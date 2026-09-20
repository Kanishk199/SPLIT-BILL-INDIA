import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { splitBotChat, parseNaturalLanguageAssignment } from '../services/aiService';
import { calculateBalances } from '../services/settlementEngine';
import Decimal from 'decimal.js';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
  context: z.object({
    groupId: z.string().optional(),
    billId: z.string().optional(),
  }).optional(),
});

const assignSchema = z.object({
  message: z.string(),
  billId: z.string(),
  groupId: z.string(),
});

// POST /api/ai/chat
router.post('/chat', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = chatSchema.parse(req.body);
    const userId = req.userId!;
    const user = req.user!;

    // Get or create conversation
    let conversationId = body.conversationId;
    let conversation;

    if (conversationId) {
      conversation = await prisma.aIConversation.findFirst({
        where: { id: conversationId, userId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
      });
    }

    if (!conversation) {
      conversation = await prisma.aIConversation.create({
        data: {
          userId,
          groupId: body.context?.groupId,
          billId: body.context?.billId,
          title: body.message.substring(0, 50),
          messages: { create: [] },
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      conversationId = conversation.id;
    }

    // Build context
    let balanceSummary = '';
    let groupMembers: Array<{ id: string; name: string }> = [];
    let billItems: Array<{ id: string; name: string; price: string }> = [];

    if (body.context?.groupId) {
      const group = await prisma.group.findUnique({
        where: { id: body.context.groupId },
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
          bills: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { payer: { select: { id: true, name: true } }, items: true }
          }
        },
      });

      if (group) {
        groupMembers = group.members.map((m) => ({ id: m.userId, name: m.user.name }));
        const balances = await calculateBalances(group.id);

        const memberBalances = balances
          .map((b) => {
            const net = new Decimal(b.netBalance);
            const isMe = b.userId === userId;
            if (isMe) {
              return net.gt(0) ? `You are owed ₹${net.toFixed(2)} in total in this group.` : net.lt(0) ? `You owe ₹${net.abs().toFixed(2)} in total in this group.` : 'Your balance is settled (₹0).';
            }
            return net.gt(0) ? `${b.userName} is owed ₹${net.toFixed(2)}` : net.lt(0) ? `${b.userName} owes ₹${net.abs().toFixed(2)}` : `${b.userName} is settled`;
          })
          .join('\n');

        const recentBills = group.bills.length > 0
          ? `Recent bills:\n` + group.bills.map((b) => `- "${b.title}": ₹${b.total} (paid by ${b.payer.name}) with items: ${b.items.map(i => `${i.name} (₹${i.price})`).join(', ')}`).join('\n')
          : 'No bills recorded in this group yet.';

        balanceSummary = `Active Group: "${group.name}"\nMembers: ${group.members.map(m => m.user.name).join(', ')}\nBalances:\n${memberBalances}\n${recentBills}`;
      }
    } else {
      // Find all groups user belongs to
      const groups = await prisma.group.findMany({
        where: { members: { some: { userId } } },
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
          bills: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: { payer: { select: { id: true, name: true } }, items: true }
          }
        }
      });

      const memberMap = new Map<string, { id: string; name: string }>();
      const groupSummaries: string[] = [];

      for (const g of groups) {
        g.members.forEach((m) => memberMap.set(m.userId, { id: m.userId, name: m.user.name }));
        const balances = await calculateBalances(g.id);
        const myBal = balances.find((b) => b.userId === userId);
        const myStatus = myBal ? (new Decimal(myBal.netBalance).gt(0) ? `others owe you ₹${new Decimal(myBal.netBalance).toFixed(2)}` : new Decimal(myBal.netBalance).lt(0) ? `you owe ₹${new Decimal(myBal.netBalance).abs().toFixed(2)}` : 'settled') : 'settled';

        const otherOwes = balances
          .filter(b => b.userId !== userId)
          .map(b => `${b.userName} (${new Decimal(b.netBalance).gt(0) ? 'is owed ₹' + b.netBalance : new Decimal(b.netBalance).lt(0) ? 'owes ₹' + new Decimal(b.netBalance).abs().toFixed(2) : 'settled'})`)
          .join(', ');

        let gSummary = `• Group "${g.name}": ${myStatus}. Members: ${otherOwes || 'None'}.`;
        if (g.bills.length > 0) {
          gSummary += ` Bills: ` + g.bills.map(b => `${b.title} (₹${b.total}, paid by ${b.payer.name})`).join(', ');
        }
        groupSummaries.push(gSummary);
      }

      groupMembers = Array.from(memberMap.values());
      balanceSummary = groupSummaries.length > 0
        ? `User's Groups & Balances Overview:\n` + groupSummaries.join('\n')
        : 'User is not part of any groups yet.';
    }

    if (body.context?.billId) {
      const bill = await prisma.bill.findUnique({
        where: { id: body.context.billId },
        include: { items: true, payer: { select: { id: true, name: true } } },
      });
      if (bill) {
        billItems = bill.items.map((i) => ({ id: i.id, name: i.name, price: i.price }));
        balanceSummary += `\nCurrent specific bill: "${bill.title}" (Total: ₹${bill.total}, Paid by: ${bill.payer.name})`;
      }
    }

    // Build conversation history for Gemini
    const history = conversation.messages.map((m) => ({
      role: (m.role === 'assistant' || m.role === 'model' ? 'model' : 'user') as 'user' | 'model',
      parts: [{ text: m.content }],
    }));

    // Get AI response
    const aiResponse = await splitBotChat(body.message, history, {
      userId,
      userName: user.name,
      currentGroupId: body.context?.groupId,
      currentBillId: body.context?.billId,
      balanceSummary: balanceSummary || undefined,
      groupMembers: groupMembers.length > 0 ? groupMembers : undefined,
      billItems: billItems.length > 0 ? billItems : undefined,
    });

    // Save messages
    await prisma.aIMessage.create({
      data: { conversationId: conversationId!, role: 'user', content: body.message },
    });

    await prisma.aIMessage.create({
      data: {
        conversationId: conversationId!,
        role: 'assistant',
        content: aiResponse.message,
        action: aiResponse.action ? JSON.stringify(aiResponse.action) : undefined,
      },
    });

    res.json({
      conversationId,
      message: aiResponse.message,
      action: aiResponse.action,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    if (err instanceof Error && (err.message.includes('GEMINI_API_KEY') || err.message.includes('API key'))) {
      res.status(503).json({ error: 'AI service not configured. Please add your Gemini API key.' });
      return;
    }
    console.error('AI chat error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI chat failed' });
  }
});

// POST /api/ai/assign - natural language bill assignment
router.post('/assign', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = assignSchema.parse(req.body);

    const bill = await prisma.bill.findFirst({
      where: {
        id: body.billId,
        group: { members: { some: { userId: req.userId! } } },
      },
      include: { items: true },
    });

    if (!bill) {
      res.status(404).json({ error: 'Bill not found' });
      return;
    }

    const group = await prisma.group.findUnique({
      where: { id: body.groupId },
      include: { members: { include: { user: { select: { id: true, name: true } } } } },
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const billItemsList = bill.items.map((i) => ({ id: i.id, name: i.name }));
    const membersList = group.members.map((m) => ({ id: m.userId, name: m.user.name }));

    const parsed = await parseNaturalLanguageAssignment(body.message, billItemsList, membersList);

    // Map parsed names to IDs
    const assignments: Array<{ itemId: string; userId: string; share: string }> = [];

    for (const pa of parsed) {
      const member = membersList.find(
        (m) => m.name.toLowerCase().includes(pa.personName.toLowerCase()) ||
               pa.personName.toLowerCase().includes(m.name.toLowerCase())
      );
      if (!member) continue;

      for (const itemName of pa.items) {
        const item = billItemsList.find(
          (i) => i.name.toLowerCase().includes(itemName.toLowerCase()) ||
                 itemName.toLowerCase().includes(i.name.toLowerCase())
        );
        if (!item) continue;

        assignments.push({ itemId: item.id, userId: member.id, share: '1' });
      }
    }

    res.json({ assignments, parsed });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    console.error('AI assign error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI assign failed' });
  }
});

// GET /api/ai/conversations
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversations = await prisma.aIConversation.findMany({
      where: { userId: req.userId! },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    res.json({ conversations });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch conversations' });
  }
});

// GET /api/ai/conversations/:id
router.get('/conversations/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversation = await prisma.aIConversation.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.json({ conversation });
  } catch (err) {
    console.error('Get conversation error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch conversation' });
  }
});

export default router;

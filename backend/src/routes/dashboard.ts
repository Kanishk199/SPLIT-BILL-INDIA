import { Router, Response } from 'express';
import Decimal from 'decimal.js';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateBalances, minimizeSettlements } from '../services/settlementEngine';

const router = Router();

// GET /api/dashboard
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Get all groups user belongs to
    const groups = await prisma.group.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatarColor: true } } },
        },
        _count: { select: { bills: { where: { isSettled: false } } } },
      },
    });

    let totalOwedToMe = new Decimal(0);
    let totalIOwe = new Decimal(0);
    let pendingGroups = 0;
    let allTransactions: Array<{ groupId: string; groupName: string; from: string; to: string; amount: string }> = [];

    for (const group of groups) {
      const balances = await calculateBalances(group.id);
      const myBalance = balances.find((b) => b.userId === userId);

      if (myBalance) {
        const net = new Decimal(myBalance.netBalance);
        if (net.gt(0)) totalOwedToMe = totalOwedToMe.add(net);
        if (net.lt(0)) totalIOwe = totalIOwe.add(net.abs());
      }

      const transactions = minimizeSettlements(balances);
      const hasActivity = transactions.some((t) => t.fromId === userId || t.toId === userId);
      if (hasActivity || group._count.bills > 0) pendingGroups++;

      for (const tx of transactions) {
        allTransactions.push({
          groupId: group.id,
          groupName: group.name,
          from: tx.fromName,
          to: tx.toName,
          amount: tx.amount,
        });
      }
    }

    // Recent bills
    const recentBills = await prisma.bill.findMany({
      where: {
        group: { members: { some: { userId } } },
      },
      orderBy: { date: 'desc' },
      take: 5,
      include: {
        payer: { select: { id: true, name: true, avatarColor: true } },
        group: { select: { id: true, name: true, emoji: true } },
        _count: { select: { items: true } },
      },
    });

    // Pending reminders
    const pendingReminders = await prisma.reminder.count({
      where: { targetId: userId, status: 'pending' },
    });

    // Insight message
    const totalSettlements = allTransactions.length;
    const insightMessage =
      totalSettlements > 0
        ? `💡 You can settle ${pendingGroups} group${pendingGroups !== 1 ? 's' : ''} with just ${totalSettlements} payment${totalSettlements !== 1 ? 's' : ''}.`
        : totalOwedToMe.gt(0)
        ? `🎉 You're owed ₹${totalOwedToMe.toFixed(2)}. Time to collect!`
        : `✅ You're all settled up! No pending payments.`;

    res.json({
      totalOwedToMe: totalOwedToMe.toFixed(2),
      totalIOwe: totalIOwe.toFixed(2),
      pendingGroups,
      pendingReminders,
      recentBills,
      insightMessage,
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        emoji: g.emoji,
        memberCount: g.members.length,
        pendingBills: g._count.bills,
      })),
    });
  } catch (err) {
    throw err;
  }
});

export default router;

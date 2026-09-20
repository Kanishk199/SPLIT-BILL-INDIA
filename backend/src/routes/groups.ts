import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateBalances } from '../services/settlementEngine';

const router = Router();

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.string().default('other'),
  emoji: z.string().default('👥'),
});

const addMemberSchema = z.object({
  email: z.string().email(),
});

// GET /api/groups
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groups = await prisma.group.findMany({
      where: {
        members: { some: { userId: req.userId! } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
        },
        _count: { select: { bills: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Calculate balances for each group
    const groupsWithBalances = await Promise.all(
      groups.map(async (group) => {
        const balances = await calculateBalances(group.id);
        const myBalance = balances.find((b) => b.userId === req.userId);
        return {
          ...group,
          myBalance: myBalance?.netBalance || '0',
          totalBills: group._count.bills,
        };
      })
    );

    res.json({ groups: groupsWithBalances });
  } catch (err) {
    throw err;
  }
});

// POST /api/groups
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = createGroupSchema.parse(req.body);

    const group = await prisma.group.create({
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        emoji: body.emoji,
        members: {
          create: { userId: req.userId!, role: 'admin' },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
        },
      },
    });

    res.status(201).json({ group });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/groups/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await prisma.group.findFirst({
      where: {
        id: req.params.id,
        members: { some: { userId: req.userId! } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
        },
        bills: {
          orderBy: { date: 'desc' },
          include: {
            payer: { select: { id: true, name: true, avatarColor: true } },
            _count: { select: { items: true } },
          },
        },
      },
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const balances = await calculateBalances(group.id);
    res.json({ group, balances });
  } catch (err) {
    throw err;
  }
});

// POST /api/groups/:id/members
router.post('/:id/members', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = addMemberSchema.parse(req.body);

    // Check if requester is in group
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: req.params.id, userId: req.userId! },
    });
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    const userToAdd = await prisma.user.findUnique({ where: { email: body.email } });
    if (!userToAdd) {
      res.status(404).json({ error: 'User not found with this email' });
      return;
    }

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: userToAdd.id } },
    });
    if (existing) {
      res.status(409).json({ error: 'User is already a member' });
      return;
    }

    const member = await prisma.groupMember.create({
      data: { groupId: req.params.id, userId: userToAdd.id },
      include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
    });

    res.status(201).json({ member });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    console.error('Add member error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to add member' });
  }
});

// DELETE /api/groups/:id/members/:userId
router.delete('/:id/members/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: groupId, userId: targetUserId } = req.params;

    // Can only remove yourself or if admin
    const myMembership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId! },
    });
    if (!myMembership) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    if (targetUserId !== req.userId && myMembership.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can remove other members' });
      return;
    }

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });

    res.json({ message: 'Member removed' });
  } catch (err) {
    throw err;
  }
});

export default router;

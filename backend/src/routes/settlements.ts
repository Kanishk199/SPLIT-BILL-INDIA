import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateBalances, minimizeSettlements } from '../services/settlementEngine';

const router = Router();

// GET /api/settlements/group/:groupId
router.get('/group/:groupId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;

    // Verify membership
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId! },
    });
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    const balances = await calculateBalances(groupId);
    const transactions = minimizeSettlements(balances);

    const naiveCount = balances.reduce((count, b) => {
      const creditors = balances.filter((other) => parseFloat(other.netBalance) > 0).length;
      return count + (parseFloat(b.netBalance) < 0 ? creditors : 0);
    }, 0);

    res.json({
      balances,
      transactions,
      optimizedCount: transactions.length,
      naiveCount: Math.max(naiveCount, transactions.length),
      savingsMessage:
        transactions.length < naiveCount
          ? `${transactions.length} settlements instead of ${naiveCount}`
          : undefined,
    });
  } catch (err) {
    throw err;
  }
});

// POST /api/settlements/group/:groupId/confirm
router.post('/group/:groupId/confirm', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId! },
    });
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    const balances = await calculateBalances(groupId);
    const transactions = minimizeSettlements(balances);

    // Deactivate previous settlements
    await prisma.settlement.updateMany({
      where: { groupId },
      data: { isActive: false },
    });

    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        transactions: {
          create: transactions.map((t) => ({
            fromId: t.fromId,
            toId: t.toId,
            amount: t.amount,
          })),
        },
      },
      include: { transactions: true },
    });

    res.status(201).json({ settlement, transactions });
  } catch (err) {
    throw err;
  }
});

// GET /api/settlements/history
router.get('/history', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settlements = await prisma.settlement.findMany({
      where: {
        group: { members: { some: { userId: req.userId! } } },
        isActive: true,
      },
      include: {
        group: { select: { id: true, name: true, emoji: true } },
        transactions: true,
      },
      orderBy: { calculatedAt: 'desc' },
      take: 20,
    });

    res.json({ settlements });
  } catch (err) {
    throw err;
  }
});

// POST /api/settlements/transactions/:txId/complete
router.post('/transactions/:txId/complete', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tx = await prisma.settlementTransaction.findFirst({
      where: {
        id: req.params.txId,
        settlement: { group: { members: { some: { userId: req.userId! } } } },
      },
    });

    if (!tx) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const updated = await prisma.settlementTransaction.update({
      where: { id: req.params.txId },
      data: { isCompleted: true, completedAt: new Date() },
    });

    res.json({ transaction: updated });
  } catch (err) {
    throw err;
  }
});

export default router;

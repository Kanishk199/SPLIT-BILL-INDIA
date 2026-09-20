import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const createPaymentSchema = z.object({
  billId: z.string().optional(),
  groupId: z.string().optional(),
  fromId: z.string().optional(),
  toId: z.string().optional(),
  amount: z.string(),
  note: z.string().optional(),
  method: z.enum(['upi', 'cash', 'other']).default('other'),
});

// POST /api/payments
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = createPaymentSchema.parse(req.body);

    // Validate amount
    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({ error: 'Invalid payment amount' });
      return;
    }

    const currentUserId = req.userId!;
    let fromId = body.fromId || currentUserId;
    let toId = body.toId || currentUserId;

    // If neither was explicitly different from current user, error
    if (fromId === toId) {
      res.status(400).json({ error: 'Sender and recipient cannot be the same user' });
      return;
    }

    // Verify current user is one of the parties
    if (fromId !== currentUserId && toId !== currentUserId) {
      res.status(403).json({ error: 'You can only record payments you sent or received' });
      return;
    }

    // Verify both users exist
    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: fromId } }),
      prisma.user.findUnique({ where: { id: toId } }),
    ]);

    if (!fromUser || !toUser) {
      res.status(404).json({ error: 'One or more payment participants not found' });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        fromId,
        toId,
        amount: body.amount,
        note: body.note,
        method: body.method,
        billId: body.billId,
        groupId: body.groupId,
      },
      include: {
        from: { select: { id: true, name: true, avatarColor: true } },
        to: { select: { id: true, name: true, avatarColor: true } },
      },
    });

    res.status(201).json({ payment });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    console.error('Error creating payment:', err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// GET /api/payments
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        OR: [{ fromId: req.userId! }, { toId: req.userId! }],
      },
      include: {
        from: { select: { id: true, name: true, avatarColor: true } },
        to: { select: { id: true, name: true, avatarColor: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ payments });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

export default router;

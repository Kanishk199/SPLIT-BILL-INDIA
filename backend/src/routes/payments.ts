import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const createPaymentSchema = z.object({
  billId: z.string().optional(),
  groupId: z.string().optional(),
  toId: z.string(),
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

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({ where: { id: body.toId } });
    if (!recipient) {
      res.status(404).json({ error: 'Recipient not found' });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        fromId: req.userId!,
        toId: body.toId,
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
    throw err;
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
    throw err;
  }
});

export default router;

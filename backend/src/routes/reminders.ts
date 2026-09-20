import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const createReminderSchema = z.object({
  targetId: z.string(),
  message: z.string().min(1).max(500),
  context: z.string().optional(), // JSON string
});

// GET /api/reminders
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reminders = await prisma.reminder.findMany({
      where: {
        OR: [{ creatorId: req.userId! }, { targetId: req.userId! }],
      },
      include: {
        creator: { select: { id: true, name: true, avatarColor: true } },
        target: { select: { id: true, name: true, avatarColor: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ reminders });
  } catch (err) {
    throw err;
  }
});

// POST /api/reminders (AI prepares this, user reviews before creating)
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = createReminderSchema.parse(req.body);

    const target = await prisma.user.findUnique({ where: { id: body.targetId } });
    if (!target) {
      res.status(404).json({ error: 'Target user not found' });
      return;
    }

    const reminder = await prisma.reminder.create({
      data: {
        creatorId: req.userId!,
        targetId: body.targetId,
        message: body.message,
        context: body.context,
        status: 'pending',
      },
      include: {
        creator: { select: { id: true, name: true, avatarColor: true } },
        target: { select: { id: true, name: true, avatarColor: true } },
      },
    });

    res.status(201).json({ reminder });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    throw err;
  }
});

// POST /api/reminders/:id/send (user approves sending)
router.post('/:id/send', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reminder = await prisma.reminder.findFirst({
      where: { id: req.params.id, creatorId: req.userId! },
    });

    if (!reminder) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    if (reminder.status !== 'pending') {
      res.status(400).json({ error: `Reminder is already ${reminder.status}` });
      return;
    }

    const updated = await prisma.reminder.update({
      where: { id: req.params.id },
      data: { status: 'sent', sentAt: new Date() },
      include: {
        creator: { select: { id: true, name: true } },
        target: { select: { id: true, name: true } },
      },
    });

    // In a real app: send push notification, WhatsApp, email etc.
    // For now: mark as sent
    res.json({ reminder: updated, message: 'Reminder sent successfully' });
  } catch (err) {
    throw err;
  }
});

// DELETE /api/reminders/:id (cancel)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reminder = await prisma.reminder.findFirst({
      where: { id: req.params.id, creatorId: req.userId! },
    });

    if (!reminder) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    await prisma.reminder.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
    });

    res.json({ message: 'Reminder cancelled' });
  } catch (err) {
    throw err;
  }
});

export default router;

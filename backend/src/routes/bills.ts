import { Router, Response } from 'express';
import { z } from 'zod';
import Decimal from 'decimal.js';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { extractBillFromImage, parseBillText } from '../services/aiService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const createBillSchema = z.object({
  groupId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().default('restaurant'),
  subtotal: z.string(),
  tax: z.string().default('0'),
  serviceCharge: z.string().default('0'),
  tip: z.string().default('0'),
  discount: z.string().default('0'),
  total: z.string(),
  date: z.string().optional(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().int().positive(),
    price: z.string(),
    totalPrice: z.string(),
  })).optional(),
});

const assignSchema = z.object({
  assignments: z.array(z.object({
    itemId: z.string(),
    userId: z.string(),
    share: z.string().default('1'),
  })),
});

// POST /api/bills/scan - upload and OCR a bill
router.post('/scan', authenticate, upload.single('bill'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype as string;

    const extracted = await extractBillFromImage(imageBase64, mimeType);
    res.json({ bill: extracted });
  } catch (err) {
    if (err instanceof Error && (err.message.includes('GEMINI_API_KEY') || err.message.includes('API key'))) {
      res.status(503).json({ error: 'AI service not configured. Please check your GEMINI_API_KEY.' });
      return;
    }
    console.error('Scan error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to scan bill' });
  }
});

// POST /api/bills/parse-text - parse bill from text description
router.post('/parse-text', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }
    const extracted = await parseBillText(text);
    res.json({ bill: extracted });
  } catch (err) {
    console.error('Parse text error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to parse text' });
  }
});

// POST /api/bills
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = createBillSchema.parse(req.body);

    // Verify user is in group
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: body.groupId, userId: req.userId! },
    });
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    const bill = await prisma.bill.create({
      data: {
        groupId: body.groupId,
        payerId: req.userId!,
        title: body.title,
        description: body.description,
        category: body.category,
        subtotal: body.subtotal,
        tax: body.tax,
        serviceCharge: body.serviceCharge,
        tip: body.tip,
        discount: body.discount,
        total: body.total,
        date: body.date ? new Date(body.date) : undefined,
        items: body.items ? {
          create: body.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice,
          })),
        } : undefined,
      },
      include: {
        items: true,
        payer: { select: { id: true, name: true, avatarColor: true } },
      },
    });

    res.status(201).json({ bill });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/bills/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await prisma.bill.findFirst({
      where: {
        id: req.params.id,
        group: { members: { some: { userId: req.userId! } } },
      },
      include: {
        payer: { select: { id: true, name: true, avatarColor: true } },
        group: {
          include: {
            members: {
              include: { user: { select: { id: true, name: true, avatarColor: true } } },
            },
          },
        },
        items: {
          include: {
            assignments: {
              include: { user: { select: { id: true, name: true, avatarColor: true } } },
            },
          },
        },
      },
    });

    if (!bill) {
      res.status(404).json({ error: 'Bill not found' });
      return;
    }

    res.json({ bill });
  } catch (err) {
    throw err;
  }
});

// PUT /api/bills/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.id, group: { members: { some: { userId: req.userId! } } } },
    });
    if (!bill) { res.status(404).json({ error: 'Bill not found' }); return; }

    const updateSchema = createBillSchema.omit({ groupId: true, items: true }).partial();
    const body = updateSchema.parse(req.body);

    const updated = await prisma.bill.update({
      where: { id: req.params.id },
      data: body,
      include: { items: true, payer: { select: { id: true, name: true, avatarColor: true } } },
    });
    res.json({ bill: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    throw err;
  }
});

// POST /api/bills/:id/items
router.post('/:id/items', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.id, group: { members: { some: { userId: req.userId! } } } },
    });
    if (!bill) { res.status(404).json({ error: 'Bill not found' }); return; }

    const itemSchema = z.object({
      name: z.string(),
      quantity: z.number().int().positive(),
      price: z.string(),
      totalPrice: z.string(),
    });
    const body = itemSchema.parse(req.body);

    const item = await prisma.billItem.create({
      data: { billId: req.params.id, ...body },
    });
    res.status(201).json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/bills/:id/items/:itemId
router.put('/:id/items/:itemId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.id, group: { members: { some: { userId: req.userId! } } } },
    });
    if (!bill) { res.status(404).json({ error: 'Bill not found' }); return; }

    const itemSchema = z.object({
      name: z.string().optional(),
      quantity: z.number().int().positive().optional(),
      price: z.string().optional(),
      totalPrice: z.string().optional(),
    });
    const body = itemSchema.parse(req.body);

    const item = await prisma.billItem.update({
      where: { id: req.params.itemId },
      data: body,
    });
    res.json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/bills/:id/items/:itemId
router.delete('/:id/items/:itemId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.id, group: { members: { some: { userId: req.userId! } } } },
    });
    if (!bill) { res.status(404).json({ error: 'Bill not found' }); return; }

    await prisma.billItem.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    throw err;
  }
});

// POST /api/bills/:id/assign
router.post('/:id/assign', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.id, group: { members: { some: { userId: req.userId! } } } },
      include: { items: true },
    });
    if (!bill) { res.status(404).json({ error: 'Bill not found' }); return; }

    const body = assignSchema.parse(req.body);

    // Delete existing assignments for these items and recreate
    const itemIds = body.assignments.map((a) => a.itemId);
    await prisma.itemAssignment.deleteMany({ where: { billItemId: { in: itemIds } } });

    // Calculate actual amounts with extras ratio
    const subtotal = new Decimal(bill.subtotal);
    const total = new Decimal(bill.total);
    const extraRatio = subtotal.gt(0) ? total.div(subtotal) : new Decimal(1);

    const assignmentsToCreate = [];
    for (const assignment of body.assignments) {
      const item = bill.items.find((i) => i.id === assignment.itemId);
      if (!item) continue;

      const itemTotal = new Decimal(item.totalPrice).mul(extraRatio);
      const amount = itemTotal.toFixed(2);

      assignmentsToCreate.push({
        billItemId: assignment.itemId,
        userId: assignment.userId,
        share: assignment.share,
        amount,
      });
    }

    await prisma.itemAssignment.createMany({ data: assignmentsToCreate });

    const updatedBill = await prisma.bill.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            assignments: {
              include: { user: { select: { id: true, name: true, avatarColor: true } } },
            },
          },
        },
      },
    });

    res.json({ bill: updatedBill });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    throw err;
  }
});

export default router;

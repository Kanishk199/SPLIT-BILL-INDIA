import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name must be under 50 characters'),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().trim().optional().nullable().or(z.literal('')),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'billsplit-india-hackathon-super-secret-jwt-key-2026-min32chars';
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = registerSchema.parse(req.body);
    const normalizedEmail = body.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const colors = ['#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email: normalizedEmail,
        phone: body.phone && body.phone.trim() ? body.phone.trim() : null,
        passwordHash,
        avatarColor,
      },
      select: { id: true, name: true, email: true, phone: true, avatarColor: true, createdAt: true },
    });

    const token = generateToken(user.id);
    res.status(201).json({ user, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstError = err.errors[0]?.message || 'Validation failed';
      res.status(400).json({ error: firstError, details: err.errors });
      return;
    }
    console.error('Registration error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = loginSchema.parse(req.body);
    const normalizedEmail = body.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user.id);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarColor: user.avatarColor,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstError = err.errors[0]?.message || 'Validation failed';
      res.status(400).json({ error: firstError, details: err.errors });
      return;
    }
    console.error('Login error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'billsplit-india-hackathon-super-secret-jwt-key-2026-min32chars';

    const payload = jwt.verify(token, secret) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, phone: true, avatarColor: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
});

export default router;

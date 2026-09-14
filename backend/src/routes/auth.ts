import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../db.js';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'rakshak-super-secret-key-12345';
const SESSION_EXPIRY_DAYS = 7;

// Login Endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    // Save session in DB
    const session = await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Create JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        sessionToken: session.sessionToken,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'An error occurred during login.' });
  }
});

// Register Endpoint
router.post('/register', async (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required.' });
  }

  const validRoles = ['NODE_OPERATOR', 'POLICE', 'HOSPITAL_ADMIN'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Allowed roles: ${validRoles.join(', ')}` });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

    res.status(201).json({
      message: 'User registered successfully.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'An error occurred during registration.' });
  }
});

// Logout Endpoint
router.post('/logout', verifyToken, async (req: AuthenticatedRequest, res) => {
  const { sessionToken } = req;

  if (!sessionToken) {
    return res.json({ message: 'Successfully logged out (token only).' });
  }

  try {
    await prisma.session.delete({
      where: { sessionToken },
    });
    res.json({ message: 'Successfully logged out and session revoked.' });
  } catch (error: any) {
    res.json({ message: 'Successfully logged out.' });
  }
});

// Me Profile Endpoint
router.get('/me', verifyToken, async (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

export default router;

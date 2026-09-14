import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'rakshak-super-secret-key-12345';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️ [SECURITY WARNING]: JWT_SECRET environment variable is not defined in production! Ensure a cryptographically secure key is set.');
}

// Define custom Request properties for TypeScript
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string | null;
  };
  sessionToken?: string;
}

export const verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
      name: string | null;
      sessionToken?: string;
    };

    // If a session token was embedded, validate it against the database
    if (decoded.sessionToken) {
      const activeSession = await prisma.session.findUnique({
        where: { sessionToken: decoded.sessionToken },
      });

      if (!activeSession || activeSession.expiresAt < new Date()) {
        return res.status(401).json({ error: 'Session expired or invalidated. Please log in again.' });
      }

      req.sessionToken = decoded.sessionToken;
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name
    };

    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access forbidden. Required role: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}` 
      });
    }

    next();
  };
};

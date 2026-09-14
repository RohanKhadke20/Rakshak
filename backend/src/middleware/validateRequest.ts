import { Request, Response, NextFunction } from 'express';

/**
 * Validates and sanitizes incoming request bodies.
 * Defends against prototype pollution, dangerous keys, and unexpected payloads.
 */
export const sanitizeRequestBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    // Check for prototype pollution attack vectors
    const hasForbiddenKeys = (obj: any): boolean => {
      for (const key of Object.keys(obj)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return true;
        }
        if (obj[key] && typeof obj[key] === 'object' && hasForbiddenKeys(obj[key])) {
          return true;
        }
      }
      return false;
    };

    if (hasForbiddenKeys(req.body)) {
      return res.status(400).json({ error: 'Malformed request: Forbidden object keys detected.' });
    }
  }

  next();
};

/**
 * Parameter validator helper ensuring non-empty strings and bounds.
 */
export const validateFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing: string[] = [];
    for (const field of fields) {
      const val = req.body?.[field];
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Validation error: Missing or empty required fields: ${missing.join(', ')}`,
      });
    }

    next();
  };
};

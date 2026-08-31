import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../config/firebase';

/**
 * Middleware to authenticate requests via Firebase ID Token
 */
export async function authenticateFirebaseUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected format: "Bearer <token>"',
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token is empty',
    });
    return;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      decodedToken,
    };
    next();
  } catch (error: any) {
    console.error('Firebase token verification failed:', error?.message || error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired Firebase ID token',
      code: error?.code || 'AUTH_TOKEN_INVALID',
    });
  }
}

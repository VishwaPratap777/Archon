import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'archon-secret-jwt-key-2026';

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (err) {
    return null;
  }
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token. Please sign in again.' });
  }

  req.user = decoded;
  next();
}

export function optionalAuthenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

export async function trackTokenUsage(params: {
  userId: string;
  agentType: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  repositoryId?: string;
}) {
  try {
    const { userId, agentType, promptTokens, completionTokens, totalTokens, model, repositoryId } = params;
    if (!userId) return;

    const { db } = await connectToDatabase();

    const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;

    // Update aggregate token stats on User document
    await db.collection('users').updateOne(
      { _id: userObjectId as any },
      {
        $inc: {
          'tokenUsage.promptTokens': promptTokens || 0,
          'tokenUsage.completionTokens': completionTokens || 0,
          'tokenUsage.totalTokens': totalTokens || (promptTokens + completionTokens) || 0,
          'tokenUsage.requestCount': 1,
        },
        $set: { updatedAt: new Date() }
      },
      { upsert: false }
    );

    // Insert granular audit log entry in tokenLogs collection
    await db.collection('tokenLogs').insertOne({
      userId: userObjectId,
      repositoryId: repositoryId && ObjectId.isValid(repositoryId) ? new ObjectId(repositoryId) : repositoryId || null,
      agentType,
      promptTokens: promptTokens || 0,
      completionTokens: completionTokens || 0,
      totalTokens: totalTokens || (promptTokens + completionTokens) || 0,
      model: model || 'unknown',
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('[AUTH] Failed to track token usage:', error);
  }
}

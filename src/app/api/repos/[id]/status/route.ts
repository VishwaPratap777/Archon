import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { db } = await connectToDatabase();
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid repository identifier' }, { status: 400 });
    }

    const repo = await db.collection('repositories').findOne({ _id: new ObjectId(id) });
    if (!repo) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: repo.status,
      progress: repo.progress,
      logs: repo.logs || [],
      frameworks: repo.frameworks || [],
      stats: repo.stats || {},
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch status' }, { status: 500 });
  }
}

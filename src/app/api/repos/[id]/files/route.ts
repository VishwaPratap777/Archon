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

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!ObjectId.isValid(id) || !filePath) {
      return NextResponse.json({ error: 'Invalid parameters provided' }, { status: 400 });
    }

    const repoObjectId = new ObjectId(id);
    const file = await db.collection('files').findOne({
      repositoryId: repoObjectId,
      path: filePath,
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({
      _id: file._id,
      path: file.path,
      content: file.content || '',
      loc: file.loc || 0,
      complexity: file.complexity || 1,
      extension: file.extension || '',
      imports: file.imports || [],
      functionsCount: file.functionsCount || 0,
      classesCount: file.classesCount || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch file content' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const settings: any = await db.collection('settings').findOne({}) || {};
    
    // Mask sensitive keys before sending
    const response = {
      githubPat: settings.githubPat ? `ghp_***${settings.githubPat.slice(-4)}` : '',
      openaiApiKey: settings.openaiApiKey ? `sk-proj-***${settings.openaiApiKey.slice(-4)}` : '',
      anthropicApiKey: settings.anthropicApiKey ? `sk-ant-***${settings.anthropicApiKey.slice(-4)}` : '',
      hasGithubPat: !!settings.githubPat,
      hasOpenaiApiKey: !!settings.openaiApiKey,
      hasAnthropicApiKey: !!settings.anthropicApiKey,
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase();
    const data = await request.json();
    
    // We only update if they pass non-masked values.
    // If they send a masked representation, we ignore that field to preserve the existing value.
    const updates: Record<string, string> = {};
    
    if (data.githubPat && !data.githubPat.includes('***')) {
      updates.githubPat = data.githubPat.trim();
    }
    if (data.openaiApiKey && !data.openaiApiKey.includes('***')) {
      updates.openaiApiKey = data.openaiApiKey.trim();
    }
    if (data.anthropicApiKey && !data.anthropicApiKey.includes('***')) {
      updates.anthropicApiKey = data.anthropicApiKey.trim();
    }
    
    if (Object.keys(updates).length > 0) {
      await db.collection('settings').updateOne(
        {},
        { $set: updates },
        { upsert: true }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save settings' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const auth = await getApiAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Chat history error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await getApiAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await prisma.chatMessage.deleteMany({
      where: { userId: auth.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear chat history error:', error);
    return NextResponse.json({ error: 'Failed to clear chat history' }, { status: 500 });
  }
}

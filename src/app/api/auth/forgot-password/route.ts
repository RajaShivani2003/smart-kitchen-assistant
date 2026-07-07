import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({
        message: 'If the email exists, a reset token has been generated',
      });
    }

    const token = crypto.randomBytes(32).toString('hex').slice(0, 16);

    await prisma.verificationToken.create({
      data: {
        identifier: `reset:${user.id}`,
        token,
        expires: new Date(Date.now() + 3600000),
      },
    });

    return NextResponse.json({
      message: 'Reset token generated successfully',
      token,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

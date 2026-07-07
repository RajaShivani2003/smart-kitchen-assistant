import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth-utils';

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier: `reset:${token}`,
        token,
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    if (new Date() > verificationToken.expires) {
      await prisma.verificationToken.delete({ where: { identifier: verificationToken.identifier, token } });
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
    }

    const userId = verificationToken.identifier.replace('reset:', '');

    await prisma.user.update({
      where: { id: userId },
      data: { password: await hashPassword(password) },
    });

    await prisma.verificationToken.delete({
      where: { identifier: verificationToken.identifier, token },
    });

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

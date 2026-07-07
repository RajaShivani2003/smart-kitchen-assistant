import { getServerAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth-utils';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const schema = z.object({
      name: z.string().min(2, 'Name must be at least 2 characters'),
      email: z.string().email('Invalid email address'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
    });

    const validation = schema.safeParse(body);

    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || 'Validation failed';
      return Response.json(
        { error: firstIssue },
        { status: 400 }
      );
    }

    const { name, email, password } = validation.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return Response.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return Response.json({
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      { error: 'Something went wrong: ' + msg },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const auth = await getServerAuth();
  return Response.json({ session: auth ? { user: { id: auth.userId, email: auth.email, name: auth.name } } : null });
}

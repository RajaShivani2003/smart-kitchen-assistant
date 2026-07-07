import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';

export async function GET() {
  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user: { userId: auth.userId, email: auth.email, name: auth.name } });
}

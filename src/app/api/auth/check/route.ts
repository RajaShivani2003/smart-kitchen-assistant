import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/server-auth';

export async function GET(req: Request) {
  try {
    const auth = await getApiAuth(req);
    if (!auth) {
      return new NextResponse(JSON.stringify({ user: null }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }
    return new NextResponse(JSON.stringify({ user: { userId: auth.userId, email: auth.email, name: auth.name } }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return new NextResponse(JSON.stringify({ user: null }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }
}

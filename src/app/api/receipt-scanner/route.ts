import { getApiAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }

    // OCR is now done client-side via Tesseract.js in the browser
    // This endpoint is kept for backward compatibility
    // The client sends extracted text here to save to database
    const text = formData.get('text') as string;

    if (!text) {
      return Response.json({ error: 'No text provided' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: auth.email },
    });

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    return Response.json({ message: 'OCR is now handled client-side' });
  } catch (error) {
    console.error('Receipt scan error:', error);
    return Response.json({ error: 'Failed to scan receipt. Please try again.' }, { status: 500 });
  }
}

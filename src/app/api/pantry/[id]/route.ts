import { getApiAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string(),
  category: z.string(),
  expiryDate: z.string().optional().nullable(),
});

export async function PUT(req: Request) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const validation = schema.safeParse(await req.json());

  if (!validation.success) {
    return Response.json(
      { error: validation.error.message },
      { status: 400 }
    );
  }

  const { id, name, quantity, unit, category, expiryDate } = validation.data;

  const existing = await prisma.ingredient.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== auth.userId) {
    return Response.json({ error: 'Ingredient not found' }, { status: 404 });
  }

  const ingredient = await prisma.ingredient.update({
    where: { id },
    data: {
      name,
      quantity,
      unit,
      category,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    },
  });

  return Response.json(ingredient);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.ingredient.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== auth.userId) {
    return Response.json({ error: 'Ingredient not found' }, { status: 404 });
  }

  await prisma.ingredient.delete({
    where: { id },
  });

  return Response.json({ message: 'Ingredient deleted' });
}

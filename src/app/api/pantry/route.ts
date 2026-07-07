import { getServerAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const LOW_STOCK_THRESHOLD = 2;

export async function GET() {
  const auth = await getServerAuth();

  if (!auth) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ingredients = await prisma.ingredient.findMany({
    where: {
      user: { email: auth.email },
    },
    orderBy: { createdAt: 'desc' },
  });

  const lowStockCount = ingredients.filter((ing) => ing.quantity <= LOW_STOCK_THRESHOLD).length;

  return Response.json({ ingredients, lowStockCount });
}

export async function POST(req: Request) {
  const auth = await getServerAuth();

  if (!auth) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    quantity: z.number().positive('Quantity must be positive'),
    unit: z.string(),
    category: z.string(),
    expiryDate: z.string().optional().nullable(),
  });

  const validation = schema.safeParse(await req.json());

  if (!validation.success) {
    return Response.json(
      { error: validation.error.message },
      { status: 400 }
    );
  }

  const { name, quantity, unit, category, expiryDate } = validation.data;

  const ingredient = await prisma.ingredient.create({
    data: {
      user: {
        connect: { email: auth.email },
      },
      name,
      quantity,
      unit,
      category,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    },
  });

  return Response.json(ingredient);
}

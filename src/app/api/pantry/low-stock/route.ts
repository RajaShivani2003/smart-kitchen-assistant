import { getApiAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

const LOW_STOCK_THRESHOLD = 2;

export async function GET(req: Request) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const lowStockItems = await prisma.ingredient.findMany({
    where: {
      user: { email: auth.email },
      quantity: { lte: LOW_STOCK_THRESHOLD },
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      quantity: true,
      unit: true,
      category: true,
    },
  });

  return Response.json({ lowStockItems });
}

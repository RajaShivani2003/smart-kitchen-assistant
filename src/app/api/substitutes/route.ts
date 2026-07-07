import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/server-auth';

export async function GET(req: Request) {
  const auth = await getApiAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ingredient = searchParams.get('ingredient');

  if (!ingredient) {
    return NextResponse.json({ error: 'Ingredient name is required' }, { status: 400 });
  }

  const substitutes: Array<{ substitute: string; amount: string; unit: string; ratio: string; note: string }> = [];

  const substituteMap: Record<string, typeof substitutes> = {
    'egg': [
      { substitute: 'Applesauce', amount: '1/4', unit: 'cup', ratio: '1:1', note: 'Best for baking, adds moisture' },
      { substitute: 'Mashed banana', amount: '1/4', unit: 'cup', ratio: '1:1', note: 'Adds sweetness and fiber' },
      { substitute: 'Greek yogurt', amount: '1/4', unit: 'cup', ratio: '1:1', note: 'Adds protein, works in most recipes' },
    ],
    'flour': [
      { substitute: 'Almond flour', amount: '1', unit: 'cup', ratio: '1:1', note: 'Gluten-free, adds protein and healthy fats' },
      { substitute: 'Oat flour', amount: '1', unit: 'cup', ratio: '1:1', note: 'Gluten-free if certified, adds fiber' },
      { substitute: 'Coconut flour', amount: '1/4', unit: 'cup', ratio: '1:4', note: 'Very absorbent, add extra liquid' },
    ],
    'butter': [
      { substitute: 'Coconut oil', amount: '1', unit: 'cup', ratio: '1:1', note: 'Solid at room temp, great for baking' },
      { substitute: 'Olive oil', amount: '3/4', unit: 'cup', ratio: '3:4', note: 'Best for savory dishes' },
      { substitute: 'Greek yogurt', amount: '1', unit: 'cup', ratio: '1:1', note: 'Reduces fat, adds moisture' },
    ],
    'milk': [
      { substitute: 'Almond milk', amount: '1', unit: 'cup', ratio: '1:1', note: 'Lighter, slightly nutty flavor' },
      { substitute: 'Oat milk', amount: '1', unit: 'cup', ratio: '1:1', note: 'Creamiest dairy-free option' },
      { substitute: 'Coconut milk', amount: '1', unit: 'cup', ratio: '1:1', note: 'Rich and creamy, adds coconut flavor' },
    ],
    'sugar': [
      { substitute: 'Honey', amount: '3/4', unit: 'cup', ratio: '3:4', note: 'Reduce liquid by 1/4 cup' },
      { substitute: 'Maple syrup', amount: '3/4', unit: 'cup', ratio: '3:4', note: 'Adds distinct flavor' },
      { substitute: 'Stevia', amount: '1', unit: 'tsp', ratio: '1:200', note: 'Much sweeter, no calories' },
    ],
  };

  const key = ingredient.toLowerCase();
  const result = substituteMap[key];
  if (result) {
    return NextResponse.json({ substitutes: result });
  }

  return NextResponse.json({ substitutes: [
    { substitute: 'Check recipe context', amount: '1', unit: 'serving', ratio: 'varies', note: `For "${ingredient}", substitute choice depends on the specific recipe. Consider similar texture and flavor profile ingredients.` },
  ]});
}

export async function POST(req: Request) {
  const auth = await getApiAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { ingredient, quantity, unit, recipeContext } = body;

  if (!ingredient) {
    return NextResponse.json({ error: 'Ingredient name is required' }, { status: 400 });
  }

  const prompt = `You are a professional chef and cooking expert. The user is making a recipe and needs a substitute for "${ingredient}".

Recipe context: ${recipeContext || 'Not specified'}
Required amount: ${quantity || 'not specified'} ${unit || ''}

Give me exactly 3 substitutes. For each substitute, provide:
1. substitute: the name of the substitute ingredient
2. amount: the exact amount to use (can be same or different from original)
3. unit: the unit for the amount
4. ratio: the ratio compared to original (e.g., "1:1", "2:1", "0.5:1")
5. note: a brief note about taste/texture difference or when to use this substitute

Format your response as a JSON array like this:
[
  {"substitute": "...", "amount": "...", "unit": "...", "ratio": "...", "note": "..."},
  {"substitute": "...", "amount": "...", "unit": "...", "ratio": "...", "note": "..."},
  {"substitute": "...", "amount": "...", "unit": "...", "ratio": "...", "note": "..."}
]

Only return the JSON array, nothing else.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful cooking assistant. Always respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    let substitutes;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      substitutes = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      substitutes = [];
    }

    return NextResponse.json({ substitutes });
  } catch (error) {
    console.error('Substitution API error:', error);
    return NextResponse.json({ error: 'Failed to get substitutes' }, { status: 500 });
  }
}

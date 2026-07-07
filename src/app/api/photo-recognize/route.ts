import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/server-auth';

export async function POST(req: Request) {
  const auth = await getApiAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let base64: string;
  let mimeType: string;

  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }
    const bytes = await image.arrayBuffer();
    base64 = Buffer.from(bytes).toString('base64');
    mimeType = image.type || 'image/jpeg';
  } else {
    const data = await req.json();
    base64 = data.image || '';
    mimeType = data.mimeType || 'image/jpeg';
  }

  if (base64.includes(',')) {
    base64 = base64.split(',')[1];
  }

  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured. Add GEMINI_API_KEY to your .env file.' }, { status: 500 });
  }

  try {
    const prompt = `You are a kitchen expert. Look at this image and identify all food ingredients/vegetables/fruits you can see.

For each item, provide:
1. name: the common name of the ingredient
2. category: one of [Vegetables, Fruits, Dairy, Spices, Grains, Meats, Beverages, Snacks, Condiments, Others]
3. estimatedQuantity: an estimated quantity (e.g., "2", "100g", "1 cup")
4. unit: the unit (pcs, g, kg, ml, liters, pack, can, bottle, cup, tbsp, tsp)

Format your response as a JSON array like this:
[
  {"name": "...", "category": "...", "estimatedQuantity": "...", "unit": "..."},
  {"name": "...", "category": "...", "estimatedQuantity": "...", "unit": "..."}
]

Only return the JSON array, nothing else. Be thorough and identify every ingredient you can see.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            max_output_tokens: 1000,
            temperature: 0.1,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', response.status, error);
      return NextResponse.json({ error: 'Failed to analyze image. Please try again.' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('Gemini response:', content);

    let items;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        items = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: 'Could not identify ingredients. Try a clearer photo.' }, { status: 500 });
      }
    } catch {
      return NextResponse.json({ error: 'Could not parse results. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Photo recognition error:', error);
    return NextResponse.json({ error: 'Failed to analyze image. Please try again.' }, { status: 500 });
  }
}

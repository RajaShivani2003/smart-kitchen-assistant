import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: Request) {
  try {
    const auth = await getApiAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { action, message, messages: messagesBody } = body;
    let messages = Array.isArray(messagesBody) ? messagesBody : [];

    if (messages.length === 0 && !action && message) {
      messages = [{ role: 'user', content: message }];
    }

    if (messages.length === 0 && !action) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Handle shopping list action
    if (action === 'addToShoppingList') {
      const lastMessage = messages[messages.length - 1].content;
      const item = extractItemFromMessage(lastMessage);
      if (item) {
        await prisma.shoppingList.create({
          data: {
            user: { connect: { email: auth.email } },
            item: item.charAt(0).toUpperCase() + item.slice(1),
            category: 'Other',
          },
        });
        const savedUserMsg = await prisma.chatMessage.create({
          data: { userId: auth.userId, role: 'user', content: lastMessage },
        });
        const savedAssistantMsg = await prisma.chatMessage.create({
          data: { userId: auth.userId, role: 'assistant', content: `✅ Added "${item}" to your shopping list!` },
        });
        return NextResponse.json({
          message: {
            role: 'assistant',
            content: `✅ Added "${item}" to your shopping list!`,
          },
          action: { type: 'shoppingList', item },
          messageIds: { user: savedUserMsg.id, assistant: savedAssistantMsg.id },
        });
      }
    }

    // Handle timer action
    if (action === 'startTimer') {
      const lastMessage = messages[messages.length - 1].content;
      const minutes = extractMinutes(lastMessage);
      if (minutes && minutes > 0) {
        const savedUserMsg = await prisma.chatMessage.create({
          data: { userId: auth.userId, role: 'user', content: lastMessage },
        });
        const savedAssistantMsg = await prisma.chatMessage.create({
          data: { userId: auth.userId, role: 'assistant', content: `⏱️ Timer started for ${minutes} minutes. Use the cooking timer component!` },
        });
        return NextResponse.json({
          message: {
            role: 'assistant',
            content: `⏱️ Timer started for ${minutes} minutes. Use the cooking timer component!`,
          },
          action: { type: 'timer', minutes },
          messageIds: { user: savedUserMsg.id, assistant: savedAssistantMsg.id },
        });
      }
    }

    // Handle recipe generation from pantry
    if (action === 'generateRecipe') {
      const lastMessage = messages[messages.length - 1].content;
      const ingredients = extractIngredients(lastMessage);
      if (ingredients.length > 0) {
        const recipe = generateRecipeFromIngredients(ingredients);
        const savedUserMsg = await prisma.chatMessage.create({
          data: { userId: auth.userId, role: 'user', content: lastMessage },
        });
        const savedAssistantMsg = await prisma.chatMessage.create({
          data: { userId: auth.userId, role: 'assistant', content: recipe },
        });
        return NextResponse.json({
          message: {
            role: 'assistant',
            content: recipe,
          },
          action: { type: 'recipe' },
          messageIds: { user: savedUserMsg.id, assistant: savedAssistantMsg.id },
        });
      }
    }

    // Fetch user context for personalized responses
    const user = await prisma.user.findUnique({
      where: { email: auth.email },
      include: {
        ingredients: true,
      },
    });

    const pantryIngredients = user?.ingredients.map(i => normalizeIngredient(i.name.toLowerCase().trim())) || [];
    const dietaryPrefs = user?.dietaryPreferences || '';
    const healthGoals = user?.healthGoals || '';

    const lastMessage = messages[messages.length - 1].content;
    const lastMessageLower = lastMessage.toLowerCase();

    // Check for special commands
    if (lastMessageLower.includes('add') && (lastMessageLower.includes('shopping') || lastMessageLower.includes('grocery'))) {
      const item = extractItemFromMessage(lastMessage);
      if (item) {
        await prisma.shoppingList.create({
          data: {
            user: { connect: { email: auth.email } },
            item: item.charAt(0).toUpperCase() + item.slice(1),
            category: 'Other',
          },
        });
        const savedUserMsg = await prisma.chatMessage.create({
          data: { userId: auth.userId, role: 'user', content: lastMessage },
        });
        const savedAssistantMsg = await prisma.chatMessage.create({
          data: { userId: auth.userId, role: 'assistant', content: `✅ Added "${item}" to your shopping list!` },
        });
        return NextResponse.json({
          message: {
            role: 'assistant',
            content: `✅ Added "${item}" to your shopping list!`,
          },
          action: { type: 'shoppingList', item },
          messageIds: { user: savedUserMsg.id, assistant: savedAssistantMsg.id },
        });
      }
    }

    // Check for timer command
    if (lastMessageLower.includes('timer') || lastMessageLower.includes('set time')) {
      const minutes = extractMinutes(lastMessage);
      if (minutes && minutes > 0) {
        const savedUserMsg = await prisma.chatMessage.create({
          data: { userId: auth.userId, role: 'user', content: lastMessage },
        });
        const savedAssistantMsg = await prisma.chatMessage.create({
          data: { userId: auth.userId, role: 'assistant', content: `⏱️ Timer started for ${minutes} minutes. You can use the cooking timer in the app!` },
        });
        return NextResponse.json({
          message: {
            role: 'assistant',
            content: `⏱️ Timer started for ${minutes} minutes. You can use the cooking timer in the app!`,
          },
          action: { type: 'timer', minutes },
          messageIds: { user: savedUserMsg.id, assistant: savedAssistantMsg.id },
        });
      }
    }

    // Check for recipe generation request
    if (lastMessageLower.includes('what can i cook') || lastMessageLower.includes('what can i make') || lastMessageLower.includes('i have') || lastMessageLower.includes('recommend')) {
      let ingredients = extractIngredients(lastMessage);
      // If no specific ingredients mentioned, use pantry
      if (ingredients.length === 0 && pantryIngredients.length > 0) {
        ingredients = [...pantryIngredients];
      }
      if (ingredients.length > 0) {
        const matchedRecipes = findRecipesFromIngredients(ingredients, pantryIngredients);
        if (matchedRecipes.length > 0) {
          let response = `Based on your pantry, here's what you can make:\n\n`;
          matchedRecipes.slice(0, 5).forEach((r, i) => {
            response += `${i + 1}. ${r.title} - ${r.matchPercentage}% ingredients available\n`;
            response += `   Missing: ${r.missing.slice(0, 3).join(', ')}${r.missing.length > 3 ? '...' : ''}\n\n`;
          });
          response += `\nWant full recipes for any of these? Just ask!`;
          const truncatedResponse = response.length > 200 ? response.substring(0, 200) + '...' : response;
          const savedUserMsg = await prisma.chatMessage.create({
            data: { userId: auth.userId, role: 'user', content: lastMessage },
          });
          const savedAssistantMsg = await prisma.chatMessage.create({
            data: { userId: auth.userId, role: 'assistant', content: truncatedResponse },
          });
          return NextResponse.json({
            message: { role: 'assistant', content: truncatedResponse },
            action: { type: 'recipeSuggestions', recipes: matchedRecipes.slice(0, 5) },
            messageIds: { user: savedUserMsg.id, assistant: savedAssistantMsg.id },
          });
        }
      }
    }

    // Use OpenAI if API key is available
    if (OPENAI_KEY) {
      try {
        const responseContent = await callOpenAI(messages, user, pantryIngredients, dietaryPrefs, healthGoals);
        const savedUserMsg = await prisma.chatMessage.create({
          data: { userId: auth.userId, role: 'user', content: lastMessage },
        });
        const truncatedContent = responseContent.length > 200 ? responseContent.substring(0, 200) + '...' : responseContent;
        const savedAssistantMsg = await prisma.chatMessage.create({
          data: { userId: auth.userId, role: 'assistant', content: truncatedContent },
        });
        return NextResponse.json({
          message: { role: 'assistant', content: truncatedContent },
          messageIds: { user: savedUserMsg.id, assistant: savedAssistantMsg.id },
        });
      } catch (aiError) {
        console.error('OpenAI error, falling back to keyword-based:', aiError);
      }
    }

    // Fallback to enhanced keyword-based responses
    const response = generateCookingResponse(lastMessage, pantryIngredients, dietaryPrefs);
    const truncatedResponse = response.length > 200 ? response.substring(0, 200) + '...' : response;
    const savedUserMsg = await prisma.chatMessage.create({
      data: { userId: auth.userId, role: 'user', content: lastMessage },
    });
    const savedAssistantMsg = await prisma.chatMessage.create({
      data: { userId: auth.userId, role: 'assistant', content: truncatedResponse },
    });
    return NextResponse.json({
      message: { role: 'assistant', content: truncatedResponse },
      messageIds: { user: savedUserMsg.id, assistant: savedAssistantMsg.id },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
}

function callOpenAI(messages: ChatMessage[], user: any, pantry: string[], prefs: string, goals: string): Promise<string> {
  const systemPrompt = `You are a helpful cooking assistant for a Smart Kitchen app.

User context:
- Pantry ingredients: ${pantry.join(', ') || 'None'}
- Dietary preferences: ${prefs || 'None'}
- Health goals: ${goals || 'None'}

Guidelines:
- If user mentions dietary preferences, filter suggestions accordingly
- If user has ingredients in their pantry, suggest recipes using those ingredients
- Be concise but informative
- Provide cooking times, temperatures, and steps
- If user asks to add something to their shopping list, tell them to use the command "add X to shopping list"
- If user asks for a timer, tell them to specify minutes like "set timer for 15 minutes"
- For recipe suggestions, mention what ingredients they have and what they're missing
- Keep responses under 300 words unless detailed instructions are needed`;

  const enrichedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: enrichedMessages,
      temperature: 0.7,
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(30000),
  })
    .then(res => res.json())
    .then(data => {
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
      throw new Error('No response from OpenAI');
    });
}

function extractItemFromMessage(message: string): string | null {
  const addPatterns = [
    /add\s+(?:to\s+my\s+)?shopping\s+list[:\s]*\s*(.+?)(?:\.|$)/i,
    /add\s+(.+?)\s+to\s+shopping/i,
    /add\s+(.+?)\s+in\s+shopping/i,
    /add\s+(.+?)\s+to\s+my\s+list/i,
    /add\s+(.+?)\s+grocery/i,
  ];
  for (const pattern of addPatterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1].trim().toLowerCase();
    }
  }
  return null;
}

function extractMinutes(message: string): number | null {
  const match = message.match(/(\d+)\s*minutes?/i);
  return match ? parseInt(match[1]) : null;
}

function normalizeIngredient(name: string): string {
  const hindiMap: Record<string, string> = {
    'aloo': 'potato',
    'alu': 'potato',
    'pyaaz': 'onion',
    'tamatar': 'tomato',
    'lahsun': 'garlic',
    'adrak': 'ginger',
    'dhaniya': 'coriander',
    'hara dhaniya': 'coriander',
    'mirch': 'chili',
    'lal mirch': 'chili',
    'haldi': 'turmeric',
    'jeera': 'cumin',
    'gil-e-khair': 'cinnamon',
    'dalchini': 'cinnamon',
    'laung': 'cloves',
    'tej patta': 'bay leaf',
    'namak': 'salt',
    'cheeni': 'sugar',
    'doodh': 'milk',
    'makhan': 'butter',
    'tel': 'oil',
    'ghee': 'ghee',
    'chicken': 'chicken',
    'murgi': 'chicken',
    'mutton': 'mutton',
    'gosht': 'mutton',
    'machli': 'fish',
    'anda': 'egg',
    'ande': 'eggs',
    'paneer': 'paneer',
    'chana': 'chickpeas',
    'dal': 'lentils',
    'chawal': 'rice',
    'atta': 'flour',
    'noodles': 'noodles',
    'pasta': 'pasta',
  };
  const lower = name.trim().toLowerCase();
  return hindiMap[lower] || lower;
}

function normalizeIngredientNames(ingredients: string[]): string[] {
  return ingredients.map(normalizeIngredient);
}

function extractIngredients(message: string): string[] {
  // Try "recommend/suggest dishes with X" or "what should I cook with X"
  const recommendPattern = /(?:recommend|suggest)\s+(?:dishes|recipes|meals|ideas)\s+(?:for\s+(?:today\s+)?(?:breakfast|lunch|dinner|snack)\s+)?with\s+(.+?)(?:\?|\.|$)/i;
  let match = message.match(recommendPattern);
  if (match) {
    const raw = match[1].trim();
    return normalizeIngredientNames(
      raw
        .split(/,\s*(?!\s*and\s+|\s*or\s+)|\s+and\s+|\s+or\s+/)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0)
    );
  }

  // Try "make me a recipe with eggs and spinach"
  const makePattern = /(?:make|give|create)\s+(?:me\s+)?(?:a\s+)?recipe\s+(?:with|using)\s+(.+?)(?:\?|\.|$)/i;
  match = message.match(makePattern);
  if (match) {
    const raw = match[1].trim();
    return normalizeIngredientNames(
      raw
        .split(/,\s*(?!\s*and\s+|\s*or\s+)|\s+and\s+|\s+or\s+/)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0)
    );
  }

  // Try "I have X, Y, Z"
  const havePattern = /i have\s+(.+?)(?:\s*that\s+can|\s*for\s+cooking|\s*to cook)/i;
  const haveMatch = message.match(havePattern);
  if (haveMatch) {
    const raw = haveMatch[1].trim();
    return normalizeIngredientNames(
      raw
        .split(/,\s*(?!\s*and\s+|\s*or\s+)|\s+and\s+|\s+or\s+/)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0)
    );
  }

  // Try "What can I cook with X and Y?"
  const whatPattern = /what can i (?:cook|make)\s+with\s+(.+?)(?:\?|\.|$)/i;
  const whatMatch = message.match(whatPattern);
  if (whatMatch) {
    const raw = whatMatch[1].trim();
    return normalizeIngredientNames(
      raw
        .split(/,\s*(?!\s*and\s+|\s*or\s+)|\s+and\s+|\s+or\s+/)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0)
    );
  }

  // Fallback: extract ingredients after "with" keyword anywhere in the message
  const withPattern = /with\s+(.+?)(?:\?|\.|$)/i;
  const withMatch = message.match(withPattern);
  if (withMatch) {
    const raw = withMatch[1].trim();
    return normalizeIngredientNames(
      raw
        .split(/,\s*(?!\s*and\s+|\s*or\s+)|\s+and\s+|\s+or\s+/)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0)
    );
  }

  return [];
}

interface MatchedRecipe {
  title: string;
  matchPercentage: number;
  missing: string[];
  combinedScore: number;
}

function findRecipesFromIngredients(ingredients: string[], pantry: string[]): MatchedRecipe[] {
  const allRecipes = [
    { title: 'Chicken Stir Fry', ingredients: ['chicken', 'rice', 'onion', 'tomato', 'garlic', 'soy sauce'], missing: [] as string[] },
    { title: 'Pasta Bolognese', ingredients: ['pasta', 'beef', 'tomato', 'garlic', 'cheese'], missing: [] as string[] },
    { title: 'Egg Fried Rice', ingredients: ['rice', 'eggs', 'onion', 'garlic', 'soy sauce'], missing: [] as string[] },
    { title: 'Chicken Curry', ingredients: ['chicken', 'onion', 'tomato', 'garlic', 'rice', 'spices'], missing: [] as string[] },
    { title: 'Pasta Aglio e Olio', ingredients: ['pasta', 'garlic', 'olive oil', 'cheese'], missing: [] as string[] },
    { title: 'Vegetable Stir Fry', ingredients: ['onion', 'tomato', 'garlic', 'rice', 'soy sauce'], missing: [] as string[] },
    { title: 'Aloo Paratha', ingredients: ['potato', 'onion', 'flour', 'spices', 'butter'], missing: [] as string[] },
    { title: 'Aloo Omelette', ingredients: ['potato', 'eggs', 'onion', 'spices'], missing: [] as string[] },
    { title: 'Potato Toast', ingredients: ['potato', 'onion', 'eggs', 'cheese'], missing: [] as string[] },
    { title: 'Vegetable Omelette', ingredients: ['eggs', 'onion', 'tomato', 'cheese'], missing: [] as string[] },
    { title: 'Chicken Rice Bowl', ingredients: ['chicken', 'rice', 'onion', 'garlic'], missing: [] as string[] },
    { title: 'Tomato Soup', ingredients: ['tomato', 'onion', 'garlic', 'milk'], missing: [] as string[] },
    { title: 'Garlic Bread', ingredients: ['flour', 'butter', 'garlic'], missing: [] as string[] },
    { title: 'Potato Hash', ingredients: ['potato', 'onion', 'eggs', 'oil'], missing: [] as string[] },
    { title: 'Spaghetti Marinara', ingredients: ['pasta', 'tomato', 'garlic', 'olive oil'], missing: [] as string[] },
    { title: 'Bruschetta', ingredients: ['bread', 'tomato', 'garlic', 'basil'], missing: [] as string[] },
    { title: 'Tomato Pasta', ingredients: ['pasta', 'tomato', 'garlic', 'olive oil', 'cheese'], missing: [] as string[] },
    { title: 'Roasted Garlic Tomato Soup', ingredients: ['tomato', 'garlic', 'onion', 'cream'], missing: [] as string[] },
    { title: 'Garlic Butter Shrimp', ingredients: ['shrimp', 'garlic', 'butter', 'lemon'], missing: [] as string[] },
    { title: 'Tomato Rice', ingredients: ['rice', 'tomato', 'onion', 'garlic'], missing: [] as string[] },
    { title: 'Garlic Mushrooms', ingredients: ['mushrooms', 'garlic', 'butter', 'herbs'], missing: [] as string[] },
    { title: 'Tomato Bruschetta Pasta', ingredients: ['pasta', 'tomato', 'garlic', 'basil', 'olive oil'], missing: [] as string[] },
    { title: 'Simple Tomato Pasta', ingredients: ['pasta', 'tomato', 'garlic'], missing: [] as string[] },
  ];

  const allAvailable = [...new Set([...ingredients, ...pantry])];

  // Find main ingredients (the star of the dish)
  const MAIN_INGREDIENTS = ['chicken', 'beef', 'potato', 'paneer', 'eggs', 'rice', 'pasta', 'shrimp', 'fish', 'tofu', 'lentils', 'okra', 'bhindi', 'lady finger', 'carrot', 'cauliflower', 'spinach', 'beans', 'chickpeas', 'lentils', 'mushroom', 'bell pepper', 'capsicum'];
  const mainInPantry = allAvailable.filter(a => MAIN_INGREDIENTS.some(m => a.includes(m)));
  const baseInPantry = allAvailable.filter(a => !MAIN_INGREDIENTS.some(m => a.includes(m)) && ['onion', 'tomato', 'garlic', 'ginger', 'carrot', 'potato', 'pea'].some(b => a.includes(b)));

  const matched = allRecipes
    .map(recipe => {
      const matched = recipe.ingredients.filter(ing =>
        allAvailable.some(p => p.includes(ing) || ing.includes(p))
      );
      const missing = recipe.ingredients.filter(ing =>
        !allAvailable.some(p => p.includes(ing) || ing.includes(p))
      );
      const matchPercentage = recipe.ingredients.length > 0
        ? Math.round((matched.length / recipe.ingredients.length) * 100)
        : 0;

      const userIngredientCount = matched.filter(m => ingredients.includes(m) || pantry.includes(m)).length;
      const combinedScore = userIngredientCount * 100 + matchPercentage;

      return { ...recipe, matchPercentage, missing, combinedScore };
    })
    .filter(r => r.matchPercentage > 0)
    .sort((a, b) => b.combinedScore - a.combinedScore);

  // Generate dynamic suggestions from user's ingredients (not limited to database)
  const generated: MatchedRecipe[] = [];

  if (mainInPantry.length > 0) {
    for (const main of mainInPantry) {
      const mainCap = main.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      // Bhindi Masala style
      if (main.includes('bhindi') || main.includes('okra') || main.includes('lady finger')) {
        generated.push({ title: `Bhindi Masala`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        generated.push({ title: `Bhindi Fry`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        generated.push({ title: `Crispy Bhindi Onion Fry`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        generated.push({ title: `Stuffed Bhindi Curry`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        generated.push({ title: `Bhindi Onion Tomato Curry`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        if (pantry.some(p => p.includes('yogurt') || p.includes('curd'))) {
          generated.push({ title: `Dahi Bhindi`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        }
        if (pantry.some(p => p.includes('besan') || p.includes('gram flour'))) {
          generated.push({ title: `Besan Bhindi Curry`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        }
        generated.push({ title: `Andhra Style Bhindi Vepudu`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        if (pantry.some(p => p.includes('coconut'))) {
          generated.push({ title: `Bhindi Coconut Curry`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        }
      }
      // Aloo / potato
      else if (main.includes('potato') || main.includes('aloo')) {
        generated.push({ title: `Aloo Masala`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        generated.push({ title: `Aloo Fry`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        generated.push({ title: `Aloo Curry`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        if (baseInPantry.some(b => b.includes('cauliflower') || b.includes('gobi'))) {
          generated.push({ title: `Aloo Gobi`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        }
        if (baseInPantry.some(b => b.includes('pea') || b.includes('matar'))) {
          generated.push({ title: `Aloo Matar`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        }
        if (pantry.some(p => p.includes('spinach') || p.includes('palak'))) {
          generated.push({ title: `Aloo Palak`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        }
      }
      // General main ingredient
      else {
        generated.push({ title: `${mainCap} Masala`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        generated.push({ title: `${mainCap} Curry`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        generated.push({ title: `${mainCap} Fry`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        generated.push({ title: `${mainCap} Bhaji`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        if (pantry.some(p => p.includes('yogurt') || p.includes('curd'))) {
          generated.push({ title: `Dahi ${mainCap}`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        }
        if (pantry.some(p => p.includes('coconut'))) {
          generated.push({ title: `${mainCap} Coconut Curry`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        }
        if (pantry.some(p => p.includes('besan') || p.includes('gram flour'))) {
          generated.push({ title: `Besan ${mainCap} Curry`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        }
        generated.push({ title: `${mainCap} Onion Tomato Curry`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
        generated.push({ title: `Stuffed ${mainCap} Curry`, matchPercentage: 100, missing: [], combinedScore: 300 + 100 });
      }
    }
  }

  // If user only has base ingredients (e.g., carrot + onion)
  if (mainInPantry.length === 0 && baseInPantry.length >= 2) {
    const b1 = baseInPantry[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const b2 = baseInPantry[1].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    generated.push({ title: `${b1} ${b2} Curry`, matchPercentage: 100, missing: [], combinedScore: 200 + 100 });
    generated.push({ title: `${b1} ${b2} Stir Fry`, matchPercentage: 100, missing: [], combinedScore: 200 + 100 });
    generated.push({ title: `${b1} ${b2} Sabzi`, matchPercentage: 100, missing: [], combinedScore: 200 + 100 });
  }

  // If user has only 1 base ingredient
  if (mainInPantry.length === 0 && baseInPantry.length === 1) {
    const b1 = baseInPantry[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    generated.push({ title: `Simple ${b1} Curry`, matchPercentage: 100, missing: [], combinedScore: 100 + 100 });
    generated.push({ title: `${b1} Fry`, matchPercentage: 100, missing: [], combinedScore: 100 + 100 });
  }

  // Merge: database recipes first, then generated
  const allMatched = [...matched, ...generated];

  // Deduplicate by title
  const seen = new Set<string>();
  return allMatched.filter(r => {
    if (seen.has(r.title)) return false;
    seen.add(r.title);
    return true;
  });
}

function generateRecipeFromIngredients(ingredients: string[]): string {
  let recipe = `🍳 Here's a recipe idea using your ingredients:\n\n`;
  recipe += `**Main Dish**\n`;
  recipe += `Combine your ${ingredients.slice(0, 4).join(', ')} in a pan.\n`;
  recipe += `Season with salt, pepper, and your favorite spices.\n`;
  recipe += `Cook over medium heat for 15-20 minutes.\n\n`;
  recipe += `**Tips:**\n`;
  recipe += `- Cut everything into uniform pieces for even cooking\n`;
  recipe += `- Season in layers throughout cooking\n`;
  recipe += `- Taste and adjust seasoning before serving\n\n`;
  recipe += `Want a more specific recipe? Tell me the exact quantities you have!`;
  return recipe;
}

function generateCookingResponse(input: string, pantry: string[], prefs: string): string {
  // Pantry-aware suggestions
  if (input.includes('i have') || input.includes('what can i cook') || input.includes('what can i make')) {
    const pantryStr = pantry.join(', ');
    if (pantry.length > 0) {
      return `You have these ingredients: ${pantryStr}.\n\nTry asking:\n• "What can I cook with these?"\n• "Cook chicken"\n• "Cook rice"\n• "Cooking tips"\n\nOr just describe what you'd like to make!`;
    }
  }

  // Dietary preference awareness
  if (prefs.includes('vegetarian') || prefs.includes('vegan')) {
    if (input.includes('chicken') || input.includes('beef') || input.includes('pork') || input.includes('fish')) {
      return `Since you're ${prefs}, I'd suggest plant-based alternatives:\n\n• Chicken → Tofu, tempeh, or chickpeas\n• Beef → Lentils, mushrooms, or beans\n• Pork → Jackfruit or seitan\n\nWant vegetarian recipes instead?`;
    }
  }

  // Health goal awareness
  if (prefs.includes('low-carb') || prefs.includes('keto')) {
    if (input.includes('rice') || input.includes('pasta') || input.includes('bread')) {
      return `For your ${prefs} diet, try these swaps:\n\n• Rice → Cauliflower rice\n• Pasta → Zucchini noodles or shirataki\n• Bread → Cloud bread or lettuce wraps\n\nThese keep the meal satisfying while cutting carbs!`;
    }
  }

  // Cooking times
  if (input.includes('boil egg') || input.includes('boiling egg')) {
    if (input.includes('soft')) return 'For soft-boiled eggs: boil for 4-6 minutes. The yolk will be runny. For medium-boiled: 7-8 minutes (jammy yolk). For hard-boiled: 9-12 minutes (fully set yolk). After boiling, transfer to ice water for 2 minutes to stop cooking and make peeling easier.';
    if (input.includes('hard')) return 'For hard-boiled eggs: boil for 9-12 minutes. After boiling, transfer to ice water for 2 minutes to stop cooking and make peeling easier. To peel, gently crack the shell all over and peel under running water.';
    return 'For boiling eggs: Bring water to a boil, then gently add eggs. Soft-boiled: 4-6 minutes. Medium-boiled: 7-8 minutes. Hard-boiled: 9-12 minutes. Transfer to ice water after cooking for easier peeling.';
  }

  // Chicken cooking
  if (input.includes('cook chicken') || input.includes('chicken cook')) {
    if (input.includes('grill')) return 'To grill chicken: Marinate for at least 30 minutes. Grill over medium-high heat for 6-7 minutes per side for breast pieces, or 10-12 minutes per side for thighs. Internal temperature should reach 165°F (74°C). Let rest for 5 minutes before serving.';
    if (input.includes('fry')) return 'To fry chicken: Season with salt, pepper, and your preferred spices. Heat oil to 350°F (175°C). Fry breast pieces for 6-7 minutes per side, thighs for 10-12 minutes per side until golden brown and internal temp reaches 165°F (74°C).';
    if (input.includes('bake') || input.includes('oven') || input.includes('roast')) return 'To bake chicken: Preheat oven to 400°F (200°C). Season chicken with oil, salt, pepper, and spices. Place in baking dish and bake for 35-45 minutes for breasts, 40-50 minutes for thighs. Internal temp should reach 165°F (74°C).';
    return 'To cook chicken: Ensure internal temperature reaches 165°F (74°C). Methods: Grilling (6-7 min/side for breasts), Frying (6-7 min/side in hot oil), Baking (35-45 min at 400°F), or Boiling (15-20 min in simmering water). Always let chicken rest 5 minutes before cutting.';
  }

  // Rice cooking
  if (input.includes('cook rice') || input.includes('rice cook')) {
    return 'To cook rice: Rinse 1 cup of rice under cold water. Add to pot with 2 cups of water (1:2 ratio for white rice, 1:2.25 for brown rice). Bring to boil, then reduce heat to low, cover, and simmer for 15-18 minutes (white) or 40-45 minutes (brown). Remove from heat and let stand covered for 5 minutes. Fluff with a fork before serving.';
  }

  // Substitutions
    if (input.includes('substitut') || input.includes('subsitute') || input.includes('replace') || input.includes('instead of')) {
    if (input.includes('sugar')) return 'Sugar substitutes: Honey (3/4 cup per 1 cup sugar, reduce liquid), Maple syrup (3/4 cup per 1 cup sugar), Coconut sugar (1:1 ratio, adds caramel flavor), Stevia (1 tsp stevia per 1 cup sugar), or Applesauce (1/2 cup per 1 cup sugar in baking).';
    if (input.includes('butter')) return 'Butter substitutes: Coconut oil (1:1 ratio), Olive oil (use 3/4 cup per 1 cup butter), Vegetable oil (1:1 ratio), Greek yogurt (1:1 ratio, adds moisture), or Applesauce (1:1 ratio for baking, reduces fat).';
    if (input.includes('flour')) return 'Flour substitutes: Almond flour (1:1 ratio, gluten-free), Oat flour (1:1 ratio, blend oats), Coconut flour (use 1/4 cup per 1 cup all-purpose flour, absorbs more liquid), or Rice flour (1:1 ratio, gluten-free).';
    if (input.includes('milk')) return 'Milk substitutes: Almond milk (1:1 ratio), Oat milk (1:1 ratio, creamier), Coconut milk (1:1 ratio, adds coconut flavor), Soy milk (1:1 ratio, high protein), or Water with butter (for cooking).';
    return 'Common substitutions:\n\n• Sugar → Honey, maple syrup, coconut sugar, or stevia\n• Butter → Coconut oil, olive oil, or Greek yogurt\n• Flour → Almond flour, oat flour, or rice flour\n• Milk → Almond, oat, or coconut milk\n• Eggs → 1/4 cup applesauce per egg, or flax egg (1 tbsp ground flax + 3 tbsp water per egg)\n\nLet me know what specific ingredient you want to substitute!';
  }

  // Pasta
  if (input.includes('cook pasta') || input.includes('pasta cook') || input.includes('boil pasta')) {
    return 'To cook pasta: Bring a large pot of heavily salted water to boil (use about 1-2 tablespoons salt per quart). Add pasta and stir immediately. Cook according to package directions, usually 8-12 minutes. Taste test 1 minute before package time for al dente. Reserve 1 cup pasta water before draining. Drain and serve immediately with your sauce.';
  }

  // Onion
  if (input.includes('onion') && (input.includes('crying') || input.includes('cry') || input.includes('tear'))) {
    return 'To prevent crying while cutting onions: Chill onions in the fridge for 30 minutes before cutting. Use a sharp knife (dull knives crush more cells). Cut under running water or in a bowl of water. Soak sliced onions in ice water for 10 minutes. Or use the tip of your tongue to push against the roof of your mouth - it reduces the effect of the gas!';
  }

  // General cooking tips
  if (input.includes('tip') || input.includes('trick') || input.includes('hack')) {
    return 'Top cooking tips:\n\n1. Always season in layers throughout cooking, not just at the end\n2. Let meat rest after cooking to retain juices\n3. Preheat your pan before adding oil\n4. Don\'t overcrowd the pan - cook in batches\n5. Taste as you go and adjust seasoning\n6. Use a meat thermometer for perfect doneness\n7. Let garlic cook until golden, not brown (it burns easily)\n8. Add acid (lemon/vinegar) at the end to brighten flavors\n9. Salt your pasta water generously\n10. Keep your knives sharp for safer, easier cutting';
  }

  // Baking
  if (input.includes('bake') || input.includes('baking')) {
    return 'General baking tips:\n\n1. Preheat oven fully before baking\n2. Measure ingredients accurately (use kitchen scale for best results)\n3. Use room temperature ingredients unless specified otherwise\n4. Don\'t open oven door during first 3/4 of baking time\n5. Check doneness with a toothpick - it should come out clean\n6. Let baked goods cool in pan for 5-10 minutes before removing\n7. Understand your oven - use an oven thermometer to verify temperature\n8. Rotate pans halfway through baking for even cooking';
  }

  // Spices
  if (input.includes('spice') || input.includes('season')) {
    return 'Essential spices to keep in your kitchen:\n\n1. Salt (kosher or sea salt)\n2. Black pepper\n3. Garlic powder\n4. Paprika (smoked is great)\n5. Cumin\n6. Cinnamon\n7. Chili powder\n8. Oregano\n9. Turmeric\n10. Red pepper flakes\n\nPairing basics:\n• Italian: oregano, basil, garlic, red pepper\n• Indian: cumin, coriander, turmeric, garam masala\n• Mexican: cumin, chili powder, paprika, oregano\n• Asian: ginger, garlic, five-spice, sesame seeds';
  }

  // Timer commands
  if (input.includes('timer') || input.includes('set time')) {
    const minutes = extractMinutes(input);
    if (minutes) {
      return `⏱️ Timer set for ${minutes} minutes! You can use the cooking timer feature in the app to track this.`;
    }
    return 'To set a timer, say something like "set timer for 15 minutes" or "start timer for 10 minutes". I\'ll help you track cooking times!';
  }

  // Shopping list commands
  if (input.includes('add') && (input.includes('shopping') || input.includes('grocery'))) {
    const item = extractItemFromMessage(input);
    if (item) {
      return `✅ Added "${item}" to your shopping list! You can view it at /shopping-list.`;
    }
    return 'To add something to your shopping list, say "add milk to shopping list" or "add eggs to my shopping list".';
  }

  // Default response
  return `I can help with cooking questions! Try asking me about:\n\n• 🍳 How to cook specific foods (chicken, rice, pasta, eggs)\n• 🔄 Ingredient substitutions (sugar, butter, flour, milk)\n• 💡 Cooking tips and techniques\n• 🧁 Baking advice\n• 🌶️ Spice combinations\n• 🛒 "Add X to shopping list" - adds items to your shopping list\n• ⏱️ "Set timer for X minutes" - starts a cooking timer\n• 🥘 "I have X, Y, Z" - suggests recipes based on your pantry\n\nWhat would you like to know?`;
}

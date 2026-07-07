import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';
  const mealType = searchParams.get('mealType');
  const cuisine = searchParams.get('cuisine');
  const limit = parseInt(searchParams.get('limit') || '12');

  const auth = await getServerAuth();

  // Build base filters (case-insensitive done in JS since Prisma v6 removed mode: insensitive)
  let allRecipes = await prisma.recipe.findMany({
    include: { recipeIngredients: true },
    orderBy: { createdAt: 'desc' },
  });

  // Case-insensitive search in JavaScript
  if (query) {
    const q = query.toLowerCase();
    allRecipes = allRecipes.filter(r =>
      r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    );
  }
  if (mealType && mealType !== 'All') {
    allRecipes = allRecipes.filter(r => r.mealType.toLowerCase() === mealType.toLowerCase());
  }
  if (cuisine && cuisine !== 'All') {
    allRecipes = allRecipes.filter(r => r.cuisine.toLowerCase() === cuisine.toLowerCase());
  }

  const recipes = allRecipes.slice(0, limit);

  // Get pantry matches if user is logged in
  let pantryMatches: any[] = [];
  if (auth) {
    const user = await prisma.user.findUnique({
      where: { email: auth.email },
      include: { ingredients: true },
    });
    if (user && user.ingredients.length > 0) {
      const pantryIngredients = user.ingredients.map(i => i.name.toLowerCase().trim());
      const pantrySet = new Set(pantryIngredients.map(p => getNormalizedAlias(p)));

      const pantryMatchRecipes = allRecipes.map((recipe: any) => {
        const recipeIngredientNames = recipe.recipeIngredients.map((ri: any) => ri.ingredient.toLowerCase().trim());
        const pantryMatchCount = new Set<string>();
        recipeIngredientNames.forEach((riName: string) => {
          const pantryMatch = pantryIngredients.find((pi) => matchesIngredient(riName, pi));
          if (pantryMatch) pantryMatchCount.add(getNormalizedAlias(pantryMatch));
        });

        let mainIngredientInPantry = false;
        recipeIngredientNames.forEach((riName: string) => {
          if (isMainIngredient(riName)) {
            const pantryMatch = pantryIngredients.find((pi) => matchesIngredient(riName, pi));
            if (pantryMatch) mainIngredientInPantry = true;
          }
        });

        let totalWeight = 0;
        let matchedWeight = 0;
        recipeIngredientNames.forEach((riName: string) => {
          if (isMainIngredient(riName)) totalWeight += 5;
          else if (BASE_INGREDIENTS.some(b => riName.includes(b))) totalWeight += 2;
          else totalWeight += 1;

          const match = pantryIngredients.find((pi) => matchesIngredient(riName, pi));
          if (match) {
            if (isMainIngredient(riName)) matchedWeight += 5;
            else if (BASE_INGREDIENTS.some(b => riName.includes(b))) matchedWeight += 2;
            else matchedWeight += 1;
          }
        });
        const matchPercentage = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;

        const mainIngredientBoost = mainIngredientInPantry ? 1000 : 0;
        const missingPenalty = (recipeIngredientNames.length - pantryMatchCount.size) * 50;
        const combinedScore = mainIngredientBoost + matchPercentage - missingPenalty;

        const tier = combinedScore > 900 ? 1 : combinedScore > 500 ? 2 : combinedScore > 0 ? 3 : 4;

        return {
          ...recipe,
          matchPercentage,
          mainIngredientInPantry,
          matchedPantryCount: pantryMatchCount.size,
          combinedScore,
          tier,
        };
      }).filter((r: any) => r.matchedPantryCount > 0 && r.mainIngredientInPantry)
        .sort((a: any, b: any) => b.combinedScore - a.combinedScore || b.matchPercentage - a.matchPercentage);

      pantryMatches = pantryMatchRecipes.slice(0, 5);
    }
  }

  return NextResponse.json({
    recipes,
    pantryMatches,
    youtubeUrl: query ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' recipe')}` : null,
  });
}

// --- Inline matching functions (copied from match/route.ts for simplicity) ---

const MAIN_INGREDIENTS = [
  'chicken', 'beef', 'pork', 'fish', 'shrimp', 'tofu', 'lentils',
  'salmon', 'turkey', 'lamb', 'paneer', 'chickpeas', 'beans',
  'kidney bean', 'green bean', 'black bean', 'rajma', 'chana',
  'tuna', 'mutton', 'prawn', 'prawns', 'crab', 'lobster', 'duck',
  'veal', 'sausage', 'bacon', 'ham', 'eggs',
  'potato', 'aloo', 'alu', 'okra', 'lady finger', 'bhindi',
  'eggplant', 'aubergine', 'cauliflower', 'gobi', 'spinach', 'palak',
  'cabbage', 'carrot', 'gajar', 'mushroom', 'peas', 'matar',
  'bell pepper', 'capsicum', 'corn', 'sweet potato', 'shakarkandi', 'urulai',
  'bread', 'rice', 'pasta', 'noodles', 'flour',
  'milk', 'cream', 'cheese', 'yogurt', 'curd', 'butter',
];

const BASE_INGREDIENTS = [
  'onion', 'tomato', 'garlic', 'ginger', 'celery', 'leek',
  'shallot', 'scallion', 'spring onion', 'radish', 'beet',
  'pumpkin', 'squash', 'yam', 'artichoke', 'avocado', 'coconut',
  'peanut', 'almond', 'walnut', 'cashew', 'pistachio', 'hazelnut',
  'pecan', 'macadamia', 'pine nut', 'olive', 'capers',
];

const INGREDIENT_ALIASES: Record<string, string[]> = {
  'potato': ['aloo', 'alu', 'potato', 'sweet potato', 'shakarkandi', 'urulai'],
  'onion': ['pyaaz', 'piaz', 'onion', 'red onion', 'white onion', 'brown onion', 'shallot', 'shallots'],
  'tomato': ['tamatar', 'tomato', 'tomatoes', 'roma tomato', 'cherry tomato'],
  'paneer': ['paneer', 'cottage cheese', 'chhana', 'neer paneer'],
  'rice': ['bhat', 'chawal', 'rice', 'basmati rice', 'brown rice', 'samba rice', 'jeera rice'],
  'chicken': ['murgh', 'chicken', 'chicken breast', 'chicken thigh', 'chicken pieces', 'chicken leg'],
  'egg': ['anda', 'eggs', 'egg', 'egg white', 'egg yolk'],
  'milk': ['doodh', 'milk', 'whole milk', 'skim milk', 'condensed milk', 'evaporated milk'],
  'cream': ['cream', 'fresh cream', 'malai', 'heavy cream', 'whipping cream', 'coconut cream'],
  'butter': ['makhan', 'butter', 'unsalted butter', 'salted butter', 'ghee'],
  'ghee': ['ghee', 'clarified butter', 'desi ghee'],
  'oil': ['tel', 'oil', 'cooking oil', 'vegetable oil', 'sunflower oil', 'olive oil', 'mustard oil', 'coconut oil'],
  'flour': ['maida', 'flour', 'all-purpose flour', 'plain flour', 'atta'],
  'wheat flour': ['atta', 'wheat flour', 'whole wheat flour'],
  'sugar': ['cheeni', 'sugar', 'white sugar', 'brown sugar', 'jaggery', 'gur'],
  'salt': ['namak', 'salt', 'sea salt', 'pink salt', 'kosher salt'],
  'water': ['paani', 'water', 'spring water', 'mineral water'],
  'yogurt': ['dahi', 'yogurt', 'curd', 'greek yogurt'],
  'chickpea': ['chana', 'chickpea', 'garbanzo bean', 'kabuli chana', 'kala chana', 'chana dal'],
  'lentil': ['dal', 'lentil', 'moong dal', 'masoor dal', 'toor dal', 'urad dal', 'green gram'],
  'cumin': ['jeera', 'cumin', 'cumin seeds', 'jeera seeds', 'jeera powder'],
  'coriander': ['dhaniya', 'coriander', 'coriander powder', 'dhaniya powder'],
  'turmeric': ['haldi', 'turmeric', 'turmeric powder', 'haldi powder'],
  'chili': ['mirch', 'chili', 'chilli', 'red chili', 'green chili', 'serrano pepper', 'chili flakes'],
  'pepper': ['kali mirch', 'pepper', 'black pepper', 'white pepper', 'peppercorns'],
  'cinnamon': ['dalchini', 'cinnamon', 'cinnamon stick', 'cinnamon powder'],
  'cardamom': ['elaichi', 'cardamom', 'green cardamom', 'black cardamom'],
  'cloves': ['laung', 'cloves', 'clove'],
  'bay leaf': ['tej patta', 'bay leaf', 'tejpatta'],
  'mustard seed': ['rai', 'sarson', 'mustard seed', 'mustard seeds', 'rai ke beej'],
  'fenugreek': ['methi', 'fenugreek', 'fenugreek seeds', 'methi dana', 'kasuri methi'],
  'fennel': ['saunf', 'fennel', 'fennel seeds', 'saunf seeds'],
  'asafetida': ['hing', 'asafetida', 'asafoetida'],
  'coconut': ['nariyal', 'coconut', 'fresh coconut', 'desiccated coconut', 'coconut milk', 'coconut cream'],
  'cashew': ['kaju', 'cashew', 'cashew nuts', 'cashew paste'],
  'almond': ['badam', 'almond', 'almonds', 'almond paste'],
  'pistachio': ['pista', 'pistachio', 'pistachio nuts'],
  'raisin': ['kishmish', 'raisin', 'raisins', 'kishmish chhana'],
  'peas': ['matar', 'peas', 'green peas', 'frozen peas'],
  'carrot': ['gajar', 'carrot', 'carrots'],
  'cauliflower': ['gobi', 'cauliflower', 'florets'],
  'okra': ['bhindi', 'bhinda', 'okra', 'lady finger', 'ladyfingers'],
  'spinach': ['palak', 'spinach', 'spinach leaves', 'palak leaves'],
  'mint': ['pudina', 'mint', 'fresh mint', 'mint leaves'],
  'coriander leaves': ['dhaniya patta', 'coriander leaves', 'cilantro', 'fresh coriander', 'kothimeer'],
  'curry leaves': ['kadi patta', 'curry leaves', 'kadhipatta'],
  'tamarind': ['imli', 'tamarind', 'tamarind paste', 'imli paste'],
  'soy sauce': ['soya sauce', 'soy sauce'],
  'tomato sauce': ['ketchup', 'tomato sauce', 'tomato ketchup'],
  'cheese': ['cheese', 'mozzarella', 'cheddar', 'parmesan', 'cream cheese'],
  'flour tortilla': ['tortilla', 'flour tortilla', 'roti', 'chapati', 'phulka', 'paratha', 'naan', 'puri'],
  'pita': ['pita', 'pita bread', 'pitta'],
  'bread': ['bread', 'slice', 'sliced bread', 'bread slice', 'toast', 'white bread', 'brown bread'],
  'pasta': ['pasta', 'spaghetti', 'penne', 'macaroni', 'fusilli', 'rigatoni', 'linguine', 'fettuccine', 'noodles'],
  'noodle': ['noodle', 'noodles', 'ramen', 'soba', 'udon', 'vermicelli', 'seviyan', 'savaiyan'],
  'yam': ['yam', 'sweet potato', 'shakarkandi', 'urulai'],
  'mushroom': ['mushroom', 'mushrooms', 'kapoor mushroom', 'button mushroom'],
  'bell pepper': ['capsicum', 'bell pepper', 'shimla mirch', 'red capsicum', 'green capsicum', 'yellow capsicum', 'orange capsicum'],
  'beans': ['beans', 'green beans', 'green bean', 'kidney bean', 'rajma', 'kidney beans', 'green beans', 'string beans', 'string bean'],
  'kidney bean': ['rajma', 'kidney bean', 'kidney beans', 'red kidney bean', 'red kidney beans'],
  'green bean': ['green beans', 'green bean', 'string beans', 'string bean', 'beans', 'French beans', 'French bean'],
  'black bean': ['black beans', 'black bean', 'urad dal'],
  'chickpeas': ['chickpeas', 'chickpea', 'chana', 'garbanzo', 'garbanzo beans'],
  'chicken breast': ['chicken breast', 'chicken breast boneless', 'boneless chicken breast'],
  'chicken thigh': ['chicken thigh', 'chicken thighs', 'chicken thigh boneless'],
  'green chili': ['green chili', 'green chilli', 'green chilies', 'green chillies', 'hara mirch'],
  'garlic': ['garlic', 'lehsun', 'garlic cloves', 'crushed garlic', 'minced garlic', 'garlic paste'],
  'ginger': ['ginger', 'adrak', 'fresh ginger', 'ginger paste', 'grated ginger'],
  'tomato puree': ['tomato puree', 'tomato pure', 'tomato pulp'],
  'cream cheese': ['cream cheese', 'cream cheese spread'],
  'all purpose flour': ['all purpose flour', 'maida', 'refined flour', 'plain flour'],
  'gram flour': ['gram flour', 'besan', 'besan flour', 'chickpea flour'],
  'corn flour': ['corn flour', 'cornstarch', 'corn starch', 'cornflour'],
  'chili powder': ['chili powder', 'red chili powder', 'mirch powder', 'lal mirch powder'],
  'garam masala': ['garam masala', 'garam masala powder'],
  'kashmiri chili': ['kashmiri chili', 'kashmiri chili powder', 'kashmiri mirch'],
  'kadai masala': ['kadai masala', 'kadai masala powder'],
  'biriyani masala': ['biryani masala', 'biriyani masala', 'biryani masala powder'],
  'shawarma spice': ['shawarma spice', 'shawarma masala', 'shawarma seasoning'],
  'chicken broth': ['chicken broth', 'chicken stock', 'chicken stock'],
  'chicken stock': ['chicken stock', 'chicken broth'],
};

function normalize(str: string): string {
  return str.toLowerCase().trim();
}

function getNormalizedAlias(ingredient: string): string {
  const lower = normalize(ingredient);
  for (const [canonical, aliases] of Object.entries(INGREDIENT_ALIASES)) {
    for (const alias of aliases) {
      if (lower === alias) return canonical;
    }
  }
  return lower;
}

function isMainIngredient(ingredient: string): boolean {
  const lower = ingredient.toLowerCase();
  return MAIN_INGREDIENTS.some(m => lower.includes(m));
}

function matchesIngredient(recipeIng: string, pantryIng: string): boolean {
  const recipeNorm = getNormalizedAlias(recipeIng);
  const pantryNorm = getNormalizedAlias(pantryIng);

  if (recipeNorm === pantryNorm) return true;

  const recipeCanonical = getNormalizedAlias(recipeIng);
  const pantryCanonical = getNormalizedAlias(pantryIng);
  if (recipeCanonical === pantryCanonical) return true;

  if (pantryNorm.includes(recipeNorm) || recipeNorm.includes(pantryNorm)) {
    const shorter = pantryNorm.length < recipeNorm.length ? pantryNorm : recipeNorm;
    const longer = pantryNorm.length < recipeNorm.length ? recipeNorm : pantryNorm;
    if (shorter.length >= 3) {
      const shorterWords = shorter.split(/\s+/);
      const longerWords = longer.split(/\s+/);
      const allWordsMatch = shorterWords.length === longerWords.length && shorterWords.every(sw => longerWords.some(lw => lw === sw));
      if (allWordsMatch) return true;
    }
  }

  const dist = levenshtein(recipeNorm, pantryNorm);
  const maxLen = Math.max(recipeNorm.length, pantryNorm.length);
  if (maxLen === 0) return true;
  if (dist / maxLen <= 0.4) return true;

  const recipeWords = recipeNorm.split(/\s+/);
  const pantryWords = pantryNorm.split(/\s+/);
  if (recipeWords.length > 0 && pantryWords.length > 0) {
    let wordMatches = 0;
    for (const rw of recipeWords) {
      for (const pw of pantryWords) {
        if (rw === pw || levenshtein(rw, pw) / Math.max(rw.length, pw.length) <= 0.5) {
          wordMatches++;
          break;
        }
      }
    }
    if (wordMatches >= Math.ceil(recipeWords.length * 0.5)) return true;
  }

  return false;
}

function levenshtein(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= lenA; i++) matrix[i] = [i];
  for (let j = 0; j <= lenB; j++) matrix[0][j] = j;
  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[lenA][lenB];
}

import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { dishProfiles } from '../dish-profiles';

// The "star" ingredient of a dish — what makes it what it is
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

// The flavor base — supports the main ingredient
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
      if (lower === alias) {
        return canonical;
      }
    }
  }
  return lower;
}

function levenshtein(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= lenA; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= lenB; j++) {
    matrix[0][j] = j;
  }
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
      // Require exact word-for-word match with equal word count
      // e.g., "flour" should NOT match "gram flour" because they are different ingredients
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

export async function GET(req: Request) {
  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const mealType = searchParams.get('mealType');
  const dietaryFilter = searchParams.get('dietary');
  const includeExternal = searchParams.get('external') === 'true';

  const user = await prisma.user.findUnique({
    where: { email: auth.email },
    include: {
      ingredients: true,
      userRecipes: {
        include: {
          recipeIngredients: true,
          recipeSteps: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const pantryIngredients = user.ingredients.map((i) => i.name.toLowerCase().trim());
  const pantrySet = new Set(pantryIngredients.map(p => getNormalizedAlias(p)));

  let allRecipes: any[] = [];

  let catalogRecipes = await prisma.recipe.findMany({
    include: { recipeIngredients: true },
    orderBy: { createdAt: 'desc' },
  });

  if (mealType && mealType !== 'All') {
    catalogRecipes = catalogRecipes.filter(r => r.mealType === mealType);
  }

  allRecipes = catalogRecipes.map(r => ({ ...r, source: 'catalog' }));

  if (includeExternal) {
    try {
      const categories = ['Chicken', 'Beef', 'Pasta', 'Vegetarian', 'Seafood', 'Starter', 'Side Dish', 'Goat'];
      const seen = new Set<string>();
      const allMeals: any[] = [];

      for (const category of categories) {
        try {
          const url = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`;
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();
          const meals = data.meals || [];
          for (const meal of meals) {
            if (!seen.has(meal.idMeal)) {
              seen.add(meal.idMeal);
              allMeals.push(meal);
            }
          }
        } catch (e) {
          // skip failed category
        }
      }

      for (const meal of allMeals.slice(0, 100)) {
        const strIngredient1 = meal.strIngredient1;
        if (!strIngredient1) continue;
        const ingredients: Array<{ ingredient: string; quantity: string; unit: string }> = [];
        let i = 1;
        while (meal[`strIngredient${i}`]) {
          ingredients.push({
            ingredient: meal[`strIngredient${i}`],
            quantity: meal[`strMeasure${i}`] || '',
            unit: '',
          });
          i++;
        }
        const nutrition = JSON.stringify({
          calories: Math.floor(Math.random() * 400) + 200,
          protein: Math.floor(Math.random() * 30) + 5,
          carbs: Math.floor(Math.random() * 50) + 10,
          fat: Math.floor(Math.random() * 25) + 5,
        });
        allRecipes.push({
          id: `external_${meal.idMeal}`,
          title: meal.strMeal,
          description: meal.strInstructions.substring(0, 150) + '...',
          cuisine: meal.strArea || 'International',
          mealType: meal.strCategory || 'Dinner',
          cookingTime: Math.floor(Math.random() * 40) + 15,
          servings: 2,
          difficulty: 'Medium',
          nutritionalInfo: nutrition,
          image: meal.strImageThumb,
          recipeIngredients: ingredients,
          recipeSteps: [],
          source: 'external',
          externalId: meal.idMeal,
    });
  }

  } catch (error) {
      console.error('Failed to fetch external recipes:', error);
    }
  }

  allRecipes.push(...user.userRecipes.map(r => ({ ...r, source: 'user' })));

  // Infer dietary preference from pantry: if no meat products in pantry, treat as vegetarian
  const meatWords = ['chicken', 'beef', 'pork', 'fish', 'shrimp', 'salmon', 'turkey', 'lamb', 'bacon', 'sausage', 'ham', 'tuna', 'anchovy', 'mutton', 'duck', 'prawn', 'prawns', 'crab', 'lobster', 'veal', 'goat', 'meat'];
  const pantryHasMeat = pantryIngredients.some(pi => meatWords.some(m => pi.includes(m)));
  const inferredVegetarian = !pantryHasMeat;

  const matchedRecipes = allRecipes.map((recipe) => {
    const recipeIngredientNames = recipe.recipeIngredients.map((ri: any) => ri.ingredient.toLowerCase().trim());

    // Count how many of the user's pantry ingredients appear in this recipe
    const pantryMatchCount = new Set<string>();
    let mainIngredientMatched = false;
    recipeIngredientNames.forEach((riName: string) => {
      if (isMainIngredient(riName)) {
        const pantryMatch = pantryIngredients.find((pi) => matchesIngredient(riName, pi));
        if (pantryMatch) {
          mainIngredientMatched = true;
          pantryMatchCount.add(getNormalizedAlias(pantryMatch));
        }
      }
      const pantryMatch = pantryIngredients.find((pi) => matchesIngredient(riName, pi));
      if (pantryMatch) {
        pantryMatchCount.add(getNormalizedAlias(pantryMatch));
      }
    });
    const matchedPantryCount = pantryMatchCount.size;

    // Check if the recipe's MAIN ingredient (the star) is in the user's pantry
    let mainIngredientInPantry = mainIngredientMatched;

    // How much of the recipe do you have? (weighted by ingredient importance)
    let totalWeight = 0;
    let matchedWeight = 0;
    recipeIngredientNames.forEach((riName: string) => {
      if (isMainIngredient(riName)) {
        totalWeight += 5;
      } else if (BASE_INGREDIENTS.some(b => riName.includes(b))) {
        totalWeight += 2;
      } else {
        totalWeight += 1;
      }
      const match = pantryIngredients.find((pi) => matchesIngredient(riName, pi));
      if (match) {
        if (isMainIngredient(riName)) matchedWeight += 5;
        else if (BASE_INGREDIENTS.some(b => riName.includes(b))) matchedWeight += 2;
        else matchedWeight += 1;
      }
    });
    const matchPercentage = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;

    const matchedIngredients: string[] = [];
    const missingIngredients: string[] = [];
    recipeIngredientNames.forEach((riName: string) => {
      const match = pantryIngredients.find((pi) => matchesIngredient(riName, pi));
      if (match) {
        matchedIngredients.push(riName);
      } else {
        missingIngredients.push(riName);
      }
    });

    // For catalog recipes, all missing ingredients are treated as required
    // (no preferred/optional distinction for catalog dishes)
    const missingPreferredIngredients: string[] = [];

    // --- SCORING ---
    // Hybrid scoring: core ingredient present = big boost, penalize missing items
    // score = (corePresent ? 1000 : 0) + match% - (missingCount × 50)
    // This ensures dishes you can cook now rank highest, but ALL dishes are visible

    const mainIngredientBoost = mainIngredientInPantry ? 1000 : 0;
    const missingPenalty = missingIngredients.length * 50;
    const combinedScore = mainIngredientBoost + matchPercentage - missingPenalty;

    // Determine tier based on score
    let tier: number;
    if (combinedScore > 900) tier = 1;       // Cook Now
    else if (combinedScore > 500) tier = 2;  // Buy 1-2 items
    else if (combinedScore > 0) tier = 3;    // Buy More
    else tier = 4;                           // Inspiration

    return {
      ...recipe,
      matchPercentage,
      mainIngredientInPantry,
      matchedPantryCount,
      combinedScore,
      tier,
      matchedIngredients,
      missingIngredients,
      missingPreferredIngredients,
    };
  });

  let filtered = matchedRecipes;
  if (mealType && mealType !== 'All') {
    filtered = filtered.filter(r => r.mealType === mealType);
  }

  // Filter out meat recipes if pantry has no meat
  if (inferredVegetarian) {
    filtered = filtered.filter(r => {
      const allIngs = r.recipeIngredients.map((ri: any) => ri.ingredient.toLowerCase());
      return !meatWords.some(m => allIngs.some((i: string) => i.includes(m)));
    });
  }

  if (dietaryFilter && dietaryFilter !== 'All') {
    const prefs = user.dietaryPreferences.split(',').map((p: string) => p.trim().toLowerCase());
    if (prefs.includes('vegetarian') || prefs.includes('vegan')) {
      filtered = filtered.filter(r => {
        const allIngs = r.recipeIngredients.map((ri: any) => ri.ingredient.toLowerCase());
        return !meatWords.some(m => allIngs.some((i: string) => i.includes(m)));
      });
    }
  }

  // Show recipes that use at least one pantry ingredient AND have their main ingredient in pantry
  filtered = filtered.filter(r => r.matchedPantryCount > 0 && r.mainIngredientInPantry);

  // Sort: main ingredient in pantry first, then by count of your ingredients, then by match %
  filtered.sort((a, b) => {
    if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
    return b.matchPercentage - a.matchPercentage;
  });

  // --- Generate dynamic dish suggestions from user's ingredients ---
  const generatedSuggestions = generateDishSuggestions(pantryIngredients, pantrySet);

  // Merge database recipes with generated suggestions, deduplicating by title
  const mergedResults = mergeAndDeduplicateRecipes(filtered, generatedSuggestions);

  // Sort ALL results together by combinedScore (highest first), then by matchPercentage
  mergedResults.sort((a, b) => {
    if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
    if (b.matchPercentage !== a.matchPercentage) return b.matchPercentage - a.matchPercentage;
    return 0;
  });

  // Apply mealType filter to ALL results including generated
  if (mealType && mealType !== 'All') {
    const finalResults = mergedResults.filter(r => r.mealType === mealType);
    // Only show dishes with at least 15% match, limit to 15 results
    return NextResponse.json(finalResults.filter(r => r.matchPercentage >= 15).slice(0, 15));
  }

  // Apply dietary filter to ALL results including generated
  if (dietaryFilter && dietaryFilter !== 'All') {
    const prefs = user.dietaryPreferences.split(',').map((p: string) => p.trim().toLowerCase());
    if (prefs.includes('vegetarian') || prefs.includes('vegan')) {
      const finalResults = mergedResults.filter(r => {
        const allIngs = r.recipeIngredients.map((ri: any) => ri.ingredient.toLowerCase());
        return !meatWords.some(m => allIngs.some((i: string) => i.includes(m)));
      });
      return NextResponse.json(finalResults.filter(r => r.matchPercentage >= 15).slice(0, 15));
    }
  }

  // Only show dishes with at least 15% match, limit to 15 results
  return NextResponse.json(mergedResults.filter(r => r.matchPercentage >= 15).slice(0, 15));
}

// Merge catalog/external/user recipes with generated profile suggestions, deduplicating by title
function mergeAndDeduplicateRecipes(
  catalogRecipes: any[],
  generatedSuggestions: any[]
): any[] {
  const seen = new Set<string>();
  const merged: any[] = [];

  // Keep all catalog/external/user recipes
  for (const recipe of catalogRecipes) {
    const key = recipe.title.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(recipe);
    }
  }

  // Only add generated suggestions if no catalog recipe with the same title exists
  for (const suggestion of generatedSuggestions) {
    const key = suggestion.title.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(suggestion);
    }
  }

  return merged;
}

// Score a dish profile against user's pantry
function scoreProfileAgainstPantry(
  profile: typeof dishProfiles[number],
  pantryIngredients: string[]
): any | null {
  // Check if user has the base ingredient
  const hasBase = pantryIngredients.some(p => matchesIngredient(profile.baseIngredient, p));
  if (!hasBase) return null;

  // Find which companions user has
  const required = profile.companions.required.filter(c =>
    pantryIngredients.some(p => matchesIngredient(c, p))
  );
  const preferred = profile.companions.preferred.filter(c =>
    pantryIngredients.some(p => matchesIngredient(c, p))
  );
  const missingRequired = profile.companions.required.filter(c =>
    !pantryIngredients.some(p => matchesIngredient(c, p))
  );
  const missingPreferred = profile.companions.preferred.filter(c =>
    !pantryIngredients.some(p => matchesIngredient(c, p))
  );

  // Build matched/missing ingredient lists
  // Only required companions are shown as "missing" — preferred are optional
  const matchedIngredients: string[] = [profile.baseIngredient, ...required, ...preferred];
  const missingIngredients: string[] = [...missingRequired];

  // Calculate match percentage based on required + preferred companions only
  // Salt, oil, water are basic staples — assumed available in every kitchen
  const totalRequired = profile.companions.required.length;
  const totalPreferred = profile.companions.preferred.length;
  const totalItems = totalRequired + totalPreferred;
  const matchedItems = required.length + preferred.length;

  // Weight: required companions count double
  const weightedScore = (required.length * 2) + preferred.length;
  const weightedTotal = (totalRequired * 2) + totalPreferred;

  let matchPct: number;
  if (totalItems === 0) {
    matchPct = 100;
  } else if (weightedTotal === 0) {
    matchPct = preferred.length > 0 ? Math.round((preferred.length / totalPreferred) * 100) : 0;
  } else {
    matchPct = Math.round((weightedScore / weightedTotal) * 100);
  }
  // Bonus: if user has the base ingredient and at least 1 companion, boost to at least 50%
  if (matchedItems > 0 && matchPct < 50) {
    matchPct = 50;
  }

  // Build recipe ingredients from profile
  const recipeIngredients = generateRecipeIngredientsFromProfile(profile, matchedIngredients, missingIngredients);

  // Generate steps based on stepKey
  const recipeSteps = generateStepsFromProfile(profile);

  // YouTube search URL
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(profile.name + ' recipe')}`;

  // Nutritional info
  const nutritionalInfo = JSON.stringify({
    calories: profile.calories,
    protein: profile.protein,
    carbs: profile.carbs,
    fat: profile.fat,
    fiber: profile.fiber,
  });

  // Scoring: base ingredient = 1000pts, penalize missing items
  // score = (corePresent ? 1000 : 0) + matchPct - (missingCount × 50)
  const mainBoost = 1000;
  const missingPenalty = missingIngredients.length * 50;
  const combinedScore = mainBoost + matchPct - missingPenalty;

  // Determine tier based on score
  let tier: number;
  if (combinedScore > 900) tier = 1;       // Cook Now
  else if (combinedScore > 500) tier = 2;  // Buy 1-2 items
  else if (combinedScore > 0) tier = 3;    // Buy More
  else tier = 4;                           // Inspiration

  return {
    id: `profile_${profile.id}_${Date.now()}`,
    title: profile.name,
    description: profile.description,
    cuisine: profile.cuisine,
    mealType: profile.mealType,
    cookingTime: profile.time,
    servings: 2,
    difficulty: profile.difficulty,
    nutritionalInfo,
    image: null,
    youtubeUrl,
    recipeIngredients,
    recipeSteps,
    source: 'generated',
    matchPercentage: matchPct,
    mainIngredientInPantry: true,
    matchedPantryCount: matchedIngredients.length,
    combinedScore,
    tier,
    matchedIngredients,
    missingIngredients,
    missingPreferredIngredients: missingPreferred,
  };
}

// Generate recipe ingredients list from profile and pantry match
function generateRecipeIngredientsFromProfile(
  profile: typeof dishProfiles[number],
  matched: string[],
  missing: string[]
): Array<{ ingredient: string; quantity: string; unit?: string }> {
  const ingredients: Array<{ ingredient: string; quantity: string; unit?: string }> = [];
  const baseQuantities: Record<string, { qty: string; unit: string }> = {
    'egg': { qty: '3', unit: 'pcs' },
    'flour': { qty: '2', unit: 'cup' },
    'rice': { qty: '2', unit: 'cup' },
    'noodles': { qty: '200', unit: 'g' },
    'pasta': { qty: '250', unit: 'g' },
    'bread': { qty: '4', unit: 'slice' },
    'gram flour': { qty: '1', unit: 'cup' },
    'yogurt': { qty: '1', unit: 'cup' },
    'milk': { qty: '1', unit: 'cup' },
    'butter': { qty: '2', unit: 'tbsp' },
    'paneer': { qty: '200', unit: 'g' },
    'chicken': { qty: '500', unit: 'g' },
    'lentils': { qty: '1', unit: 'cup' },
    'potato': { qty: '2', unit: 'pcs' },
    'onion': { qty: '2', unit: 'pcs' },
    'tomato': { qty: '2', unit: 'pcs' },
    'capsicum': { qty: '1', unit: 'pcs' },
    'carrot': { qty: '1', unit: 'pcs' },
    'cabbage': { qty: '1', unit: 'cup' },
    'coconut': { qty: '0.5', unit: 'cup' },
    'corn': { qty: '1', unit: 'cup' },
    'peas': { qty: '0.5', unit: 'cup' },
    'cauliflower': { qty: '1', unit: 'cup' },
    'mushroom': { qty: '1', unit: 'cup' },
    'ginger': { qty: '1', unit: 'inch' },
    'garlic': { qty: '3', unit: 'cloves' },
    'chili': { qty: '2', unit: 'pcs' },
    'oil': { qty: '2', unit: 'tbsp' },
    'salt': { qty: '1', unit: 'tsp' },
    'turmeric': { qty: '0.5', unit: 'tsp' },
    'cumin': { qty: '1', unit: 'tsp' },
    'soy sauce': { qty: '1', unit: 'tbsp' },
    'sugar': { qty: '2', unit: 'tbsp' },
    'cream': { qty: '2', unit: 'tbsp' },
    'cheese': { qty: '50', unit: 'g' },
    'peanut': { qty: '2', unit: 'tbsp' },
    'cashew': { qty: '4', unit: 'pcs' },
    'mustard seed': { qty: '1', unit: 'tsp' },
    'curry leaves': { qty: '1', unit: 'sprig' },
    'coriander leaves': { qty: '2', unit: 'tbsp' },
    'lemon': { qty: '1', unit: 'pcs' },
    'pepper': { qty: '0.5', unit: 'tsp' },
    'cardamom': { qty: '2', unit: 'pcs' },
    'raisin': { qty: '1', unit: 'tbsp' },
    'pista': { qty: '4', unit: 'pcs' },
    'banana': { qty: '1', unit: 'pcs' },
    'oats': { qty: '0.5', unit: 'cup' },
    'basil': { qty: '4', unit: 'leaves' },
    'parsley': { qty: '2', unit: 'tbsp' },
    'mint': { qty: '4', unit: 'leaves' },
    'celery': { qty: '1', unit: 'stick' },
    'biryani masala': { qty: '1', unit: 'tbsp' },
    'garam masala': { qty: '0.5', unit: 'tsp' },
    'ginger paste': { qty: '1', unit: 'tbsp' },
    'garlic paste': { qty: '1', unit: 'tbsp' },
  };

  // Add base ingredient
  const baseQty = baseQuantities[profile.baseIngredient];
  if (baseQty) {
    ingredients.push({ ingredient: profile.baseIngredient, quantity: baseQty.qty, unit: baseQty.unit });
  } else {
    ingredients.push({ ingredient: profile.baseIngredient, quantity: '1', unit: 'cup' });
  }

  // Add matched companions
  const allCompanions = [...profile.companions.required, ...profile.companions.preferred];
  for (const companion of allCompanions) {
    const qty = baseQuantities[companion];
    if (qty) {
      ingredients.push({ ingredient: companion, quantity: qty.qty, unit: qty.unit });
    } else {
      ingredients.push({ ingredient: companion, quantity: '1', unit: 'tsp' });
    }
  }

  return ingredients;
}

// Generate cooking steps from profile
function generateStepsFromProfile(profile: typeof dishProfiles[number]): Array<{ stepNumber: number; instruction: string; estimatedTime?: number }> {
  const base = profile.baseIngredient;
  const baseDisplay = capitalizeFirst(base);

  const stepTemplates: Record<string, Array<{ instruction: string; time: number }>> = {
    'fry': [
      { instruction: `Wash and prepare ${baseDisplay} — cut into desired pieces`, time: 5 },
      { instruction: `Heat oil in a pan or kadai over medium heat`, time: 2 },
      { instruction: `Add tempering spices and sauté until fragrant`, time: 2 },
      { instruction: `Add chopped onions and cook until golden brown`, time: 8 },
      { instruction: `Add ginger-garlic paste and green chilies, cook for 2 minutes`, time: 2 },
      { instruction: `Add ${baseDisplay} and toss well with spices`, time: 3 },
      { instruction: `Cook on medium heat until ${baseDisplay} is tender and cooked through`, time: 15 },
      { instruction: `Garnish with fresh coriander and serve hot`, time: 2 },
    ],
    'scramble': [
      { instruction: `Beat eggs in a bowl with salt and pepper`, time: 2 },
      { instruction: `Heat oil in a non-stick pan over medium heat`, time: 2 },
      { instruction: `Add chopped onions and vegetables, sauté for 3 minutes`, time: 3 },
      { instruction: `Pour beaten eggs over the vegetables`, time: 1 },
      { instruction: `Scramble continuously until eggs are cooked but still soft`, time: 5 },
      { instruction: `Add spices and fresh herbs. Serve hot with bread or toast`, time: 2 },
    ],
    'roll': [
      { instruction: `Make dough: mix flour, salt, water and oil. Knead into soft dough`, time: 10 },
      { instruction: `Let dough rest for 15 minutes`, time: 15 },
      { instruction: `Prepare filling: cook vegetables with spices until tender`, time: 10 },
      { instruction: `Roll out each portion into a thin circle`, time: 5 },
      { instruction: `Cook on hot tawa with ghee until golden on both sides`, time: 8 },
      { instruction: `Serve hot with butter, yogurt and pickle`, time: 2 },
    ],
    'stuff-roll': [
      { instruction: `Prepare stuffing: cook and mash the filling ingredient with spices`, time: 15 },
      { instruction: `Make dough: mix flour, salt and water. Knead soft`, time: 10 },
      { instruction: `Divide dough into balls. Flatten each, add stuffing in center`, time: 5 },
      { instruction: `Seal edges and roll out carefully into flatbread`, time: 5 },
      { instruction: `Cook on tawa with ghee/butter until golden on both sides`, time: 8 },
      { instruction: `Serve hot with butter and yogurt`, time: 2 },
    ],
    'boil-temper': [
      { instruction: `Cook rice according to package directions until just done. Spread to cool`, time: 20 },
      { instruction: `Heat oil in a wide pan. Add tempering spices`, time: 2 },
      { instruction: `Add onions, vegetables and sauté for 3 minutes`, time: 3 },
      { instruction: `Add spices and mix well`, time: 2 },
      { instruction: `Add cooled rice and gently fold to combine without breaking grains`, time: 3 },
      { instruction: `Cook for 2 more minutes. Garnish and serve`, time: 2 },
    ],
    'boil': [
      { instruction: `Wash and chop all vegetables into uniform pieces`, time: 10 },
      { instruction: `Heat oil in a heavy pot. Add whole spices`, time: 2 },
      { instruction: `Add onions and cook until golden`, time: 8 },
      { instruction: `Add ginger-garlic paste, tomatoes and ground spices`, time: 5 },
      { instruction: `Add vegetables and rice. Add water and salt`, time: 3 },
      { instruction: `Cover and cook on low heat until rice and vegetables are done`, time: 20 },
      { instruction: `Fluff gently with fork. Garnish with coriander and serve`, time: 2 },
    ],
    'mix-temper': [
      { instruction: `Cook rice and let it cool completely. Break any clumps`, time: 20 },
      { instruction: `Whisk yogurt until smooth and creamy`, time: 2 },
      { instruction: `Heat ghee in a small pan. Add tempering ingredients`, time: 2 },
      { instruction: `Pour tempered ghee over yogurt and mix`, time: 1 },
      { instruction: `Add cooled rice and gently fold to combine`, time: 3 },
      { instruction: `Season with salt and cumin. Serve as side dish or light meal`, time: 2 },
    ],
    'stir-fry': [
      { instruction: `Cook noodles/pasta according to package directions. Drain and toss with oil`, time: 10 },
      { instruction: `Heat wok or large pan over high heat until smoking`, time: 2 },
      { instruction: `Add oil, then garlic and ginger. Stir for 30 seconds`, time: 1 },
      { instruction: `Add sliced vegetables. Toss on high heat for 2-3 minutes`, time: 3 },
      { instruction: `Add cooked noodles and sauce. Toss everything together`, time: 3 },
      { instruction: `Cook for 1 more minute. Garnish and serve immediately`, time: 2 },
    ],
    'boil-soup': [
      { instruction: `Cook noodles according to package directions. Drain`, time: 10 },
      { instruction: `In a pot, heat oil and sauté onions, garlic and vegetables`, time: 5 },
      { instruction: `Add water or broth, bring to boil`, time: 5 },
      { instruction: `Add soy sauce, chili and seasonings`, time: 2 },
      { instruction: `Add cooked noodles and simmer for 2 minutes`, time: 2 },
      { instruction: `Serve hot with chili oil and spring onions`, time: 2 },
    ],
    'boil-sauce': [
      { instruction: `Cook pasta in salted boiling water until al dente. Reserve 1 cup pasta water`, time: 12 },
      { instruction: `In a pan, heat olive oil and sauté garlic until fragrant`, time: 2 },
      { instruction: `Add tomatoes and cook until they break down into sauce`, time: 8 },
      { instruction: `Add spices and seasonings. Simmer for 5 minutes`, time: 5 },
      { instruction: `Toss drained pasta with sauce. Add pasta water if needed`, time: 3 },
      { instruction: `Serve with grated cheese and fresh herbs`, time: 2 },
    ],
    'boil-toss': [
      { instruction: `Cook pasta until al dente. Drain and set aside`, time: 10 },
      { instruction: `In a large pan, heat oil and sauté garlic and vegetables`, time: 5 },
      { instruction: `Add cooked pasta and toss on high heat`, time: 3 },
      { instruction: `Add sauces and seasonings. Toss well`, time: 2 },
      { instruction: `Garnish with fresh herbs and serve`, time: 2 },
    ],
    'cook': [
      { instruction: `Wash and chop all vegetables into uniform pieces`, time: 10 },
      { instruction: `Heat oil in a pan. Add whole spices`, time: 2 },
      { instruction: `Add onions and cook until golden brown`, time: 8 },
      { instruction: `Add ginger-garlic paste and green chilies`, time: 2 },
      { instruction: `Add vegetables and spices. Cook on medium heat`, time: 15 },
      { instruction: `Cover and cook until vegetables are tender`, time: 10 },
      { instruction: `Garnish with coriander and serve with roti or rice`, time: 2 },
    ],
    'cook-gravy': [
      { instruction: `Prepare the main ingredient — marinate if needed`, time: 10 },
      { instruction: `Heat oil/ghee in a pan. Add whole spices`, time: 2 },
      { instruction: `Add onions and cook until deeply golden`, time: 10 },
      { instruction: `Add ginger-garlic paste, tomatoes and ground spices`, time: 5 },
      { instruction: `Cook until oil separates from masala`, time: 8 },
      { instruction: `Add main ingredient and cook for 5 minutes`, time: 5 },
      { instruction: `Add water/cream/yogurt. Simmer until cooked through`, time: 15 },
      { instruction: `Finish with garam masala and fresh cream. Serve with rice or naan`, time: 2 },
    ],
    'pan-fry': [
      { instruction: `Prepare the batter or filling as directed`, time: 10 },
      { instruction: `Heat oil on a flat tawa or griddle over medium heat`, time: 2 },
      { instruction: `Pour/spread batter evenly on the hot surface`, time: 2 },
      { instruction: `Drizzle oil around edges. Cook until golden and crispy`, time: 5 },
      { instruction: `Flip carefully and cook other side`, time: 3 },
      { instruction: `Serve hot with chutney and sambar`, time: 2 },
    ],
    'deep-fry': [
      { instruction: `Prepare the batter or filling mixture`, time: 10 },
      { instruction: `Heat oil for deep frying in a kadai over medium heat`, time: 5 },
      { instruction: `Shape portions of the mixture`, time: 5 },
      { instruction: `Carefully drop into hot oil. Fry until golden and crispy`, time: 8 },
      { instruction: `Drain on paper towels`, time: 2 },
      { instruction: `Serve hot with chutney or ketchup`, time: 2 },
    ],
    'grill-fry': [
      { instruction: `Prepare and season the main ingredient`, time: 5 },
      { instruction: `Heat grill pan or tawa over high heat`, time: 3 },
      { instruction: `Brush with butter or oil`, time: 1 },
      { instruction: `Cook, turning occasionally, until golden and tender`, time: 10 },
      { instruction: `Season with spices and squeeze lemon`, time: 2 },
      { instruction: `Serve hot as a snack`, time: 2 },
    ],
    'bake-fry': [
      { instruction: `Cut potatoes into wedges. Pat dry`, time: 5 },
      { instruction: `Toss with oil, spices and salt`, time: 2 },
      { instruction: `Spread on baking sheet in single layer`, time: 2 },
      { instruction: `Bake at 200°C for 25 minutes, turning once`, time: 25 },
      { instruction: `Serve hot with dipping sauce`, time: 2 },
    ],
    'toast': [
      { instruction: `Prepare the topping or filling`, time: 5 },
      { instruction: `Spread butter on bread slices`, time: 2 },
      { instruction: `Add vegetables and seasonings`, time: 2 },
      { instruction: `Toast in a pan or toaster until golden`, time: 5 },
      { instruction: `Cut and serve hot`, time: 2 },
    ],
    'layer-cook': [
      { instruction: `Cook rice until 70% done. Drain and set aside`, time: 15 },
      { instruction: `Prepare the main ingredient — cook with spices until done`, time: 20 },
      { instruction: `In a heavy pot, layer half the rice at the bottom`, time: 2 },
      { instruction: `Add cooked main ingredient as middle layer`, time: 2 },
      { instruction: `Top with remaining rice. Add saffron milk and fried onions`, time: 3 },
      { instruction: `Seal pot with lid (dough or foil). Cook on high heat 5 min, then low heat 25 min`, time: 30 },
      { instruction: `Rest 5 minutes. Gently layer and serve`, time: 5 },
    ],
    'boil-dal': [
      { instruction: `Wash and cook lentils with turmeric and water until soft`, time: 20 },
      { instruction: `In a small pan, heat ghee for tempering`, time: 2 },
      { instruction: `Add cumin seeds, dried chili, garlic and curry leaves`, time: 1 },
      { instruction: `Pour hot tempering over cooked dal`, time: 1 },
      { instruction: `Mix well. Serve with steamed rice and roti`, time: 2 },
    ],
    'blend': [
      { instruction: `Heat oil in a pot. Sauté onions and garlic until soft`, time: 5 },
      { instruction: `Add tomatoes and cook until mushy`, time: 8 },
      { instruction: `Add spices and water. Simmer for 10 minutes`, time: 10 },
      { instruction: `Blend until smooth using immersion blender`, time: 3 },
      { instruction: `Add cream, season and simmer for 2 minutes`, time: 2 },
      { instruction: `Serve hot with garlic bread or croutons`, time: 2 },
    ],
    'boil-simmer': [
      { instruction: `Heat milk in a heavy-bottomed pot on low heat`, time: 5 },
      { instruction: `Add rice/wheat and stir continuously to prevent sticking`, time: 2 },
      { instruction: `Simmer on low heat, stirring every 2 minutes`, time: 30 },
      { instruction: `Add sugar and cardamom when milk reduces by half`, time: 2 },
      { instruction: `Cook until thick and creamy consistency`, time: 5 },
      { instruction: `Garnish with nuts and serve warm or chilled`, time: 2 },
    ],
    'roll-fry': [
      { instruction: `Prepare vegetable filling: stir-fry shredded vegetables with spices`, time: 10 },
      { instruction: `Let filling cool completely`, time: 5 },
      { instruction: `Place filling on spring roll wrappers. Roll tightly`, time: 5 },
      { instruction: `Heat oil for deep frying`, time: 3 },
      { instruction: `Fry rolls until golden and crispy on all sides`, time: 8 },
      { instruction: `Drain and serve hot with sweet chili sauce`, time: 2 },
    ],
    'fry-sauce': [
      { instruction: `Prepare vegetable balls: mix mashed vegetables with corn flour and spices`, time: 10 },
      { instruction: `Shallow fry balls until golden and crispy`, time: 10 },
      { instruction: `In same pan, sauté garlic, onions and peppers`, time: 5 },
      { instruction: `Add soy sauce, chili and vinegar for sauce`, time: 2 },
      { instruction: `Toss fried balls in sauce. Serve hot`, time: 2 },
    ],
  };

  const template = stepTemplates[profile.cookingMethod];
  if (!template) {
    // Default steps
    return [
      { stepNumber: 1, instruction: `Prepare ${baseDisplay} by washing and cutting into pieces`, estimatedTime: 5 },
      { stepNumber: 2, instruction: `Heat oil in a pan and add tempering spices`, estimatedTime: 2 },
      { stepNumber: 3, instruction: `Add chopped onions and cook until golden`, estimatedTime: 8 },
      { stepNumber: 4, instruction: `Add ginger-garlic paste and vegetables`, estimatedTime: 3 },
      { stepNumber: 5, instruction: `Add spices and cook for 5 minutes`, estimatedTime: 5 },
      { stepNumber: 6, instruction: `Add ${baseDisplay} and cook until done`, estimatedTime: 15 },
      { stepNumber: 7, instruction: `Garnish with fresh herbs and serve`, estimatedTime: 2 },
    ];
  }

  return template.map((step, idx) => ({
    stepNumber: idx + 1,
    instruction: step.instruction,
    estimatedTime: step.time,
  }));
}

// Generate dish suggestions from profiles
function generateDishSuggestions(pantryIngredients: string[], pantrySet: Set<string>): any[] {
  const suggestions: any[] = [];
  const seenTitles = new Set<string>();

  function addSuggestion(suggestion: any) {
    if (!seenTitles.has(suggestion.title)) {
      seenTitles.add(suggestion.title);
      suggestions.push(suggestion);
    }
  }

  // Score each profile against pantry
  for (const profile of dishProfiles) {
    const result = scoreProfileAgainstPantry(profile, pantryIngredients);
    if (result) {
      addSuggestion(result);
    }
  }

  // Sort by match percentage (highest first)
  suggestions.sort((a, b) => b.matchPercentage - a.matchPercentage);

  return suggestions;
}

function generateIngredientsForGeneratedDish(title: string, description: string, pantry: string[]): Array<{ ingredient: string; quantity: string; unit?: string }> {
  const t = title.toLowerCase();
  const d = description.toLowerCase();
  const ingredients: Array<{ ingredient: string; quantity: string; unit?: string }> = [];

  // Rice dishes
  if (t.includes('rice') || t.includes('pulao') || t.includes('biryani')) {
    ingredients.push({ ingredient: 'rice', quantity: '2', unit: 'cup' });
    if (t.includes('lemon')) {
      ingredients.push({ ingredient: 'lemon', quantity: '2', unit: 'pcs' });
      ingredients.push({ ingredient: 'butter', quantity: '2', unit: 'tbsp' });
      ingredients.push({ ingredient: 'mustard seed', quantity: '1', unit: 'tsp' });
      ingredients.push({ ingredient: 'turmeric', quantity: '0.5', unit: 'tsp' });
      ingredients.push({ ingredient: 'green chili', quantity: '2', unit: 'pcs' });
      ingredients.push({ ingredient: 'curry leaves', quantity: '1', unit: 'sprig' });
      ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
    } else if (t.includes('curd') || t.includes('dahi')) {
      ingredients.push({ ingredient: 'yogurt', quantity: '1', unit: 'cup' });
      ingredients.push({ ingredient: 'butter', quantity: '1', unit: 'tbsp' });
      ingredients.push({ ingredient: 'mustard seed', quantity: '1', unit: 'tsp' });
      ingredients.push({ ingredient: 'curry leaves', quantity: '1', unit: 'sprig' });
      ingredients.push({ ingredient: 'green chili', quantity: '1', unit: 'pcs' });
      ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
    } else if (t.includes('tomato')) {
      ingredients.push({ ingredient: 'tomato', quantity: '2', unit: 'pcs' });
      ingredients.push({ ingredient: 'onion', quantity: '1', unit: 'pcs' });
      ingredients.push({ ingredient: 'green chili', quantity: '2', unit: 'pcs' });
      ingredients.push({ ingredient: 'turmeric', quantity: '0.5', unit: 'tsp' });
      ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
    } else if (t.includes('aloo') || t.includes('potato')) {
      ingredients.push({ ingredient: 'potato', quantity: '2', unit: 'pcs' });
      ingredients.push({ ingredient: 'cumin', quantity: '1', unit: 'tsp' });
      ingredients.push({ ingredient: 'turmeric', quantity: '0.5', unit: 'tsp' });
      ingredients.push({ ingredient: 'coriander', quantity: '1', unit: 'tsp' });
      ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
    } else if (t.includes('egg')) {
      ingredients.push({ ingredient: 'egg', quantity: '2', unit: 'pcs' });
      ingredients.push({ ingredient: 'onion', quantity: '1', unit: 'pcs' });
      ingredients.push({ ingredient: 'soy sauce', quantity: '1', unit: 'tbsp' });
      ingredients.push({ ingredient: 'green chili', quantity: '1', unit: 'pcs' });
      ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
    } else if (t.includes('capsicum')) {
      ingredients.push({ ingredient: 'capsicum', quantity: '1', unit: 'pcs' });
      ingredients.push({ ingredient: 'onion', quantity: '1', unit: 'pcs' });
      ingredients.push({ ingredient: 'soy sauce', quantity: '1', unit: 'tbsp' });
      ingredients.push({ ingredient: 'green chili', quantity: '1', unit: 'pcs' });
      ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
    } else if (t.includes('vegetable')) {
      ingredients.push({ ingredient: 'potato', quantity: '1', unit: 'pcs' });
      ingredients.push({ ingredient: 'peas', quantity: '0.5', unit: 'cup' });
      ingredients.push({ ingredient: 'carrot', quantity: '1', unit: 'pcs' });
      ingredients.push({ ingredient: 'cumin', quantity: '1', unit: 'tsp' });
      ingredients.push({ ingredient: 'turmeric', quantity: '0.5', unit: 'tsp' });
      ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
    } else {
      // Plain pulao / basic rice
      ingredients.push({ ingredient: 'onion', quantity: '1', unit: 'pcs' });
      ingredients.push({ ingredient: 'tomato', quantity: '1', unit: 'pcs' });
      ingredients.push({ ingredient: 'cumin', quantity: '1', unit: 'tsp' });
      ingredients.push({ ingredient: 'turmeric', quantity: '0.5', unit: 'tsp' });
      ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
    }
  }
  // Paratha dishes
  else if (t.includes('paratha')) {
    const main = t.includes('paneer') ? 'paneer' : t.includes('potato') ? 'potato' : t.includes('capsicum') ? 'capsicum' : 'vegetable';
    ingredients.push({ ingredient: 'flour', quantity: '2', unit: 'cup' });
    ingredients.push({ ingredient: main, quantity: '1', unit: 'cup' });
    ingredients.push({ ingredient: 'yogurt', quantity: '2', unit: 'tbsp' });
    ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
    ingredients.push({ ingredient: 'ghee', quantity: '2', unit: 'tbsp' });
  }
  // Chilla / bhaji dishes
  else if (t.includes('chilla') || t.includes('bhaji')) {
    ingredients.push({ ingredient: 'gram flour', quantity: '1', unit: 'cup' });
    ingredients.push({ ingredient: 'onion', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'green chili', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'turmeric', quantity: '0.5', unit: 'tsp' });
    ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
  }
  // Masala / curry / fry / kadai / jalfrezi / do pyaza dishes
  else if (t.includes('masala') || t.includes('curry') || t.includes('fry') || t.includes('kadai') || t.includes('jalfrezi') || t.includes('do pyaza')) {
    const mainWord = title.split(' ')[0].toLowerCase();
    const main = ['paneer', 'potato', 'capsicum', 'tomato', 'egg', 'cauliflower', 'mushroom'].includes(mainWord) ? mainWord : 'vegetable';
    ingredients.push({ ingredient: main, quantity: '2', unit: 'cup' });
    ingredients.push({ ingredient: 'onion', quantity: '2', unit: 'pcs' });
    ingredients.push({ ingredient: 'tomato', quantity: '2', unit: 'pcs' });
    ingredients.push({ ingredient: 'garlic', quantity: '3', unit: 'cloves' });
    ingredients.push({ ingredient: 'ginger', quantity: '1', unit: 'inch' });
    ingredients.push({ ingredient: 'green chili', quantity: '2', unit: 'pcs' });
    ingredients.push({ ingredient: 'turmeric', quantity: '0.5', unit: 'tsp' });
    ingredients.push({ ingredient: 'cumin', quantity: '1', unit: 'tsp' });
    ingredients.push({ ingredient: 'coriander', quantity: '1', unit: 'tsp' });
    ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
  }
  // Stir fry / roast / soup / korma / cream
  else if (t.includes('stir fry') || t.includes('roast')) {
    const mainWord = title.split(' ')[0].toLowerCase();
    const main = ['paneer', 'potato', 'capsicum', 'tomato'].includes(mainWord) ? mainWord : 'vegetable';
    ingredients.push({ ingredient: main, quantity: '2', unit: 'cup' });
    ingredients.push({ ingredient: 'garlic', quantity: '3', unit: 'cloves' });
    ingredients.push({ ingredient: 'ginger', quantity: '1', unit: 'inch' });
    ingredients.push({ ingredient: 'green chili', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
  } else if (t.includes('soup')) {
    const mainWord = title.split(' ')[0].toLowerCase();
    const main = ['paneer', 'potato', 'tomato', 'capsicum'].includes(mainWord) ? mainWord : 'vegetable';
    ingredients.push({ ingredient: main, quantity: '2', unit: 'cup' });
    ingredients.push({ ingredient: 'onion', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'garlic', quantity: '2', unit: 'cloves' });
    ingredients.push({ ingredient: 'ginger', quantity: '1', unit: 'inch' });
    ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
  } else if (t.includes('korma') || t.includes('cream')) {
    const mainWord = title.split(' ')[0].toLowerCase();
    const main = ['paneer', 'potato', 'capsicum'].includes(mainWord) ? mainWord : 'vegetable';
    ingredients.push({ ingredient: main, quantity: '2', unit: 'cup' });
    ingredients.push({ ingredient: 'onion', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'tomato', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'cream', quantity: '2', unit: 'tbsp' });
    ingredients.push({ ingredient: 'garlic', quantity: '2', unit: 'cloves' });
    ingredients.push({ ingredient: 'ginger', quantity: '1', unit: 'inch' });
    ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
  }
  // Omelette / egg bhurji
  else if (t.includes('omelette') || t.includes('egg bhurji')) {
    ingredients.push({ ingredient: 'egg', quantity: '3', unit: 'pcs' });
    ingredients.push({ ingredient: 'onion', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'green chili', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'tomato', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
  }
  // Dahi dishes
  else if (t.includes('dahi')) {
    const mainWord = title.split(' ')[1]?.toLowerCase() || 'vegetable';
    const main = ['paneer', 'potato', 'capsicum', 'tomato'].includes(mainWord) ? mainWord : 'vegetable';
    ingredients.push({ ingredient: main, quantity: '2', unit: 'cup' });
    ingredients.push({ ingredient: 'yogurt', quantity: '1', unit: 'cup' });
    ingredients.push({ ingredient: 'onion', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'cumin', quantity: '1', unit: 'tsp' });
    ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
  }
  // Coconut curry
  else if (t.includes('coconut')) {
    const mainWord = title.split(' ')[0].toLowerCase();
    const main = ['paneer', 'potato', 'capsicum'].includes(mainWord) ? mainWord : 'vegetable';
    ingredients.push({ ingredient: main, quantity: '2', unit: 'cup' });
    ingredients.push({ ingredient: 'coconut', quantity: '0.5', unit: 'cup' });
    ingredients.push({ ingredient: 'onion', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'garlic', quantity: '2', unit: 'cloves' });
    ingredients.push({ ingredient: 'green chili', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
  }
  // Stuffed dishes
  else if (t.includes('stuffed')) {
    const mainWord = title.split(' ')[1]?.toLowerCase() || 'vegetable';
    const main = ['paneer', 'potato', 'capsicum'].includes(mainWord) ? mainWord : 'vegetable';
    ingredients.push({ ingredient: main, quantity: '4', unit: 'pcs' });
    ingredients.push({ ingredient: 'onion', quantity: '2', unit: 'pcs' });
    ingredients.push({ ingredient: 'tomato', quantity: '2', unit: 'pcs' });
    ingredients.push({ ingredient: 'garlic', quantity: '3', unit: 'cloves' });
    ingredients.push({ ingredient: 'ginger', quantity: '1', unit: 'inch' });
    ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
  }
  // Crispy / battered
  else if (t.includes('crispy')) {
    const mainWord = title.split(' ')[1]?.toLowerCase() || 'vegetable';
    const main = ['paneer', 'potato', 'capsicum'].includes(mainWord) ? mainWord : 'vegetable';
    ingredients.push({ ingredient: main, quantity: '2', unit: 'cup' });
    ingredients.push({ ingredient: 'gram flour', quantity: '0.5', unit: 'cup' });
    ingredients.push({ ingredient: 'onion', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'green chili', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'turmeric', quantity: '0.5', unit: 'tsp' });
    ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
  }
  // Aloo combo
  else if (t.includes('aloo')) {
    const mainWord = title.split(' ')[0].toLowerCase();
    const main = ['paneer', 'capsicum', 'tomato'].includes(mainWord) ? mainWord : 'vegetable';
    ingredients.push({ ingredient: main, quantity: '1', unit: 'cup' });
    ingredients.push({ ingredient: 'potato', quantity: '2', unit: 'pcs' });
    ingredients.push({ ingredient: 'onion', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'tomato', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'turmeric', quantity: '0.5', unit: 'tsp' });
    ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
  }
  // Base dishes (curry, stir fry, sabzi, korma with base ingredients only)
  else if (t.includes('curry') || t.includes('stir fry') || t.includes('sabzi') || t.includes('korma')) {
    const words = title.split(' ').slice(0, 2);
    const ing1 = words[0]?.toLowerCase() || 'vegetable';
    const ing2 = words[1]?.toLowerCase() || 'vegetable';
    ingredients.push({ ingredient: ing1, quantity: '1', unit: 'cup' });
    ingredients.push({ ingredient: ing2, quantity: '1', unit: 'cup' });
    ingredients.push({ ingredient: 'onion', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'tomato', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'garlic', quantity: '2', unit: 'cloves' });
    ingredients.push({ ingredient: 'ginger', quantity: '1', unit: 'inch' });
    ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
  }
  // Simple curry
  else if (t.includes('simple')) {
    const mainWord = title.split(' ')[1]?.toLowerCase() || 'vegetable';
    const main = ['paneer', 'potato', 'capsicum', 'tomato'].includes(mainWord) ? mainWord : 'vegetable';
    ingredients.push({ ingredient: main, quantity: '2', unit: 'cup' });
    ingredients.push({ ingredient: 'turmeric', quantity: '0.5', unit: 'tsp' });
    ingredients.push({ ingredient: 'cumin', quantity: '1', unit: 'tsp' });
    ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
  }
  // Default fallback
  else {
    const mainWord = title.split(' ')[0]?.toLowerCase() || 'vegetable';
    const main = ['paneer', 'potato', 'capsicum', 'tomato', 'egg'].includes(mainWord) ? mainWord : 'vegetable';
    ingredients.push({ ingredient: main, quantity: '2', unit: 'cup' });
    ingredients.push({ ingredient: 'onion', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'tomato', quantity: '1', unit: 'pcs' });
    ingredients.push({ ingredient: 'garlic', quantity: '2', unit: 'cloves' });
    ingredients.push({ ingredient: 'salt', quantity: '1', unit: 'tsp' });
  }

  return ingredients;
}

function capitalizeFirst(str: string): string {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function generateMasalaSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Wash and cut ${mainLower} into bite-sized pieces or strips`, estimatedTime: 5 },
    { stepNumber: 2, instruction: `Heat oil in a pan, add cumin seeds and let them splutter`, estimatedTime: 1 },
    { stepNumber: 3, instruction: `Add chopped onions and saute until golden brown`, estimatedTime: 8 },
    { stepNumber: 4, instruction: `Add ginger-garlic paste and green chilies, cook for 2 minutes`, estimatedTime: 2 },
    { stepNumber: 5, instruction: `Add chopped tomatoes, turmeric, chili powder, and coriander powder. Cook until oil separates`, estimatedTime: 10 },
    { stepNumber: 6, instruction: `Add the ${mainLower}, salt, and garam masala. Toss well to coat in masala`, estimatedTime: 3 },
    { stepNumber: 7, instruction: `Cover and cook on medium heat for 15 minutes, stirring occasionally`, estimatedTime: 15 },
    { stepNumber: 8, instruction: `Garnish with fresh coriander leaves and serve hot with roti or rice`, estimatedTime: 2 },
  ];
}

function generateCurrySteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Wash and prepare ${mainLower} — cut into uniform pieces`, estimatedTime: 5 },
    { stepNumber: 2, instruction: `Heat ghee in a heavy-bottomed pan, add whole spices (bay leaf, cinnamon, cardamom)`, estimatedTime: 1 },
    { stepNumber: 3, instruction: `Add sliced onions and cook until caramelized and deep golden`, estimatedTime: 10 },
    { stepNumber: 4, instruction: `Add ginger-garlic paste, green chilies, and cook until raw smell disappears`, estimatedTime: 3 },
    { stepNumber: 5, instruction: `Add tomato puree, turmeric, cumin powder, and red chili powder. Cook until the masala is thick and oil begins to separate`, estimatedTime: 10 },
    { stepNumber: 6, instruction: `Add ${mainLower} and mix well. Pour in warm water to form a gravy consistency`, estimatedTime: 2 },
    { stepNumber: 7, instruction: `Cover and simmer on low heat for 20 minutes until ${mainLower} is tender`, estimatedTime: 20 },
    { stepNumber: 8, instruction: `Finish with garam masala, fresh cream (optional), and coriander. Serve with rice or naan`, estimatedTime: 2 },
  ];
}

function generateFrySteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Wash and slice ${mainLower} into thin strips or rings`, estimatedTime: 5 },
    { stepNumber: 2, instruction: `Heat oil in a kadai or wide pan over medium-high heat`, estimatedTime: 2 },
    { stepNumber: 3, instruction: `Add mustard seeds and let them crackle`, estimatedTime: 1 },
    { stepNumber: 4, instruction: `Add curry leaves, green chilies, and a pinch of turmeric`, estimatedTime: 1 },
    { stepNumber: 5, instruction: `Add sliced onions and saute for 3 minutes until slightly softened`, estimatedTime: 3 },
    { stepNumber: 6, instruction: `Add ${mainLower} and toss on high heat for 5 minutes`, estimatedTime: 5 },
    { stepNumber: 7, instruction: `Add salt, cumin powder, and a squeeze of lemon juice. Cook for another 3 minutes`, estimatedTime: 3 },
    { stepNumber: 8, instruction: `Serve crispy and hot as a side dish with roti or chappati`, estimatedTime: 1 },
  ];
}

function generateBhajiSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Wash and finely chop ${mainLower} into small pieces`, estimatedTime: 5 },
    { stepNumber: 2, instruction: `In a bowl, mix gram flour, rice flour, turmeric, red chili powder, and salt with water to make a thick batter`, estimatedTime: 3 },
    { stepNumber: 3, instruction: `Add the chopped ${mainLower} to the batter and mix well`, estimatedTime: 2 },
    { stepNumber: 4, instruction: `Heat oil for deep frying in a kadai until medium-hot`, estimatedTime: 3 },
    { stepNumber: 5, instruction: `Drop spoonfuls of the batter into hot oil and fry until golden and crispy on both sides`, estimatedTime: 8 },
    { stepNumber: 6, instruction: `Drain on paper towels and serve hot with green chutney and tea`, estimatedTime: 2 },
  ];
}

function generateDoPyazaSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Cut ${mainLower} into large chunks and parboil for 5 minutes. Cut onions into large wedges`, estimatedTime: 10 },
    { stepNumber: 2, instruction: `Heat oil in a pan, add whole spices and sliced onions. Cook until deeply caramelized`, estimatedTime: 10 },
    { stepNumber: 3, instruction: `Add ginger-garlic paste, tomatoes, and spices. Cook until oil separates from masala`, estimatedTime: 8 },
    { stepNumber: 4, instruction: `Add the parboiled ${mainLower} and onion wedges. Toss and coat well in the masala`, estimatedTime: 3 },
    { stepNumber: 5, instruction: `Add yogurt (or cream), mix gently, and cook on low heat for 15 minutes`, estimatedTime: 15 },
    { stepNumber: 6, instruction: `Finish with garam masala and fresh coriander. Serve with naan or pulao`, estimatedTime: 2 },
  ];
}

function generateKormaSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Prepare ${mainLower} by washing and cutting into even pieces`, estimatedTime: 5 },
    { stepNumber: 2, instruction: `Heat ghee in a pan, add cashew paste and saute until light golden`, estimatedTime: 5 },
    { stepNumber: 3, instruction: `Add onions and cook until soft and translucent`, estimatedTime: 5 },
    { stepNumber: 4, instruction: `Add ginger-garlic paste, tomatoes, and mild spices (turmeric, coriander). Cook until oil separates`, estimatedTime: 8 },
    { stepNumber: 5, instruction: `Add ${mainLower}, yogurt or cream, and a splash of milk. Mix gently`, estimatedTime: 3 },
    { stepNumber: 6, instruction: `Cover and simmer on low heat for 20 minutes until ${mainLower} is tender and gravy is thick`, estimatedTime: 20 },
    { stepNumber: 7, instruction: `Garnish with cream, saffron strands, and nuts. Serve with naan or jeera rice`, estimatedTime: 2 },
  ];
}

function generateSoupSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Wash and dice ${mainLower} into small uniform pieces`, estimatedTime: 5 },
    { stepNumber: 2, instruction: `Heat butter in a pot, add chopped onions and garlic. Cook until soft`, estimatedTime: 5 },
    { stepNumber: 3, instruction: `Add ${mainLower}, vegetable broth, and water. Bring to a boil`, estimatedTime: 5 },
    { stepNumber: 4, instruction: `Reduce heat and simmer for 15 minutes until ${mainLower} is completely soft`, estimatedTime: 15 },
    { stepNumber: 5, instruction: `Blend until smooth using an immersion blender or countertop blender`, estimatedTime: 3 },
    { stepNumber: 6, instruction: `Season with salt, pepper, and a pinch of nutmeg. Serve hot with croutons or bread`, estimatedTime: 2 },
  ];
}

function generateRoastSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Wash and slice ${mainLower} into thick strips or wedges`, estimatedTime: 5 },
    { stepNumber: 2, instruction: `Toss with oil, cumin seeds, chili flakes, turmeric, and salt`, estimatedTime: 2 },
    { stepNumber: 3, instruction: `Heat a dry pan or tawa on medium-high heat`, estimatedTime: 2 },
    { stepNumber: 4, instruction: `Add ${mainLower} in a single layer. Do not stir for 3 minutes to let it char`, estimatedTime: 3 },
    { stepNumber: 5, instruction: `Flip and roast on the other side for 3 more minutes`, estimatedTime: 3 },
    { stepNumber: 6, instruction: `Squeeze lemon juice, sprinkle chaat masala, and serve hot`, estimatedTime: 1 },
  ];
}

function generateStirFrySteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Wash and julienne ${mainLower} into thin strips`, estimatedTime: 5 },
    { stepNumber: 2, instruction: `Heat sesame oil in a wok over high heat until smoking`, estimatedTime: 2 },
    { stepNumber: 3, instruction: `Add garlic, ginger, and green chilies. Stir fry for 30 seconds`, estimatedTime: 1 },
    { stepNumber: 4, instruction: `Add ${mainLower} and toss on high heat for 2 minutes`, estimatedTime: 2 },
    { stepNumber: 5, instruction: `Add soy sauce, a splash of vinegar, and red chili flakes. Toss for 1 minute`, estimatedTime: 1 },
    { stepNumber: 6, instruction: `Garnish with sesame seeds and spring onions. Serve over steamed rice`, estimatedTime: 1 },
  ];
}

function generateParathaSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Prepare the stuffing: cook ${mainLower} with spices, onions, and herbs until tender. Mash and cool`, estimatedTime: 15 },
    { stepNumber: 2, instruction: `Make dough: mix wheat flour, salt, oil, and water. Knead into a soft dough`, estimatedTime: 10 },
    { stepNumber: 3, instruction: `Divide dough and stuffing into equal portions`, estimatedTime: 3 },
    { stepNumber: 4, instruction: `Roll each portion flat, place stuffing in center, seal edges, and roll out again carefully`, estimatedTime: 5 },
    { stepNumber: 5, instruction: `Cook on a hot tawa with ghee or butter until both sides are golden brown`, estimatedTime: 8 },
    { stepNumber: 6, instruction: `Serve hot with butter, yogurt, and pickle`, estimatedTime: 2 },
  ];
}

function generateCreamCurrySteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Cut ${mainLower} into uniform pieces`, estimatedTime: 5 },
    { stepNumber: 2, instruction: `Heat butter in a pan, saute onions until golden and caramelized`, estimatedTime: 8 },
    { stepNumber: 3, instruction: `Add ginger-garlic paste, tomatoes, and spices. Cook until oil separates`, estimatedTime: 10 },
    { stepNumber: 4, instruction: `Add cashew paste and cook for 2 minutes`, estimatedTime: 2 },
    { stepNumber: 5, instruction: `Add ${mainLower} and pour in cream. Mix gently and cook on low heat for 15 minutes`, estimatedTime: 15 },
    { stepNumber: 6, instruction: `Finish with a drizzle of cream and garam masala. Serve with naan or biryani`, estimatedTime: 2 },
  ];
}

function generateDahiSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Wash and cut ${mainLower} into medium pieces`, estimatedTime: 5 },
    { stepNumber: 2, instruction: `Whisk yogurt until smooth. Add turmeric, cumin, and salt`, estimatedTime: 2 },
    { stepNumber: 3, instruction: `Heat oil in a pan, add mustard seeds, curry leaves, and green chilies`, estimatedTime: 1 },
    { stepNumber: 4, instruction: `Add chopped onions and cook until soft`, estimatedTime: 5 },
    { stepNumber: 5, instruction: `Lower heat and add the whisked yogurt mixture. Stir continuously to prevent curdling`, estimatedTime: 5 },
    { stepNumber: 6, instruction: `Add ${mainLower} and cook on low heat for 15 minutes, stirring occasionally`, estimatedTime: 15 },
    { stepNumber: 7, instruction: `Temper with cumin, mustard seeds, and curry leaves in ghee. Pour over the curry. Serve with rice`, estimatedTime: 3 },
  ];
}

function generateCoconutCurrySteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Prepare ${mainLower} by washing and cutting into pieces`, estimatedTime: 5 },
    { stepNumber: 2, instruction: `Grate fresh coconut and grind with green chilies, cumin, and garlic into a smooth paste`, estimatedTime: 5 },
    { stepNumber: 3, instruction: `Heat coconut oil in a pan, temper with mustard seeds and curry leaves`, estimatedTime: 2 },
    { stepNumber: 4, instruction: `Add onions and cook until golden. Add ginger-garlic paste and tomatoes`, estimatedTime: 8 },
    { stepNumber: 5, instruction: `Add ground coconut paste, turmeric, and coriander powder. Cook until oil separates`, estimatedTime: 8 },
    { stepNumber: 6, instruction: `Add ${mainLower}, coconut milk, and water. Cover and cook for 20 minutes`, estimatedTime: 20 },
    { stepNumber: 7, instruction: `Garnish with coconut flakes and curry leaves. Serve with appam or rice`, estimatedTime: 2 },
  ];
}

function generateEggMasalaSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Boil eggs for 10 minutes, peel, and make shallow slits on each egg`, estimatedTime: 15 },
    { stepNumber: 2, instruction: `Wash and prepare ${mainLower} — cut into pieces`, estimatedTime: 5 },
    { stepNumber: 3, instruction: `Heat oil in a pan, add cumin seeds and whole spices`, estimatedTime: 1 },
    { stepNumber: 4, instruction: `Add onions, ginger-garlic paste, and green chilies. Cook until golden`, estimatedTime: 8 },
    { stepNumber: 5, instruction: `Add tomatoes, turmeric, chili powder, and coriander powder. Cook until oil separates`, estimatedTime: 10 },
    { stepNumber: 6, instruction: `Add ${mainLower} and cook for 5 minutes`, estimatedTime: 5 },
    { stepNumber: 7, instruction: `Add boiled eggs and garam masala. Toss gently to coat in masala`, estimatedTime: 3 },
    { stepNumber: 8, instruction: `Cook for 5 more minutes. Garnish with coriander. Serve with roti or rice`, estimatedTime: 5 },
  ];
}

function generateKebabSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Cook ${mainLower} until tender. Mash coarsely and let cool`, estimatedTime: 15 },
    { stepNumber: 2, instruction: `Mix mashed ${mainLower} with chopped onions, ginger, green chilies, coriander, and spices`, estimatedTime: 5 },
    { stepNumber: 3, instruction: `Add gram flour or breadcrumbs to bind. Shape into patties or kebabs`, estimatedTime: 5 },
    { stepNumber: 4, instruction: `Heat oil in a pan. shallow fry the kebabs until golden and crispy on both sides`, estimatedTime: 10 },
    { stepNumber: 5, instruction: `Serve hot with chutney, salad, and chaat masala`, estimatedTime: 2 },
  ];
}

function generateRiceSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Cook rice according to package directions. Let it cool slightly`, estimatedTime: 20 },
    { stepNumber: 2, instruction: `Heat oil in a wok over high heat`, estimatedTime: 2 },
    { stepNumber: 3, instruction: `Add cumin seeds, chopped onions, and garlic. Stir fry for 2 minutes`, estimatedTime: 2 },
    { stepNumber: 4, instruction: `Add ${mainLower} and cook on high heat for 3 minutes`, estimatedTime: 3 },
    { stepNumber: 5, instruction: `Add cooled rice, soy sauce, and a splash of sesame oil. Toss everything together`, estimatedTime: 3 },
    { stepNumber: 6, instruction: `Scramble eggs separately and mix in. Garnish with spring onions. Serve hot`, estimatedTime: 5 },
  ];
}

function generatePickleSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Wash and thoroughly dry ${mainLower}. Cut into small pieces or slices`, estimatedTime: 10 },
    { stepNumber: 2, instruction: `Sun-dry the pieces for 2-3 hours until completely moisture-free`, estimatedTime: 180 },
    { stepNumber: 3, instruction: `Mix with mustard oil, red chili powder, turmeric, fenugreek powder, and salt`, estimatedTime: 3 },
    { stepNumber: 4, instruction: `Transfer to a clean, dry glass jar. Seal tightly`, estimatedTime: 2 },
    { stepNumber: 5, instruction: `Store in sunlight for 7 days, shaking daily. The pickle is ready after a week`, estimatedTime: 720 },
  ];
}

function generateRaitaSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Whisk yogurt until smooth and creamy`, estimatedTime: 2 },
    { stepNumber: 2, instruction: `Grate or finely dice ${mainLower}`, estimatedTime: 5 },
    { stepNumber: 3, instruction: `Mix ${mainLower} with yogurt, roasted cumin powder, salt, and a pinch of sugar`, estimatedTime: 2 },
    { stepNumber: 4, instruction: `Add fresh coriander leaves and a drizzle of olive oil`, estimatedTime: 1 },
    { stepNumber: 5, instruction: `Chill for 30 minutes. Serve as a cooling side dish with biryani or kebabs`, estimatedTime: 30 },
  ];
}

function generateSaladSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Wash and thinly slice ${mainLower} into ribbons or julienne strips`, estimatedTime: 5 },
    { stepNumber: 2, instruction: `Add sliced onions, cherry tomatoes, and cucumber`, estimatedTime: 3 },
    { stepNumber: 3, instruction: `Make dressing: mix olive oil, lemon juice, salt, pepper, and a pinch of sugar`, estimatedTime: 2 },
    { stepNumber: 4, instruction: `Toss vegetables with dressing and massage gently for 2 minutes`, estimatedTime: 2 },
    { stepNumber: 5, instruction: `Garnish with sesame seeds, herbs, and lemon wedges. Serve immediately`, estimatedTime: 1 },
  ];
}

function generateDosaSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Prepare the ${mainLower} filling: cook chopped ${mainLower} with turmeric, mustard seeds, curry leaves, and onions`, estimatedTime: 15 },
    { stepNumber: 2, instruction: `Spread the batter thinly on a hot griddle. Drizzle oil around the edges`, estimatedTime: 3 },
    { stepNumber: 3, instruction: `Cook until crispy and golden brown on the bottom`, estimatedTime: 5 },
    { stepNumber: 4, instruction: `Place the ${mainLower} filling in the center and fold`, estimatedTime: 2 },
    { stepNumber: 5, instruction: `Serve hot with sambar and coconut chutney`, estimatedTime: 2 },
  ];
}

function generateOmeletteSteps(mainLower: string, mainDisplay: string): any[] {
  return [
    { stepNumber: 1, instruction: `Beat 2-3 eggs with salt, pepper, and chopped green chilies`, estimatedTime: 2 },
    { stepNumber: 2, instruction: `Finely chop ${mainLower} and onions`, estimatedTime: 3 },
    { stepNumber: 3, instruction: `Heat butter in a non-stick pan over medium heat`, estimatedTime: 2 },
    { stepNumber: 4, instruction: `Add onions and ${mainLower}, saute for 2 minutes until softened`, estimatedTime: 2 },
    { stepNumber: 5, instruction: `Pour beaten eggs over the vegetables. Cook until bottom is set`, estimatedTime: 3 },
    { stepNumber: 6, instruction: `Flip carefully, cook the other side for 1 minute. Serve with bread or toast`, estimatedTime: 2 },
  ];
}


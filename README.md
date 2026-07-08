# Smart Kitchen Assistant

A full-stack Next.js web application that helps users manage their kitchen, plan meals, and discover recipes based on ingredients they already have.

## Features

### Authentication
- Email/password login with secure cookie-based sessions
- User registration with password hashing (bcryptjs)
- Session management with Prisma Session model
- Auto-redirect to login for protected pages

### Recipe Catalog
- 50+ curated recipes with correct ingredients and step-by-step cooking instructions
- Filter by cuisine, meal type, and dietary preferences
- Recipe detail page with ingredients, nutritional info, cooking time, difficulty
- Save/unsave recipes to personal collections
- Rate and review recipes
- Share recipes via link
- Watch video tutorials (YouTube integration)

### Pantry Management
- Track ingredients in your kitchen
- Quantity and unit tracking (pcs, kg, g, ml, liters, pack, can)
- Category organization (Vegetables, Fruits, Dairy, Meats, Grains, Spices, etc.)
- Low stock alerts
- Auto-generate shopping lists from meal plans

### Meal Planning
- Weekly meal planner with day-by-day grid view
- Add recipes to Breakfast, Lunch, Dinner, or Snacks slots
- Navigate between weeks
- Share meal plans on WhatsApp (full week or single day)
- Auto-generate shopping lists from meal plans

### Shopping List
- Add items manually with quantity, unit, and category
- Mark items as purchased
- Edit and delete items
- Filter by All, Pending, or Purchased
- Quick Buy links to BigBasket, Zepto, and Swiggy Instamart
- Auto-generate from meal plans
- Shows items missing from pantry

### Collections
- Organize saved recipes into custom collections
- Create, edit, and delete collections
- Add/remove recipes from collections
- Visual recipe cards with cooking time, difficulty, cuisine

### Smart Matching
- Add ingredients to pantry
- Get recipe recommendations based on available ingredients
- Match percentage shown for each recipe
- Shows which ingredients you have vs. missing
- Shopping list for missing items

### AI Chat
- Chat with AI assistant for cooking help
- Chat history stored per user

### User Preferences
- Set dietary preferences (Veg, Non-Veg, Vegan, etc.)
- Set health goals
- Preferences stored per user

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: MySQL (Aiven Cloud) with Prisma ORM
- **Authentication**: Custom cookie-based sessions with bcryptjs
- **AI**: OpenAI API / Gemini API for chat and recipe matching
- **Deployment**: Vercel
- **Styling**: TailwindCSS with dark mode support

## Important Logic & Methods

### Authentication Flow (`src/lib/server-auth.ts`, `src/lib/auth-utils.ts`)
- **`hashPassword()`**: Hashes passwords using bcrypt with 12 salt rounds before storing
- **`comparePassword()`**: Compares entered password with stored hash using bcrypt.compare
- **`getServerAuth()`**: Extracts session cookie from request headers, looks up session in DB, returns user data if valid and not expired
- **`getApiAuth()`**: Same as getServerAuth but for API route requests
- Session tokens are 32-byte random hex strings stored in `sessions` table with 7-day expiry

### Session Management (`src/app/api/login/route.ts`, `src/app/api/logout/route.ts`)
- Login creates a session token and sets it as an httpOnly cookie
- Cookie is httpOnly, secure (in production), sameSite=lax, path=/
- Logout deletes the session from DB and clears the cookie (maxAge=0)

### Cached Fetch (`src/hooks/useCachedFetch.ts`)
- In-memory cache with 5-minute TTL to avoid repeated API calls
- Checks cache before first render to prevent loading spinners on navigation
- `refresh()` method clears cache and refetches data
- 15-second timeout with AbortController to prevent hanging requests

### Auth Context (`src/context/AuthContext.tsx`)
- Provides `user`, `loading`, and `refreshAuth` to all components
- Checks `/api/auth/check` on mount to determine if user is logged in
- 10-second timeout on auth check request

### Recipe Matching (`src/app/api/recipes/match/route.ts`)
- Compares pantry ingredients with recipe ingredients
- Calculates match percentage based on available ingredients
- Returns recipes sorted by match percentage

### Shopping List Generation (`src/app/api/shopping-list/generate/route.ts`)
- Reads meal plans for the current week
- Aggregates ingredients from planned recipes
- Compares against pantry to find missing items
- Creates shopping list entries for missing items

### API Routes Structure
```
src/app/api/
├── auth/
│   ├── check/route.ts        - Verify if user is logged in
│   ├── forgot-password/route.ts
│   └── reset-password/route.ts
├── login/route.ts            - User login
├── logout/route.ts           - User logout
├── register/route.ts         - User registration
├── recipes/
│   ├── route.ts              - List all recipes
│   ├── search/route.ts       - Search recipes
│   ├── external/route.ts     - Fetch external recipe data
│   └── match/route.ts        - Match recipes to pantry
├── meal-plans/route.ts       - CRUD for meal plans
├── shopping-list/
│   ├── route.ts              - CRUD for shopping items
│   ├── generate/route.ts     - Auto-generate from meal plans
│   └── clean/route.ts        - Remove purchased items
├── pantry/
│   ├── route.ts              - CRUD for pantry ingredients
│   └── low-stock/route.ts    - Get low stock items
├── collections/
│   ├── route.ts              - CRUD for collections
│   ├── add/route.ts          - Add recipe to collection
│   └── remove/route.ts       - Remove recipe from collection
├── saved-recipes/route.ts    - Save/unsave recipes
├── reviews/route.ts          - Submit/get reviews
├── substitutes/route.ts      - Get ingredient substitutes
├── chat/
│   ├── route.ts              - Send chat message
│   └── history/route.ts      - Get chat history
├── preferences/route.ts      - Get/set user preferences
├── user/route.ts             - Update user profile
├── user-recipes/             - CRUD for user-created recipes
├── receipt-scanner/route.ts  - AI receipt image recognition
└── photo-recognize/route.ts  - AI photo ingredient recognition
```

### Database Schema (Prisma)
- **User**: id, name, email, password, role, dietaryPreferences, healthGoals
- **Recipe**: id, title, description, cuisine, mealType, cookingTime, servings, difficulty, nutritionalInfo
- **RecipeIngredient**: id, recipeId, ingredient, quantity, unit
- **RecipeStep**: id, recipeId, stepNumber, instruction, estimatedTime
- **Session**: id, sessionToken, userId, expires
- **SavedRecipe**: id, userId, recipeId, collectionId
- **MealPlan**: id, userId, date, mealType, recipeId
- **ShoppingList**: id, userId, item, quantity, unit, isPurchased, category
- **Collection**: id, userId, name, description
- **Review**: id, userId, recipeId, rating, comment
- **UserRecipe**: id, userId, title, description, cuisine, mealType, cookingTime, servings, difficulty
- **ChatMessage**: id, userId, role, content

### Page Descriptions

| Page | Path | Description |
|------|------|-------------|
| Home | `/` | Landing page with app overview |
| Login | `/login` | Email/password login form |
| Register | `/register` | User registration with password confirmation |
| Forgot Password | `/forgot-password` | Password reset request |
| Reset Password | `/reset-password` | Password reset form with token |
| Dashboard | `/dashboard` | Main dashboard with recipe search, pantry ingredients, meal plan summary |
| Recipes | `/recipes` | Browse all recipes with filters |
| Recipe Detail | `/recipes/[id]` | Full recipe view with ingredients, steps, save/share buttons |
| Meal Plan | `/meal-plan` | Weekly meal planner grid |
| Pantry | `/pantry` | Manage kitchen ingredients |
| Shopping List | `/shopping-list` | Shopping list with quick buy links |
| Collections | `/collections` | Organize saved recipes into collections |
| Saved Recipes | `/saved-recipes` | View all saved recipes |
| Chat | `/chat` | AI-powered cooking assistant chat |
| Match | `/match` | Smart recipe matching based on pantry |
| Receipt Scanner | `/receipt-scanner` | AI receipt image analysis |
| Preferences | `/preferences` | Set dietary preferences and health goals |

### Deployment
- Build command: `prisma generate && next build`
- Environment variables: DATABASE_URL, OPENAI_API_KEY, GEMINI_API_KEY, NEXTAUTH_SECRET
- Database: MySQL via Aiven Cloud
- Auto-seeds 50 recipes with correct ingredients and instructions on first deploy

## Live Demo

🔗 [smart-kitchen-assistant-five.vercel.app](https://smart-kitchen-assistant-five.vercel.app/login)

# Smart Kitchen Assistant - Project Plan

## Project Overview
AI-powered smart kitchen assistant website that helps users discover dishes they can cook using groceries already available at home.

## Target Users
- Busy working professionals
- Working women
- Bachelors
- Families
- Health-conscious users

## Tech Stack
- **Framework:** Next.js 16.2.6 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Database:** MySQL + Prisma ORM
- **Authentication:** Next-Auth v4
- **State Management:** Zustand
- **Validation:** Zod + React Hook Form
- **Animations:** Framer Motion
- **Charts:** Recharts
- **HTTP Client:** Axios
- **Icons:** Lucide React

---

## Features

### Phase 1: MVP (Core)

#### 1. User Authentication
- Sign up / login with Next-Auth
- Email/password authentication with bcryptjs
- Personalized dashboard per user
- Password reset functionality
- Session management

#### 2. Ingredient Inventory / Pantry Manager
- Add groceries with: name, quantity, unit, category, expiry date
- Categories: vegetables, fruits, dairy, spices, grains, beverages, meats, snacks, condiments, others
- Search & filter ingredients
- Bulk add ingredients
- Visual pantry dashboard
- Low-stock alerts
- Expiring-soon alerts (highlight items expiring within 3 days)
- Edit / remove items
- Quantity tracking with units (kg, g, pcs, liters, etc.)

#### 3. Recipe Discovery (Main Feature)
- AI-powered recipe suggestions based on available ingredients
- "What can I cook?" — user selects ingredients they have, system suggests recipes
- Show recipes that use maximum available ingredients
- Display "missing ingredients" for each recipe
- Filter by: cuisine, meal type, cooking time, difficulty
- Sort by: match percentage, cooking time, popularity
- Recipe match percentage indicator (e.g., "7/10 ingredients available")

#### 4. Recipe Detail Page
- Full recipe view with ingredients list and step-by-step instructions
- Cooking time, servings, difficulty level
- Nutritional info: calories, protein, carbs, fat, fiber
- Save / bookmark recipes
- Share recipes (copy link, social share)
- User ratings and reviews
- Image gallery for recipes

#### 5. Dashboard (Home Page)
- Welcome message with user's name
- Quick stats: total ingredients, expiring soon, saved recipes
- "What can I cook today?" quick action
- Recently viewed recipes
- Trending recipes
- Quick pantry access

---

### Phase 2: Planning & Health

#### 6. Meal Planner
- Weekly meal planning interface (7-day calendar)
- Meal slots: breakfast, lunch, dinner, snacks
- Drag-and-drop or click to assign recipes to days
- Visual weekly calendar view
- Generate shopping list from meal plan
- Export meal plan as image/PDF
- Copy previous week's plan

#### 7. Smart Shopping List
- Auto-generate shopping list from meal plan
- Compare with pantry to show only items NOT in stock
- Manually add custom items to shopping list
- Check off purchased items
- Share shopping list
- Categories in shopping list (produce, dairy, pantry, etc.)

#### 8. Dietary Preferences & Health Tracking
- Set dietary preferences: vegetarian, vegan, keto, low-carb, high-protein, gluten-free, dairy-free
- Set health goals: weight loss, muscle gain, maintenance
- AI filters recipes based on preferences
- Calorie & macro tracking per meal
- Daily/weekly nutrition summary
- Recharts dashboard for nutrition trends
- Water intake tracker

#### 9. Cooking Timer
- Built-in timer for each cooking step
- Custom timer duration
- Audio notification when timer ends
- Multi-timer support for parallel cooking
- Pause, resume, reset controls
- Visual progress indicator

---

### Phase 3: Advanced Features

#### 10. AI Chat Assistant
- Chat interface for cooking questions
- Natural language queries: "I have chicken and tomatoes, what can I make?"
- Cooking tips and technique advice
- Ingredient substitution suggestions
- "How do I make this dish spicier?"
- Meal prep advice
- Voice input support

#### 11. Recipe Collections / Bookmarks
- Create custom collections (e.g., "Quick Weeknight Meals", "Party Dishes", "Healthy Options")
- Organize saved recipes into collections
- Rename / delete collections
- Share collections with others
- Public recipe collections from community

#### 12. Community & Social Features
- Share recipes with friends
- Rate recipes (1-5 stars)
- Write reviews and comments
- Trending/popular recipes section
- User profiles with activity
- Follow other users
- Recipe challenges (e.g., "Meatless Monday")

#### 13. Mobile PWA
- Install as app on phone
- Offline access to pantry and saved recipes
- Push notifications for expiring items
- Responsive design for all screen sizes
- Add to home screen capability

#### 14. Additional Features
- Recipe import from URL (parse recipe from website)
- Meal prep calculator (scale recipes for multiple servings)
- Seasonal recipe suggestions
- Leftover recipe ideas
- Food waste tracker (track expired items)
- Recipe of the day
- Cooking video integration
- Multi-language support

---

## Database Schema (Planned)

### Users
- id, name, email, password, role, dietaryPreferences, healthGoals, createdAt, updatedAt

### Ingredients
- id, userId, name, quantity, unit, category, expiryDate, createdAt, updatedAt

### Recipes
- id, title, description, cuisine, mealType, cookingTime, servings, difficulty, nutritionalInfo, createdAt, updatedAt

### RecipeIngredients
- id, recipeId, ingredientName, quantity, unit

### RecipeSteps
- id, recipeId, stepNumber, instruction, estimatedTime

### UserRecipeIngredients (Linking user's ingredients to recipes)
- id, userId, recipeId, isAvailable

### SavedRecipes
- id, userId, recipeId, collectionId, savedAt

### MealPlan
- id, userId, date, mealType, recipeId, createdAt

### ShoppingList
- id, userId, item, quantity, unit, isPurchased, category, createdAt

### NutritionLog
- id, userId, date, calories, protein, carbs, fat, fiber, mealType, createdAt

### Collections
- id, userId, name, description, createdAt

### Reviews
- id, userId, recipeId, rating, comment, createdAt

---

## API Routes (Planned)

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/forgot-password

### Pantry
- GET /api/pantry - List all ingredients
- POST /api/pantry - Add ingredient
- PUT /api/pantry/[id] - Update ingredient
- DELETE /api/pantry/[id] - Remove ingredient
- GET /api/pantry/expiring - Get expiring items
- GET /api/pantry/low-stock - Get low stock items

### Recipes
- GET /api/recipes - List recipes with filters
- GET /api/recipes/[id] - Recipe details
- POST /api/recipes - Create recipe (admin)
- GET /api/recipes/discover?ingredients[]=chicken&ingredients[]=tomato - AI discovery
- POST /api/recipes/[id]/save - Save recipe
- DELETE /api/recipes/[id]/save - Unsave recipe
- POST /api/recipes/[id]/review - Add review

### Meal Planner
- GET /api/meal-plan?week=2024-W22 - Get weekly plan
- POST /api/meal-plan - Add meal
- PUT /api/meal-plan/[id] - Update meal
- DELETE /api/meal-plan/[id] - Remove meal

### Shopping List
- GET /api/shopping-list - Get list
- POST /api/shopping-list - Add item
- PUT /api/shopping-list/[id] - Toggle purchase
- DELETE /api/shopping-list/[id] - Remove item
- POST /api/shopping-list/generate - Auto-generate from meal plan

### Nutrition
- GET /api/nutrition?start=2024-01-01&end=2024-01-07 - Weekly summary
- POST /api/nutrition/log - Log meal nutrition

### Collections
- GET /api/collections - List collections
- POST /api/collections - Create collection
- PUT /api/collections/[id] - Update collection
- DELETE /api/collections/[id] - Delete collection
- GET /api/collections/[id]/recipes - Get recipes in collection

### AI Chat
- POST /api/chat - Send message and get AI response

---

## UI Pages Structure

```
/app
  /page.tsx              - Dashboard (Home)
  /login/page.tsx        - Login page
  /register/page.tsx     - Registration page
  /dashboard/page.tsx    - Main dashboard
  /pantry/page.tsx       - Pantry/ingredient management
  /recipes/page.tsx      - Recipe discovery/browse
  /recipes/[id]/page.tsx - Recipe detail
  /meal-plan/page.tsx    - Weekly meal planner
  /shopping-list/page.tsx- Shopping list
  /nutrition/page.tsx    - Nutrition dashboard
  /collections/page.tsx  - Recipe collections
  /profile/page.tsx      - User profile & preferences
  /chat/page.tsx         - AI chat assistant
  /community/page.tsx    - Community features
```

---

## Development Order

1. **Setup & Auth** - Project setup, Next-Auth integration, login/register pages
2. **Pantry Manager** - CRUD for ingredients, dashboard stats, alerts
3. **Recipe Discovery** - Recipe database, search, AI matching algorithm
4. **Recipe Detail** - Full recipe view, save/bookmark functionality
5. **Dashboard** - Home page with quick actions and stats
6. **Meal Planner** - Weekly calendar, drag-and-drop
7. **Shopping List** - Auto-generation, manual add, check-off
8. **Dietary Preferences** - User settings, recipe filtering, nutrition tracking
9. **Cooking Timer** - In-app timer component
10. **AI Chat** - Chat interface with AI integration
11. **Collections** - Bookmark organization
12. **Community** - Reviews, ratings, social features
13. **PWA & Polish** - Offline support, animations, responsive design

---

## Design Guidelines
- Clean, modern UI with warm kitchen-themed colors
- Mobile-first responsive design
- Smooth animations with Framer Motion
- Dark mode support
- Accessible (WCAG compliant)
- Intuitive navigation for busy users (minimal clicks to core features)

---

## Notes
- This plan is a living document and will be updated as development progresses
- AI recipe matching may use a rule-based approach initially, then integrate with an AI API for smarter suggestions
- Recipe database can start with a curated set of popular recipes and grow via community contributions

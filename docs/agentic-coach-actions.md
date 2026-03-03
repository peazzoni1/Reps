# Feature Spec: Agentic Coach Actions

## Overview

Extend the AI Coach chat interface to allow Claude to take actions on behalf of the user — starting with generating a weekly meal plan that persists to a new Meals screen.

## Status

**Backlog** — pending beta testing of core coach chat feature.

---

## User Story

> As a user chatting with my AI coach, I want to ask it to create a weekly meal plan based on our conversation, and have that plan appear on a dedicated screen — without having to manually re-enter anything.

**Example flow:**
1. User and coach discuss nutrition goals in chat
2. User: "Can you put together a weekly meal plan based on what we talked about?"
3. Coach creates the plan in the background and confirms: "Done! I've added a weekly plan to your Meals tab."
4. User navigates to Meals tab and sees the structured plan

---

## Scope (V1)

**In scope:**
- `create_meal_plan` tool — Claude can generate and save a 7-day meal plan
- New Meals screen displaying the active plan
- Coach confirms in chat when the plan has been created

**Out of scope for V1:**
- Updating or deleting plans from chat
- Multiple saved plans / plan history
- Grocery list generation
- Syncing with calendar

---

## Technical Design

### 1. Tool Definition (`anthropic.ts`)

Add a `tools` array to the API request:

```ts
{
  name: "create_meal_plan",
  description: "Creates a 7-day meal plan and saves it for the user to view on the Meals screen.",
  input_schema: {
    type: "object",
    properties: {
      days: {
        type: "array",
        items: {
          type: "object",
          properties: {
            day: { type: "string" },         // e.g. "Monday"
            breakfast: { type: "string" },
            lunch: { type: "string" },
            dinner: { type: "string" },
            snack: { type: "string" }
          },
          required: ["day", "breakfast", "lunch", "dinner"]
        }
      },
      notes: { type: "string" }              // optional coaching notes
    },
    required: ["days"]
  }
}
```

### 2. Two-turn API loop (`anthropic.ts`)

`sendChatMessage` becomes a loop:

```
POST → Claude
  if response contains tool_use block:
    execute tool (save to storage)
    POST → Claude with tool_result
  return final text response
```

The function signature stays the same so `ChatScreen` requires no changes beyond a minor loading state label tweak.

### 3. Storage (`storage.ts`)

New key `@reps_meal_plan`. Two new functions:
- `saveMealPlan(plan: MealPlan): Promise<void>`
- `getMealPlan(): Promise<MealPlan | null>`

New types in `types/index.ts`:
```ts
interface MealPlanDay {
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  snack?: string;
}

interface MealPlan {
  id: string;
  createdAt: string;
  days: MealPlanDay[];
  notes?: string;
}
```

### 4. New Screen (`MealPlanScreen.tsx`)

- Reads active plan from storage on focus
- Renders each day as a card with meal rows
- Empty state prompts user to ask the coach to create one
- No editing in V1 — read-only

### 5. Navigation

Add a Meals tab to `TabNavigator.tsx`.

---

## Open Questions

- Should creating a new plan overwrite the existing one, or should we keep a history?
- Should the coach be able to update an existing plan mid-conversation (e.g. "swap Wednesday dinner")?
- Do we want to gate this feature behind having a certain number of days of logged data first?

# BLUE FITNESS 1.0 Roadmap

## Executive Summary

This roadmap outlines the feature development plan for the Blue Fitness 1.0 App Store release. Features are prioritized based on complexity, user value, and business necessity. The goal is to ship a sustainable, differentiated product that delivers immediate value while managing AI API costs.

---

## 1.0 Release Scope

### ✅ Included in 1.0
1. **Paywall & Subscription Management** (Critical - Business Sustainability)
2. **Daily Notes Card** (High Value - Low Complexity)
3. **Goals Feature** (Differentiation - Medium Complexity)

### 🔮 Post-1.0 (v1.1+)
- **Apple HealthKit Integration** (High Complexity - Requires extensive testing)

---

## Feature Details (Ordered by Priority)

### 1. 💰 Paywall & Subscription Management
**Priority:** CRITICAL | **Complexity:** Medium | **Timeline:** 2-3 weeks

#### Purpose
- Manage Anthropic API costs (daily check-ins are expensive at scale)
- Generate sustainable revenue
- Gate premium features (unlimited AI check-ins, advanced analytics)

#### Implementation Details

**Tech Stack:**
- RevenueCat SDK for subscription management
- App Store Connect for pricing/subscriptions
- Supabase for user subscription status sync

**Core Components:**
1. **Subscription Tiers**
   - Free: 3 AI check-ins per week, basic logging
   - Premium ($4.99/month or $49.99/year): Unlimited AI check-ins, advanced features, priority support

2. **Paywall Screens**
   - Onboarding paywall (soft - shown after 3 AI check-ins)
   - Settings/upgrade screen
   - Feature-gate paywall (hard - when free tier exhausted)

3. **Backend Changes**
   - Add `subscription_tier` and `subscription_status` to `user_profiles` table
   - Add `ai_check_in_count` tracking (reset weekly for free users)
   - Supabase Edge Function for RevenueCat webhook integration
   - Update `getDailyCheckIn()` to check subscription status

4. **UI Components**
   - [src/screens/PaywallScreen.tsx](src/screens/PaywallScreen.tsx) - Main paywall with benefits
   - [src/components/SubscriptionBadge.tsx](src/components/SubscriptionBadge.tsx) - Premium badge in header
   - [src/services/subscriptions.ts](src/services/subscriptions.ts) - RevenueCat wrapper

**Success Metrics:**
- Conversion rate to premium
- Retention rate at 30/60/90 days
- API cost per user vs. revenue

---

### 2. 📝 Daily Notes Card
**Priority:** HIGH | **Complexity:** Low | **Timeline:** 3-5 days

#### Purpose
- Quick capture of daily thoughts, feelings, or reminders
- Complements existing activity/food logging
- Low barrier to daily engagement

#### Implementation Details

**Core Components:**
1. **UI Card on HomeScreen**
   - Add below AI Coach card, above Activity/Food toggle
   - Minimalist design: "✍️ DAILY NOTES" header
   - Auto-expanding text input (starts at 2 lines, expands to 8)
   - Auto-save on blur (debounced 500ms)
   - Character limit: 500 characters

2. **Data Model**
   - Local-first with AsyncStorage: `daily_notes_{YYYY-MM-DD}`
   - Supabase table: `daily_notes`
     ```sql
     - id (uuid, primary key)
     - user_id (uuid, foreign key to auth.users)
     - date (date, indexed)
     - content (text)
     - created_at (timestamp)
     - updated_at (timestamp)
     ```

3. **Functionality**
   - One note per day (keyed by date)
   - View past notes in Journal screen (existing tab)
   - Search notes by keyword (future enhancement)

4. **Files to Modify**
   - [src/screens/HomeScreen.tsx:340](src/screens/HomeScreen.tsx#L340) - Add DailyNotes card component
   - [src/components/DailyNotesCard.tsx](src/components/DailyNotesCard.tsx) - New component
   - [src/services/storage.ts](src/services/storage.ts) - Add daily notes CRUD functions
   - [src/services/sync.ts](src/services/sync.ts) - Sync daily notes to Supabase

**Success Metrics:**
- Daily active users who write notes
- Average note length
- Retention correlation (users who note vs. don't)

---

### 3. 🎯 Goals Feature
**Priority:** HIGH | **Complexity:** Medium | **Timeline:** 1-2 weeks

#### Purpose
- Allow users to set custom fitness/health goals
- Create meaningful connection between daily activities and aspirations
- Increase motivation and app stickiness

#### Implementation Details

**Core Components:**
1. **Goal Types**
   - Activity-based: "Run 3x per week", "Lift 4x this month"
   - Streak-based: "Log food daily for 30 days"
   - Custom: Free-form user-defined goals

2. **Goal Management**
   - New "Goals" tab in bottom navigation (replace or add to existing)
   - Create/Edit/Delete goals
   - Set target (e.g., 3 runs/week) and time window (weekly, monthly, custom)
   - Optional: Set start/end dates

3. **Activity Linking**
   - When logging activity, show active goals and allow tagging
   - Auto-suggest goals based on activity type (e.g., "Run" activity → suggest "Running" goals)
   - Progress indicators on goal cards

4. **Progress Tracking**
   - Visual progress bars/rings (inspired by Apple Watch activity rings)
   - Weekly/monthly summary views
   - Celebration animations when goals are achieved
   - Push notification when goal completed

5. **Data Model**
   - Supabase table: `goals`
     ```sql
     - id (uuid, primary key)
     - user_id (uuid, foreign key)
     - title (text, e.g., "Run 3x per week")
     - description (text, optional)
     - goal_type (enum: 'activity_count', 'streak', 'custom')
     - target_value (int, e.g., 3)
     - target_period (enum: 'daily', 'weekly', 'monthly', 'custom')
     - activity_type (text, nullable, links to MovementType)
     - start_date (date)
     - end_date (date, nullable for ongoing goals)
     - is_active (boolean)
     - created_at (timestamp)
     ```
   - Link table: `activity_goals`
     ```sql
     - id (uuid)
     - goal_id (uuid, foreign key to goals)
     - movement_session_id (uuid, foreign key to movement_sessions)
     - logged_at (timestamp)
     ```

6. **New Files**
   - [src/screens/GoalsScreen.tsx](src/screens/GoalsScreen.tsx) - Main goals management screen
   - [src/screens/CreateGoalScreen.tsx](src/screens/CreateGoalScreen.tsx) - Goal creation flow
   - [src/components/GoalCard.tsx](src/components/GoalCard.tsx) - Individual goal display
   - [src/components/GoalProgressRing.tsx](src/components/GoalProgressRing.tsx) - Circular progress indicator
   - [src/services/goals.ts](src/services/goals.ts) - Goal CRUD and progress calculation

7. **Files to Modify**
   - [src/navigation/TabNavigator.tsx](src/navigation/TabNavigator.tsx) - Add Goals tab
   - [src/components/QuickLogCard.tsx](src/components/QuickLogCard.tsx) - Add goal tagging UI
   - [src/services/storage.ts](src/services/storage.ts) - Link activities to goals on save
   - [src/screens/HomeScreen.tsx](src/screens/HomeScreen.tsx) - Show active goal progress summary (optional)

**Success Metrics:**
- % of users who create at least 1 goal
- Average goals per active user
- Goal completion rate
- Retention lift for users with active goals

---

## Post-1.0 Features

### 4. 🏃 Apple HealthKit Integration
**Priority:** MEDIUM | **Complexity:** High | **Timeline:** 3-4 weeks

#### Purpose
- Sync workout data from Apple Health (steps, runs, workouts)
- Export Blue Fitness data to Health app
- Reduce manual logging friction
- Leverage existing Apple Watch ecosystem

#### Implementation Details

**Core Components:**
1. **HealthKit Permissions**
   - Request on first launch or in settings
   - Read: steps, workouts, active energy, heart rate
   - Write: workouts logged in Blue Fitness

2. **Data Sync Strategy**
   - One-way sync initially: Import Apple Health → Blue Fitness
   - Deduplicate: Don't import workouts already logged in Fitness
   - Background sync: Daily at midnight + manual refresh

3. **Workout Mapping**
   - Map HealthKit workout types to Blue Fitness MovementTypes
   - `HKWorkoutActivityTypeRunning` → `run`
   - `HKWorkoutActivityTypeTraditionalStrengthTraining` → `lift`
   - etc.

4. **UI Changes**
   - Settings toggle: "Sync with Apple Health"
   - Last sync timestamp display
   - HealthKit badge on imported activities (to distinguish from manual logs)

5. **Technical Challenges**
   - Privacy & permissions UX
   - Handling duplicate workouts
   - Mapping HealthKit's granular workout types to Blue Fitness' simplified types
   - Background fetch limitations on iOS
   - Testing without physical device/Apple Watch

6. **Dependencies**
   - `expo-health` or native module (Expo may not fully support HealthKit)
   - May require ejecting from Expo or using a custom development client

**Why Post-1.0:**
- High complexity with platform-specific edge cases
- Requires extensive testing with real devices/Apple Watches
- Not critical for core value prop (AI coaching + manual logging works)
- Better to nail core features first, then add integrations

---

## Development Workflow

### Phase 1: Foundation (Week 1-2)
1. Set up RevenueCat account and App Store subscriptions
2. Implement paywall UI and subscription logic
3. Update Supabase schema for subscriptions and daily notes

### Phase 2: Core Features (Week 3-4)
1. Build Daily Notes card and sync
2. Implement Goals data model and CRUD
3. Build Goals UI and progress tracking

### Phase 3: Integration & Testing (Week 5)
1. Connect Goals to activity logging
2. Test subscription flows end-to-end
3. Polish UI/UX across all new features

### Phase 4: App Store Prep (Week 6)
1. Create App Store screenshots showcasing new features
2. Write App Store description emphasizing AI coach + goals
3. Submit for review with subscription IAP

---

## Success Criteria for 1.0 Launch

- **Business:** 5% conversion to premium within first month
- **Engagement:** 30% of users create at least 1 goal
- **Retention:** 40% Day 30 retention for active users
- **Technical:** <1% crash rate, AI check-in success rate >95%
- **Revenue:** Positive unit economics (LTV > CAC within 6 months)

---

## Future Considerations (v1.2+)

- **Social Features:** Share goals/achievements with friends
- **Advanced Analytics:** Trends, insights, correlations
- **Nutrition Tracking:** Macro counting, meal planning
- **Wearable Integrations:** Garmin, Fitbit, Whoop
- **Coach Customization:** Tone, personality, focus areas
- **Challenges:** Community challenges, competitions

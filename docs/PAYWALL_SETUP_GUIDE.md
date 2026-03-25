# Paywall Setup Guide - Phase 1

This guide walks you through setting up the backend infrastructure for the paywall feature.

## ✅ Completed Steps

- [x] Database schema updated
- [x] Supabase Edge Function created
- [x] Migration file documented

## 📋 Steps You Need to Complete

### Step 1: Run Database Migration

1. Open **Supabase Dashboard** → Your Project → **SQL Editor**
2. Copy the contents of `/docs/supabase-migration.sql`
3. Paste into SQL Editor and click **Run**
4. Verify success - you should see:
   - `user_profiles` table created (with subscription fields)
   - `ai_check_in_usage` table created

### Step 2: Deploy Supabase Edge Function

In your terminal, run:

```bash
# Login to Supabase (if not already)
npx supabase login

# Link your project (if not already)
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy the webhook function
npx supabase functions deploy revenuecat-webhook
```

**Note:** You'll need your Supabase project ref. Find it in your Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### Step 3: Set Up RevenueCat Account

#### 3.1 Create Account
1. Go to [revenuecat.com](https://www.revenuecat.com)
2. Sign up for a free account
3. Verify your email

#### 3.2 Create Project
1. Click **"Create a new app"** or **"Add Project"**
2. Project name: **"Blue Fitness"**
3. Click **Create**

#### 3.3 Add iOS App
1. In your project, go to **Apps** section
2. Click **"+ Add App"**
3. Select **iOS**
4. Enter your **Bundle ID** (from your Xcode project or `app.json`)
   - Example: `com.yourname.bluefitness`
5. App Name: **"Blue Fitness"**
6. Click **Save**

#### 3.4 Get Public SDK Key
1. In RevenueCat dashboard, go to **API Keys** (left sidebar)
2. Under **Public app-specific API keys**, find your iOS key
3. Copy the key starting with `appl_...`
4. **Save this** - you'll need it for environment variables

### Step 4: Configure Products in RevenueCat

#### 4.1 Create Products
1. Go to **Products** tab (left sidebar)
2. Click **"+ New"** button

**Product 1: Monthly Subscription**
- Product Identifier: `premium_monthly`
- App: Blue Fitness (iOS)
- Type: Subscription
- Duration: 1 month
- Click **Save**

**Product 2: Yearly Subscription**
- Product Identifier: `premium_yearly`
- App: Blue Fitness (iOS)
- Type: Subscription
- Duration: 1 year
- Click **Save**

#### 4.2 Create Entitlement
1. Go to **Entitlements** tab (left sidebar)
2. Click **"+ New"**
3. Entitlement Identifier: `premium_access`
4. Display Name: `Premium Access`
5. Click **Save**

#### 4.3 Attach Products to Entitlement
1. Click on your **premium_access** entitlement
2. Under **Attached Products**, click **"+ Add Product"**
3. Select `premium_monthly` → Click **Add**
4. Click **"+ Add Product"** again
5. Select `premium_yearly` → Click **Add**

### Step 5: Set Up App Store Connect Products

#### 5.1 Create Subscription Group
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app (or create one if you haven't)
3. Go to **Monetization** → **Subscriptions** (or **In-App Purchases**)
4. Click **"+"** to create a new subscription group
5. Reference Name: `Premium Subscription`
6. Click **Create**

#### 5.2 Create Subscriptions

**Subscription 1: Monthly**
1. Click **"+"** within your subscription group
2. Product ID: `com.bluefitness.premium.monthly` (must match exactly)
3. Reference Name: `Premium Monthly`
4. Subscription Duration: 1 month
5. **Subscription Pricing:**
   - Select your primary country (e.g., United States)
   - Price: $4.99 USD
6. **Localization:**
   - Display Name: `Premium Monthly`
   - Description: `Unlimited AI check-ins and advanced features billed monthly`
7. **Review Information:**
   - Screenshot: (you can add this later before submission)
8. Click **Save**

**Subscription 2: Yearly**
1. Click **"+"** within your subscription group again
2. Product ID: `com.bluefitness.premium.yearly` (must match exactly)
3. Reference Name: `Premium Yearly`
4. Subscription Duration: 1 year
5. **Subscription Pricing:**
   - Price: $49.99 USD
6. **Localization:**
   - Display Name: `Premium Yearly`
   - Description: `Unlimited AI check-ins and advanced features billed annually`
7. Click **Save**

#### 5.3 Link Products to RevenueCat
1. Back in **RevenueCat** dashboard
2. Go to **Products** tab
3. For `premium_monthly`:
   - Click **Edit**
   - Under **Store Product IDs** section
   - Add App Store Product ID: `com.bluefitness.premium.monthly`
   - Click **Save**
4. For `premium_yearly`:
   - Click **Edit**
   - Add App Store Product ID: `com.bluefitness.premium.yearly`
   - Click **Save**

### Step 6: Configure RevenueCat Webhook

#### 6.1 Generate Webhook Secret
1. Create a secure random string for your webhook secret:
   ```bash
   openssl rand -hex 32
   ```
2. **Save this secret** - you'll need it for both RevenueCat and Supabase

#### 6.2 Add Secret to Supabase
```bash
# Set the webhook secret in Supabase
npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=your_secret_from_step_6.1
```

#### 6.3 Configure Webhook in RevenueCat
1. In RevenueCat dashboard, go to **Integrations** (left sidebar)
2. Scroll to **Webhooks** section
3. Click **"+ Add"** or **Configure**
4. **Webhook URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/revenuecat-webhook`
   - Replace `YOUR_PROJECT_REF` with your actual Supabase project reference
5. **Authorization Header:**
   - Add header: `authorization`
   - Value: Your webhook secret from step 6.1
6. **Events to Send** - Select these:
   - ✅ `INITIAL_PURCHASE`
   - ✅ `RENEWAL`
   - ✅ `CANCELLATION`
   - ✅ `EXPIRATION`
   - ✅ `PRODUCT_CHANGE`
7. Click **Save**

### Step 7: Set Environment Variables

#### 7.1 Create/Update .env file
In your project root, create or update `.env`:

```bash
# Existing environment variables
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_key

# Add this new variable
EXPO_PUBLIC_REVENUECAT_API_KEY=appl_YOUR_PUBLIC_KEY_HERE
```

Replace `appl_YOUR_PUBLIC_KEY_HERE` with the key from Step 3.4

#### 7.2 Verify .env is in .gitignore
Make sure `.env` is listed in your `.gitignore` file to keep secrets safe.

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] Database tables created successfully in Supabase
- [ ] Edge Function deployed (check Supabase dashboard → Edge Functions)
- [ ] RevenueCat account created with 2 products and 1 entitlement
- [ ] App Store Connect has 2 subscription products
- [ ] Products linked between App Store Connect and RevenueCat
- [ ] Webhook configured in RevenueCat
- [ ] Webhook secret set in Supabase
- [ ] `.env` file has RevenueCat API key

---

## 🧪 Test Webhook (Optional)

To test if your webhook is working:

1. In RevenueCat dashboard, go to **Integrations** → **Webhooks**
2. Click **"Send Test"** next to your webhook
3. Check Supabase dashboard → **Edge Functions** → **revenuecat-webhook** → **Logs**
4. You should see a log entry for the test webhook

---

## 🚀 What's Next?

Once Phase 1 is complete, you'll be ready for:
- **Phase 2:** Client-side services (subscriptions.ts, checkInTracking.ts)
- **Phase 3:** UI components (PaywallModal, badges, quota display)
- **Phase 4:** Integration with HomeScreen

---

## ❓ Troubleshooting

### Supabase Function Won't Deploy
- Make sure you're logged in: `npx supabase login`
- Make sure project is linked: `npx supabase link --project-ref YOUR_REF`
- Check you have the Supabase CLI installed: `npm install -g supabase`

### RevenueCat Products Not Showing
- Make sure Product IDs match exactly between App Store Connect and RevenueCat
- Wait a few minutes - sometimes App Store Connect takes time to sync
- Check that products are "Ready to Submit" in App Store Connect

### Webhook Not Receiving Events
- Verify the webhook URL is correct (check your Supabase project ref)
- Verify the authorization header matches your secret
- Check Edge Function logs in Supabase dashboard
- Use "Send Test" in RevenueCat to manually trigger a test event

---

**Need help?** Let me know which step you're stuck on and I'll guide you through it!

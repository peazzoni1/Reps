# Anthropic API Setup for Supabase

## Step 1: Set up your Anthropic API key as a Supabase secret

You need to add your Anthropic API key to Supabase so the Edge Function can use it securely.

### Option A: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add a new secret:
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your actual Anthropic API key (the one currently in your .env)

### Option B: Using Supabase CLI
```bash
# Set the secret (replace with your actual key)
npx supabase secrets set ANTHROPIC_API_KEY=your-actual-anthropic-key-here
```

## Step 2: Deploy the Edge Function

```bash
# Deploy the anthropic-proxy function
npx supabase functions deploy anthropic-proxy
```

## Step 3: Test the deployment

After deploying, you can test it:
```bash
# Get your function URL from the Supabase dashboard
# It will look like: https://your-project.supabase.co/functions/v1/anthropic-proxy
```

## Step 4: Update your .env file

Remove the `EXPO_PUBLIC_ANTHROPIC_API_KEY` line from your .env file since it's now stored securely in Supabase.

## Verification

After setup, your app will:
- ✅ Call Supabase Edge Function (which requires authentication)
- ✅ Edge Function calls Anthropic API using the secret key
- ✅ API key never exposed in client code
- ✅ Only authenticated users can make requests

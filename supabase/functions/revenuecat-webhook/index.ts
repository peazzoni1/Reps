import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify webhook using query parameter
    const url = new URL(req.url);
    const webhookSecret = url.searchParams.get('secret');
    const expectedSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

    console.log('Webhook request received', {
      method: req.method,
      hasSecret: !!webhookSecret,
      secretConfigured: !!expectedSecret,
      url: url.href
    });

    if (!webhookSecret || webhookSecret !== expectedSecret) {
      console.error('Webhook authorization failed');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid webhook secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse webhook event
    const event = await req.json();
    console.log('RevenueCat webhook received:', {
      type: event.type,
      app_user_id: event.app_user_id,
    });

    const { type, app_user_id, entitlements } = event;

    // Initialize Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Determine subscription status from entitlements
    const premiumEntitlement = entitlements?.premium_access;
    const hasPremium = premiumEntitlement?.expires_date
      ? new Date(premiumEntitlement.expires_date) > new Date()
      : false;

    const tier = hasPremium ? 'premium' : 'free';
    const status = premiumEntitlement?.expires_date
      ? (hasPremium ? 'active' : 'expired')
      : 'inactive';
    const expiresAt = premiumEntitlement?.expires_date || null;

    console.log('Subscription status:', { tier, status, expiresAt });

    // Update user profile with subscription info
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        subscription_tier: tier,
        subscription_status: status,
        subscription_expires_at: expiresAt,
        revenue_cat_user_id: app_user_id,
        last_synced_at: new Date().toISOString(),
      })
      .eq('revenue_cat_user_id', app_user_id)
      .select();

    if (error) {
      console.error('Database update error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully updated subscription status for user:', app_user_id);

    return new Response(
      JSON.stringify({
        success: true,
        updated: data?.length || 0,
        tier,
        status
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

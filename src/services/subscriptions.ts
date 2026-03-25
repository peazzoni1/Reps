import Purchases, { PurchasesPackage, CustomerInfo, PurchasesOfferings } from 'react-native-purchases';
import { supabase } from '../lib/supabase';
import { SubscriptionInfo } from '../types';

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

/**
 * Initialize RevenueCat SDK with user ID
 * Should be called after user authentication
 */
export async function initializeRevenueCat(userId: string): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    console.error('RevenueCat API key not configured');
    return;
  }

  try {
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: userId
    });
    console.log('RevenueCat initialized for user:', userId);
  } catch (error) {
    console.error('RevenueCat initialization error:', error);
  }
}

/**
 * Get current subscription status from RevenueCat
 * Returns subscription tier, status, and expiration info
 */
export async function getSubscriptionStatus(): Promise<SubscriptionInfo> {
  try {
    const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();
    const hasPremium = customerInfo.entitlements.active['premium_access'] !== undefined;

    const subscriptionInfo: SubscriptionInfo = {
      tier: hasPremium ? 'premium' : 'free',
      status: hasPremium ? 'active' : 'inactive',
      expiresAt: hasPremium
        ? customerInfo.entitlements.active['premium_access'].expirationDate
        : null,
      isActive: hasPremium,
    };

    return subscriptionInfo;
  } catch (error) {
    console.error('Error fetching subscription status:', error);

    // Return free tier on error
    return {
      tier: 'free',
      status: 'inactive',
      expiresAt: null,
      isActive: false
    };
  }
}

/**
 * Get available subscription packages (offerings) from RevenueCat
 * Returns array of available subscription packages to purchase
 */
export async function getOfferings(): Promise<PurchasesPackage[]> {
  try {
    const offerings: PurchasesOfferings = await Purchases.getOfferings();

    if (!offerings.current) {
      console.warn('No current offering found in RevenueCat');
      return [];
    }

    return offerings.current.availablePackages || [];
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return [];
  }
}

/**
 * Purchase a subscription package
 * Handles the purchase flow and returns updated customer info
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    // Sync to Supabase after successful purchase
    await syncSubscriptionToSupabase();

    return customerInfo;
  } catch (error: any) {
    // User cancelled purchase
    if (error.userCancelled) {
      console.log('User cancelled purchase');
      return null;
    }

    console.error('Purchase error:', error);
    throw error;
  }
}

/**
 * Restore previous purchases
 * Useful when user reinstalls app or switches devices
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.restorePurchases();

    // Sync to Supabase after restore
    await syncSubscriptionToSupabase();

    return customerInfo;
  } catch (error) {
    console.error('Restore purchases error:', error);
    throw error;
  }
}

/**
 * Sync subscription status from RevenueCat to Supabase
 * Updates user_profiles table with current subscription info
 */
export async function syncSubscriptionToSupabase(): Promise<void> {
  try {
    const subscriptionInfo = await getSubscriptionStatus();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('No authenticated user, skipping subscription sync');
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_tier: subscriptionInfo.tier,
        subscription_status: subscriptionInfo.status,
        subscription_expires_at: subscriptionInfo.expiresAt,
        last_synced_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error syncing subscription to Supabase:', error);
    } else {
      console.log('Subscription synced to Supabase:', subscriptionInfo.tier);
    }
  } catch (error) {
    console.error('Error in syncSubscriptionToSupabase:', error);
  }
}

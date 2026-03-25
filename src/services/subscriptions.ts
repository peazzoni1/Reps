import Purchases, { PurchasesPackage, CustomerInfo, PurchasesOfferings } from 'react-native-purchases';
import { supabase } from '../lib/supabase';
import { SubscriptionInfo } from '../types';

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

// Track initialization state
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize RevenueCat SDK with user ID
 * Should be called after user authentication
 */
export async function initializeRevenueCat(userId: string): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    console.error('RevenueCat API key not configured');
    return;
  }

  // If already initialized, skip
  if (isInitialized) {
    console.log('RevenueCat already initialized');
    return;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
        appUserID: userId
      });
      isInitialized = true;
      console.log('RevenueCat initialized for user:', userId);
    } catch (error) {
      console.error('RevenueCat initialization error:', error);
      isInitialized = false;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

/**
 * Check if RevenueCat SDK is initialized
 */
export function isRevenueCatInitialized(): boolean {
  return isInitialized;
}

/**
 * Wait for RevenueCat to be initialized
 * Returns true if initialized successfully, false if timeout
 */
async function waitForInitialization(timeoutMs: number = 5000): Promise<boolean> {
  if (isInitialized) return true;
  if (initializationPromise) {
    await initializationPromise;
    return isInitialized;
  }

  // Wait with timeout
  const startTime = Date.now();
  while (!isInitialized && Date.now() - startTime < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return isInitialized;
}

/**
 * Get current subscription status from RevenueCat
 * Returns subscription tier, status, and expiration info
 */
export async function getSubscriptionStatus(): Promise<SubscriptionInfo> {
  // Wait for initialization (up to 5 seconds)
  const initialized = await waitForInitialization();

  if (!initialized) {
    console.warn('RevenueCat not initialized, returning free tier');
    return {
      tier: 'free',
      status: 'inactive',
      expiresAt: null,
      isActive: false
    };
  }

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
  // Wait for initialization (up to 5 seconds)
  const initialized = await waitForInitialization();

  if (!initialized) {
    console.warn('RevenueCat not initialized, returning empty offerings');
    return [];
  }

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
  // Wait for initialization
  const initialized = await waitForInitialization();

  if (!initialized) {
    throw new Error('RevenueCat not initialized. Please try again.');
  }

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
  // Wait for initialization
  const initialized = await waitForInitialization();

  if (!initialized) {
    throw new Error('RevenueCat not initialized. Please try again.');
  }

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

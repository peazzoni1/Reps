import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DeviceEventEmitter } from 'react-native';
import { Session } from '@supabase/supabase-js';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from './src/lib/supabase';
import { syncFromSupabase } from './src/services/sync';
import TabNavigator from './src/navigation/TabNavigator';
import AuthScreen from './src/screens/AuthScreen';
import BiometricGateScreen from './src/screens/BiometricGateScreen';
import AccountDetailsScreen from './src/screens/AccountDetailsScreen';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricLocked, setBiometricLocked] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const checkUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    setHasProfile(!error && !!data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        await Promise.all([
          syncFromSupabase(session.user.id),
          checkUserProfile(session.user.id),
        ]);
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (hasHardware && isEnrolled) {
          setBiometricLocked(true);
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_IN' && session) {
        await Promise.all([
          syncFromSupabase(session.user.id),
          checkUserProfile(session.user.id),
        ]);
      }
    });

    // Listen for profile updates
    const handleProfileUpdate = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await checkUserProfile(session.user.id);
      }
    };

    const profileUpdateListener = DeviceEventEmitter.addListener('profileUpdated', handleProfileUpdate);

    return () => {
      subscription.unsubscribe();
      profileUpdateListener.remove();
    };
  }, []);

  if (loading) return null;

  if (session && biometricLocked) {
    return (
      <SafeAreaProvider>
        <BiometricGateScreen onUnlock={() => setBiometricLocked(false)} />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {session ? (
          hasProfile ? (
            <NavigationContainer>
              <TabNavigator />
            </NavigationContainer>
          ) : (
            <AccountDetailsScreen />
          )
        ) : (
          <AuthScreen />
        )}
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

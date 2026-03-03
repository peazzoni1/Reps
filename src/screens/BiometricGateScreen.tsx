import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Nunito_200ExtraLight } from '@expo-google-fonts/nunito';
import { supabase } from '../lib/supabase';
import { Spacing, BorderRadius, Typography } from '../theme';

const GRADIENT_COLORS = ['#2E86C1', '#5BA4CF', '#F2CDAA', '#E8A0A8', '#1A5276'] as const;
const GRADIENT_LOCATIONS = [0, 0.2, 0.45, 0.65, 1] as const;

interface Props {
  onUnlock: () => void;
}

export default function BiometricGateScreen({ onUnlock }: Props) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ Nunito_200ExtraLight });

  useEffect(() => {
    triggerBiometric();
  }, []);

  const triggerBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Blue Fitness',
      cancelLabel: 'Cancel',
    });
    if (result.success) onUnlock();
  };

  const handleUsePassword = async () => {
    await supabase.auth.signOut();
  };

  return (
    <LinearGradient colors={GRADIENT_COLORS} locations={GRADIENT_LOCATIONS} style={styles.gradient}>
      <View style={[styles.inner, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.wordmark}>Blue Fitness</Text>
        <Text style={styles.tagline}>Log your movement. Track how you feel. Keep showing up.</Text>

        <TouchableOpacity onPress={triggerBiometric} style={styles.faceIdButton} activeOpacity={0.8}>
          <Ionicons name="scan-outline" size={30} color="#fff" />
          <Text style={styles.faceIdLabel}>Unlock with Face ID</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleUsePassword} style={styles.fallbackRow} activeOpacity={0.7}>
          <Text style={styles.fallbackText}>Sign in another way</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 48,
    fontWeight: '200',
    fontFamily: 'Nunito_200ExtraLight',
    color: '#fff',
    marginBottom: Spacing.sm,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  tagline: {
    ...Typography.subheadline,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 48,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  faceIdButton: {
    backgroundColor: '#1A5276',
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  faceIdLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif',
    letterSpacing: 0.5,
  },
  fallbackRow: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  fallbackText: {
    ...Typography.footnote,
    color: 'rgba(255,255,255,0.75)',
  },
});

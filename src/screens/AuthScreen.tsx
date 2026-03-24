import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { supabase } from '../lib/supabase';

const CREDENTIALS_KEY = 'bluefitness_credentials';

// Three concentric semicircle arcs — open at the bottom, sunrise shape.
// ViewBox: 0 0 80 60. Center X=40, base Y=58. Radii: 15, 25, 35.
// Paths use two cubic Béziers per arc (k≈0.5523) to reliably approximate semicircles.
const ARC_PATHS = [
  // inner  r=15: peak y=43
  { d: 'M25,58 C25,49.7 31.7,43 40,43 C48.3,43 55,49.7 55,58', pathLen: 50 },
  // middle r=25: peak y=33
  { d: 'M15,58 C15,44.2 26.2,33 40,33 C53.8,33 65,44.2 65,58', pathLen: 82 },
  // outer  r=35: peak y=23
  { d: 'M5,58 C5,38.7 20.7,23 40,23 C59.3,23 75,38.7 75,58',   pathLen: 116 },
];
const ARC_OPACITIES = [1.0, 0.6, 0.3];

// Static stacked arc logo with teal and orange arcs
function ArcLogo() {
  return (
    <View style={logoStyles.logoGlow}>
      <Svg width={80} height={60} viewBox="0 0 80 60">
        {ARC_PATHS.map((arc, i) => (
          <Path
            key={i}
            d={arc.d}
            fill="none"
            stroke={i === 2 ? 'rgba(245, 166, 35, 0.45)' : (i === 0 ? '#3db88a' : `rgba(61, 184, 138, ${ARC_OPACITIES[i]})`)}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ))}
      </Svg>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  logoGlow: {
    shadowColor: '#3db88a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
});

function PrivacyPolicyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[ppStyles.container, { paddingTop: insets.top || 20 }]}>
        <View style={ppStyles.header}>
          <Text style={ppStyles.title}>Privacy Policy</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={24} color="#3db88a" />
          </TouchableOpacity>
        </View>
        <ScrollView style={ppStyles.scroll} contentContainerStyle={ppStyles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={ppStyles.updated}>Last updated: March 2026</Text>

          <Text style={ppStyles.section}>What we collect</Text>
          <Text style={ppStyles.body}>
            When you create an account, we store your email address. As you use the app, we store the
            activity and food logs you create, and the conversations you have with the AI coach.
          </Text>

          <Text style={ppStyles.section}>How your data is stored</Text>
          <Text style={ppStyles.body}>
            Your data is stored in Supabase, a cloud database provider. It is encrypted at rest.
            Access controls ensure that other users cannot read your data.{'\n\n'}
            As the developer of this app, I have administrative access to the database and can
            technically read your data. I will never do this except to diagnose a bug you report,
            and only with your explicit permission.
          </Text>

          <Text style={ppStyles.section}>AI coach conversations</Text>
          <Text style={ppStyles.body}>
            The AI coach is powered by Anthropic's Claude API. When you send a message, the
            conversation is transmitted to Anthropic's servers to generate a response. Anthropic's
            privacy policy applies to that data. We do not use your conversations to train AI models.
          </Text>

          <Text style={ppStyles.section}>What we don't do</Text>
          <Text style={ppStyles.body}>
            We do not sell your data. We do not share your data with advertisers or third parties
            beyond the infrastructure providers listed above (Supabase, Anthropic).
          </Text>

          <Text style={ppStyles.section}>Deleting your data</Text>
          <Text style={ppStyles.body}>
            You can delete your account and all associated data at any time from the app settings.
            Once deleted, your data is permanently removed from our servers within 30 days.
          </Text>

          <Text style={ppStyles.section}>Contact</Text>
          <Text style={ppStyles.body}>
            Questions? Reach out via the feedback option in settings.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const ppStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2e4f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 20,
  },
  updated: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 24,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3db88a',
    marginTop: 24,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(255, 255, 255, 0.75)',
  },
});

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({ Nunito_700Bold });

  useEffect(() => {
    (async () => {
      const [hasHardware, isEnrolled, stored] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        SecureStore.getItemAsync(CREDENTIALS_KEY),
      ]);
      setHasBiometrics(hasHardware && isEnrolled);
      setHasSavedCredentials(!!stored);
    })();
  }, []);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        Alert.alert('Sign in failed', error.message);
      } else {
        await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify({ email, password }));
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        Alert.alert('Sign up failed', error.message);
      } else {
        Alert.alert('Check your email', 'We sent you a confirmation link.');
      }
    }

    setLoading(false);
  };

  const handleFaceId = async () => {
    if (!hasSavedCredentials) {
      Alert.alert('Face ID', 'Sign in with your password once to enable Face ID login.');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to Blue Fitness',
      cancelLabel: 'Cancel',
    });
    if (!result.success) return;

    const stored = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    if (!stored) return;

    setLoading(true);
    const { email: savedEmail, password: savedPassword } = JSON.parse(stored);
    const { error } = await supabase.auth.signInWithPassword({ email: savedEmail, password: savedPassword });
    if (error) {
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
      setHasSavedCredentials(false);
      Alert.alert('Sign in failed', 'Please sign in with your password.');
    }
    setLoading(false);
  };

  return (
    <LinearGradient
      colors={['#2d4a66', '#1f2e4f', '#16202f']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <PrivacyPolicyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.inner, { paddingTop: Math.max(insets.top, 40), paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Brand block */}
          <View>
            <ArcLogo />
            <Text style={[styles.wordmark, fontsLoaded && { fontFamily: 'Nunito_700Bold' }]}>
              Blue Fitness
            </Text>
            <Text style={styles.tagline}>Log your movement. Track how you feel. Keep showing up.</Text>
          </View>

          {/* Form block */}
          <View style={styles.form}>
            <TextInput
              style={[styles.input, emailFocused && styles.inputFocused]}
              placeholder="Email"
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <TextInput
              style={[styles.input, passwordFocused && styles.inputFocused]}
              placeholder="Password"
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />

            <TouchableOpacity
              style={[styles.button, (!email.trim() || !password.trim()) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading || !email.trim() || !password.trim()}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              activeOpacity={0.7}
              style={styles.switchRow}
            >
              <Text style={styles.switchText}>
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.switchLink}>
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </Text>
              </Text>
            </TouchableOpacity>

            {mode === 'signup' && (
              <Text style={styles.privacyText}>
                By creating an account, you agree to our{' '}
                <Text style={styles.privacyLink} onPress={() => setPrivacyVisible(true)}>
                  Privacy Policy
                </Text>
                .
              </Text>
            )}

            {mode === 'signin' && (
              <TouchableOpacity onPress={() => setPrivacyVisible(true)} activeOpacity={0.7} style={styles.privacyRow}>
                <Text style={styles.privacyLink}>Privacy Policy</Text>
              </TouchableOpacity>
            )}


            {mode === 'signin' && hasBiometrics && (
              <TouchableOpacity
                onPress={handleFaceId}
                disabled={loading}
                activeOpacity={0.7}
                style={styles.faceIdRow}
              >
                <Ionicons name="scan-outline" size={28} color="#3db88a" />
                <Text style={styles.faceIdText}>Face ID</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2e4f',
  },
  flex: {
    flex: 1,
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  wordmark: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 32,
    letterSpacing: 0.2,
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    lineHeight: 21,
    color: '#ffffff',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputFocused: {
    borderColor: '#3db88a',
    shadowColor: '#3db88a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    backgroundColor: '#f5a623',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  faceIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  faceIdText: {
    color: '#3db88a',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  switchRow: {
    alignItems: 'center',
    marginTop: 12,
  },
  switchText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
  },
  switchLink: {
    color: '#3db88a',
    fontWeight: '700',
  },
  privacyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 19,
  },
  privacyLink: {
    color: '#3db88a',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  privacyRow: {
    alignItems: 'center',
    marginTop: 4,
  },
});

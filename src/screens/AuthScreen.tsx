import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Easing,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Nunito_200ExtraLight, Nunito_300Light } from '@expo-google-fonts/nunito';
import { supabase } from '../lib/supabase';
import { Typography, Spacing, BorderRadius } from '../theme';

const CREDENTIALS_KEY = 'bluefitness_credentials';

// Four gradient states to cycle through — sky blue → peach warmth → dusty rose → deep blue
const GRADIENTS = [
  ['#2E86C1', '#5BA4CF', '#F2CDAA', '#E8A0A8', '#1A5276'],
  ['#1A5276', '#4A90BE', '#F5D5B8', '#E8A0A8', '#2E6FA3'],
  ['#3A7DAF', '#5BA4CF', '#E8A0A8', '#D490A0', '#1A5276'],
  ['#2E86C1', '#6AB0D4', '#F2CDAA', '#C890A0', '#1A3D5C'],
] as const;

const LOCATIONS = [0, 0.2, 0.45, 0.65, 1] as const;

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

// Static stacked arc logo
function ArcLogo() {
  return (
    <Svg width={80} height={60} viewBox="0 0 80 60">
      {ARC_PATHS.map((arc, i) => (
        <Path
          key={i}
          d={arc.d}
          fill="none"
          stroke={`rgba(255,255,255,${ARC_OPACITIES[i]})`}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}

// Animated gradient that slowly crossfades between colour states
function AnimatedGradientBackground({ children }: { children: React.ReactNode }) {
  const opacities = useRef(
    GRADIENTS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))
  ).current;

  useEffect(() => {
    const steps: Animated.CompositeAnimation[] = [];
    for (let i = 0; i < GRADIENTS.length; i++) {
      const nextI = (i + 1) % GRADIENTS.length;
      steps.push(Animated.delay(6000));
      steps.push(
        Animated.parallel([
          Animated.timing(opacities[nextI], {
            toValue: 1,
            duration: 8000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(opacities[i], {
            toValue: 0,
            duration: 8000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
    }
    Animated.loop(Animated.sequence(steps)).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      {GRADIENTS.map((colors, i) => (
        <Animated.View
          key={i}
          style={[StyleSheet.absoluteFill, { opacity: opacities[i] }]}
        >
          <LinearGradient
            colors={colors as any}
            locations={LOCATIONS}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ))}
      {children}
    </View>
  );
}

function PrivacyPolicyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[ppStyles.container, { paddingTop: insets.top || 20 }]}>
        <View style={ppStyles.header}>
          <Text style={ppStyles.title}>Privacy Policy</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={24} color="#333" />
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
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
    color: '#999',
    marginBottom: 24,
  },
  section: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginTop: 20,
    marginBottom: 6,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
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
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({ Nunito_200ExtraLight, Nunito_300Light });

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

  const wordmarkFont = fontsLoaded ? 'Nunito_200ExtraLight' : undefined;

  return (
    <AnimatedGradientBackground>
      <PrivacyPolicyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.inner, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Brand block */}
          <View>
            <ArcLogo />
            <Text style={[styles.wordmark, wordmarkFont ? { fontFamily: wordmarkFont } : null]}>
              Blue Fitness
            </Text>
            <Text style={styles.tagline}>Log your movement. Track how you feel. Keep showing up.</Text>
          </View>

          {/* Form block */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.65)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.65)"
              value={password}
              onChangeText={setPassword}
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
                <Ionicons name="scan-outline" size={30} color="rgba(255,255,255,0.8)" />
                <Text style={styles.faceIdText}>Face ID</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AnimatedGradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
  },
  wordmark: {
    fontSize: 48,
    fontWeight: '200',
    color: '#fff',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.25)',
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
  form: {
    gap: Spacing.md,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    ...Typography.body,
    color: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  button: {
    backgroundColor: '#1A5276',
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif',
    letterSpacing: 0.5,
  },
  faceIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
  },
  faceIdText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif',
    letterSpacing: 0.5,
  },
  switchRow: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  switchText: {
    ...Typography.footnote,
    color: 'rgba(255,255,255,0.75)',
  },
  switchLink: {
    color: '#fff',
    fontWeight: '700',
  },
  privacyText: {
    ...Typography.footnote,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 18,
  },
  privacyLink: {
    color: 'rgba(255,255,255,0.9)',
    textDecorationLine: 'underline',
  },
  privacyRow: {
    alignItems: 'center',
  },
});

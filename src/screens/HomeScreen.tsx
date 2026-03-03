import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Nunito_700Bold, Nunito_600SemiBold } from '@expo-google-fonts/nunito';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { FeelingType, MovementType, WorkoutExercise } from '../types';
import {
  createMovementSession,
  getRecentDailySnapshots,
  getCachedDailyMessage,
  storeDailyMessage,
  getPreviousDailyMessages,
  toLocalDateStr,
  DailyCheckInMessage,
} from '../services/storage';
import { getBlendedTheme } from '../constants/seasonal';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import QuickLogCard from '../components/QuickLogCard';
import { getDailyCheckIn } from '../services/anthropic';
import { TabParamList } from '../navigation/TabNavigator';

type WeatherInfo = { temp: number; iconName: string };

function getWeatherIconName(code: number): string {
  if (code === 0) return 'sunny-outline';
  if (code <= 2) return 'partly-sunny-outline';
  if (code <= 48) return 'cloudy-outline';
  if (code <= 67) return 'rainy-outline';
  if (code <= 77) return 'snow-outline';
  if (code <= 82) return 'rainy-outline';
  return 'thunderstorm-outline';
}

type HomeNavigationProp = BottomTabNavigationProp<TabParamList, 'Today'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavigationProp>();
  const [profileVisible, setProfileVisible] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [coachMessage, setCoachMessage] = useState<DailyCheckInMessage | null>(null);
  const [coachLoading, setCoachLoading] = useState(true);
  const [coachExpanded, setCoachExpanded] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState<'up' | 'down' | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [fontsLoaded] = useFonts({ Nunito_700Bold, Nunito_600SemiBold });
  const season = getBlendedTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = loc.coords;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
        );
        const data = await res.json();
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          iconName: getWeatherIconName(data.current.weather_code),
        });
      } catch {}
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    const loadMessage = async () => {
      const [cached, recentData, previousMessages] = await Promise.all([
        getCachedDailyMessage(),
        getRecentDailySnapshots(5),
        getPreviousDailyMessages(),
      ]);
      const count = recentData.reduce((sum, d) => sum + d.exercises.length, 0);
      if (!cancelled) setSessionCount(count);
      if (cached) {
        if (!cancelled) { setCoachMessage(cached); setCoachLoading(false); }
        return;
      }
      try {
        const message = await getDailyCheckIn(recentData, previousMessages);
        if (!cancelled && message) {
          const entry: DailyCheckInMessage = {
            date: toLocalDateStr(new Date()),
            headline: message.headline,
            body: message.body,
          };
          await storeDailyMessage(entry);
          setCoachMessage(entry);
        }
      } catch {}
      if (!cancelled) setCoachLoading(false);
    };
    loadMessage();
    return () => { cancelled = true; };
  }, []));

  const handleTellMeMore = () => {
    if (coachMessage) {
      navigation.navigate('Coach', {
        initialMessage: `${coachMessage.headline}\n\n${coachMessage.body}`,
      });
    }
  };

  const handleSave = async (entry: { type: MovementType; label: string; feelings: FeelingType[]; note?: string; workoutDetails?: WorkoutExercise[] }) => {
    await createMovementSession(
      entry.type,
      entry.feelings,
      entry.label,
      entry.note,
      entry.workoutDetails
    );
  };

  const handleLogout = async () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setProfileVisible(false);
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const initials = userEmail ? userEmail[0].toUpperCase() : '?';

  const ACCENT = '#3d7a8a';

  return (
    <LinearGradient colors={['#f0f6fa', '#fdf4f0']} style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={[styles.headerTitle, fontsLoaded && { fontFamily: 'Nunito_700Bold' }]}>Today</Text>
        {weather ? (
          <View style={styles.weatherBadge}>
            <Ionicons name={weather.iconName as any} size={14} color={ACCENT} />
            <Text style={styles.weatherText}>{weather.temp}°</Text>
          </View>
        ) : (
          <View style={styles.weatherBadge} />
        )}
        <TouchableOpacity style={styles.userButton} onPress={() => setProfileVisible(true)} activeOpacity={0.8}>
          <Text style={styles.userInitials}>{initials}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* AI Coach Daily Check-In */}
        <View style={styles.coachCard}>
          <LinearGradient
            colors={['#ffffff', '#fff5f2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.coachAccentBar} />
          <View style={styles.coachCardContent}>
            <Text style={[styles.coachLabel, fontsLoaded && { fontFamily: 'Nunito_600SemiBold' }]}>✦ AI Coach · Daily Check-In</Text>
            {coachLoading ? (
              <View style={styles.coachMessagePlaceholder}>
                <View style={[styles.placeholderLine, { width: '60%', height: 16, marginBottom: 8 }]} />
                <View style={[styles.placeholderLine, { width: '90%' }]} />
                <View style={[styles.placeholderLine, { width: '65%', marginTop: 6 }]} />
              </View>
            ) : coachMessage ? (
              <>
                <Text style={[styles.coachHeadline, fontsLoaded && { fontFamily: 'Nunito_600SemiBold' }]}>
                  {coachMessage.headline}
                </Text>
                <Text style={styles.coachBody} numberOfLines={coachExpanded ? undefined : 3}>
                  {coachMessage.body}
                </Text>
                {!coachExpanded && (
                  <TouchableOpacity onPress={() => setCoachExpanded(true)} activeOpacity={0.7}>
                    <Text style={styles.readMore}>Read more</Text>
                  </TouchableOpacity>
                )}
                {sessionCount > 0 && (
                  <Text style={styles.coachCaption}>
                    ↑ Based on your last {sessionCount} session{sessionCount !== 1 ? 's' : ''}
                  </Text>
                )}
                {coachExpanded && (
                  <>
                    <TouchableOpacity onPress={handleTellMeMore} activeOpacity={0.7} style={styles.tellMeMoreRow}>
                      <Text style={styles.tellMeMore}>Tell me more →</Text>
                    </TouchableOpacity>
                    <View style={styles.feedbackRow}>
                      <TouchableOpacity
                        onPress={() => setCoachFeedback(coachFeedback === 'up' ? null : 'up')}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={coachFeedback === 'up' ? 'thumbs-up' : 'thumbs-up-outline'}
                          size={18}
                          color={coachFeedback === 'up' ? ACCENT : '#b0bec5'}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setCoachFeedback(coachFeedback === 'down' ? null : 'down')}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={coachFeedback === 'down' ? 'thumbs-down' : 'thumbs-down-outline'}
                          size={18}
                          color={coachFeedback === 'down' ? ACCENT : '#b0bec5'}
                        />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            ) : null}
          </View>
        </View>

        {/* Quick log card */}
        <QuickLogCard season={{ ...season, color: '#3d7a8a', accent: '#7ab8c8', cardBg: '#fffaf8' }} onSave={handleSave} />

      </ScrollView>

      {/* Profile modal */}
      <Modal visible={profileVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setProfileVisible(false)}
          />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.modalHandle} />

            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>

            {/* Email */}
            {userEmail && (
              <Text style={styles.email}>{userEmail}</Text>
            )}

            <View style={styles.divider} />

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(245, 250, 252, 0.97)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(61, 122, 138, 0.12)',
  },
  headerTitle: {
    ...Typography.headline,
    color: '#3d7a8a',
  },
  userButton: {
    backgroundColor: '#3d7a8a',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
  },
  userInitials: {
    ...Typography.footnote,
    color: '#fff',
    fontWeight: '600',
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3d7a8a',
  },
  // Content
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  coachCard: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(61, 122, 138, 0.15)',
    shadowColor: '#d4a5a0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  coachAccentBar: {
    width: 4,
    backgroundColor: '#3d7a8a',
  },
  coachCardContent: {
    flex: 1,
    padding: 18,
    gap: 8,
  },
  coachLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#3d7a8a',
  },
  coachHeadline: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  coachBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    color: Colors.textPrimary,
  },
  readMore: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3d7a8a',
    marginTop: 2,
  },
  coachCaption: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tellMeMoreRow: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(61, 122, 138, 0.12)',
  },
  tellMeMore: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3d7a8a',
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  coachMessagePlaceholder: {
    paddingVertical: 4,
  },
  placeholderLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.separator,
  },
  // Profile modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  modalSheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.separator,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.accent,
  },
  email: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
  },
  divider: {
    width: '100%',
    height: 0.5,
    backgroundColor: Colors.separator,
    marginVertical: Spacing.xs,
  },
  logoutButton: {
    width: '100%',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
  },
  logoutText: {
    ...Typography.headline,
    color: Colors.destructive,
  },
});

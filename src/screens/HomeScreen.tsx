import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Nunito_700Bold, Nunito_600SemiBold } from '@expo-google-fonts/nunito';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeelingType, MealType, MovementType, WorkoutExercise } from '../types';
import {
  createMovementSession,
  createFoodEntry,
  getRecentDailySnapshots,
  getCachedDailyMessage,
  storeDailyMessage,
  getPreviousDailyMessages,
  clearTodayDailyMessage,
  clearAllData,
  toLocalDateStr,
  DailyCheckInMessage,
} from '../services/storage';
import { getBlendedTheme } from '../constants/seasonal';
import { Typography, Spacing, BorderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import QuickLogCard from '../components/QuickLogCard';
import { getDailyCheckIn } from '../services/anthropic';
import { schedulePostWorkoutNotification, scheduleDailyRecapNotification } from '../services/notifications';

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

const MEALS: { id: MealType; label: string; icon: string; color: string }[] = [
  { id: 'breakfast', label: 'Breakfast', icon: '☀️', color: 'rgba(255, 193, 7, 0.15)' },
  { id: 'lunch', label: 'Lunch', icon: '🌤', color: 'rgba(255, 152, 0, 0.15)' },
  { id: 'dinner', label: 'Dinner', icon: '🌙', color: 'rgba(103, 58, 183, 0.15)' },
  { id: 'snack', label: 'Snack', icon: '🍎', color: 'rgba(244, 67, 54, 0.15)' },
];

// Header logo component - smaller version for the header
function HeaderLogo() {
  const ARC_PATHS = [
    { d: 'M25,58 C25,49.7 31.7,43 40,43 C48.3,43 55,49.7 55,58' }, // inner
    { d: 'M15,58 C15,44.2 26.2,33 40,33 C53.8,33 65,44.2 65,58' }, // middle
    { d: 'M5,58 C5,38.7 20.7,23 40,23 C59.3,23 75,38.7 75,58' },   // outer
  ];

  return (
    <Svg width={44} height={33} viewBox="0 0 80 60">
      {ARC_PATHS.map((arc, i) => (
        <Path
          key={i}
          d={arc.d}
          fill="none"
          stroke={i === 2 ? 'rgba(245, 166, 35, 0.7)' : (i === 0 ? '#3db88a' : 'rgba(61, 184, 138, 0.6)')}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}

type UserProfile = {
  first_name: string;
  last_name: string;
  sex: 'male' | 'female' | 'other';
  birthdate: string;
};

export default function HomeScreen() {
  const [profileVisible, setProfileVisible] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [coachMessage, setCoachMessage] = useState<DailyCheckInMessage | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachExpanded, setCoachExpanded] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState<'up' | 'down' | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [fontsLoaded] = useFonts({ Nunito_700Bold, Nunito_600SemiBold });
  const season = getBlendedTheme();
  const insets = useSafeAreaInsets();

  // Toggle state
  const [activeTab, setActiveTab] = useState<'activity' | 'food'>('activity');

  // Food card state
  const todayStr = toLocalDateStr(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterdayDate);
  const [foodDescription, setFoodDescription] = useState('');
  const [selectedFoodMeal, setSelectedFoodMeal] = useState<MealType | null>(null);
  const [selectedFoodDate, setSelectedFoodDate] = useState<string>(todayStr);
  const [foodSaving, setFoodSaving] = useState(false);
  const [showMoreFoodDates, setShowMoreFoodDates] = useState(false);

  const FOOD_DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const moreFoodDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (i + 2));
    return { label: FOOD_DAY_NAMES[d.getDay()], date: toLocalDateStr(d) };
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUserEmail(user?.email ?? null);

      // Fetch user profile
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, sex, birthdate')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setUserProfile(profile);
        }
      }
    });
    // Schedule daily 8PM recap notification
    scheduleDailyRecapNotification().catch(() => {});
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

  // Incrementing key used to discard stale in-flight responses
  const loadKeyRef = React.useRef(0);

  const loadCoachMessage = useCallback(async (bustCache = false) => {
    const key = ++loadKeyRef.current;

    if (bustCache) {
      await clearTodayDailyMessage();
      setCoachLoading(true);
      setCoachMessage(null);
    }

    const [cached, recentData, previousMessages] = await Promise.all([
      getCachedDailyMessage(),
      getRecentDailySnapshots(10),
      getPreviousDailyMessages(),
    ]);

    if (key !== loadKeyRef.current) return;

    const count = recentData.reduce((sum, d) => sum + d.exercises.length, 0);
    setSessionCount(count);

    if (cached) {
      setCoachMessage(cached);
      setCoachLoading(false);
      return;
    }

    setCoachLoading(true);
    try {
      const message = await getDailyCheckIn(recentData, previousMessages);
      if (key !== loadKeyRef.current) return;
      if (message) {
        const entry: DailyCheckInMessage = {
          date: toLocalDateStr(new Date()),
          headline: message.headline,
          body: message.body,
        };
        await storeDailyMessage(entry);
        setCoachMessage(entry);
      }
    } catch {}
    if (key === loadKeyRef.current) setCoachLoading(false);
  }, []);

  const handleSave = async (entry: { type: MovementType; label: string; feelings: FeelingType[]; note?: string; workoutDetails?: WorkoutExercise[]; date: string }) => {
    const session = await createMovementSession(
      entry.type,
      entry.feelings,
      entry.label,
      entry.note,
      entry.workoutDetails,
      entry.date
    );
    // Coach check-in is now on-demand only, not auto-generated
    schedulePostWorkoutNotification(session).catch(() => {});
  };

  const handleSaveFood = async () => {
    const desc = foodDescription.trim();
    if (!desc) return;
    setFoodSaving(true);
    await createFoodEntry(desc, selectedFoodMeal ?? undefined, selectedFoodDate);
    setFoodSaving(false);
    setFoodDescription('');
    setSelectedFoodMeal(null);
    setSelectedFoodDate(todayStr);
    setShowMoreFoodDates(false);
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete all your movement logs, food entries, and coach conversations. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'Your account and all data will be gone forever.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, delete everything',
                  style: 'destructive',
                  onPress: async () => {
                    setProfileVisible(false);
                    try {
                      const { error } = await supabase.functions.invoke('delete-account');
                      if (error) throw error;
                    } catch (e) {
                      Alert.alert('Something went wrong', 'Your account could not be deleted. Please try again.');
                      return;
                    }
                    await clearAllData();
                    await supabase.auth.signOut();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const getInitials = (): string => {
    // Use first and last name from profile if available
    if (userProfile?.first_name && userProfile?.last_name) {
      return (userProfile.first_name[0] + userProfile.last_name[0]).toUpperCase();
    }
    // Fallback to email parsing if profile not loaded yet
    if (!userEmail) return '?';
    const username = userEmail.split('@')[0];
    const parts = username.split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (username.length >= 2) {
      return (username[0] + username[1]).toUpperCase();
    }
    return username[0].toUpperCase();
  };

  const initials = getInitials();

  const ACCENT = '#3db88a';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerLeft}>
          {weather ? (
            <View style={styles.weatherBadge}>
              <Ionicons name={weather.iconName as any} size={14} color={ACCENT} />
              <Text style={styles.weatherText}>{weather.temp}°</Text>
            </View>
          ) : (
            <View style={styles.weatherBadge} />
          )}
        </View>
        <View style={styles.headerCenter}>
          <HeaderLogo />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.userButton} onPress={() => setProfileVisible(true)} activeOpacity={0.8}>
            <Text style={styles.userInitials}>{initials}</Text>
          </TouchableOpacity>
        </View>
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
          <View style={styles.coachCardContent}>
            <View style={styles.coachHeader}>
              <Text style={[styles.coachLabel, fontsLoaded && { fontFamily: 'Nunito_600SemiBold' }]}>✨ AI COACH · DAILY CHECK-IN</Text>
              <TouchableOpacity
                onPress={() => loadCoachMessage(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={coachLoading}
              >
                <Ionicons
                  name="refresh"
                  size={20}
                  color={coachLoading ? 'rgba(255, 255, 255, 0.2)' : ACCENT}
                />
              </TouchableOpacity>
            </View>
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
                  {sessionCount > 0 && (
                    <Text style={styles.sessionContext}>
                      {' '}(Based on your last <Text style={styles.sessionCount}>{sessionCount}</Text> session{sessionCount !== 1 ? 's' : ''})
                    </Text>
                  )}
                </Text>
                {!coachExpanded && (
                  <TouchableOpacity onPress={() => setCoachExpanded(true)} activeOpacity={0.7}>
                    <Text style={styles.readMore}>Read more</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.feedbackRow}>
                  <Text style={styles.feedbackLabel}>Was this helpful?</Text>
                  <TouchableOpacity
                    onPress={() => setCoachFeedback(coachFeedback === 'up' ? null : 'up')}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={coachFeedback === 'up' ? 'thumbs-up' : 'thumbs-up-outline'}
                      size={18}
                      color={coachFeedback === 'up' ? ACCENT : 'rgba(255, 255, 255, 0.3)'}
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
                      color={coachFeedback === 'down' ? ACCENT : 'rgba(255, 255, 255, 0.3)'}
                    />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.coachEmptyState}>
                <Text style={styles.coachEmptyText}>Tap the refresh button to get your personalized check-in</Text>
              </View>
            )}
          </View>
        </View>

        {/* Activity / Food toggle */}
        <View style={styles.segmentControl}>
          <TouchableOpacity
            style={[styles.segment, activeTab === 'activity' && styles.segmentActive]}
            onPress={() => setActiveTab('activity')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, activeTab === 'activity' && styles.segmentTextActive]}>Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, activeTab === 'food' && styles.segmentActive]}
            onPress={() => setActiveTab('food')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, activeTab === 'food' && styles.segmentTextActive]}>Food</Text>
          </TouchableOpacity>
        </View>

        {/* Quick log card */}
        {activeTab === 'activity' && (
          <QuickLogCard season={{ ...season, color: '#3db88a', accent: '#7ab8c8', cardBg: 'rgba(255, 255, 255, 0.06)', textSecondary: 'rgba(255, 255, 255, 0.55)' }} onSave={handleSave} />
        )}

        {/* Food log card */}
        {activeTab === 'food' && (
          <View style={styles.foodCard}>
            <Text style={styles.foodCardHeader}>🍽️ LOG FOOD</Text>

            <View style={styles.foodPillRow}>
              {MEALS.map(meal => (
                <TouchableOpacity
                  key={meal.id}
                  style={[
                    styles.foodPill,
                    selectedFoodMeal === meal.id && styles.foodPillActive,
                    { backgroundColor: selectedFoodMeal === meal.id ? meal.color : 'transparent' }
                  ]}
                  onPress={() => setSelectedFoodMeal(prev => prev === meal.id ? null : meal.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.foodPillIcon}>{meal.icon}</Text>
                  <Text style={[styles.foodPillText, selectedFoodMeal === meal.id && styles.foodPillTextActive]}>
                    {meal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.foodPillRow, { marginTop: 4, marginBottom: showMoreFoodDates ? 4 : 0 }]}>
              {[{ label: 'Today', date: todayStr }, { label: 'Yesterday', date: yesterdayStr }].map(({ label, date }) => (
                <TouchableOpacity
                  key={date}
                  style={[styles.foodPill, selectedFoodDate === date && styles.foodPillActive]}
                  onPress={() => setSelectedFoodDate(date)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.foodPillText, selectedFoodDate === date && styles.foodPillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setShowMoreFoodDates(v => !v)}
                style={[styles.foodPill, { borderStyle: 'dashed' }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.foodPillText, { opacity: 0.6 }]}>
                  {showMoreFoodDates ? 'Less' : 'More'}
                </Text>
              </TouchableOpacity>
            </View>
            {showMoreFoodDates && (
              <View style={styles.foodPillRow}>
                {moreFoodDates.map(({ label, date }) => (
                  <TouchableOpacity
                    key={date}
                    style={[styles.foodPill, selectedFoodDate === date && styles.foodPillActive]}
                    onPress={() => setSelectedFoodDate(date)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.foodPillText, selectedFoodDate === date && styles.foodPillTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput
              style={styles.foodInput}
              value={foodDescription}
              onChangeText={setFoodDescription}
              placeholder="What did you eat?"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              multiline
              maxLength={300}
            />

            {foodDescription.trim().length > 0 && (
              <TouchableOpacity
                style={[styles.foodSaveBtn, foodSaving && styles.foodSaveBtnDisabled]}
                onPress={handleSaveFood}
                disabled={foodSaving}
                activeOpacity={0.8}
              >
                {foodSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.foodSaveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

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

            {/* Name */}
            {userProfile && (
              <Text style={styles.userName}>
                {userProfile.first_name} {userProfile.last_name}
              </Text>
            )}

            {/* Email */}
            {userEmail && (
              <Text style={styles.email}>{userEmail}</Text>
            )}

            {/* Profile Details */}
            {userProfile && (
              <View style={styles.profileDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Sex</Text>
                  <Text style={styles.detailValue}>
                    {userProfile.sex.charAt(0).toUpperCase() + userProfile.sex.slice(1)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Birthdate</Text>
                  <Text style={styles.detailValue}>
                    {new Date(userProfile.birthdate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.divider} />

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
              <Text style={styles.deleteText}>Delete account & data</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2e4f',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 14,
    backgroundColor: 'rgba(31, 46, 79, 0.97)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerTitle: {
    ...Typography.headline,
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  userButton: {
    backgroundColor: '#3db88a',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
  },
  userInitials: {
    ...Typography.footnote,
    color: '#ffffff',
    fontWeight: '600',
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(61, 184, 138, 0.12)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(61, 184, 138, 0.2)',
  },
  weatherText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  // Content
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  coachCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#3db88a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  coachCardContent: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coachLabel: {
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#3db88a',
  },
  coachHeadline: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  coachBody: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sessionContext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '400',
  },
  sessionCount: {
    color: '#f5a623',
    fontWeight: '700',
  },
  readMore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3db88a',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  feedbackLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginRight: 4,
  },
  coachMessagePlaceholder: {
    paddingVertical: 6,
  },
  placeholderLine: {
    height: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  coachEmptyState: {
    paddingVertical: 12,
  },
  coachEmptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
  },
  // Segment control
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: BorderRadius.pill,
    padding: 4,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: '#3db88a',
    shadowColor: '#3db88a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.3,
  },
  segmentTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  // Food card
  foodCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: '#ffffff',
    padding: 20,
    gap: 16,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  foodCardHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3db88a',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  foodPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  foodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: BorderRadius.pill,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
  },
  foodPillActive: {
    borderColor: '#ffffff',
  },
  foodPillIcon: {
    fontSize: 13,
  },
  foodPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  foodPillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  foodInput: {
    fontSize: 15,
    lineHeight: 21,
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  foodSaveBtn: {
    backgroundColor: '#f5a623',
    borderRadius: 12,
    padding: Spacing.base,
    alignItems: 'center',
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  foodSaveBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  foodSaveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Profile modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalSheet: {
    backgroundColor: '#1f2e4f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.round,
    backgroundColor: 'rgba(61, 184, 138, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#3db88a',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '800',
    color: '#3db88a',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 8,
  },
  email: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  profileDetails: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  divider: {
    width: '100%',
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 12,
  },
  logoutButton: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 80, 80, 0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 80, 80, 0.35)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6b6b',
  },
  deleteButton: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
  },
});

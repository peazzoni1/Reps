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
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Nunito_700Bold, Nunito_600SemiBold } from '@expo-google-fonts/nunito';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
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
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import QuickLogCard from '../components/QuickLogCard';
import { getDailyCheckIn } from '../services/anthropic';
import { schedulePostWorkoutNotification } from '../services/notifications';
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

const MEALS: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Breakfast', icon: '☀️' },
  { id: 'lunch', label: 'Lunch', icon: '🌤' },
  { id: 'dinner', label: 'Dinner', icon: '🌙' },
  { id: 'snack', label: 'Snack', icon: '🍎' },
];

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

  useFocusEffect(useCallback(() => {
    loadCoachMessage();
  }, [loadCoachMessage]));

  const handleTellMeMore = () => {
    if (coachMessage) {
      navigation.navigate('Coach', {
        initialMessage: `${coachMessage.headline}\n\n${coachMessage.body}`,
      });
    }
  };

  const handleSave = async (entry: { type: MovementType; label: string; feelings: FeelingType[]; note?: string; workoutDetails?: WorkoutExercise[]; date: string }) => {
    const session = await createMovementSession(
      entry.type,
      entry.feelings,
      entry.label,
      entry.note,
      entry.workoutDetails,
      entry.date
    );
    loadCoachMessage(true);
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
          <QuickLogCard season={{ ...season, color: '#3d7a8a', accent: '#7ab8c8', cardBg: '#fffaf8', textSecondary: '#7a9aaa' }} onSave={handleSave} />
        )}

        {/* Food log card */}
        {activeTab === 'food' && (
          <View style={styles.foodCard}>
            <Text style={styles.foodCardHeader}>▸ Log Food</Text>

            <View style={styles.foodPillRow}>
              {MEALS.map(meal => (
                <TouchableOpacity
                  key={meal.id}
                  style={[styles.foodPill, selectedFoodMeal === meal.id && styles.foodPillActive]}
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
              placeholderTextColor="#7a9aaa"
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

            {/* Email */}
            {userEmail && (
              <Text style={styles.email}>{userEmail}</Text>
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
  // Segment control
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(61, 122, 138, 0.08)',
    borderRadius: BorderRadius.pill,
    padding: 3,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: '#3d7a8a',
    shadowColor: '#3d7a8a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3d7a8a',
  },
  segmentTextActive: {
    color: '#fff',
  },
  // Food card
  foodCard: {
    backgroundColor: '#fffaf8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(61, 122, 138, 0.15)',
    padding: 18,
    gap: 14,
    shadowColor: '#d4a5a0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  foodCardHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3d7a8a',
    letterSpacing: 0.5,
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
    borderWidth: 1.5,
    borderColor: 'rgba(61, 122, 138, 0.2)',
    backgroundColor: 'transparent',
  },
  foodPillActive: {
    borderColor: '#3d7a8a',
    backgroundColor: 'rgba(61, 122, 138, 0.08)',
  },
  foodPillIcon: {
    fontSize: 13,
  },
  foodPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7a9aaa',
  },
  foodPillTextActive: {
    color: '#3d7a8a',
  },
  foodInput: {
    fontSize: 15,
    color: '#1a3a44',
    backgroundColor: 'rgba(61, 122, 138, 0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  foodSaveBtn: {
    backgroundColor: '#3d7a8a',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    alignItems: 'center',
  },
  foodSaveBtnDisabled: {
    backgroundColor: Colors.separator,
  },
  foodSaveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
  deleteButton: {
    width: '100%',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  deleteText: {
    ...Typography.subheadline,
    color: Colors.textTertiary,
  },
});

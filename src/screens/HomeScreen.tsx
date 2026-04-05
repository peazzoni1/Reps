import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Switch,
  Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

// Create animated version of LinearGradient
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Nunito_700Bold, Nunito_600SemiBold } from '@expo-google-fonts/nunito';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeelingType, MovementType, WorkoutExercise, SubscriptionTier, FoodChallenge, FoodChallengeCompletion } from '../types';
import {
  createMovementSession,
  getRecentDailySnapshots,
  getCachedDailyMessage,
  storeDailyMessage,
  getPreviousDailyMessages,
  clearTodayDailyMessage,
  clearAllData,
  toLocalDateStr,
  DailyCheckInMessage,
  getTodayMovementSessions,
  getTodayFoodEntries,
  getDailyNote,
  getAllDailyNotes,
  getNotificationPrefs,
  saveNotificationPrefs,
} from '../services/storage';
import { getBlendedTheme } from '../constants/seasonal';
import { Typography, Spacing, BorderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import QuickLogCard from '../components/QuickLogCard';
import QuickAccessTile from '../components/QuickAccessTile';
import FoodLogModal from '../components/FoodLogModal';
import DailyFoodChallengeCard from '../components/DailyFoodChallengeCard';
import FoodChallengeCompletionPrompt from '../components/FoodChallengeCompletionPrompt';
import DailyNotesModal from '../components/DailyNotesModal';
import GoalsModal from '../components/GoalsModal';
import CreateGoalModal from '../components/CreateGoalModal';
import PaywallModal from '../components/PaywallModal';
import SubscriptionBadge from '../components/SubscriptionBadge';
import ProfileEditScreen from './ProfileEditScreen';
import { getDailyCheckIn } from '../services/anthropic';
import { getSubscriptionStatus } from '../services/subscriptions';
import { getCheckInQuota, incrementCheckInCount, canUseCheckIn } from '../services/checkInTracking';
import { scheduleDailyRecapNotification, cancelDailyRecapNotification, scheduleDailyChallengeNotification } from '../services/notifications';
import { getActiveGoals, updateGoalProgress, Goal } from '../services/goals';
import { getChallengeForDate } from '../constants/foodChallenges';
import {
  getTodayFoodChallengeCompletion,
  createFoodChallengeCompletion,
  linkFoodEntryToCompletion,
  calculateFoodChallengeStreak,
} from '../services/foodChallengeStorage';
import { checkFoodChallengeAchievements } from '../services/progressAnalytics';

type WeatherInfo = { temp: number; iconName: string };

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function getWeatherIconName(code: number): string {
  if (code === 0) return 'sunny-outline';
  if (code <= 2) return 'partly-sunny-outline';
  if (code <= 48) return 'cloudy-outline';
  if (code <= 67) return 'rainy-outline';
  if (code <= 77) return 'snow-outline';
  if (code <= 82) return 'rainy-outline';
  return 'thunderstorm-outline';
}

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
  first_name?: string;
  last_name?: string;
  sex?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
  birthdate?: string;
  height_inches?: number;
  weight_lbs?: number;
};


export default function HomeScreen() {
  const [profileVisible, setProfileVisible] = useState(false);
  const [profileEditVisible, setProfileEditVisible] = useState(false);
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

  // Animated glow for AI Coach card border
  const borderGlowAnim = useRef(new Animated.Value(0)).current;

  // Modal visibility states
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [foodModalVisible, setFoodModalVisible] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [createGoalModalVisible, setCreateGoalModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Tile status states
  const [activityStatus, setActivityStatus] = useState('No activities today');
  const [foodStatus, setFoodStatus] = useState('No meals logged');
  const [notesStatus, setNotesStatus] = useState('No notes yet');
  const [goalsStatus, setGoalsStatus] = useState('Coming soon');

  // Subscription states
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallVariant, setPaywallVariant] = useState<'soft' | 'hard'>('soft');

  // Notification preference states
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifHour, setNotifHour] = useState(20);
  const [showHourPicker, setShowHourPicker] = useState(false);

  // Food challenge states
  const [todayChallenge, setTodayChallenge] = useState<FoodChallenge | null>(null);
  const [todayChallengeCompletion, setTodayChallengeCompletion] = useState<FoodChallengeCompletion | null>(null);
  const [challengeStreak, setChallengeStreak] = useState(0);
  const [challengePromptVisible, setChallengePromptVisible] = useState(false);
  const [pendingChallengeCompletion, setPendingChallengeCompletion] = useState<FoodChallengeCompletion | null>(null);

  const loadUserProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserEmail(user?.email ?? null);

    // Fetch user profile
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, sex, birthdate, height_inches, weight_lbs')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setUserProfile(profile);
      }
    }
  }, []);

  const loadChallengeState = useCallback(async () => {
    const dateStr = toLocalDateStr(new Date());
    const challenge = getChallengeForDate(dateStr);
    const [completion, streak] = await Promise.all([
      getTodayFoodChallengeCompletion(),
      calculateFoodChallengeStreak(),
    ]);
    setTodayChallenge(challenge);
    setTodayChallengeCompletion(completion);
    setChallengeStreak(streak);
  }, []);

  useEffect(() => {
    loadUserProfile();
    // Load notification prefs and schedule accordingly
    getNotificationPrefs().then(prefs => {
      setNotifEnabled(prefs.enabled);
      setNotifHour(prefs.hour);
      if (prefs.enabled) {
        scheduleDailyRecapNotification(prefs.hour).catch(() => {});
        scheduleDailyChallengeNotification().catch(() => {});
      }
    });
    // Load tile statuses
    loadStatuses();
    // Load subscription status
    loadSubscriptionStatus();
    // Load food challenge state
    loadChallengeState();
  }, [loadUserProfile, loadChallengeState]);

  // Animate the coach card border glow
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(borderGlowAnim, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: false,
        }),
        Animated.timing(borderGlowAnim, {
          toValue: 0,
          duration: 5000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [borderGlowAnim]);

  const loadSubscriptionStatus = useCallback(async () => {
    const subscription = await getSubscriptionStatus();
    setSubscriptionTier(subscription.tier);
  }, []);

  const handleChallengeComplete = useCallback(async () => {
    if (!todayChallenge || todayChallengeCompletion) return;
    const completion = await createFoodChallengeCompletion(todayChallenge.id);
    setTodayChallengeCompletion(completion);
    const newStreak = await calculateFoodChallengeStreak();
    setChallengeStreak(newStreak);
    await checkFoodChallengeAchievements(newStreak);
    setPendingChallengeCompletion(completion);
    setChallengePromptVisible(true);
  }, [todayChallenge, todayChallengeCompletion]);

  const handleChallengeAddFood = useCallback(() => {
    setChallengePromptVisible(false);
    setFoodModalVisible(true);
  }, []);

  const loadStatuses = useCallback(async () => {
    try {
      const [activitySessions, foodEntries, dailyNote, activeGoals] = await Promise.all([
        getTodayMovementSessions(),
        getTodayFoodEntries(),
        getDailyNote(toLocalDateStr(new Date())),
        getActiveGoals(),
      ]);

      // Activity status
      const activityCount = activitySessions.length;
      if (activityCount === 0) {
        setActivityStatus('No activities today');
      } else if (activityCount === 1) {
        setActivityStatus('1 activity today');
      } else {
        setActivityStatus(`${activityCount} activities today`);
      }

      // Food status
      const foodCount = foodEntries.length;
      if (foodCount === 0) {
        setFoodStatus('No meals logged');
      } else if (foodCount === 1) {
        setFoodStatus('1 meal logged');
      } else {
        setFoodStatus(`${foodCount} meals logged`);
      }

      // Notes status
      if (dailyNote && dailyNote.content.trim()) {
        setNotesStatus('Note saved');
      } else {
        setNotesStatus('No notes yet');
      }

      // Goals status
      if (activeGoals.length === 0) {
        setGoalsStatus('No goals set');
      } else {
        const onTrack = activeGoals.filter(g =>
          g.currentProgress >= g.targetValue * 0.7
        ).length;
        setGoalsStatus(`${onTrack} of ${activeGoals.length} on track`);
      }
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
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
      // Check quota before allowing refresh
      const canUse = await canUseCheckIn();
      if (!canUse) {
        setPaywallVariant('hard');
        setPaywallVisible(true);
        return;
      }

      await clearTodayDailyMessage();
      setCoachLoading(true);
      setCoachMessage(null);
    }

    const [cached, recentData, dailyNotes, previousMessages, activeGoals] = await Promise.all([
      getCachedDailyMessage(),
      getRecentDailySnapshots(10),
      getAllDailyNotes(),
      getPreviousDailyMessages(),
      getActiveGoals(),
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
      // Get subscription status to determine message quality tier
      const subscriptionStatus = await getSubscriptionStatus();
      const isPremium = subscriptionStatus.isActive;

      const message = await getDailyCheckIn(recentData, dailyNotes, previousMessages, activeGoals, isPremium);
      if (key !== loadKeyRef.current) return;
      if (message) {
        const entry: DailyCheckInMessage = {
          date: toLocalDateStr(new Date()),
          headline: message.headline,
          body: message.body,
        };
        await storeDailyMessage(entry);
        setCoachMessage(entry);

        // Increment check-in count after successful generation
        await incrementCheckInCount();

        // Show soft paywall if this was the last free check-in
        const updatedQuota = await getCheckInQuota();
        if (!updatedQuota.isPremium && updatedQuota.remaining === 0) {
          setPaywallVariant('soft');
          setPaywallVisible(true);
        }
      }
    } catch {}
    if (key === loadKeyRef.current) setCoachLoading(false);
  }, []);

  const handleSave = async (entry: { type: MovementType; label: string; feelings: FeelingType[]; note?: string; workoutDetails?: WorkoutExercise[]; date: string; goalIds?: string[] }) => {
    const session = await createMovementSession(
      entry.type,
      entry.feelings,
      entry.label,
      entry.note,
      entry.workoutDetails,
      entry.date,
      entry.goalIds
    );

    // Update progress for linked goals
    if (entry.goalIds && entry.goalIds.length > 0) {
      await Promise.all(entry.goalIds.map(goalId => updateGoalProgress(goalId)));
    }

    // Refresh activity and goals status
    loadStatuses();
  };

  const handleNotifToggle = async (value: boolean) => {
    setNotifEnabled(value);
    setShowHourPicker(false);
    const prefs = { hour: notifHour, enabled: value };
    await saveNotificationPrefs(prefs);
    if (value) {
      scheduleDailyRecapNotification(notifHour).catch(() => {});
    } else {
      cancelDailyRecapNotification().catch(() => {});
    }
  };

  const handleHourChange = async (hour: number) => {
    setNotifHour(hour);
    setShowHourPicker(false);
    const prefs = { hour, enabled: notifEnabled };
    await saveNotificationPrefs(prefs);
    scheduleDailyRecapNotification(hour).catch(() => {});
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
    // Use first and last name from profile if both are available
    if (userProfile?.first_name && userProfile?.last_name) {
      return (userProfile.first_name[0] + userProfile.last_name[0]).toUpperCase();
    }

    // If only first name is available, use first two letters
    if (userProfile?.first_name) {
      const name = userProfile.first_name;
      if (name.length >= 2) {
        return (name[0] + name[1]).toUpperCase();
      }
      return name[0].toUpperCase();
    }

    // If only last name is available, use first two letters
    if (userProfile?.last_name) {
      const name = userProfile.last_name;
      if (name.length >= 2) {
        return (name[0] + name[1]).toUpperCase();
      }
      return name[0].toUpperCase();
    }

    // Fallback to email parsing if no name provided
    if (!userEmail) return '?';
    const username = userEmail.split('@')[0];
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
        {/* Daily Food Challenge */}
        {todayChallenge && (
          <DailyFoodChallengeCard
            challenge={todayChallenge}
            completion={todayChallengeCompletion}
            streak={challengeStreak}
            onComplete={handleChallengeComplete}
          />
        )}

        {/* Quick Access Tiles */}
        <View style={styles.tileGrid}>
          <QuickAccessTile
            icon="⚡"
            label="Activity"
            status={activityStatus}
            color="#3db88a"
            onPress={() => setActivityModalVisible(true)}
          />
          <QuickAccessTile
            icon="🍽️"
            label="Food"
            status={foodStatus}
            color="#f5a623"
            onPress={() => setFoodModalVisible(true)}
          />
          <QuickAccessTile
            icon="✍️"
            label="Notes"
            status={notesStatus}
            color="#7ab8c8"
            onPress={() => setNotesModalVisible(true)}
          />
          <QuickAccessTile
            icon="⭐"
            label="Goals"
            status={goalsStatus}
            color="#8fbc8f"
            onPress={() => setGoalsModalVisible(true)}
          />
        </View>

        {/* AI Coach Daily Check-In */}
        <Animated.View style={styles.coachCardWrapper}>
          <AnimatedLinearGradient
            colors={['#3db88a', '#7ab8c8', '#3db88a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.coachCardGradient,
              {
                opacity: borderGlowAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.6, 1, 0.6],
                }),
              },
            ]}
          >
            <View style={styles.coachCard}>
              <View style={styles.coachCardContent}>
            <View style={styles.coachHeader}>
              <Text style={[styles.coachLabel, fontsLoaded && { fontFamily: 'Nunito_600SemiBold' }]}>✨ DAILY INSIGHTS</Text>
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
            ) : null}
          </View>
            </View>
          </AnimatedLinearGradient>
        </Animated.View>

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
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >

            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>

            {/* Subscription Badge */}
            {subscriptionTier === 'premium' && (
              <View style={{ marginTop: 8 }}>
                <SubscriptionBadge tier={subscriptionTier} />
              </View>
            )}

            {/* Name */}
            {userProfile && (userProfile.first_name || userProfile.last_name) && (
              <Text style={styles.userName}>
                {[userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ')}
              </Text>
            )}

            {/* Email */}
            {userEmail && (
              <Text style={styles.email}>{userEmail}</Text>
            )}

            {/* Profile Details */}
            {userProfile && (userProfile.sex || userProfile.birthdate || userProfile.height_inches || userProfile.weight_lbs) && (
              <View style={styles.profileDetails}>
                {userProfile.sex && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Sex</Text>
                    <Text style={styles.detailValue}>
                      {userProfile.sex === 'prefer-not-to-say'
                        ? 'Prefer not to say'
                        : userProfile.sex === 'non-binary'
                        ? 'Non-binary'
                        : userProfile.sex.charAt(0).toUpperCase() + userProfile.sex.slice(1)}
                    </Text>
                  </View>
                )}
                {userProfile.birthdate && (
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
                )}
                {userProfile.height_inches && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Height</Text>
                    <Text style={styles.detailValue}>
                      {Math.floor(userProfile.height_inches / 12)}'{userProfile.height_inches % 12}"
                    </Text>
                  </View>
                )}
                {userProfile.weight_lbs && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Weight</Text>
                    <Text style={styles.detailValue}>
                      {userProfile.weight_lbs} lbs
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Edit Profile Button */}
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => {
                setProfileVisible(false);
                setProfileEditVisible(true);
              }}
            >
              <Ionicons name="create-outline" size={18} color="#3db88a" />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>

            {/* Subscription Buttons */}
            {subscriptionTier === 'premium' ? (
              <TouchableOpacity
                style={styles.manageSubButton}
                onPress={() => {
                  setProfileVisible(false);
                  setPaywallVisible(true);
                }}
              >
                <Text style={styles.manageSubText}>Manage Subscription</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => {
                  setProfileVisible(false);
                  setPaywallVariant('soft');
                  setPaywallVisible(true);
                }}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              </TouchableOpacity>
            )}

            <View style={styles.divider} />

            {/* Notification Settings */}
            <View style={styles.notifSection}>
              <View style={styles.notifRow}>
                <Text style={styles.notifLabel}>Daily Reminder</Text>
                <Switch
                  value={notifEnabled}
                  onValueChange={handleNotifToggle}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#3db88a' }}
                  thumbColor="#ffffff"
                />
              </View>
              {notifEnabled && (
                <TouchableOpacity
                  style={styles.detailRow}
                  onPress={() => setShowHourPicker(!showHourPicker)}
                >
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>{formatHour(notifHour)}</Text>
                </TouchableOpacity>
              )}
              {notifEnabled && showHourPicker && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.hourPickerScroll}
                  contentContainerStyle={styles.hourPickerContent}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.hourButton, notifHour === i && styles.hourButtonActive]}
                      onPress={() => handleHourChange(i)}
                    >
                      <Text style={[styles.hourButtonText, notifHour === i && styles.hourButtonTextActive]}>
                        {formatHour(i)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
              <Text style={styles.deleteText}>Delete account & data</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Activity Modal */}
      <Modal visible={activityModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setActivityModalVisible(false)}
          />
          <View style={[styles.activityModalSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Log Activity</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setActivityModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.activityModalContent}
              contentContainerStyle={styles.activityModalContentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <QuickLogCard
                season={{ ...season, color: '#3db88a', accent: '#7ab8c8', cardBg: 'rgba(255, 255, 255, 0.06)', textSecondary: 'rgba(255, 255, 255, 0.55)' }}
                onSave={(entry) => {
                  handleSave(entry);
                  setActivityModalVisible(false);
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Food Modal */}
      <FoodLogModal
        visible={foodModalVisible}
        onClose={() => setFoodModalVisible(false)}
        onSave={async (savedEntryId: string) => {
          setFoodModalVisible(false);
          loadStatuses();
          if (pendingChallengeCompletion) {
            await linkFoodEntryToCompletion(pendingChallengeCompletion.id, savedEntryId);
            setPendingChallengeCompletion(null);
          }
        }}
        season={season}
      />

      {/* Food Challenge Completion Prompt */}
      {todayChallenge && (
        <FoodChallengeCompletionPrompt
          visible={challengePromptVisible}
          challengeText={todayChallenge.text}
          streak={challengeStreak}
          onAddFoodLog={handleChallengeAddFood}
          onSkip={() => {
            setChallengePromptVisible(false);
            setPendingChallengeCompletion(null);
          }}
        />
      )}

      {/* Daily Notes Modal */}
      <DailyNotesModal
        visible={notesModalVisible}
        onClose={() => setNotesModalVisible(false)}
        onSave={() => {
          loadStatuses();
        }}
        season={season}
      />

      {/* Goals Modal */}
      <GoalsModal
        visible={goalsModalVisible}
        onClose={() => setGoalsModalVisible(false)}
        season={season}
        onCreateGoal={() => {
          setGoalsModalVisible(false);
          setEditingGoal(null);
          setCreateGoalModalVisible(true);
        }}
        onEditGoal={(goal) => {
          setGoalsModalVisible(false); // Close GoalsModal first
          setEditingGoal(goal);
          setCreateGoalModalVisible(true);
        }}
      />

      {/* Create/Edit Goal Modal */}
      <CreateGoalModal
        visible={createGoalModalVisible}
        onClose={() => {
          setCreateGoalModalVisible(false);
          setEditingGoal(null);
          setGoalsModalVisible(true); // Re-open GoalsModal
        }}
        onSuccess={() => {
          setCreateGoalModalVisible(false);
          setEditingGoal(null);
          loadStatuses();
          setGoalsModalVisible(true); // Re-open GoalsModal to show the new goal
        }}
        season={season}
        existingGoal={editingGoal}
      />

      {/* Paywall Modal */}
      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onSuccess={() => {
          loadSubscriptionStatus();
          setPaywallVisible(false);
        }}
        variant={paywallVariant}
      />

      {/* Profile Edit Modal */}
      {profileEditVisible && (
        <Modal visible={profileEditVisible} animationType="slide" presentationStyle="fullScreen">
          <ProfileEditScreen
            onClose={() => setProfileEditVisible(false)}
            onSave={async () => {
              await loadUserProfile();
              setProfileVisible(true);
            }}
          />
        </Modal>
      )}
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
  // Greeting Section
  greetingSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#1f2e4f',
  },
  greetingLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#3ee8a0',
    marginBottom: 8,
  },
  greetingTitleContainer: {
    gap: 0,
  },
  greetingTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  greetingTitleAccent: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3ee8a0',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  // Content
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  coachCardWrapper: {
    marginBottom: 20,
  },
  coachCardGradient: {
    borderRadius: 24,
    padding: 1.5,
  },
  coachCard: {
    borderRadius: 22.5,
    overflow: 'hidden',
    backgroundColor: '#1f2e4f',
    shadowColor: '#3db88a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
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
  // Tile grid
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
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
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    maxHeight: '85%',
  },
  modalScrollContent: {
    alignItems: 'center',
    gap: 14,
    paddingBottom: 20,
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
  editProfileButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(61, 184, 138, 0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(61, 184, 138, 0.3)',
    marginTop: 12,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3db88a',
  },
  divider: {
    width: '100%',
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 12,
  },
  manageSubButton: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(61, 184, 138, 0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(61, 184, 138, 0.3)',
    marginTop: 12,
  },
  manageSubText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3db88a',
  },
  upgradeButton: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f5a623',
    marginTop: 12,
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  notifSection: {
    width: '100%',
    gap: 10,
  },
  notifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  hourPickerScroll: {
    marginTop: 4,
  },
  hourPickerContent: {
    gap: 8,
    paddingHorizontal: 2,
  },
  hourButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  hourButtonActive: {
    backgroundColor: 'rgba(61, 184, 138, 0.2)',
    borderColor: '#3db88a',
  },
  hourButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  hourButtonTextActive: {
    color: '#3db88a',
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  activityModalSheet: {
    backgroundColor: '#1f2e4f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    maxHeight: '92%',
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  activityModalContent: {
    maxHeight: 600,
  },
  activityModalContentContainer: {
    paddingBottom: Spacing.md,
  },
});

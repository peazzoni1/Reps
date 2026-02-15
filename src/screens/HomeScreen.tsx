import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MovementSession, MovementType, FeelingType, WorkoutExercise } from '../types';
import {
  getRecentMovementSessions,
  createMovementSession,
} from '../services/storage';
import { SEASONS, getCurrentSeason, getDayLabel, getMovementIcon, getSeasonDay, MOVEMENT_TYPES } from '../constants/seasonal';
import { getGreetingWithWeather } from '../utils/greetings';
import { getCurrentWeather } from '../services/weather';
import StreakRow from '../components/StreakRow';
import QuickLogModal from '../components/QuickLogModal';
import StoryView from '../components/StoryView';

export default function HomeScreen() {
  const [currentSeason] = useState(getCurrentSeason());
  const [sessions, setSessions] = useState<MovementSession[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [greeting, setGreeting] = useState<string>('');
  const season = SEASONS[currentSeason];
  const insets = useSafeAreaInsets();

  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const loadSessions = async () => {
    const data = await getRecentMovementSessions(14);
    setSessions(data);
  };

  const loadGreeting = async () => {
    // Fetch weather data (cached for 1 hour)
    const weather = await getCurrentWeather();

    // Generate greeting with weather if available
    const newGreeting = getGreetingWithWeather(weather?.temperature, weather?.condition);
    setGreeting(newGreeting);
  };

  useEffect(() => {
    loadSessions();
    loadGreeting();
  }, []);

  const handleSave = async (entry: { type: MovementType; feeling: FeelingType; note?: string; workoutDetails?: WorkoutExercise[] }) => {
    const typeData = MOVEMENT_TYPES.find((m) => m.id === entry.type);
    await createMovementSession(
      entry.type,
      entry.feeling,
      typeData?.label || 'Movement',
      entry.note,
      entry.workoutDetails
    );
    setShowLog(false);
    loadSessions();
  };

  const recentSessions = sessions.slice(0, 5);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[season.bgStart, season.bgMiddle, season.bgEnd]}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 56, paddingBottom: 120 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Season indicator */}
          <View style={styles.seasonIndicator}>
            <Animated.View
              style={[
                styles.seasonDot,
                { backgroundColor: season.color, transform: [{ scale: pulseAnim }] },
              ]}
            />
            <Text style={[styles.seasonText, { color: season.color }]}>
              {season.name.toUpperCase()} · DAY {getSeasonDay().currentDay} of {getSeasonDay().totalDays}
            </Text>
          </View>

          {/* Dynamic greeting */}
          <Text style={[styles.prompt, { color: season.text }]}>
            {greeting || season.prompt}
          </Text>

          {/* Streak */}
          <View style={styles.streakContainer}>
            <StreakRow sessions={sessions} seasonColor={season.color} />
            <Text style={[styles.streakLabel, { color: season.textSecondary }]}>
              last 14 days
            </Text>
          </View>

          {/* Contextual insight */}
          <View style={[styles.insightCard, { backgroundColor: season.cardBg }]}>
            <Text style={[styles.insightWeather, { color: season.textSecondary }]}>
              Keep moving
            </Text>
            <Text style={[styles.insightText, { color: season.textSecondary }]}>
              {sessions.length > 0
                ? `You've logged ${sessions.length} movement${sessions.length === 1 ? '' : 's'} recently. Every session matters.`
                : 'Start your journey by logging your first movement.'}
            </Text>
          </View>

          {/* The recap button */}
          <TouchableOpacity
            onPress={() => setShowStory(true)}
            style={[styles.storyButton, { backgroundColor: season.cardBg }]}
            activeOpacity={0.7}
          >
            <View>
              <Text style={[styles.storyLabel, { color: season.textSecondary }]}>
                THE RECAP
              </Text>
              <Text style={[styles.storyTitle, { color: season.text }]}>
                {sessions.length} session{sessions.length === 1 ? '' : 's'} this {season.name.toLowerCase()}
              </Text>
            </View>
            <Text style={[styles.storyArrow, { color: season.textSecondary }]}>→</Text>
          </TouchableOpacity>

          {/* Recent sessions */}
          {recentSessions.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={[styles.recentLabel, { color: season.textSecondary }]}>
                RECENT
              </Text>
              {recentSessions.map((session) => {
                const sessionDate = new Date(session.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                sessionDate.setHours(0, 0, 0, 0);
                const daysAgo = Math.floor(
                  (today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <View key={session.id} style={styles.sessionCard}>
                    <View
                      style={[
                        styles.sessionIcon,
                        { backgroundColor: `${season.color}15` },
                      ]}
                    >
                      <Text style={[styles.sessionIconText, { color: season.color }]}>
                        {getMovementIcon(session.type)}
                      </Text>
                    </View>
                    <View style={styles.sessionContent}>
                      <Text style={[styles.sessionLabel, { color: season.text }]}>
                        {session.label}
                      </Text>
                      <Text style={[styles.sessionDetails, { color: season.textSecondary }]}>
                        {session.feeling} · {getDayLabel(daysAgo)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Log button */}
        <View
          style={[
            styles.logButtonContainer,
            { paddingBottom: insets.bottom + 16, backgroundColor: season.bgEnd },
          ]}
        >
          <TouchableOpacity
            onPress={() => setShowLog(true)}
            style={[styles.logButton, { backgroundColor: season.color }]}
            activeOpacity={0.8}
          >
            <Text style={styles.logButtonText}>Log Movement</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <QuickLogModal
        visible={showLog}
        season={season}
        onClose={() => setShowLog(false)}
        onSave={handleSave}
      />

      <StoryView
        visible={showStory}
        season={season}
        sessions={sessions}
        onClose={() => setShowStory(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  seasonIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  seasonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  seasonText: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  prompt: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '300',
    marginBottom: 32,
    maxWidth: 300,
  },
  streakContainer: {
    marginBottom: 32,
  },
  streakLabel: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 8,
    opacity: 0.5,
  },
  insightCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 32,
  },
  insightWeather: {
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 6,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  storyButton: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  storyTitle: {
    fontSize: 17,
    fontWeight: '400',
  },
  storyArrow: {
    fontSize: 20,
    opacity: 0.4,
  },
  recentSection: {
    marginTop: 0,
  },
  recentLabel: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionIconText: {
    fontSize: 16,
  },
  sessionContent: {
    flex: 1,
  },
  sessionLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  sessionDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  logButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  logButton: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

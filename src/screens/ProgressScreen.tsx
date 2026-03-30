import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  DailySnapshot,
  Achievement,
  WeeklySummary,
  PatternData,
} from '../types';
import { getRecentDailySnapshots } from '../services/storage';
import {
  generateWeeklySummary,
  detectAchievements,
  calculatePatterns,
  getRecentAchievements,
} from '../services/progressAnalytics';
import WeeklySummaryCard from '../components/WeeklySummaryCard';
import AchievementCard from '../components/AchievementCard';
import { Typography, Spacing } from '../theme';

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [patterns, setPatterns] = useState<PatternData | null>(null);
  const [recentData, setRecentData] = useState<DailySnapshot[]>([]);

  const loadProgressData = useCallback(async () => {
    try {
      // Load last 30 days of data
      const data = await getRecentDailySnapshots(30);
      setRecentData(data);

      // Get this week's data (last 7 days)
      const weekData = data.slice(0, 7);

      // Generate weekly summary
      const summary = await generateWeeklySummary(weekData);
      setWeeklySummary(summary);

      // Detect new achievements
      await detectAchievements(data);

      // Load recent achievements
      const recentAchievements = await getRecentAchievements(5);
      setAchievements(recentAchievements);

      // Calculate patterns
      const patternData = calculatePatterns(data);
      setPatterns(patternData);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProgressData();
    }, [loadProgressData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProgressData();
  }, [loadProgressData]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3db88a"
          />
        }
      >
        {/* Weekly Summary */}
        <WeeklySummaryCard summary={weeklySummary} loading={loading} />

        {/* Achievements Section */}
        {achievements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Achievements</Text>
            </View>
            {achievements.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </View>
        )}

        {/* Patterns Section */}
        {patterns && patterns.exerciseDistribution.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Patterns & Trends</Text>
            </View>

            {/* Workout Frequency */}
            <View style={styles.patternCard}>
              <Text style={styles.patternTitle}>Workout Frequency</Text>
              <Text style={styles.patternValue}>
                {(
                  patterns.workoutFrequency.reduce((sum, d) => sum + d.count, 0) /
                  Math.max(patterns.workoutFrequency.length, 1)
                ).toFixed(1)}{' '}
                workouts/week average
              </Text>
            </View>

            {/* Exercise Distribution */}
            {patterns.exerciseDistribution.length > 0 && (
              <View style={styles.patternCard}>
                <Text style={styles.patternTitle}>Exercise Distribution</Text>
                {patterns.exerciseDistribution
                  .sort((a, b) => b.percentage - a.percentage)
                  .slice(0, 3)
                  .map((cat) => (
                    <View key={cat.category} style={styles.distributionRow}>
                      <Text style={styles.distributionLabel}>{cat.category}</Text>
                      <View style={styles.distributionBarContainer}>
                        <View
                          style={[
                            styles.distributionBar,
                            { width: `${cat.percentage}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.distributionValue}>
                        {cat.percentage}%
                      </Text>
                    </View>
                  ))}
              </View>
            )}

            {/* Top Feelings */}
            {patterns.feelingTrends.length > 0 && (
              <View style={styles.patternCard}>
                <Text style={styles.patternTitle}>Top Feelings</Text>
                <View style={styles.feelingGrid}>
                  {patterns.feelingTrends
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 4)
                    .map((feeling) => (
                      <View key={feeling.feeling} style={styles.feelingChip}>
                        <Text style={styles.feelingText}>
                          {feeling.feeling} ({feeling.count})
                        </Text>
                      </View>
                    ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Empty State */}
        {!loading && recentData.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyText}>
              Start logging workouts to see your progress and achievements
            </Text>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141b2d',
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    ...Typography.largeTitle,
    color: '#fff',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.sm,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.title2,
    color: '#fff',
    fontWeight: '600',
  },
  patternCard: {
    backgroundColor: '#1e2940',
    borderRadius: 12,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
  },
  patternTitle: {
    ...Typography.headline,
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  patternValue: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  distributionLabel: {
    ...Typography.caption1,
    color: '#fff',
    width: 80,
  },
  distributionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginHorizontal: Spacing.xs,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    backgroundColor: '#3db88a',
    borderRadius: 4,
  },
  distributionValue: {
    ...Typography.caption1,
    color: 'rgba(255, 255, 255, 0.7)',
    width: 40,
    textAlign: 'right',
  },
  feelingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
  },
  feelingChip: {
    backgroundColor: 'rgba(61, 184, 138, 0.2)',
    borderRadius: 16,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  feelingText: {
    ...Typography.caption1,
    color: '#3db88a',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.title2,
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  emptyText: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});

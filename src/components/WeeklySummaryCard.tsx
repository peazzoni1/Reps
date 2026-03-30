import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { WeeklySummary } from '../types';
import { Typography, Spacing, BorderRadius } from '../theme';

interface WeeklySummaryCardProps {
  summary: WeeklySummary | null;
  loading?: boolean;
}

// Icon components matching HomeScreen tile style
function TargetIcon({ color = '#fff', size = 24 }: { color?: string; size?: number }) {
  const strokeWidth = 2;
  const scale = size / 20;

  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {/* Outer ring */}
      <Circle
        cx="10"
        cy="10"
        r="8"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Middle ring */}
      <Circle
        cx="10"
        cy="10"
        r="5"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Inner ring */}
      <Circle
        cx="10"
        cy="10"
        r="2.5"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Center dot */}
      <Circle cx="10" cy="10" r="1" fill={color} />
    </Svg>
  );
}

function LightningIcon({ color = '#fff', size = 24 }: { color?: string; size?: number }) {
  const strokeWidth = 2;

  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {/* Lightning bolt */}
      <Path
        d="M12 2 L6 11 L10 11 L8 18 L14 9 L10 9 Z"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function FlameIcon({ color = '#fff', size = 24 }: { color?: string; size?: number }) {
  const strokeWidth = 2;

  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {/* Outer flame */}
      <Path
        d="M10 2 C10 2, 6 6, 6 10 C6 13, 8 15, 10 15 C12 15, 14 13, 14 10 C14 6, 10 2, 10 2 Z"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner flame */}
      <Path
        d="M10 6 C10 6, 8 8, 8 10 C8 11.5, 9 12.5, 10 12.5 C11 12.5, 12 11.5, 12 10 C12 8, 10 6, 10 6 Z"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Base */}
      <Path
        d="M6 15 C6 16, 7 17, 10 17 C13 17, 14 16, 14 15"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ClockIcon({ color = '#fff', size = 24 }: { color?: string; size?: number }) {
  const strokeWidth = 2;

  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {/* Clock circle */}
      <Circle
        cx="10"
        cy="10"
        r="8"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Hour hand */}
      <Path
        d="M10 10 L10 6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Minute hand */}
      <Path
        d="M10 10 L13 10"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Center dot */}
      <Circle cx="10" cy="10" r="1" fill={color} />
    </Svg>
  );
}

export default function WeeklySummaryCard({ summary, loading }: WeeklySummaryCardProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.loadingCard]}>
          <Text style={styles.loadingText}>Loading your week...</Text>
        </View>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.emptyCard]}>
          <View style={styles.emptyIconContainer}>
            <TargetIcon color="rgba(255, 255, 255, 0.3)" size={48} />
          </View>
          <Text style={styles.emptyTitle}>No Activity Yet</Text>
          <Text style={styles.emptyText}>
            Start logging workouts to see your weekly summary
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#3db88a', '#2a7a5f']}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <TargetIcon color="#fff" size={24} />
          </View>
          <Text style={styles.title}>Your Week</Text>
        </View>

        <Text style={styles.summaryText}>{summary.text}</Text>

        <View style={styles.stats}>
          {summary.workoutCount > 0 && (
            <Stat
              icon={<LightningIcon color="#F5A623" size={20} />}
              value={summary.workoutCount}
              label={summary.workoutCount === 1 ? 'workout' : 'workouts'}
              iconBgColor="rgba(245, 166, 35, 0.15)"
            />
          )}
          {summary.currentStreak > 0 && (
            <Stat
              icon={<FlameIcon color="#FF6B6B" size={20} />}
              value={summary.currentStreak}
              label="day streak"
              iconBgColor="rgba(255, 107, 107, 0.15)"
            />
          )}
          {summary.totalMinutes > 0 && (
            <Stat
              icon={<ClockIcon color="#4ECDC4" size={20} />}
              value={Math.round((summary.totalMinutes / 60) * 10) / 10}
              label="hours"
              iconBgColor="rgba(78, 205, 196, 0.15)"
            />
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

interface StatProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  iconBgColor?: string;
}

function Stat({ icon, value, label, iconBgColor }: StatProps) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIconContainer, iconBgColor && { backgroundColor: iconBgColor }]}>
        <View style={styles.statIcon}>{icon}</View>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  loadingCard: {
    backgroundColor: '#1e2940',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  loadingText: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptyCard: {
    backgroundColor: '#1e2940',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIconContainer: {
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.title3,
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  emptyText: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerIconContainer: {
    marginRight: Spacing.xs,
  },
  title: {
    ...Typography.title2,
    color: '#fff',
    fontWeight: '700',
  },
  summaryText: {
    ...Typography.body,
    color: '#fff',
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  stat: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    ...Typography.title1,
    color: '#fff',
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.caption1,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

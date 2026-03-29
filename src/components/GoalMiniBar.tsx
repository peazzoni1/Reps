import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Goal } from '../types';
import { isGoalCompleted } from '../services/goals';

interface GoalMiniBarProps {
  goal: Goal;
  compact?: boolean;
}

export default function GoalMiniBar({ goal, compact = false }: GoalMiniBarProps) {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  const completed = isGoalCompleted(goal);
  const progress = goal.targetValue > 0 ? goal.currentProgress / goal.targetValue : 0;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percentage = Math.round(clampedProgress * 100);

  const barColor = completed ? '#34C759' : '#3db88a';

  // Animate progress bar
  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: clampedProgress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [clampedProgress]);

  const animatedWidthPercentage = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Title and Progress Text */}
      <View style={styles.header}>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
          {goal.title}
        </Text>
        <Text style={[styles.progressText, compact && styles.progressTextCompact]}>
          {goal.currentProgress}/{goal.targetValue}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={[styles.barBackground, compact && styles.barBackgroundCompact]}>
        <Animated.View
          style={[
            styles.barFill,
            compact && styles.barFillCompact,
            {
              width: animatedWidthPercentage,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  containerCompact: {
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginRight: 8,
  },
  titleCompact: {
    fontSize: 12,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
    color: '#3db88a',
  },
  progressTextCompact: {
    fontSize: 11,
  },
  barBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barBackgroundCompact: {
    height: 4,
    borderRadius: 2,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barFillCompact: {
    borderRadius: 2,
  },
});

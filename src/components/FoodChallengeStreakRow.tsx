import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FoodChallengeCompletion } from '../types';

interface FoodChallengeStreakRowProps {
  completions: FoodChallengeCompletion[];
  accentColor?: string;
}

export default function FoodChallengeStreakRow({
  completions,
  accentColor = '#f5a623',
}: FoodChallengeStreakRowProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build a set of daysAgo values that have a completion
  const completedDaysAgo = new Set(
    completions.map((c) => {
      const completionDate = new Date(c.date + 'T00:00:00');
      completionDate.setHours(0, 0, 0, 0);
      return Math.floor((today.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));
    })
  );

  // 14-day grid: index 0 = 13 days ago, index 13 = today
  const days = Array.from({ length: 14 }, (_, i) => {
    const daysAgo = 13 - i;
    return { daysAgo, completed: completedDaysAgo.has(daysAgo) };
  });

  return (
    <View style={styles.container}>
      {days.map((d, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            d.completed
              ? { width: 10, height: 10, backgroundColor: accentColor }
              : {
                  width: 6,
                  height: 6,
                  backgroundColor: 'rgba(0,0,0,0.08)',
                  opacity: d.daysAgo === 0 ? 0.4 : 1,
                },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  dot: {
    borderRadius: 50,
  },
});

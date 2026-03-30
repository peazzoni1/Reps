import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Achievement } from '../types';
import { Typography, Spacing, BorderRadius } from '../theme';

interface AchievementCardProps {
  achievement: Achievement;
}

export default function AchievementCard({ achievement }: AchievementCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconBadge}>
        <Text style={styles.icon}>{achievement.icon}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{achievement.title}</Text>
        <Text style={styles.description}>{achievement.description}</Text>
        <Text style={styles.date}>
          {new Date(achievement.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#1e2940',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    alignItems: 'center',
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(61, 184, 138, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    ...Typography.headline,
    color: '#fff',
    marginBottom: 4,
  },
  description: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  date: {
    ...Typography.caption1,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

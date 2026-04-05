import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FoodChallenge, FoodChallengeCompletion } from '../types';
import { Spacing, BorderRadius } from '../theme';

interface DailyFoodChallengeCardProps {
  challenge: FoodChallenge;
  completion: FoodChallengeCompletion | null;
  streak: number;
  onComplete: () => void;
}

export default function DailyFoodChallengeCard({
  challenge,
  completion,
  streak,
  onComplete,
}: DailyFoodChallengeCardProps) {
  const isCompleted = completion !== null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>🌿 DAILY FOOD CHALLENGE</Text>
        {isCompleted && (
          <Text style={styles.badgeIcon}>{challenge.icon}</Text>
        )}
      </View>

      <Text style={styles.challengeText} numberOfLines={2}>
        {challenge.text}
      </Text>

      <View style={styles.bottomRow}>
        <View style={styles.streakContainer}>
          <Ionicons name="flame-outline" size={14} color="#f5a623" />
          <Text style={styles.streakText}>
            {streak} day{streak !== 1 ? 's' : ''}
          </Text>
        </View>

        {isCompleted ? (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#3db88a" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.doneButton} onPress={onComplete} activeOpacity={0.8}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1f2e4f',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3db88a',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  badgeIcon: {
    fontSize: 18,
  },
  challengeText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#ffffff',
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  completedText: {
    fontSize: 13,
    color: '#3db88a',
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#3db88a',
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: BorderRadius.pill,
  },
  doneButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});

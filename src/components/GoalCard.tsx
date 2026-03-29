import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Goal } from '../types';
import { SeasonTheme } from '../types';
import { getGoalProgressText, isGoalCompleted } from '../services/goals';
import GoalProgressRing from './GoalProgressRing';

interface GoalCardProps {
  goal: Goal;
  season: SeasonTheme;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export default function GoalCard({
  goal,
  season,
  onPress,
  onEdit,
  onDelete,
  compact = false,
}: GoalCardProps) {
  const completed = isGoalCompleted(goal);
  const progress = goal.targetValue > 0 ? goal.currentProgress / goal.targetValue : 0;
  const progressText = getGoalProgressText(goal);

  const cardColor = completed ? '#34C759' : '#3db88a';
  const opacity = completed ? 0.7 : 1;

  return (
    <Pressable
      style={[styles.card, { opacity }]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
    >
      <View style={styles.cardContent}>
        {/* Progress Ring */}
        <View style={styles.leftSection}>
          <GoalProgressRing
            progress={progress}
            size={compact ? 60 : 80}
            strokeWidth={compact ? 6 : 8}
            color={cardColor}
            showPercentage={!compact}
          />
          {completed && (
            <View style={styles.checkmarkBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            </View>
          )}
        </View>

        {/* Goal Info */}
        <View style={styles.rightSection}>
          <Text style={styles.title} numberOfLines={2}>
            {goal.title}
          </Text>

          {goal.description && !compact && (
            <Text style={styles.description} numberOfLines={2}>
              {goal.description}
            </Text>
          )}

          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{progressText}</Text>
            {completed && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>Completed</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          {(onEdit || onDelete) && !compact && (
            <View style={styles.actionButtons}>
              {onEdit && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="pencil" size={18} color="rgba(255, 255, 255, 0.6)" />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color="rgba(255, 59, 48, 0.8)" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(61, 184, 138, 0.2)',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#3db88a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftSection: {
    marginRight: 16,
    position: 'relative',
  },
  checkmarkBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#1f2e4f',
    borderRadius: 12,
  },
  rightSection: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
    lineHeight: 18,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    fontWeight: '600',
    color: '#3db88a',
  },
  completedBadge: {
    marginLeft: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34C759',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
});

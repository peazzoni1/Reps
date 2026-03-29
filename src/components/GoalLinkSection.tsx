import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MovementType, Goal } from '../types';
import { getActiveGoals, getGoalsByActivityType, getGoalProgressText } from '../services/goals';

interface GoalLinkSectionProps {
  activityType: MovementType;
  onGoalsSelected: (goalIds: string[]) => void;
  preSelectedGoalIds?: string[];
  season?: any;
}

export default function GoalLinkSection({
  activityType,
  onGoalsSelected,
  preSelectedGoalIds = [],
}: GoalLinkSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>(preSelectedGoalIds);
  const [relevantGoals, setRelevantGoals] = useState<Goal[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);

  useEffect(() => {
    loadGoals();
  }, [activityType]);

  useEffect(() => {
    setSelectedGoalIds(preSelectedGoalIds);
  }, [preSelectedGoalIds]);

  const loadGoals = async () => {
    try {
      const relevant = await getGoalsByActivityType(activityType);
      const all = await getActiveGoals();
      setRelevantGoals(relevant);
      setAllGoals(all);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const toggleGoal = (goalId: string) => {
    const newSelection = selectedGoalIds.includes(goalId)
      ? selectedGoalIds.filter((id) => id !== goalId)
      : [...selectedGoalIds, goalId];

    setSelectedGoalIds(newSelection);
    onGoalsSelected(newSelection);
  };

  const displayedGoals = showAll ? allGoals : relevantGoals;

  // Don't render if no goals exist
  if (allGoals.length === 0) {
    return null;
  }

  // Don't render if no relevant goals and not expanded to show all
  if (relevantGoals.length === 0 && !showAll) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Link to Goals</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No goals match this activity type.{' '}
          </Text>
          <TouchableOpacity onPress={() => setShowAll(true)}>
            <Text style={styles.viewAllText}>View all goals</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerText}>Link to Goals</Text>
          {selectedGoalIds.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{selectedGoalIds.length}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="rgba(255, 255, 255, 0.5)"
        />
      </TouchableOpacity>

      {/* Goals List */}
      {expanded && (
        <View style={styles.content}>
          {displayedGoals.map((goal) => (
            <Pressable
              key={goal.id}
              style={styles.goalItem}
              onPress={() => toggleGoal(goal.id)}
            >
              <View style={styles.goalItemLeft}>
                <View
                  style={[
                    styles.checkbox,
                    selectedGoalIds.includes(goal.id) && styles.checkboxChecked,
                  ]}
                >
                  {selectedGoalIds.includes(goal.id) && (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  )}
                </View>
                <View style={styles.goalInfo}>
                  <Text style={styles.goalTitle} numberOfLines={1}>
                    {goal.title}
                  </Text>
                  <Text style={styles.goalProgress}>{getGoalProgressText(goal)}</Text>
                </View>
              </View>
            </Pressable>
          ))}

          {/* View All Toggle */}
          {!showAll && allGoals.length > relevantGoals.length && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setShowAll(true)}
            >
              <Text style={styles.viewAllText}>
                View all goals ({allGoals.length - relevantGoals.length} more)
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#3db88a" />
            </TouchableOpacity>
          )}

          {showAll && relevantGoals.length > 0 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setShowAll(false)}
            >
              <Text style={styles.viewAllText}>Show relevant only</Text>
              <Ionicons name="chevron-back" size={16} color="#3db88a" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    backgroundColor: 'rgba(61, 184, 138, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(61, 184, 138, 0.2)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
    color: '#3db88a',
  },
  badge: {
    backgroundColor: '#3db88a',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(61, 184, 138, 0.1)',
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  goalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#3db88a',
    borderColor: '#3db88a',
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  goalProgress: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3db88a',
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    flexWrap: 'wrap',
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

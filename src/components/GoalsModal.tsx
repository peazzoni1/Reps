import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SeasonTheme, Goal } from '../types';
import { Spacing, BorderRadius } from '../theme';
import {
  getAllGoals,
  getActiveGoals,
  deleteGoal,
  recalculateAllGoalProgress,
} from '../services/goals';
import GoalCard from './GoalCard';

interface GoalsModalProps {
  visible: boolean;
  onClose: () => void;
  season: SeasonTheme;
  onCreateGoal: () => void;
  onEditGoal: (goal: Goal) => void;
}

type FilterType = 'active' | 'all' | 'completed';

export default function GoalsModal({
  visible,
  onClose,
  season,
  onCreateGoal,
  onEditGoal,
}: GoalsModalProps) {
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filter, setFilter] = useState<FilterType>('active');
  const [refreshing, setRefreshing] = useState(false);

  const loadGoals = useCallback(async () => {
    try {
      const allGoals = await getAllGoals();
      setGoals(allGoals);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await recalculateAllGoalProgress();
      await loadGoals();
    } catch (error) {
      console.error('Error refreshing goals:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadGoals]);

  useEffect(() => {
    if (visible) {
      loadGoals();
    }
  }, [visible, loadGoals]);

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoal(goal.id);
              await loadGoals();
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Filter goals
  const filteredGoals = goals.filter((goal) => {
    if (filter === 'active') {
      return goal.isActive && goal.currentProgress < goal.targetValue;
    }
    if (filter === 'completed') {
      return goal.currentProgress >= goal.targetValue;
    }
    return true; // 'all'
  });

  // Sort: active incomplete first, then completed
  const sortedGoals = [...filteredGoals].sort((a, b) => {
    const aCompleted = a.currentProgress >= a.targetValue;
    const bCompleted = b.currentProgress >= b.targetValue;
    if (aCompleted === bCompleted) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return aCompleted ? 1 : -1;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>🎯 GOALS</Text>
              {goals.length > 0 && (
                <Text style={styles.headerCount}>{goals.length}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={onCreateGoal}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add-circle" size={28} color="#3db88a" />
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
          {goals.length > 0 && (
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
                onPress={() => setFilter('active')}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filter === 'active' && styles.filterTabTextActive,
                  ]}
                >
                  Active
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
                onPress={() => setFilter('all')}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filter === 'all' && styles.filterTabTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
                onPress={() => setFilter('completed')}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filter === 'completed' && styles.filterTabTextActive,
                  ]}
                >
                  Completed
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Goals List */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#3db88a"
              />
            }
          >
            {sortedGoals.length > 0 ? (
              <View style={styles.goalsList}>
                {sortedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    season={season}
                    onPress={() => {}}
                    onEdit={() => onEditGoal(goal)}
                    onDelete={() => handleDeleteGoal(goal)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                {goals.length === 0 ? (
                  <>
                    <Text style={styles.emptyStateEmoji}>🎯</Text>
                    <Text style={styles.emptyStateTitle}>No Goals Yet</Text>
                    <Text style={styles.emptyStateDescription}>
                      Create your first goal to start tracking your fitness journey!
                    </Text>
                    <TouchableOpacity style={styles.createButton} onPress={onCreateGoal}>
                      <Text style={styles.createButtonText}>Create Your First Goal</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.emptyStateEmoji}>🔍</Text>
                    <Text style={styles.emptyStateTitle}>No {filter} goals</Text>
                    <Text style={styles.emptyStateDescription}>
                      Try changing the filter or create a new goal.
                    </Text>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    minHeight: '80%',
    maxHeight: '95%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: Spacing.md,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3db88a',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  headerCount: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  addButton: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: 'rgba(61, 184, 138, 0.2)',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  filterTabTextActive: {
    color: '#3db88a',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  goalsList: {
    paddingBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#3db88a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});

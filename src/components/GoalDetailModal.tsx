import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Goal, GoalPeriodRecord, SeasonTheme, TargetPeriod } from '../types';
import { Spacing, BorderRadius } from '../theme';
import { getGoalPeriodRecords, getPeriodDateRange, getPeriodRangeForDate } from '../services/goals';
import GoalProgressRing from './GoalProgressRing';

interface GoalDetailModalProps {
  visible: boolean;
  onClose: () => void;
  goal: Goal | null;
  season: SeasonTheme;
  onEdit: () => void;
  onDelete: () => void;
}

function formatPeriodLabel(record: GoalPeriodRecord): string {
  if (record.targetPeriod === 'daily') {
    return new Date(`${record.periodStart}T12:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  if (record.targetPeriod === 'monthly') {
    return new Date(`${record.periodStart}T12:00:00`).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }
  // weekly
  const start = new Date(`${record.periodStart}T12:00:00`);
  const end = new Date(`${record.periodEnd}T12:00:00`);
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startStr} – ${endStr}`;
}

function formatCurrentPeriodLabel(period: TargetPeriod, start: string, end: string): string {
  if (period === 'daily') {
    return new Date(`${start}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }
  if (period === 'monthly') {
    return new Date(`${start}T12:00:00`).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }
  // weekly
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startStr} – ${endStr}`;
}

function CompletionDots({ completed, total }: { completed: number; total: number }) {
  const dots = Math.min(total, 7); // cap at 7 dots visually
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: dots }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i < completed ? dotStyles.dotFilled : dotStyles.dotEmpty,
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotFilled: {
    backgroundColor: '#3db88a',
  },
  dotEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});

export default function GoalDetailModal({
  visible,
  onClose,
  goal,
  season,
  onEdit,
  onDelete,
}: GoalDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [periodRecords, setPeriodRecords] = useState<GoalPeriodRecord[]>([]);

  const loadHistory = useCallback(async () => {
    if (!goal) return;
    const records = await getGoalPeriodRecords(goal.id);
    setPeriodRecords(records);
  }, [goal]);

  useEffect(() => {
    if (visible && goal) {
      loadHistory();
    }
  }, [visible, goal, loadHistory]);

  if (!goal) return null;

  const completed = goal.currentProgress >= goal.targetValue;
  const progress = goal.targetValue > 0 ? goal.currentProgress / goal.targetValue : 0;
  const cardColor = completed ? '#34C759' : '#3db88a';

  const currentPeriodRange =
    goal.targetPeriod !== 'custom'
      ? getPeriodDateRange(goal.targetPeriod, goal.startDate)
      : { start: goal.startDate, end: new Date().toISOString().split('T')[0] };

  const currentPeriodLabel = formatCurrentPeriodLabel(
    goal.targetPeriod,
    currentPeriodRange.start,
    currentPeriodRange.end
  );

  // Streak: count consecutive completed periods
  const streak = (() => {
    if (periodRecords.length === 0) return 0;
    let count = 0;
    for (const record of periodRecords) {
      if (record.completed) count++;
      else break;
    }
    return count;
  })();

  const completedCount = periodRecords.filter(r => r.completed).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-down" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={onEdit}
                style={styles.headerActionButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="pencil" size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDelete}
                style={styles.headerActionButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color="rgba(255, 59, 48, 0.8)" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Goal Title */}
            <Text style={styles.goalTitle}>{goal.title}</Text>
            {goal.description ? (
              <Text style={styles.goalDescription}>{goal.description}</Text>
            ) : null}

            {/* Current Period Card */}
            <View style={styles.currentPeriodCard}>
              <View style={styles.currentPeriodHeader}>
                <Text style={styles.currentPeriodLabel}>CURRENT PERIOD</Text>
                <Text style={styles.currentPeriodDate}>{currentPeriodLabel}</Text>
              </View>
              <View style={styles.currentPeriodBody}>
                <GoalProgressRing
                  progress={progress}
                  size={90}
                  strokeWidth={9}
                  color={cardColor}
                  showPercentage
                />
                <View style={styles.currentPeriodStats}>
                  <Text style={[styles.currentProgressText, { color: cardColor }]}>
                    {goal.currentProgress}
                    <Text style={styles.currentProgressTarget}>/{goal.targetValue}</Text>
                  </Text>
                  <Text style={styles.currentProgressSubtext}>
                    {completed ? 'Goal completed!' : `${goal.targetValue - goal.currentProgress} more to go`}
                  </Text>
                  {completed && (
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                      <Text style={styles.completedBadgeText}>Completed</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Stats Row */}
            {periodRecords.length > 0 && (
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{periodRecords.length}</Text>
                  <Text style={styles.statLabel}>Periods{'\n'}Tracked</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{completedCount}</Text>
                  <Text style={styles.statLabel}>Periods{'\n'}Completed</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, streak > 0 && styles.statValueStreak]}>
                    {streak}
                  </Text>
                  <Text style={styles.statLabel}>Current{'\n'}Streak</Text>
                </View>
              </View>
            )}

            {/* History */}
            <View style={styles.historySection}>
              <Text style={styles.historySectionTitle}>HISTORY</Text>

              {periodRecords.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Text style={styles.emptyHistoryText}>
                    Past periods will appear here once a new period starts.
                  </Text>
                </View>
              ) : (
                <View style={styles.historyList}>
                  {periodRecords.map((record) => (
                    <View key={record.id} style={styles.historyItem}>
                      <View style={styles.historyItemLeft}>
                        <View
                          style={[
                            styles.historyStatusIcon,
                            record.completed
                              ? styles.historyStatusCompleted
                              : styles.historyStatusIncomplete,
                          ]}
                        >
                          <Ionicons
                            name={record.completed ? 'checkmark' : 'close'}
                            size={12}
                            color={record.completed ? '#34C759' : 'rgba(255,255,255,0.4)'}
                          />
                        </View>
                      </View>
                      <View style={styles.historyItemContent}>
                        <Text style={styles.historyPeriodLabel}>{formatPeriodLabel(record)}</Text>
                        <CompletionDots
                          completed={Math.min(record.progress, record.targetValue)}
                          total={record.targetValue}
                        />
                      </View>
                      <Text
                        style={[
                          styles.historyProgress,
                          record.completed ? styles.historyProgressCompleted : styles.historyProgressIncomplete,
                        ]}
                      >
                        {record.progress}/{record.targetValue}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheet: {
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
  handle: {
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
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerActionButton: {
    padding: 4,
  },
  goalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    lineHeight: 28,
  },
  goalDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 20,
    lineHeight: 20,
  },
  currentPeriodCard: {
    backgroundColor: 'rgba(61, 184, 138, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(61, 184, 138, 0.2)',
    padding: 20,
    marginBottom: 16,
  },
  currentPeriodHeader: {
    marginBottom: 16,
  },
  currentPeriodLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3db88a',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  currentPeriodDate: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  currentPeriodBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  currentPeriodStats: {
    flex: 1,
  },
  currentProgressText: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
  },
  currentProgressTarget: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  currentProgressSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  statValueStreak: {
    color: '#FFD60A',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center',
    lineHeight: 15,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
  historySection: {
    marginBottom: 16,
  },
  historySectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  emptyHistory: {
    paddingVertical: 24,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    lineHeight: 20,
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: 12,
    gap: 12,
  },
  historyItemLeft: {
    width: 28,
    alignItems: 'center',
  },
  historyStatusIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyStatusCompleted: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  historyStatusIncomplete: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  historyItemContent: {
    flex: 1,
  },
  historyPeriodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  historyProgress: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyProgressCompleted: {
    color: '#34C759',
  },
  historyProgressIncomplete: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
});

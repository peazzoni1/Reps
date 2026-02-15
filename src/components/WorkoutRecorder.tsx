import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Template, ExerciseInstance, WorkoutInstance } from '../types';
import { Colors, Spacing, BorderRadius, Typography, Shadows, TouchTarget } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface WorkoutRecorderProps {
  visible: boolean;
  template: Template | null;
  workout?: WorkoutInstance | null;
  onSave: (exercises: ExerciseInstance[]) => void;
  onCancel: () => void;
}

const TAG_OPTIONS = ['Felt good', 'To failure', 'Heavy', 'Skip'];

export default function WorkoutRecorder({ visible, template, workout, onSave, onCancel }: WorkoutRecorderProps) {
  const [exercises, setExercises] = useState<ExerciseInstance[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (visible && template) {
      if (workout) {
        // Editing existing workout - pre-fill with workout data
        setExercises(workout.exercises);
      } else {
        // Creating new workout - initialize from template
        setExercises(
          template.exercises.map(e => ({
            name: e.name,
            weight: undefined,
            reps: undefined,
            sets: undefined,
            tags: [],
            notes: '',
          }))
        );
      }
      setExpandedIndex(null);
      setCompletedExercises(new Set());
    }
  }, [template, workout, visible]);

  const toggleExpanded = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const toggleCompleted = (index: number) => {
    const newCompleted = new Set(completedExercises);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedExercises(newCompleted);
  };

  const updateExercise = (index: number, updates: Partial<ExerciseInstance>) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], ...updates };
    setExercises(updated);
  };

  const toggleTag = (index: number, tag: string) => {
    const exercise = exercises[index];
    const tags = exercise.tags || [];
    const newTags = tags.includes(tag)
      ? tags.filter(t => t !== tag)
      : [...tags, tag];
    updateExercise(index, { tags: newTags });
  };

  const handleSave = () => {
    onSave(exercises);
  };

  if (!template) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <TouchableOpacity onPress={onCancel} style={styles.button} activeOpacity={0.6}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{template.name}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.button} activeOpacity={0.6}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {exercises.map((exercise, index) => (
            <View key={index} style={styles.exerciseCard}>
              <TouchableOpacity
                style={styles.exerciseHeader}
                onPress={() => toggleExpanded(index)}
                activeOpacity={0.6}
              >
                <TouchableOpacity
                  onPress={() => toggleCompleted(index)}
                  style={styles.checkbox}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkboxInner,
                    completedExercises.has(index) && styles.checkboxChecked
                  ]}>
                    {completedExercises.has(index) && (
                      <Ionicons name="checkmark" size={18} color={Colors.cardBackground} />
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.exerciseHeaderText}>
                  <Text style={[
                    styles.exerciseName,
                    completedExercises.has(index) && styles.exerciseNameCompleted
                  ]}>
                    {exercise.name}
                  </Text>
                  {exercise.tags && exercise.tags.length > 0 && (
                    <View style={styles.tagContainer}>
                      {exercise.tags.map((tag, i) => (
                        <View key={i} style={styles.miniTag}>
                          <Text style={styles.miniTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <Ionicons
                  name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={Colors.textTertiary}
                />
              </TouchableOpacity>

              {expandedIndex === index && (
                <View style={styles.exerciseDetails}>
                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>WEIGHT</Text>
                      <TextInput
                        style={styles.input}
                        value={exercise.weight?.toString() || ''}
                        onChangeText={(text) => updateExercise(index, {
                          weight: text ? parseFloat(text) : undefined
                        })}
                        placeholder="lbs"
                        placeholderTextColor={Colors.textTertiary}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>REPS</Text>
                      <TextInput
                        style={styles.input}
                        value={exercise.reps?.toString() || ''}
                        onChangeText={(text) => updateExercise(index, {
                          reps: text ? parseInt(text) : undefined
                        })}
                        placeholder="#"
                        placeholderTextColor={Colors.textTertiary}
                        keyboardType="number-pad"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>SETS</Text>
                      <TextInput
                        style={styles.input}
                        value={exercise.sets?.toString() || ''}
                        onChangeText={(text) => updateExercise(index, {
                          sets: text ? parseInt(text) : undefined
                        })}
                        placeholder="#"
                        placeholderTextColor={Colors.textTertiary}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.tagsSection}>
                    <Text style={styles.tagsLabel}>TAGS</Text>
                    <View style={styles.tagsRow}>
                      {TAG_OPTIONS.map((tag) => (
                        <TouchableOpacity
                          key={tag}
                          style={[
                            styles.tag,
                            exercise.tags?.includes(tag) && styles.tagActive
                          ]}
                          onPress={() => toggleTag(index, tag)}
                          activeOpacity={0.6}
                        >
                          <Text style={[
                            styles.tagText,
                            exercise.tags?.includes(tag) && styles.tagTextActive
                          ]}>
                            {tag}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.notesSection}>
                    <Text style={styles.inputLabel}>NOTES</Text>
                    <TextInput
                      style={[styles.input, styles.notesInput]}
                      value={exercise.notes || ''}
                      onChangeText={(text) => updateExercise(index, { notes: text })}
                      placeholder="Add notes..."
                      placeholderTextColor={Colors.textTertiary}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              )}
            </View>
          ))}
          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  title: {
    ...Typography.headline,
    color: Colors.textPrimary,
  },
  button: {
    minWidth: 60,
    minHeight: TouchTarget.min,
    justifyContent: 'center',
  },
  cancelText: {
    ...Typography.body,
    color: Colors.accent,
  },
  doneText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.accent,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.base,
  },
  exerciseCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    minHeight: 60,
  },
  checkbox: {
    marginRight: Spacing.md,
  },
  checkboxInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  exerciseHeaderText: {
    flex: 1,
  },
  exerciseName: {
    ...Typography.headline,
    color: Colors.textPrimary,
  },
  exerciseNameCompleted: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
  },
  miniTag: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.xs,
    marginTop: 2,
  },
  miniTagText: {
    ...Typography.caption2,
    color: Colors.accent,
    fontWeight: '500',
  },
  exerciseDetails: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    borderTopWidth: 0.5,
    borderTopColor: Colors.separator,
  },
  inputRow: {
    flexDirection: 'row',
    marginTop: Spacing.base,
    marginBottom: Spacing.base,
    gap: Spacing.md,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Typography.body,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: Spacing.md,
  },
  tagsSection: {
    marginBottom: Spacing.base,
  },
  tagsLabel: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  tagActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  tagText: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
  },
  tagTextActive: {
    color: Colors.accent,
    fontWeight: '500',
  },
  notesSection: {
    marginTop: 0,
  },
});

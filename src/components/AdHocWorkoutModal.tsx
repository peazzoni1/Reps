import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, TouchTarget } from '../theme';

interface AdHocWorkoutModalProps {
  visible: boolean;
  onStart: (exercises: { name: string }[]) => void;
  onCancel: () => void;
}

export default function AdHocWorkoutModal({ visible, onStart, onCancel }: AdHocWorkoutModalProps) {
  const [exercises, setExercises] = useState<string[]>(['']);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setExercises(['']);
    }
  }, [visible]);

  const handleAddExercise = () => {
    setExercises([...exercises, '']);
  };

  const handleRemoveExercise = (index: number) => {
    if (exercises.length > 1) {
      setExercises(exercises.filter((_, i) => i !== index));
    }
  };

  const handleExerciseChange = (index: number, value: string) => {
    const updated = [...exercises];
    updated[index] = value;
    setExercises(updated);
  };

  const handleStart = () => {
    const filteredExercises = exercises
      .filter(e => e.trim() !== '')
      .map(name => ({ name: name.trim() }));

    if (filteredExercises.length > 0) {
      onStart(filteredExercises);
      setExercises(['']);
    }
  };

  const canStart = exercises.some(e => e.trim() !== '');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
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
          <Text style={styles.title}>Ad-hoc Workout</Text>
          <TouchableOpacity
            onPress={handleStart}
            style={styles.button}
            disabled={!canStart}
            activeOpacity={0.6}
          >
            <Text style={[styles.startText, !canStart && styles.disabledText]}>Start</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>EXERCISES</Text>
              <TouchableOpacity onPress={handleAddExercise} style={styles.addButton} activeOpacity={0.6}>
                <Ionicons name="add-circle" size={20} color={Colors.accent} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              Add the exercises you want to do. You'll configure details in the next step.
            </Text>

            {exercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseRow}>
                <TextInput
                  style={styles.input}
                  value={exercise}
                  onChangeText={(value) => handleExerciseChange(index, value)}
                  placeholder={`Exercise ${index + 1}`}
                  placeholderTextColor={Colors.textTertiary}
                  autoFocus={index === 0}
                />
                {exercises.length > 1 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveExercise(index)}
                    style={styles.removeButton}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="remove-circle" size={20} color={Colors.destructive} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
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
  startText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.accent,
    textAlign: 'right',
  },
  disabledText: {
    color: Colors.textTertiary,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  hint: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
    lineHeight: 18,
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
    flex: 1,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: TouchTarget.min,
    paddingHorizontal: Spacing.sm,
  },
  addButtonText: {
    ...Typography.body,
    color: Colors.accent,
    fontWeight: '500',
  },
  removeButton: {
    width: TouchTarget.min,
    height: TouchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

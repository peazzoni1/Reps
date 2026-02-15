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
import { Template } from '../types';
import { Colors, Spacing, BorderRadius, Typography, TouchTarget } from '../theme';

interface TemplateModalProps {
  visible: boolean;
  template?: Template;
  onSave: (name: string, exercises: { name: string }[]) => void;
  onCancel: () => void;
}

export default function TemplateModal({ visible, template, onSave, onCancel }: TemplateModalProps) {
  const [templateName, setTemplateName] = useState('');
  const [exercises, setExercises] = useState<string[]>(['']);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (template) {
      setTemplateName(template.name);
      setExercises(template.exercises.map(e => e.name));
    } else {
      setTemplateName('');
      setExercises(['']);
    }
  }, [template, visible]);

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

  const handleSave = () => {
    const filteredExercises = exercises
      .filter(e => e.trim() !== '')
      .map(name => ({ name: name.trim() }));

    if (templateName.trim() && filteredExercises.length > 0) {
      onSave(templateName.trim(), filteredExercises);
      setTemplateName('');
      setExercises(['']);
    }
  };

  const canSave = templateName.trim() !== '' && exercises.some(e => e.trim() !== '');

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
          <Text style={styles.title}>{template ? 'Edit Template' : 'New Template'}</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.button}
            disabled={!canSave}
            activeOpacity={0.6}
          >
            <Text style={[styles.saveText, !canSave && styles.disabledText]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.label}>TEMPLATE NAME</Text>
            <TextInput
              style={styles.input}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="e.g., Push Day"
              placeholderTextColor={Colors.textTertiary}
              autoFocus={!template}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>EXERCISES</Text>
              <TouchableOpacity onPress={handleAddExercise} style={styles.addButton} activeOpacity={0.6}>
                <Ionicons name="add-circle" size={20} color={Colors.accent} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {exercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseRow}>
                <TextInput
                  style={styles.input}
                  value={exercise}
                  onChangeText={(value) => handleExerciseChange(index, value)}
                  placeholder={`Exercise ${index + 1}`}
                  placeholderTextColor={Colors.textTertiary}
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
  saveText: {
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
    marginBottom: Spacing.md,
  },
  label: {
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

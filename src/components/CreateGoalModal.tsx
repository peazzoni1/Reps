import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SeasonTheme, GoalType, TargetPeriod, MovementType, Goal } from '../types';
import { MOVEMENT_TYPES } from '../constants/seasonal';
import { Spacing } from '../theme';
import { createGoal, updateGoal, generateGoalTitle } from '../services/goals';
import { toLocalDateStr } from '../services/storage';

interface CreateGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  season: SeasonTheme;
  existingGoal?: Goal | null;
}

type Step = 1 | 2;

const GOAL_TYPES: { id: GoalType; label: string; icon: string; description: string }[] = [
  {
    id: 'activity_count',
    label: 'Activity Count',
    icon: '🎯',
    description: 'Track specific activities (e.g., Run 3x per week)',
  },
  {
    id: 'streak',
    label: 'Activity Streak',
    icon: '🔥',
    description: 'Build consistency (e.g., 30-day workout streak)',
  },
  {
    id: 'custom',
    label: 'Custom Goal',
    icon: '⭐',
    description: 'Set your own personalized fitness goal',
  },
];

const TARGET_PERIODS: { id: TargetPeriod; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

export default function CreateGoalModal({
  visible,
  onClose,
  onSuccess,
  season,
  existingGoal,
}: CreateGoalModalProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  // Step 1 fields
  const [goalType, setGoalType] = useState<GoalType>('activity_count');
  const [activityType, setActivityType] = useState<MovementType>('running');
  const [targetValue, setTargetValue] = useState('3');
  const [targetPeriod, setTargetPeriod] = useState<TargetPeriod>('weekly');

  // Step 2 fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(toLocalDateStr(new Date()));

  // Load existing goal data if editing
  useEffect(() => {
    if (existingGoal) {
      setGoalType(existingGoal.goalType);
      setActivityType(existingGoal.activityType || 'running');
      setTargetValue(String(existingGoal.targetValue));
      setTargetPeriod(existingGoal.targetPeriod);
      setTitle(existingGoal.title);
      setDescription(existingGoal.description || '');
      setStartDate(existingGoal.startDate);
    } else {
      // Reset to defaults when creating new
      setGoalType('activity_count');
      setActivityType('running');
      setTargetValue('3');
      setTargetPeriod('weekly');
      setTitle('');
      setDescription('');
      setStartDate(toLocalDateStr(new Date()));
      setStep(1);
    }
  }, [existingGoal, visible]);

  // Auto-generate title when moving to step 2
  useEffect(() => {
    if (step === 2 && !existingGoal) {
      const generatedTitle = generateGoalTitle(
        goalType,
        parseInt(targetValue) || 1,
        targetPeriod,
        goalType === 'activity_count' ? activityType : undefined
      );
      setTitle(generatedTitle);
    }
  }, [step, goalType, activityType, targetValue, targetPeriod, existingGoal]);

  const handleNext = () => {
    // Validate step 1
    const value = parseInt(targetValue);
    if (isNaN(value) || value < 1) {
      Alert.alert('Invalid Target', 'Please enter a valid target value (at least 1).');
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSave = async () => {
    // Validate step 2
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your goal.');
      return;
    }

    const value = parseInt(targetValue);
    if (isNaN(value) || value < 1) {
      Alert.alert('Invalid Target', 'Please enter a valid target value.');
      return;
    }

    setSaving(true);
    try {
      const goalData = {
        userId: '', // Will be set by createGoal
        title: title.trim(),
        description: description.trim() || undefined,
        goalType,
        targetValue: value,
        targetPeriod,
        activityType: goalType === 'activity_count' ? activityType : undefined,
        startDate,
        endDate: undefined,
        isActive: true,
      };

      if (existingGoal) {
        await updateGoal(existingGoal.id, goalData);
      } else {
        await createGoal(goalData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving goal:', error);
      Alert.alert('Error', 'Failed to save goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={step === 1 ? handleClose : handleBack}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={24} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {existingGoal ? 'Edit Goal' : `Create Goal (${step}/2)`}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={true}
            >
            {step === 1 ? (
              <View style={styles.stepContainer}>
                {/* Goal Type Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Goal Type</Text>
                  <View style={styles.optionsGrid}>
                    {GOAL_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.optionCard,
                          goalType === type.id && styles.optionCardActive,
                        ]}
                        onPress={() => setGoalType(type.id)}
                      >
                        <Text style={styles.optionIcon}>{type.icon}</Text>
                        <Text style={styles.optionLabel}>{type.label}</Text>
                        <Text style={styles.optionDescription}>{type.description}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Activity Type (only for activity_count) */}
                {goalType === 'activity_count' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Activity Type</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.activityScroll}
                    >
                      {MOVEMENT_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type.id}
                          style={[
                            styles.activityPill,
                            activityType === type.id && styles.activityPillActive,
                          ]}
                          onPress={() => setActivityType(type.id as MovementType)}
                        >
                          <Text style={styles.activityIcon}>{type.icon}</Text>
                          <Text
                            style={[
                              styles.activityLabel,
                              activityType === type.id && styles.activityLabelActive,
                            ]}
                          >
                            {type.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Target Value */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Target {goalType === 'streak' ? 'Days' : 'Count'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={targetValue}
                    onChangeText={setTargetValue}
                    keyboardType="number-pad"
                    placeholder="e.g., 3"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  />
                </View>

                {/* Target Period */}
                {goalType !== 'custom' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Time Period</Text>
                    <View style={styles.periodButtons}>
                      {TARGET_PERIODS.map((period) => (
                        <TouchableOpacity
                          key={period.id}
                          style={[
                            styles.periodButton,
                            targetPeriod === period.id && styles.periodButtonActive,
                          ]}
                          onPress={() => setTargetPeriod(period.id)}
                        >
                          <Text
                            style={[
                              styles.periodButtonText,
                              targetPeriod === period.id && styles.periodButtonTextActive,
                            ]}
                          >
                            {period.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Next Button */}
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                  <Text style={styles.nextButtonText}>Next</Text>
                  <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.stepContainer}>
                {/* Title */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Goal Title</Text>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g., Run 3x per week"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  />
                </View>

                {/* Description */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Description (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Add details about your goal..."
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Preview */}
                <View style={styles.previewContainer}>
                  <Text style={styles.previewTitle}>Preview</Text>
                  <View style={styles.previewCard}>
                    <Text style={styles.previewGoalTitle}>{title || 'Your Goal'}</Text>
                    {description && (
                      <Text style={styles.previewDescription}>{description}</Text>
                    )}
                    <Text style={styles.previewTarget}>
                      Target: {targetValue}{' '}
                      {goalType === 'activity_count' && activityType
                        ? MOVEMENT_TYPES.find((t) => t.id === activityType)?.label.toLowerCase()
                        : 'activities'}{' '}
                      {targetPeriod !== 'custom' && targetPeriod}
                    </Text>
                  </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : existingGoal ? 'Update Goal' : 'Create Goal'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    width: '100%',
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
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    alignItems: 'center',
  },
  optionCardActive: {
    borderColor: '#3db88a',
    backgroundColor: 'rgba(61, 184, 138, 0.1)',
  },
  optionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 18,
  },
  activityScroll: {
    flexDirection: 'row',
  },
  activityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activityPillActive: {
    borderColor: '#3db88a',
    backgroundColor: 'rgba(61, 184, 138, 0.15)',
  },
  activityIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  activityLabelActive: {
    color: '#3db88a',
    fontWeight: '700',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'Nunito_600SemiBold',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  periodButtonActive: {
    borderColor: '#3db88a',
    backgroundColor: 'rgba(61, 184, 138, 0.15)',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  periodButtonTextActive: {
    color: '#3db88a',
    fontWeight: '700',
  },
  nextButton: {
    backgroundColor: '#3db88a',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
    color: '#ffffff',
  },
  previewContainer: {
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewCard: {
    backgroundColor: 'rgba(61, 184, 138, 0.1)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(61, 184, 138, 0.3)',
    padding: 16,
  },
  previewGoalTitle: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  previewDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
    lineHeight: 20,
  },
  previewTarget: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3db88a',
  },
  saveButton: {
    backgroundColor: '#3db88a',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
    color: '#ffffff',
  },
});

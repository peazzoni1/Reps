import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SeasonTheme, MovementType, FeelingType, WorkoutExercise } from '../types';
import { MOVEMENT_TYPES, FEELINGS } from '../constants/seasonal';
import { Spacing, BorderRadius, Typography } from '../theme';

// Helper to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface QuickLogModalProps {
  visible: boolean;
  season: SeasonTheme;
  onClose: () => void;
  onSave: (entry: { type: MovementType; feeling: FeelingType; note?: string; workoutDetails?: WorkoutExercise[] }) => void;
}

export default function QuickLogModal({ visible, season, onClose, onSave }: QuickLogModalProps) {
  const [selectedType, setSelectedType] = useState<MovementType | null>(null);
  const [selectedFeeling, setSelectedFeeling] = useState<FeelingType | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([
    { name: '', sets: undefined, reps: undefined, weight: undefined }
  ]);

  // Animation values
  const feelingOpacity = useRef(new Animated.Value(0)).current;
  const feelingTranslateY = useRef(new Animated.Value(12)).current;
  const saveOpacity = useRef(new Animated.Value(0)).current;
  const saveTranslateY = useRef(new Animated.Value(12)).current;

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      // Reset after animation completes
      setTimeout(() => {
        setSelectedType(null);
        setSelectedFeeling(null);
        setNote('');
        setShowNote(false);
        setShowWorkoutDetails(false);
        setWorkoutExercises([{ name: '', sets: undefined, reps: undefined, weight: undefined }]);
        feelingOpacity.setValue(0);
        feelingTranslateY.setValue(12);
        saveOpacity.setValue(0);
        saveTranslateY.setValue(12);
      }, 300);
    }
  }, [visible]);

  // Animate feeling section when type is selected
  useEffect(() => {
    if (selectedType) {
      Animated.parallel([
        Animated.timing(feelingOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(feelingTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedType]);

  // Animate save button when feeling is selected
  useEffect(() => {
    if (selectedType && selectedFeeling) {
      Animated.parallel([
        Animated.timing(saveOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(saveTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedType, selectedFeeling]);

  const handleSave = () => {
    if (selectedType && selectedFeeling) {
      // Filter out empty exercises and only include if workout details were added
      const validExercises = showWorkoutDetails
        ? workoutExercises.filter(ex => ex.name.trim() !== '')
        : undefined;

      onSave({
        type: selectedType,
        feeling: selectedFeeling,
        note: note || undefined,
        workoutDetails: validExercises && validExercises.length > 0 ? validExercises : undefined,
      });
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  const updateExercise = (index: number, field: keyof WorkoutExercise, value: string | number) => {
    const updated = [...workoutExercises];
    updated[index] = { ...updated[index], [field]: value };
    setWorkoutExercises(updated);
  };

  const addExercise = () => {
    setWorkoutExercises([...workoutExercises, { name: '', sets: undefined, reps: undefined, weight: undefined }]);
  };

  const removeExercise = (index: number) => {
    if (workoutExercises.length > 1) {
      setWorkoutExercises(workoutExercises.filter((_, i) => i !== index));
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Pressable style={[styles.content, { backgroundColor: '#fff' }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />

            <View>
            <Text style={[styles.question, { color: season.text }]}>
              What did you do?
            </Text>

            <View style={styles.optionsContainer}>
              {MOVEMENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => setSelectedType(type.id)}
                  style={[
                    styles.option,
                    selectedType === type.id
                      ? {
                          borderColor: season.color,
                          backgroundColor: hexToRgba(season.color, 0.1),
                        }
                      : styles.optionInactive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: selectedType === type.id ? season.color : season.textSecondary },
                    ]}
                  >
                    {type.icon}  {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedType && (
              <Animated.View
                style={[
                  {
                    opacity: feelingOpacity,
                    transform: [{ translateY: feelingTranslateY }],
                  },
                ]}
              >
                <Text style={[styles.question, { color: season.text, marginTop: 8 }]}>
                  How did it feel?
                </Text>

                <View style={styles.optionsContainer}>
                  {FEELINGS.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      onPress={() => setSelectedFeeling(f.id)}
                      style={[
                        styles.option,
                        selectedFeeling === f.id
                          ? {
                              borderColor: season.color,
                              backgroundColor: hexToRgba(season.color, 0.1),
                            }
                          : styles.optionInactive,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: selectedFeeling === f.id ? season.color : season.textSecondary },
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Workout details section - only for "Lifted" */}
                {selectedType === 'lifted' && !showWorkoutDetails && (
                  <TouchableOpacity
                    onPress={() => setShowWorkoutDetails(true)}
                    style={styles.addNoteButton}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.addNoteText, { color: season.textSecondary }]}>
                      + Add workout details
                    </Text>
                  </TouchableOpacity>
                )}

                {selectedType === 'lifted' && showWorkoutDetails && (
                  <View style={styles.workoutSection}>
                    {workoutExercises.map((exercise, index) => (
                      <View key={index} style={styles.exerciseRow}>
                        <TextInput
                          value={exercise.name}
                          onChangeText={(text) => updateExercise(index, 'name', text)}
                          placeholder="Exercise name"
                          placeholderTextColor={hexToRgba(season.textSecondary, 0.5)}
                          style={[styles.exerciseNameInput, { color: season.text, borderColor: hexToRgba(season.color, 0.2) }]}
                        />
                        <View style={styles.exerciseMetrics}>
                          <TextInput
                            value={exercise.sets?.toString() || ''}
                            onChangeText={(text) => updateExercise(index, 'sets', text ? parseInt(text) : undefined)}
                            placeholder="Sets"
                            placeholderTextColor={hexToRgba(season.textSecondary, 0.5)}
                            keyboardType="number-pad"
                            style={[styles.metricInput, { color: season.text, borderColor: hexToRgba(season.color, 0.2) }]}
                          />
                          <TextInput
                            value={exercise.reps?.toString() || ''}
                            onChangeText={(text) => updateExercise(index, 'reps', text ? parseInt(text) : undefined)}
                            placeholder="Reps"
                            placeholderTextColor={hexToRgba(season.textSecondary, 0.5)}
                            keyboardType="number-pad"
                            style={[styles.metricInput, { color: season.text, borderColor: hexToRgba(season.color, 0.2) }]}
                          />
                          <TextInput
                            value={exercise.weight?.toString() || ''}
                            onChangeText={(text) => updateExercise(index, 'weight', text ? parseInt(text) : undefined)}
                            placeholder="lbs"
                            placeholderTextColor={hexToRgba(season.textSecondary, 0.5)}
                            keyboardType="number-pad"
                            style={[styles.metricInput, { color: season.text, borderColor: hexToRgba(season.color, 0.2) }]}
                          />
                        </View>
                        {workoutExercises.length > 1 && (
                          <TouchableOpacity
                            onPress={() => removeExercise(index)}
                            style={styles.removeButton}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.removeButtonText, { color: season.textSecondary }]}>×</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    <TouchableOpacity
                      onPress={addExercise}
                      style={styles.addExerciseButton}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.addNoteText, { color: season.textSecondary }]}>
                        + Add another exercise
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Note section */}
                {!showNote ? (
                  <TouchableOpacity
                    onPress={() => setShowNote(true)}
                    style={styles.addNoteButton}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.addNoteText, { color: season.textSecondary }]}>
                      + Add a note
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="Anything you want to remember..."
                    placeholderTextColor={hexToRgba(season.textSecondary, 0.5)}
                    autoFocus
                    multiline
                    numberOfLines={3}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={Keyboard.dismiss}
                    style={[styles.noteInput, { color: season.text, borderColor: hexToRgba(season.color, 0.2) }]}
                  />
                )}
              </Animated.View>
            )}

            {selectedType && selectedFeeling && (
              <Animated.View
                style={{
                  opacity: saveOpacity,
                  transform: [{ translateY: saveTranslateY }],
                }}
                pointerEvents={selectedType && selectedFeeling ? 'auto' : 'none'}
              >
                <TouchableOpacity
                  onPress={handleSave}
                  style={[styles.saveButton, { backgroundColor: season.color }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveButtonText}>Log it</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </Pressable>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingTop: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignSelf: 'center',
    marginBottom: 24,
  },
  question: {
    fontSize: 22,
    fontWeight: '400',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 2,
  },
  optionInactive: {
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'transparent',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addNoteButton: {
    marginBottom: 24,
  },
  addNoteText: {
    fontSize: 13,
    opacity: 0.5,
  },
  noteInput: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 80,
    maxHeight: 100,
    marginBottom: 24,
    textAlignVertical: 'top',
  },
  saveButton: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  workoutSection: {
    marginBottom: 24,
  },
  exerciseRow: {
    marginBottom: 12,
  },
  exerciseNameInput: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 8,
  },
  exerciseMetrics: {
    flexDirection: 'row',
    gap: 8,
  },
  metricInput: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 20,
    fontWeight: '300',
    marginTop: -2,
  },
  addExerciseButton: {
    marginTop: 8,
  },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Platform,
  Keyboard,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SeasonTheme, MovementType, FeelingType, WorkoutExercise } from '../types';
import { MOVEMENT_TYPES, FEELINGS } from '../constants/seasonal';
import { getCustomTags, addCustomTag, getCustomMovementTypes, addCustomMovementType, ActivityPreference, getActivityPreferences, saveActivityPreferences, toLocalDateStr } from '../services/storage';

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface QuickLogCardProps {
  season: SeasonTheme;
  onSave: (entry: { type: MovementType; label: string; feelings: FeelingType[]; note?: string; workoutDetails?: WorkoutExercise[]; date: string }) => void;
}

type ActivityItem = { id: string; label: string; icon: string };

export default function QuickLogCard({ season, onSave }: QuickLogCardProps) {
  const [selectedType, setSelectedType] = useState<MovementType | null>(null);
  const [selectedFeelings, setSelectedFeelings] = useState<FeelingType[]>([]);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([
    { name: '', sets: undefined, reps: undefined, weight: undefined }
  ]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [customMovementTypes, setCustomMovementTypes] = useState<Array<{ id: string; label: string; icon: string }>>([]);
  const [showCustomMovementInput, setShowCustomMovementInput] = useState(false);
  const [customMovementInput, setCustomMovementInput] = useState('');

  const [activityPrefs, setActivityPrefs] = useState<ActivityPreference[]>([]);
  const [customizeVisible, setCustomizeVisible] = useState(false);
  const [draftPrefs, setDraftPrefs] = useState<ActivityPreference[]>([]);

  const todayStr = toLocalDateStr(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterdayDate);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [showMoreDates, setShowMoreDates] = useState(false);

  const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const moreDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (i + 2));
    return { label: DAY_NAMES[d.getDay()], date: toLocalDateStr(d) };
  });

  const feelingOpacity = useRef(new Animated.Value(0)).current;
  const feelingTranslateY = useRef(new Animated.Value(12)).current;
  const saveOpacity = useRef(new Animated.Value(0)).current;
  const saveTranslateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    loadCustomTags();
    loadCustomMovementTypes();
    loadActivityPrefs();
  }, []);

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

  const loadCustomTags = async () => {
    const tags = await getCustomTags();
    setCustomTags(tags);
  };

  const loadCustomMovementTypes = async () => {
    const types = await getCustomMovementTypes();
    setCustomMovementTypes(types);
  };

  const loadActivityPrefs = async () => {
    const prefs = await getActivityPreferences();
    setActivityPrefs(prefs);
  };

  useEffect(() => {
    if (selectedType) {
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
  }, [selectedType]);

  const getAllTypes = (): ActivityItem[] => [
    ...MOVEMENT_TYPES,
    ...customMovementTypes.map(t => ({ ...t })),
  ];

  const getDisplayedTypes = (): ActivityItem[] => {
    const allTypes = getAllTypes();
    if (activityPrefs.length === 0) return allTypes;
    return activityPrefs
      .filter(p => p.visible)
      .map(p => allTypes.find(t => t.id === p.id))
      .filter((t): t is ActivityItem => Boolean(t));
  };

  const openCustomize = () => {
    const allTypes = getAllTypes();
    const base = activityPrefs.length > 0
      ? activityPrefs
      : allTypes.map(t => ({ id: t.id, visible: true }));
    const missing = allTypes
      .filter(t => !base.find(p => p.id === t.id))
      .map(t => ({ id: t.id, visible: true }));
    setDraftPrefs([...base, ...missing]);
    setCustomizeVisible(true);
  };

  const saveCustomize = async () => {
    await saveActivityPreferences(draftPrefs);
    setActivityPrefs(draftPrefs);
    setCustomizeVisible(false);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= draftPrefs.length) return;
    setDraftPrefs(prev => {
      const updated = [...prev];
      [updated[index], updated[next]] = [updated[next], updated[index]];
      return updated;
    });
  };

  const resetState = () => {
    setSelectedType(null);
    setSelectedFeelings([]);
    setNote('');
    setShowNote(false);
    setShowWorkoutDetails(false);
    setShowCustomTagInput(false);
    setCustomTagInput('');
    setShowCustomMovementInput(false);
    setCustomMovementInput('');
    setWorkoutExercises([{ name: '', sets: undefined, reps: undefined, weight: undefined }]);
    setSelectedDate(toLocalDateStr(new Date()));
    setShowMoreDates(false);
    feelingOpacity.setValue(0);
    feelingTranslateY.setValue(12);
    saveOpacity.setValue(0);
    saveTranslateY.setValue(12);
  };

  const toggleFeeling = (id: FeelingType) => {
    setSelectedFeelings(prev => {
      if (prev.includes(id)) return prev.filter(f => f !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleSave = () => {
    if (selectedType) {
      const validExercises = showWorkoutDetails
        ? workoutExercises.filter(ex => ex.name.trim() !== '')
        : undefined;

      const typeData = getAllTypes().find(t => t.id === selectedType);
      onSave({
        type: selectedType,
        label: typeData?.label ?? selectedType,
        feelings: selectedFeelings,
        note: note || undefined,
        workoutDetails: validExercises && validExercises.length > 0 ? validExercises : undefined,
        date: selectedDate,
      });
      resetState();
    }
  };

  const updateExercise = (index: number, field: keyof WorkoutExercise, value: string | number | undefined) => {
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

  const handleAddCustomTag = async () => {
    const trimmedTag = customTagInput.trim();
    if (trimmedTag) {
      await addCustomTag(trimmedTag);
      await loadCustomTags();
      toggleFeeling(trimmedTag as FeelingType);
      setCustomTagInput('');
      setShowCustomTagInput(false);
      Keyboard.dismiss();
    }
  };

  const handleAddCustomMovementType = async () => {
    const trimmedLabel = customMovementInput.trim();
    if (trimmedLabel) {
      await addCustomMovementType(trimmedLabel);
      await loadCustomMovementTypes();
      const id = trimmedLabel.toLowerCase().replace(/\s+/g, '_');
      setSelectedType(id as MovementType);
      setCustomMovementInput('');
      setShowCustomMovementInput(false);
      Keyboard.dismiss();
    }
  };

  const displayedTypes = getDisplayedTypes();
  const allTypesForModal = getAllTypes();

  return (
    <View style={[styles.card, { backgroundColor: season.cardBg }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: season.color }]}>
          ▸ Log Activity
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={openCustomize} style={styles.customizeButton} activeOpacity={0.7}>
            <Ionicons name="options-outline" size={18} color={season.textSecondary} />
          </TouchableOpacity>
          {(selectedType || selectedFeelings.length > 0 || note || showWorkoutDetails) && (
            <TouchableOpacity
              onPress={resetState}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Text style={[styles.clearButtonText, { color: season.textSecondary }]}>
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.datePillRow, { marginBottom: showMoreDates ? 8 : 16 }]}>
        {[{ label: 'Today', date: todayStr }, { label: 'Yesterday', date: yesterdayStr }].map(({ label, date }) => (
          <TouchableOpacity
            key={date}
            style={[styles.datePill, selectedDate === date && { borderColor: season.color, backgroundColor: hexToRgba(season.color, 0.1) }]}
            onPress={() => setSelectedDate(date)}
            activeOpacity={0.7}
          >
            <Text style={[styles.datePillText, { color: selectedDate === date ? season.color : season.textSecondary }]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => setShowMoreDates(v => !v)}
          style={[styles.datePill, { borderStyle: 'dashed', borderColor: hexToRgba(season.color, 0.3) }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.datePillText, { color: season.textSecondary }]}>
            {showMoreDates ? 'Less' : 'More'}
          </Text>
        </TouchableOpacity>
      </View>
      {showMoreDates && (
        <View style={styles.expandedDatesRow}>
          {moreDates.map(({ label, date }) => (
            <TouchableOpacity
              key={date}
              style={[styles.datePill, selectedDate === date && { borderColor: season.color, backgroundColor: hexToRgba(season.color, 0.1) }]}
              onPress={() => setSelectedDate(date)}
              activeOpacity={0.7}
            >
              <Text style={[styles.datePillText, { color: selectedDate === date ? season.color : season.textSecondary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.optionsContainer}>
        {displayedTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            onPress={() => setSelectedType(type.id as MovementType)}
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

        {/* Add custom movement type button */}
        {!showCustomMovementInput && (
          <TouchableOpacity
            onPress={() => setShowCustomMovementInput(true)}
            style={[styles.plusButton, { borderColor: hexToRgba(season.color, 0.2) }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.plusButtonText, { color: season.color }]}>
              +
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Custom movement type input */}
      {showCustomMovementInput && (
        <View style={[styles.customTagInputContainer, styles.customMovementInputContainer]}>
          <TextInput
            value={customMovementInput}
            onChangeText={setCustomMovementInput}
            placeholder="Activity name..."
            placeholderTextColor={hexToRgba(season.textSecondary, 0.5)}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAddCustomMovementType}
            onBlur={() => {
              if (!customMovementInput.trim()) {
                setShowCustomMovementInput(false);
              }
            }}
            style={[styles.customTagInput, { color: season.text, borderColor: hexToRgba(season.color, 0.2) }]}
          />
          <TouchableOpacity
            onPress={handleAddCustomMovementType}
            style={[styles.addTagButton, { backgroundColor: season.color }]}
            activeOpacity={0.8}
          >
            <Text style={styles.addTagButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedType && (
        <Animated.View
          style={{
            opacity: feelingOpacity,
            transform: [{ translateY: feelingTranslateY }],
          }}
        >
          <View style={styles.feelingHeader}>
            <Text style={[styles.cardLabel, { color: season.color }]}>
              How did it feel?
            </Text>
            <Text style={[styles.feelingCount, { color: season.textSecondary }]}>
              {selectedFeelings.length > 0 ? `${selectedFeelings.length}/3` : 'optional'}
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            {/* Default feelings */}
            {FEELINGS.map((f) => {
              const isSelected = selectedFeelings.includes(f.id);
              const isDisabled = !isSelected && selectedFeelings.length >= 3;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => toggleFeeling(f.id)}
                  style={[
                    styles.option,
                    isSelected
                      ? { borderColor: season.color, backgroundColor: hexToRgba(season.color, 0.1) }
                      : styles.optionInactive,
                    isDisabled && styles.optionDisabled,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, { color: isSelected ? season.color : season.textSecondary, opacity: isDisabled ? 0.35 : 1 }]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Custom tags */}
            {customTags.map((tag) => {
              const isSelected = selectedFeelings.includes(tag as FeelingType);
              const isDisabled = !isSelected && selectedFeelings.length >= 3;
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleFeeling(tag as FeelingType)}
                  style={[
                    styles.option,
                    isSelected
                      ? { borderColor: season.color, backgroundColor: hexToRgba(season.color, 0.1) }
                      : styles.optionInactive,
                    isDisabled && styles.optionDisabled,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, { color: isSelected ? season.color : season.textSecondary, opacity: isDisabled ? 0.35 : 1 }]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Add custom tag button */}
            {!showCustomTagInput && (
              <TouchableOpacity
                onPress={() => setShowCustomTagInput(true)}
                style={[styles.option, styles.addCustomOption]}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, { color: season.textSecondary, opacity: 0.6 }]}>
                  + Custom
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Custom tag input */}
          {showCustomTagInput && (
            <View style={styles.customTagInputContainer}>
              <TextInput
                value={customTagInput}
                onChangeText={setCustomTagInput}
                placeholder="Type your feeling..."
                placeholderTextColor={hexToRgba(season.textSecondary, 0.5)}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddCustomTag}
                style={[styles.customTagInput, { color: season.text, borderColor: hexToRgba(season.color, 0.2) }]}
              />
              <TouchableOpacity
                onPress={handleAddCustomTag}
                style={[styles.addTagButton, { backgroundColor: season.color }]}
                activeOpacity={0.8}
              >
                <Text style={styles.addTagButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedType === 'strength_training' && !showWorkoutDetails && (
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

          {selectedType === 'strength_training' && showWorkoutDetails && (
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
                      <Text style={[styles.removeButtonText, { color: season.textSecondary }]}>x</Text>
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

      {selectedType && (
        <Animated.View
          style={{
            opacity: saveOpacity,
            transform: [{ translateY: saveTranslateY }],
          }}
          pointerEvents={selectedType ? 'auto' : 'none'}
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

      {/* Customize Modal */}
      <Modal visible={customizeVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setCustomizeVisible(false)} />
          <View style={[styles.customizeSheet, { backgroundColor: '#fff' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.customizeHeader}>
              <Text style={[styles.customizeTitle, { color: season.text }]}>Customize Activities</Text>
              <TouchableOpacity onPress={saveCustomize}>
                <Text style={[styles.customizeDone, { color: season.color }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.customizeHint, { color: season.textSecondary }]}>Use arrows to reorder</Text>

            <ScrollView>
              {draftPrefs.map((p, index) => {
                const found = allTypesForModal.find(t => t.id === p.id);
                const label = found?.label ?? p.id;
                const icon = found?.icon ?? '•';
                return (
                  <View key={p.id} style={styles.customizeRow}>
                    <View style={styles.reorderButtons}>
                      <TouchableOpacity
                        onPress={() => moveItem(index, -1)}
                        style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
                        disabled={index === 0}
                      >
                        <Ionicons name="chevron-up" size={16} color={index === 0 ? 'transparent' : season.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => moveItem(index, 1)}
                        style={[styles.reorderBtn, index === draftPrefs.length - 1 && styles.reorderBtnDisabled]}
                        disabled={index === draftPrefs.length - 1}
                      >
                        <Ionicons name="chevron-down" size={16} color={index === draftPrefs.length - 1 ? 'transparent' : season.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.customizeIcon}>{icon}</Text>
                    <Text style={[styles.customizeLabel, { color: season.text }]}>{label}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        setDraftPrefs(prev =>
                          prev.map(item => item.id === p.id ? { ...item, visible: !item.visible } : item)
                        )
                      }
                      activeOpacity={0.7}
                      style={[styles.toggleButton, { borderColor: p.visible ? season.color : 'rgba(0,0,0,0.15)', backgroundColor: p.visible ? season.color : 'transparent' }]}
                    >
                      {p.visible && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    shadowColor: '#d4a5a0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  datePillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  expandedDatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  datePill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e8d5d0',
  },
  datePillActive: {
    borderColor: '#e8d5d0',
  },
  datePillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '600',
    fontFamily: 'Nunito_600SemiBold',
    textTransform: 'uppercase',
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  question: {
    fontSize: 22,
    fontWeight: '400',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.6,
  },
  customizeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
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
    borderColor: '#e8d5d0',
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
  addCustomOption: {
    borderStyle: 'dashed',
  },
  customTagInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  customMovementInputContainer: {
    marginTop: -16,
  },
  customTagInput: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  addTagButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addTagButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  plusButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  plusButtonText: {
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 20,
  },
  feelingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  feelingCount: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.6,
  },
  optionDisabled: {
    opacity: 0.35,
  },
  // Customize modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  customizeSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  customizeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  customizeTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  customizeDone: {
    fontSize: 16,
    fontWeight: '600',
  },
  customizeHint: {
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 12,
    opacity: 0.6,
  },
  customizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  reorderButtons: {
    flexDirection: 'column',
    gap: 2,
  },
  reorderBtn: {
    padding: 2,
  },
  reorderBtnDisabled: {
    opacity: 0,
  },
  customizeIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  customizeLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  toggleButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

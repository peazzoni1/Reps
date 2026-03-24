import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DailySnapshot, FoodEntry, MealType, MovementSession, MovementType, FeelingType } from '../types';
import {
  getRecentDailySnapshots,
  createFoodEntry,
  updateFoodEntry,
  updateMovementSession,
  deleteMovementSession,
  deleteFoodEntry,
  getCustomMovementTypes,
  clearTodayDailyMessage,
} from '../services/storage';
import { getMovementIcon, MOVEMENT_TYPES, FEELINGS } from '../constants/seasonal';
import { Typography, Spacing, BorderRadius } from '../theme';

const MEALS: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Breakfast', icon: '☀️' },
  { id: 'lunch', label: 'Lunch', icon: '🌤' },
  { id: 'dinner', label: 'Dinner', icon: '🌙' },
  { id: 'snack', label: 'Snack', icon: '🍎' },
];

function getDateOptions(): Array<{ label: string; date: string }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    let label: string;
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Yesterday';
    else label = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    return { label, date: dateStr };
  });
}

function formatDateHeading(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [customMovementTypes, setCustomMovementTypes] = useState<Array<{ id: string; label: string; icon: string }>>([]);

  const todayDateStr = new Date().toISOString().split('T')[0];

  // Food modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [foodDescription, setFoodDescription] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null);
  const [saving, setSaving] = useState(false);

  // Exercise modal state
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<MovementSession | null>(null);
  const [selectedType, setSelectedType] = useState<MovementType | null>(null);
  const [selectedFeelings, setSelectedFeelings] = useState<FeelingType[]>([]);
  const [editNote, setEditNote] = useState('');
  const [savingExercise, setSavingExercise] = useState(false);

  // Shared date state (one modal open at a time)
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);

  const load = useCallback(async () => {
    setLoading(true);
    const [data, customTypes] = await Promise.all([
      getRecentDailySnapshots(10),
      getCustomMovementTypes(),
    ]);
    setSnapshots(data);
    setCustomMovementTypes(customTypes);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openModal = (entry?: FoodEntry) => {
    setEditingEntry(entry ?? null);
    setFoodDescription(entry?.description ?? '');
    setSelectedMeal(entry?.meal ?? null);
    setSelectedDate(entry ? entry.date.split('T')[0] : todayDateStr);
    setModalVisible(true);
  };

  const handleSaveFood = async () => {
    const desc = foodDescription.trim();
    if (!desc) return;
    setSaving(true);
    if (editingEntry) {
      await updateFoodEntry(editingEntry.id, desc, selectedMeal ?? undefined, selectedDate);
    } else {
      await createFoodEntry(desc, selectedMeal ?? undefined, selectedDate);
    }
    clearTodayDailyMessage();
    setSaving(false);
    setModalVisible(false);
    load();
  };

  const openExerciseModal = (session: MovementSession) => {
    setEditingSession(session);
    setSelectedType(session.type);
    setSelectedFeelings(session.feelings ?? []);
    setEditNote(session.note ?? '');
    setSelectedDate(session.date.split('T')[0]);
    setExerciseModalVisible(true);
  };

  const handleSaveExercise = async () => {
    if (!editingSession || !selectedType) return;
    setSavingExercise(true);
    const typeData = MOVEMENT_TYPES.find(m => m.id === selectedType);
    await updateMovementSession(
      editingSession.id,
      selectedType,
      selectedFeelings,
      typeData?.label ?? editingSession.label,
      editNote.trim() || undefined,
      selectedDate,
    );
    clearTodayDailyMessage();
    setSavingExercise(false);
    setExerciseModalVisible(false);
    load();
  };

  const confirmDeleteExercise = (id: string, label: string) => {
    Alert.alert('Delete entry', `Remove "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => { await deleteMovementSession(id); load(); },
      },
    ]);
  };

  const confirmDeleteFood = (id: string, description: string) => {
    Alert.alert('Delete entry', `Remove "${description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => { await deleteFoodEntry(id); load(); },
      },
    ]);
  };

  const renderExerciseItem = (session: DailySnapshot['exercises'][number]) => (
    <TouchableOpacity
      key={session.id}
      style={styles.logItem}
      onPress={() => openExerciseModal(session)}
      activeOpacity={0.7}
    >
      <View style={[styles.logIconWrap, session.type === 'rest_day' && styles.restIconWrap]}>
        <Ionicons
          name={session.type === 'rest_day' ? 'moon-outline' : 'pulse-outline'}
          size={18}
          color={session.type === 'rest_day' ? '#8a7aaa' : '#3db88a'}
        />
      </View>
      <View style={styles.logBody}>
        <Text style={styles.logTitle}>{session.label}</Text>
        <Text style={styles.logMeta}>
          {session.feelings?.join(' · ')}
          {session.workoutDetails?.length
            ? ` · ${session.workoutDetails.map((w) => w.name).join(', ')}`
            : ''}
          {session.note ? ` · "${session.note}"` : ''}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => confirmDeleteExercise(session.id, session.label)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={16} color="rgba(255, 255, 255, 0.4)" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderFoodItem = (entry: FoodEntry) => (
    <TouchableOpacity
      key={entry.id}
      style={styles.logItem}
      onPress={() => openModal(entry)}
      activeOpacity={0.7}
    >
      <View style={[styles.logIconWrap, styles.foodIconWrap]}>
        <Text style={styles.logIcon}>
          {MEALS.find((m) => m.id === entry.meal)?.icon ?? '🍽'}
        </Text>
      </View>
      <View style={styles.logBody}>
        <Text style={styles.logTitle}>{entry.description}</Text>
        {entry.meal && (
          <Text style={styles.logMeta}>
            {entry.meal.charAt(0).toUpperCase() + entry.meal.slice(1)}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => confirmDeleteFood(entry.id, entry.description)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={16} color="rgba(255, 255, 255, 0.4)" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderDay = (snapshot: DailySnapshot) => (
    <View key={snapshot.date} style={styles.daySection}>
      <Text style={styles.dayHeading}>{formatDateHeading(snapshot.date)}</Text>

      {snapshot.exercises.length > 0 && (
        <View style={styles.categoryBlock}>
          <Text style={styles.categoryLabel}>EXERCISE</Text>
          {snapshot.exercises.map(renderExerciseItem)}
        </View>
      )}

      {snapshot.food.length > 0 && (
        <View style={styles.categoryBlock}>
          <Text style={styles.categoryLabel}>FOOD</Text>
          {snapshot.food.map(renderFoodItem)}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.headerTitle}>Tracking</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#3db88a" />
        </View>
      ) : snapshots.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Nothing logged yet</Text>
          <Text style={styles.emptySubtitle}>
            Log activity or food on the Today tab to see it here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          {snapshots.map(renderDay)}
        </ScrollView>
      )}

      {/* Food log modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.modalScrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
            >
              <Text style={styles.modalTitle}>{editingEntry ? 'Edit Food' : 'Log Food'}</Text>

              <Text style={styles.modalLabel}>When</Text>
              <View style={styles.mealRow}>
                {getDateOptions().map(({ label, date }) => (
                  <TouchableOpacity
                    key={date}
                    style={[styles.mealPill, selectedDate === date && styles.mealPillSelected]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[styles.mealPillText, selectedDate === date && styles.mealPillTextSelected]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Meal</Text>
              <View style={styles.mealRow}>
                {MEALS.map((meal) => (
                  <TouchableOpacity
                    key={meal.id}
                    style={[styles.mealPill, selectedMeal === meal.id && styles.mealPillSelected]}
                    onPress={() => setSelectedMeal(selectedMeal === meal.id ? null : meal.id)}
                  >
                    <Text style={styles.mealPillIcon}>{meal.icon}</Text>
                    <Text style={[styles.mealPillText, selectedMeal === meal.id && styles.mealPillTextSelected]}>
                      {meal.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>What did you eat?</Text>
              <TextInput
                style={styles.modalInput}
                value={foodDescription}
                onChangeText={setFoodDescription}
                placeholder="e.g. chicken rice and veggies"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                multiline
                autoFocus
                maxLength={300}
              />

              <TouchableOpacity
                style={[styles.modalSave, (!foodDescription.trim() || saving) && styles.modalSaveDisabled]}
                onPress={handleSaveFood}
                disabled={!foodDescription.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>{editingEntry ? 'Update' : 'Save'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Exercise edit modal */}
      <Modal visible={exerciseModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setExerciseModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.modalScrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
            >
              <Text style={styles.modalTitle}>Edit Exercise</Text>

              <Text style={styles.modalLabel}>When</Text>
              <View style={styles.mealRow}>
                {getDateOptions().map(({ label, date }) => (
                  <TouchableOpacity
                    key={date}
                    style={[styles.mealPill, selectedDate === date && styles.mealPillSelected]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[styles.mealPillText, selectedDate === date && styles.mealPillTextSelected]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Activity</Text>
              <View style={styles.mealRow}>
                {[...MOVEMENT_TYPES, ...customMovementTypes].map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.mealPill, selectedType === type.id && styles.mealPillSelected]}
                    onPress={() => setSelectedType(type.id as MovementType)}
                  >
                    <Text style={styles.mealPillIcon}>{type.icon}</Text>
                    <Text style={[styles.mealPillText, selectedType === type.id && styles.mealPillTextSelected]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Feeling (up to 3)</Text>
              <View style={styles.mealRow}>
                {FEELINGS.map((f) => {
                  const isSelected = selectedFeelings.includes(f.id);
                  const isDisabled = !isSelected && selectedFeelings.length >= 3;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.mealPill, isSelected && styles.mealPillSelected, isDisabled && { opacity: 0.35 }]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedFeelings(prev => prev.filter(x => x !== f.id));
                        } else if (!isDisabled) {
                          setSelectedFeelings(prev => [...prev, f.id]);
                        }
                      }}
                    >
                      <Text style={[styles.mealPillText, isSelected && styles.mealPillTextSelected]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.modalLabel}>Note</Text>
              <TextInput
                style={styles.modalInput}
                value={editNote}
                onChangeText={setEditNote}
                placeholder="Anything you want to remember..."
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                multiline
                maxLength={300}
              />

              <TouchableOpacity
                style={[styles.modalSave, (!selectedType || selectedFeelings.length === 0 || savingExercise) && styles.modalSaveDisabled]}
                onPress={handleSaveExercise}
                disabled={!selectedType || selectedFeelings.length === 0 || savingExercise}
              >
                {savingExercise ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Update</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2e4f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(31, 46, 79, 0.97)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerTitle: {
    ...Typography.headline,
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: 'rgba(61, 184, 138, 0.15)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
  },
  addButtonText: {
    ...Typography.footnote,
    color: '#3db88a',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.title3,
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...Typography.subheadline,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollContent: {
    padding: Spacing.base,
    gap: Spacing.xl,
  },
  daySection: {
    gap: Spacing.sm,
  },
  dayHeading: {
    ...Typography.footnote,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  categoryBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#3db88a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryLabel: {
    ...Typography.caption2,
    fontWeight: '700',
    color: '#3db88a',
    letterSpacing: 1.5,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    fontSize: 10,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  logIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(61, 184, 138, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodIconWrap: {
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
  },
  restIconWrap: {
    backgroundColor: 'rgba(138, 122, 170, 0.15)',
  },
  logIcon: {
    fontSize: 16,
  },
  logBody: {
    flex: 1,
  },
  logTitle: {
    ...Typography.subheadline,
    color: '#ffffff',
    fontWeight: '600',
  },
  logMeta: {
    ...Typography.caption1,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  // Modal
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
    maxHeight: '90%',
    flexShrink: 1,
    paddingTop: Spacing.md,
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalScrollContent: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  modalTitle: {
    ...Typography.title3,
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalLabel: {
    ...Typography.footnote,
    fontWeight: '700',
    color: '#3db88a',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 10,
  },
  mealRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  mealPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
  },
  mealPillSelected: {
    borderColor: '#ffffff',
    backgroundColor: 'rgba(61, 184, 138, 0.15)',
  },
  mealPillIcon: {
    fontSize: 14,
  },
  mealPillText: {
    ...Typography.footnote,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  mealPillTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalInput: {
    ...Typography.body,
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: Spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalSave: {
    backgroundColor: '#f5a623',
    borderRadius: 14,
    padding: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.xs,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modalSaveDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalSaveText: {
    ...Typography.headline,
    color: '#fff',
    fontWeight: '600',
  },
});

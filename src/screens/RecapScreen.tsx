import React, { useState, useCallback, useMemo } from 'react';
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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FoodEntry, MealType, MovementSession, MovementType, FeelingType } from '../types';
import {
  getAllMovementSessions,
  getAllFoodEntries,
  createMovementSession,
  createFoodEntry,
  updateFoodEntry,
  updateMovementSession,
  deleteMovementSession,
  deleteFoodEntry,
  getCustomMovementTypes,
  clearTodayDailyMessage,
  getAllDailyNotes,
  DailyNote,
  saveDailyNote,
  deleteDailyNote,
  toLocalDateStr,
} from '../services/storage';
import { MOVEMENT_TYPES, FEELINGS } from '../constants/seasonal';
import { Typography, Spacing, BorderRadius } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_PADDING = 16;
const DAY_CELL_SIZE = Math.floor((SCREEN_WIDTH - CALENDAR_PADDING * 2) / 7);

// Colors matching the tile colors from HomeScreen
const ACTIVITY_COLOR = '#3db88a';
const FOOD_COLOR = '#f5a623';
const NOTES_COLOR = '#7ab8c8';

const MEALS: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Breakfast', icon: '☀️' },
  { id: 'lunch', label: 'Lunch', icon: '🌤' },
  { id: 'dinner', label: 'Dinner', icon: '🌙' },
  { id: 'snack', label: 'Snack', icon: '🍎' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// Returns an array of cells for the calendar grid.
// null = empty leading/trailing cell, object = real day
function buildCalendarDays(year: number, month: number): Array<{ date: string; day: number } | null> {
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: string; day: number } | null> = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push({ date: `${year}-${mm}-${dd}`, day: d });
  }
  return cells;
}

type DateDataMap = Map<string, { hasActivity: boolean; hasFood: boolean; hasNotes: boolean }>;

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [customMovementTypes, setCustomMovementTypes] = useState<Array<{ id: string; label: string; icon: string }>>([]);
  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>([]);
  const [allSessions, setAllSessions] = useState<MovementSession[]>([]);
  const [allFoodEntries, setAllFoodEntries] = useState<FoodEntry[]>([]);

  const todayDate = new Date();
  const todayStr = toLocalDateStr(todayDate);

  // View mode toggle
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Calendar navigation
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  // Day detail sheet
  const [daySheetDate, setDaySheetDate] = useState<string | null>(null);
  const [daySheetVisible, setDaySheetVisible] = useState(false);

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

  // Shared date state for edit modals
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Notes modal state
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<DailyNote | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // New activity creation modal state
  const [newActivityModalVisible, setNewActivityModalVisible] = useState(false);
  const [newActivityType, setNewActivityType] = useState<MovementType | null>(null);
  const [newActivityFeelings, setNewActivityFeelings] = useState<FeelingType[]>([]);
  const [newActivityNote, setNewActivityNote] = useState('');
  const [newActivityDate, setNewActivityDate] = useState<string>(todayStr);
  const [savingNewActivity, setSavingNewActivity] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [sessions, foodEntries, customTypes, notes] = await Promise.all([
      getAllMovementSessions(),
      getAllFoodEntries(),
      getCustomMovementTypes(),
      getAllDailyNotes(),
    ]);
    setAllSessions(sessions);
    setAllFoodEntries(foodEntries);
    setCustomMovementTypes(customTypes);
    setDailyNotes(notes);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Build a fast lookup: date → { hasActivity, hasFood, hasNotes }
  const dateDataMap = useMemo<DateDataMap>(() => {
    const map = new Map<string, { hasActivity: boolean; hasFood: boolean; hasNotes: boolean }>();

    for (const session of allSessions) {
      const d = toLocalDateStr(new Date(session.date));
      const existing = map.get(d) ?? { hasActivity: false, hasFood: false, hasNotes: false };
      map.set(d, { ...existing, hasActivity: true });
    }
    for (const entry of allFoodEntries) {
      const d = toLocalDateStr(new Date(entry.date));
      const existing = map.get(d) ?? { hasActivity: false, hasFood: false, hasNotes: false };
      map.set(d, { ...existing, hasFood: true });
    }
    for (const note of dailyNotes) {
      const existing = map.get(note.date) ?? { hasActivity: false, hasFood: false, hasNotes: false };
      map.set(note.date, { ...existing, hasNotes: true });
    }

    return map;
  }, [allSessions, allFoodEntries, dailyNotes]);

  const calendarDays = useMemo(() => buildCalendarDays(calYear, calMonth), [calYear, calMonth]);

  const isCurrentMonth = calYear === todayDate.getFullYear() && calMonth === todayDate.getMonth();

  const goToPrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(y => y - 1);
    } else {
      setCalMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(y => y + 1);
    } else {
      setCalMonth(m => m + 1);
    }
  };

  const handleDayPress = (dateStr: string) => {
    setDaySheetDate(dateStr);
    setDaySheetVisible(true);
  };

  // Entries to show in the day detail sheet
  const daySheetEntries = useMemo(() => {
    if (!daySheetDate) return { exercises: [] as MovementSession[], food: [] as FoodEntry[], note: null as DailyNote | null };
    const exercises = allSessions.filter(s => toLocalDateStr(new Date(s.date)) === daySheetDate);
    const food = allFoodEntries.filter(f => toLocalDateStr(new Date(f.date)) === daySheetDate);
    const note = dailyNotes.find(n => n.date === daySheetDate) ?? null;
    return { exercises, food, note };
  }, [daySheetDate, allSessions, allFoodEntries, dailyNotes]);

  // ── Food modal ──────────────────────────────────────────────────────────────

  const openModal = (entry?: FoodEntry, presetDate?: string) => {
    setDaySheetVisible(false);
    setEditingEntry(entry ?? null);
    setFoodDescription(entry?.description ?? '');
    setSelectedMeal(entry?.meal ?? null);
    setSelectedDate(entry ? toLocalDateStr(new Date(entry.date)) : (presetDate ?? todayStr));
    setModalVisible(true);
  };

  const openNewActivityModal = (date: string) => {
    setDaySheetVisible(false);
    setNewActivityType(null);
    setNewActivityFeelings([]);
    setNewActivityNote('');
    setNewActivityDate(date);
    setNewActivityModalVisible(true);
  };

  const handleSaveNewActivity = async () => {
    if (!newActivityType || newActivityFeelings.length === 0) return;
    setSavingNewActivity(true);
    const typeData = [...MOVEMENT_TYPES, ...customMovementTypes].find(m => m.id === newActivityType);
    await createMovementSession(
      newActivityType,
      newActivityFeelings,
      typeData?.label ?? newActivityType,
      newActivityNote.trim() || undefined,
      undefined,
      newActivityDate,
    );
    clearTodayDailyMessage();
    setSavingNewActivity(false);
    setNewActivityModalVisible(false);
    load();
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

  // ── Exercise modal ──────────────────────────────────────────────────────────

  const openExerciseModal = (session: MovementSession) => {
    setDaySheetVisible(false);
    setEditingSession(session);
    setSelectedType(session.type);
    setSelectedFeelings(session.feelings ?? []);
    setEditNote(session.note ?? '');
    setSelectedDate(toLocalDateStr(new Date(session.date)));
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
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteMovementSession(id); load(); } },
    ]);
  };

  const confirmDeleteFood = (id: string, description: string) => {
    Alert.alert('Delete entry', `Remove "${description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteFoodEntry(id); load(); } },
    ]);
  };

  // ── Notes modal ─────────────────────────────────────────────────────────────

  const openNotesModal = (date: string, existingNote?: DailyNote) => {
    setDaySheetVisible(false);
    setEditingNote(existingNote ?? null);
    setNoteContent(existingNote?.content ?? '');
    setSelectedDate(date);
    setNotesModalVisible(true);
  };

  const handleSaveNote = async () => {
    const content = noteContent.trim();
    if (!content) return;
    setSavingNote(true);
    await saveDailyNote(selectedDate, content);
    clearTodayDailyMessage();
    setSavingNote(false);
    setNotesModalVisible(false);
    load();
  };

  const confirmDeleteNote = (date: string) => {
    Alert.alert('Delete note', 'Remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDailyNote(date); load(); } },
    ]);
  };

  // ── Item renderers ──────────────────────────────────────────────────────────

  const renderExerciseItem = (session: MovementSession) => (
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
          color={session.type === 'rest_day' ? '#8a7aaa' : ACTIVITY_COLOR}
        />
      </View>
      <View style={styles.logBody}>
        <Text style={styles.logTitle}>{session.label}</Text>
        <Text style={styles.logMeta}>
          {session.feelings?.join(' · ')}
          {session.workoutDetails?.length ? ` · ${session.workoutDetails.map(w => w.name).join(', ')}` : ''}
          {session.note ? ` · "${session.note}"` : ''}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => confirmDeleteExercise(session.id, session.label)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.4)" />
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
        <Text style={styles.logIcon}>{MEALS.find(m => m.id === entry.meal)?.icon ?? '🍽'}</Text>
      </View>
      <View style={styles.logBody}>
        <Text style={styles.logTitle}>{entry.description}</Text>
        {entry.meal && (
          <Text style={styles.logMeta}>{entry.meal.charAt(0).toUpperCase() + entry.meal.slice(1)}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => confirmDeleteFood(entry.id, entry.description)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderNoteItem = (note: DailyNote) => (
    <TouchableOpacity
      key={note.date}
      style={styles.logItem}
      onPress={() => openNotesModal(note.date, note)}
      activeOpacity={0.7}
    >
      <View style={[styles.logIconWrap, styles.notesIconWrap]}>
        <Ionicons name="document-text-outline" size={18} color={NOTES_COLOR} />
      </View>
      <View style={styles.logBody}>
        <Text style={styles.logTitle} numberOfLines={2}>{note.content}</Text>
        <Text style={styles.logMeta}>{note.content.length} characters</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => confirmDeleteNote(note.date)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // ── Calendar cell ───────────────────────────────────────────────────────────

  const renderDayCell = (cell: { date: string; day: number } | null, index: number) => {
    if (!cell) {
      return <View key={`empty-${index}`} style={styles.dayCell} />;
    }

    const data = dateDataMap.get(cell.date);
    const isToday = cell.date === todayStr;
    const isFuture = cell.date > todayStr;
    const hasData = !!data;

    return (
      <TouchableOpacity
        key={cell.date}
        style={styles.dayCell}
        onPress={() => handleDayPress(cell.date)}
        disabled={isFuture}
        activeOpacity={0.65}
      >
        <View style={[styles.dayCircle, isToday && styles.todayCircle]}>
          <Text style={[
            styles.dayNumber,
            isToday && styles.todayNumber,
            isFuture && styles.futureDayNumber,
            !hasData && !isToday && styles.emptyDayNumber,
          ]}>
            {cell.day}
          </Text>
        </View>
        <View style={styles.dotsRow}>
          {data?.hasActivity && <View style={[styles.dot, { backgroundColor: ACTIVITY_COLOR }]} />}
          {data?.hasFood && <View style={[styles.dot, { backgroundColor: FOOD_COLOR }]} />}
          {data?.hasNotes && <View style={[styles.dot, { backgroundColor: NOTES_COLOR }]} />}
        </View>
      </TouchableOpacity>
    );
  };

  // ── List view helpers ───────────────────────────────────────────────────────

  const listDates = useMemo<string[]>(() => {
    const dateSet = new Set<string>();
    allSessions.forEach(s => dateSet.add(toLocalDateStr(new Date(s.date))));
    allFoodEntries.forEach(f => dateSet.add(toLocalDateStr(new Date(f.date))));
    dailyNotes.forEach(n => dateSet.add(n.date));
    return Array.from(dateSet).sort((a, b) => b.localeCompare(a));
  }, [allSessions, allFoodEntries, dailyNotes]);

  const renderListDay = (date: string) => {
    const exercises = allSessions.filter(s => toLocalDateStr(new Date(s.date)) === date);
    const food = allFoodEntries.filter(f => toLocalDateStr(new Date(f.date)) === date);
    const note = dailyNotes.find(n => n.date === date);

    return (
      <View key={date} style={styles.listDaySection}>
        <View style={styles.listDayHeadingRow}>
          <Text style={styles.listDayHeading}>{formatDateHeading(date)}</Text>
          <TouchableOpacity
            style={styles.listAddBtn}
            onPress={() => { setDaySheetDate(date); setDaySheetVisible(true); }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="add" size={16} color={ACTIVITY_COLOR} />
          </TouchableOpacity>
        </View>

        {exercises.length > 0 && (
          <View style={styles.categoryBlock}>
            <Text style={styles.categoryLabel}>EXERCISE</Text>
            {exercises.map(renderExerciseItem)}
          </View>
        )}
        {food.length > 0 && (
          <View style={styles.categoryBlock}>
            <Text style={styles.categoryLabel}>FOOD</Text>
            {food.map(renderFoodItem)}
          </View>
        )}
        {note && (
          <View style={styles.categoryBlock}>
            <Text style={styles.categoryLabel}>NOTES</Text>
            {renderNoteItem(note)}
          </View>
        )}
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.headerTitle}>Log</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'calendar' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('calendar')}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={15} color={viewMode === 'calendar' ? '#fff' : 'rgba(255,255,255,0.45)'} />
            <Text style={[styles.viewToggleText, viewMode === 'calendar' && styles.viewToggleTextActive]}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.7}
          >
            <Ionicons name="list-outline" size={15} color={viewMode === 'list' ? '#fff' : 'rgba(255,255,255,0.45)'} />
            <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>List</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={ACTIVITY_COLOR} />
        </View>
      ) : viewMode === 'calendar' ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Month navigation */}
          <View style={styles.calHeader}>
            <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <Text style={styles.calMonthLabel}>{MONTH_NAMES[calMonth]} {calYear}</Text>
            <TouchableOpacity
              onPress={goToNextMonth}
              style={styles.navButton}
              disabled={isCurrentMonth}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={isCurrentMonth ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)'}
              />
            </TouchableOpacity>
          </View>

          {/* Day-of-week header */}
          <View style={styles.dayNamesRow}>
            {DAY_NAMES.map((name, i) => (
              <View key={i} style={styles.dayNameCell}>
                <Text style={styles.dayName}>{name}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calGrid}>
            {calendarDays.map((cell, i) => renderDayCell(cell, i))}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: ACTIVITY_COLOR }]} />
              <Text style={styles.legendText}>Activity</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: FOOD_COLOR }]} />
              <Text style={styles.legendText}>Food</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: NOTES_COLOR }]} />
              <Text style={styles.legendText}>Notes</Text>
            </View>
          </View>
        </ScrollView>
      ) : listDates.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Nothing logged yet</Text>
          <Text style={styles.emptySubtitle}>Log activity, food, or notes on the Today tab to see them here.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.listScrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          {listDates.map(renderListDay)}
        </ScrollView>
      )}

      {/* ── Day detail sheet ──────────────────────────────────────────────── */}
      <Modal visible={daySheetVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setDaySheetVisible(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.modalHandle} />
            <View style={styles.daySheetHeader}>
              <Text style={styles.daySheetTitle}>
                {daySheetDate ? formatDateHeading(daySheetDate) : ''}
              </Text>
              <TouchableOpacity onPress={() => setDaySheetVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.daySheetContent}>
              {daySheetEntries.exercises.length > 0 && (
                <View style={styles.categoryBlock}>
                  <Text style={styles.categoryLabel}>EXERCISE</Text>
                  {daySheetEntries.exercises.map(renderExerciseItem)}
                </View>
              )}
              {daySheetEntries.food.length > 0 && (
                <View style={styles.categoryBlock}>
                  <Text style={styles.categoryLabel}>FOOD</Text>
                  {daySheetEntries.food.map(renderFoodItem)}
                </View>
              )}
              {daySheetEntries.note && (
                <View style={styles.categoryBlock}>
                  <Text style={styles.categoryLabel}>NOTES</Text>
                  {renderNoteItem(daySheetEntries.note)}
                </View>
              )}

              {/* Log actions */}
              <View style={styles.logActionsRow}>
                <TouchableOpacity
                  style={[styles.logActionBtn, { borderColor: `${ACTIVITY_COLOR}50` }]}
                  onPress={() => daySheetDate && openNewActivityModal(daySheetDate)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pulse-outline" size={18} color={ACTIVITY_COLOR} />
                  <Text style={[styles.logActionText, { color: ACTIVITY_COLOR }]}>Activity</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logActionBtn, { borderColor: `${FOOD_COLOR}50` }]}
                  onPress={() => daySheetDate && openModal(undefined, daySheetDate)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.logActionIcon}>🍽</Text>
                  <Text style={[styles.logActionText, { color: FOOD_COLOR }]}>Food</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logActionBtn, { borderColor: `${NOTES_COLOR}50` }]}
                  onPress={() => daySheetDate && openNotesModal(daySheetDate, daySheetEntries.note ?? undefined)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={18} color={NOTES_COLOR} />
                  <Text style={[styles.logActionText, { color: NOTES_COLOR }]}>Note</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── New activity modal ───────────────────────────────────────────── */}
      <Modal visible={newActivityModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setNewActivityModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.modalScrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
            >
              <Text style={styles.modalTitle}>Log Activity</Text>

              <Text style={styles.modalLabel}>Activity</Text>
              <View style={styles.pillRow}>
                {[...MOVEMENT_TYPES, ...customMovementTypes].map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.pill, newActivityType === type.id && styles.pillSelected]}
                    onPress={() => setNewActivityType(type.id as MovementType)}
                  >
                    <Text style={styles.pillIcon}>{type.icon}</Text>
                    <Text style={[styles.pillText, newActivityType === type.id && styles.pillTextSelected]}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>How did it feel? (up to 3)</Text>
              <View style={styles.pillRow}>
                {FEELINGS.map(f => {
                  const isSelected = newActivityFeelings.includes(f.id);
                  const isDisabled = !isSelected && newActivityFeelings.length >= 3;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.pill, isSelected && styles.pillSelected, isDisabled && { opacity: 0.35 }]}
                      onPress={() => {
                        if (isSelected) setNewActivityFeelings(prev => prev.filter(x => x !== f.id));
                        else if (!isDisabled) setNewActivityFeelings(prev => [...prev, f.id]);
                      }}
                    >
                      <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.modalLabel}>Note (optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={newActivityNote}
                onChangeText={setNewActivityNote}
                placeholder="Anything you want to remember..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                maxLength={300}
              />

              <TouchableOpacity
                style={[styles.modalSave, (!newActivityType || newActivityFeelings.length === 0 || savingNewActivity) && styles.modalSaveDisabled]}
                onPress={handleSaveNewActivity}
                disabled={!newActivityType || newActivityFeelings.length === 0 || savingNewActivity}
              >
                {savingNewActivity ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>Save</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Food log modal ────────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
              <View style={styles.pillRow}>
                {getDateOptions().map(({ label, date }) => (
                  <TouchableOpacity
                    key={date}
                    style={[styles.pill, selectedDate === date && styles.pillSelected]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[styles.pillText, selectedDate === date && styles.pillTextSelected]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Meal</Text>
              <View style={styles.pillRow}>
                {MEALS.map(meal => (
                  <TouchableOpacity
                    key={meal.id}
                    style={[styles.pill, selectedMeal === meal.id && styles.pillSelected]}
                    onPress={() => setSelectedMeal(selectedMeal === meal.id ? null : meal.id)}
                  >
                    <Text style={styles.pillIcon}>{meal.icon}</Text>
                    <Text style={[styles.pillText, selectedMeal === meal.id && styles.pillTextSelected]}>{meal.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>What did you eat?</Text>
              <TextInput
                style={styles.modalInput}
                value={foodDescription}
                onChangeText={setFoodDescription}
                placeholder="e.g. chicken rice and veggies"
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                autoFocus
                maxLength={300}
              />

              <TouchableOpacity
                style={[styles.modalSave, (!foodDescription.trim() || saving) && styles.modalSaveDisabled]}
                onPress={handleSaveFood}
                disabled={!foodDescription.trim() || saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>{editingEntry ? 'Update' : 'Save'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Exercise edit modal ───────────────────────────────────────────── */}
      <Modal visible={exerciseModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
              <View style={styles.pillRow}>
                {getDateOptions().map(({ label, date }) => (
                  <TouchableOpacity
                    key={date}
                    style={[styles.pill, selectedDate === date && styles.pillSelected]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[styles.pillText, selectedDate === date && styles.pillTextSelected]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Activity</Text>
              <View style={styles.pillRow}>
                {[...MOVEMENT_TYPES, ...customMovementTypes].map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.pill, selectedType === type.id && styles.pillSelected]}
                    onPress={() => setSelectedType(type.id as MovementType)}
                  >
                    <Text style={styles.pillIcon}>{type.icon}</Text>
                    <Text style={[styles.pillText, selectedType === type.id && styles.pillTextSelected]}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Feeling (up to 3)</Text>
              <View style={styles.pillRow}>
                {FEELINGS.map(f => {
                  const isSelected = selectedFeelings.includes(f.id);
                  const isDisabled = !isSelected && selectedFeelings.length >= 3;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.pill, isSelected && styles.pillSelected, isDisabled && { opacity: 0.35 }]}
                      onPress={() => {
                        if (isSelected) setSelectedFeelings(prev => prev.filter(x => x !== f.id));
                        else if (!isDisabled) setSelectedFeelings(prev => [...prev, f.id]);
                      }}
                    >
                      <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>{f.label}</Text>
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
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                maxLength={300}
              />

              <TouchableOpacity
                style={[styles.modalSave, (!selectedType || selectedFeelings.length === 0 || savingExercise) && styles.modalSaveDisabled]}
                onPress={handleSaveExercise}
                disabled={!selectedType || selectedFeelings.length === 0 || savingExercise}
              >
                {savingExercise ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>Update</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Notes edit modal ──────────────────────────────────────────────── */}
      <Modal visible={notesModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setNotesModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.modalScrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
            >
              <Text style={styles.modalTitle}>{editingNote ? 'Edit Note' : 'Add Note'}</Text>

              <Text style={styles.modalLabel}>Date</Text>
              <View style={styles.pillRow}>
                {getDateOptions().map(({ label, date }) => (
                  <TouchableOpacity
                    key={date}
                    style={[styles.pill, selectedDate === date && styles.pillSelected]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[styles.pillText, selectedDate === date && styles.pillTextSelected]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>What's on your mind?</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 150 }]}
                value={noteContent}
                onChangeText={setNoteContent}
                placeholder="How are you feeling today? What's on your mind?"
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                autoFocus
                maxLength={500}
              />
              <Text style={styles.charCount}>{noteContent.length}/500</Text>

              <TouchableOpacity
                style={[styles.modalSave, (!noteContent.trim() || savingNote) && styles.modalSaveDisabled]}
                onPress={handleSaveNote}
                disabled={!noteContent.trim() || savingNote}
              >
                {savingNote ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>{editingNote ? 'Update' : 'Save'}</Text>}
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
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(31,46,79,0.97)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...Typography.headline,
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  viewToggleBtnActive: {
    backgroundColor: 'rgba(61,184,138,0.25)',
  },
  viewToggleText: {
    ...Typography.caption1,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
    fontSize: 12,
  },
  viewToggleTextActive: {
    color: '#ffffff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: CALENDAR_PADDING,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  listScrollContent: {
    padding: Spacing.base,
    gap: Spacing.xl,
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
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.xxl,
  },
  listDaySection: {
    gap: Spacing.sm,
  },
  listDayHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  listDayHeading: {
    ...Typography.footnote,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  listAddBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(61,184,138,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Calendar ────────────────────────────────────────────────────────────────
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calMonthLabel: {
    ...Typography.title3,
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 18,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayNameCell: {
    width: DAY_CELL_SIZE,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayName: {
    ...Typography.caption1,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    fontSize: 12,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: DAY_CELL_SIZE,
    height: DAY_CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 3,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: 'rgba(61,184,138,0.2)',
    borderWidth: 1.5,
    borderColor: ACTIVITY_COLOR,
  },
  dayNumber: {
    ...Typography.subheadline,
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 15,
  },
  todayNumber: {
    color: ACTIVITY_COLOR,
    fontWeight: '700',
  },
  futureDayNumber: {
    color: 'rgba(255,255,255,0.2)',
  },
  emptyDayNumber: {
    color: 'rgba(255,255,255,0.35)',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // ── Legend ──────────────────────────────────────────────────────────────────
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    ...Typography.caption1,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },

  // ── Day detail sheet ────────────────────────────────────────────────────────
  daySheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  daySheetTitle: {
    ...Typography.title3,
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 20,
  },
  daySheetContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },

  // ── Log action buttons ───────────────────────────────────────────────────────
  logActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  logActionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  logActionText: {
    ...Typography.caption1,
    fontWeight: '600',
    fontSize: 12,
  },
  logActionIcon: {
    fontSize: 18,
  },

  // ── Category blocks (shared between day sheet and edit modals) ───────────────
  categoryBlock: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: ACTIVITY_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryLabel: {
    ...Typography.caption2,
    fontWeight: '700',
    color: ACTIVITY_COLOR,
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
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  logIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(61,184,138,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodIconWrap: {
    backgroundColor: 'rgba(245,166,35,0.15)',
  },
  restIconWrap: {
    backgroundColor: 'rgba(138,122,170,0.15)',
  },
  notesIconWrap: {
    backgroundColor: 'rgba(122,184,200,0.15)',
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
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  deleteButton: {
    padding: Spacing.xs,
  },

  // ── Modals ───────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modalScrollContent: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    color: ACTIVITY_COLOR,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 10,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'transparent',
  },
  pillSelected: {
    borderColor: '#ffffff',
    backgroundColor: 'rgba(61,184,138,0.15)',
  },
  pillIcon: {
    fontSize: 14,
  },
  pillText: {
    ...Typography.footnote,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  pillTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalInput: {
    ...Typography.body,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: Spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  charCount: {
    ...Typography.caption1,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'right',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    shadowOpacity: 0,
    elevation: 0,
  },
  modalSaveText: {
    ...Typography.headline,
    color: '#fff',
    fontWeight: '600',
  },
});

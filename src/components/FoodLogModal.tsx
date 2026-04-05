import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MealType } from '../types';
import { createFoodEntry, toLocalDateStr } from '../services/storage';
import { SeasonTheme } from '../constants/seasonal';
import { Spacing, BorderRadius } from '../theme';

interface FoodLogModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (savedEntryId: string) => void;
  season: SeasonTheme;
  challengeId?: string;
}

const MEALS: { id: MealType; label: string; icon: string; color: string }[] = [
  { id: 'breakfast', label: 'Breakfast', icon: '☀️', color: 'rgba(255, 193, 7, 0.15)' },
  { id: 'lunch', label: 'Lunch', icon: '🌤', color: 'rgba(255, 152, 0, 0.15)' },
  { id: 'dinner', label: 'Dinner', icon: '🌙', color: 'rgba(103, 58, 183, 0.15)' },
  { id: 'snack', label: 'Snack', icon: '🍎', color: 'rgba(244, 67, 54, 0.15)' },
  { id: 'beverage', label: 'Beverage', icon: '☕', color: 'rgba(33, 150, 243, 0.15)' },
];

export default function FoodLogModal({ visible, onClose, onSave, season, challengeId: _challengeId }: FoodLogModalProps) {
  const insets = useSafeAreaInsets();
  const todayStr = toLocalDateStr(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterdayDate);

  const [foodDescription, setFoodDescription] = useState('');
  const [selectedFoodMeal, setSelectedFoodMeal] = useState<MealType | null>(null);
  const [selectedFoodDate, setSelectedFoodDate] = useState<string>(todayStr);
  const [foodSaving, setFoodSaving] = useState(false);
  const [showMoreFoodDates, setShowMoreFoodDates] = useState(false);

  const FOOD_DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const moreFoodDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (i + 2));
    return { label: FOOD_DAY_NAMES[d.getDay()], date: toLocalDateStr(d) };
  });

  const handleSaveFood = async () => {
    const desc = foodDescription.trim();
    if (!desc) return;
    setFoodSaving(true);
    const entry = await createFoodEntry(desc, selectedFoodMeal ?? undefined, selectedFoodDate);
    setFoodSaving(false);
    setFoodDescription('');
    setSelectedFoodMeal(null);
    setSelectedFoodDate(todayStr);
    setShowMoreFoodDates(false);
    onSave(entry.id);
    onClose();
  };

  const handleClose = () => {
    // Reset form after animation
    setTimeout(() => {
      setFoodDescription('');
      setSelectedFoodMeal(null);
      setSelectedFoodDate(todayStr);
      setShowMoreFoodDates(false);
    }, 300);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Pressable onPress={handleClose} hitSlop={{ top: 20, bottom: 20 }}>
              <View style={styles.modalHandle} />
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <View style={styles.foodCard}>
            <Text style={styles.foodCardHeader}>🍽️ LOG FOOD</Text>

            <View style={styles.foodPillRow}>
              {MEALS.map(meal => (
                <TouchableOpacity
                  key={meal.id}
                  style={[
                    styles.foodPill,
                    selectedFoodMeal === meal.id && styles.foodPillActive,
                    { backgroundColor: selectedFoodMeal === meal.id ? meal.color : 'transparent' }
                  ]}
                  onPress={() => setSelectedFoodMeal(prev => prev === meal.id ? null : meal.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.foodPillIcon}>{meal.icon}</Text>
                  <Text style={[styles.foodPillText, selectedFoodMeal === meal.id && styles.foodPillTextActive]}>
                    {meal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.foodPillRow, { marginTop: 4, marginBottom: showMoreFoodDates ? 4 : 0 }]}>
              {[{ label: 'Today', date: todayStr }, { label: 'Yesterday', date: yesterdayStr }].map(({ label, date }) => (
                <TouchableOpacity
                  key={date}
                  style={[styles.foodPill, selectedFoodDate === date && styles.foodPillActive]}
                  onPress={() => setSelectedFoodDate(date)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.foodPillText, selectedFoodDate === date && styles.foodPillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setShowMoreFoodDates(v => !v)}
                style={[styles.foodPill, { borderStyle: 'dashed' }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.foodPillText, { opacity: 0.6 }]}>
                  {showMoreFoodDates ? 'Less' : 'More'}
                </Text>
              </TouchableOpacity>
            </View>
            {showMoreFoodDates && (
              <View style={styles.foodPillRow}>
                {moreFoodDates.map(({ label, date }) => (
                  <TouchableOpacity
                    key={date}
                    style={[styles.foodPill, selectedFoodDate === date && styles.foodPillActive]}
                    onPress={() => setSelectedFoodDate(date)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.foodPillText, selectedFoodDate === date && styles.foodPillTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput
              style={styles.foodInput}
              value={foodDescription}
              onChangeText={setFoodDescription}
              placeholder="What did you eat?"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              multiline
              maxLength={300}
            />

            {foodDescription.trim().length > 0 && (
              <TouchableOpacity
                style={[styles.foodSaveBtn, foodSaving && styles.foodSaveBtnDisabled]}
                onPress={handleSaveFood}
                disabled={foodSaving}
                activeOpacity={0.8}
              >
                {foodSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.foodSaveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            )}
              </View>
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
  keyboardAvoid: {
    width: '100%',
    maxHeight: '92%',
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
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: Spacing.md,
    alignSelf: 'center',
  },
  foodCard: {
    gap: 16,
  },
  foodCardHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3db88a',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  foodPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  foodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: BorderRadius.pill,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
  },
  foodPillActive: {
    borderColor: '#ffffff',
  },
  foodPillIcon: {
    fontSize: 13,
  },
  foodPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  foodPillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  foodInput: {
    fontSize: 15,
    lineHeight: 21,
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  foodSaveBtn: {
    backgroundColor: '#f5a623',
    borderRadius: 12,
    padding: Spacing.base,
    alignItems: 'center',
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  foodSaveBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  foodSaveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

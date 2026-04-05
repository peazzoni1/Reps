import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, BorderRadius } from '../theme';

const STREAK_MILESTONES = [3, 7, 14, 30];

interface FoodChallengeCompletionPromptProps {
  visible: boolean;
  challengeText: string;
  streak: number;
  onAddFoodLog: () => void;
  onSkip: () => void;
}

export default function FoodChallengeCompletionPrompt({
  visible,
  challengeText,
  streak,
  onAddFoodLog,
  onSkip,
}: FoodChallengeCompletionPromptProps) {
  const insets = useSafeAreaInsets();
  const isStreakMilestone = STREAK_MILESTONES.includes(streak);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onSkip}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onSkip} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Pressable onPress={onSkip} hitSlop={{ top: 20, bottom: 20 }}>
            <View style={styles.handle} />
          </Pressable>

          <Text style={styles.headline}>Nice work! 🎉</Text>
          <Text style={styles.subtext} numberOfLines={2}>
            {challengeText}
          </Text>

          {isStreakMilestone && (
            <View style={styles.milestoneBadge}>
              <Text style={styles.milestoneText}>
                🔥 {streak}-day streak — badge earned!
              </Text>
            </View>
          )}

          <Text style={styles.prompt}>Want to log what you had?</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.addButton} onPress={onAddFoodLog} activeOpacity={0.8}>
              <Text style={styles.addButtonText}>+ Add food log</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.8}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  sheet: {
    backgroundColor: '#1f2e4f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 14,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 6,
  },
  headline: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
    marginTop: -4,
  },
  milestoneBadge: {
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(245, 166, 35, 0.3)',
  },
  milestoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f5a623',
  },
  prompt: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#3db88a',
    borderRadius: BorderRadius.pill,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  skipButton: {
    flex: 1,
    borderRadius: BorderRadius.pill,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

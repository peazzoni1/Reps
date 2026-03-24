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
import { SeasonTheme } from '../constants/seasonal';
import { Spacing, BorderRadius } from '../theme';

interface GoalsModalProps {
  visible: boolean;
  onClose: () => void;
  season: SeasonTheme;
}

export default function GoalsModal({ visible, onClose, season }: GoalsModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.modalHandle} />

          <View style={styles.goalsCard}>
            <Text style={styles.goalsCardHeader}>🎯 GOALS</Text>

            <View style={styles.comingSoonContainer}>
              <Text style={styles.comingSoonEmoji}>🚀</Text>
              <Text style={styles.comingSoonTitle}>Coming Soon</Text>
              <Text style={styles.comingSoonDescription}>
                Set and track your fitness goals. Stay tuned for this exciting feature!
              </Text>
            </View>

            <View style={[styles.philosophyContainer, { backgroundColor: `${season.color}15` }]}>
              <Text style={styles.philosophyText}>{season.philosophy}</Text>
            </View>
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
  goalsCard: {
    gap: 20,
  },
  goalsCardHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3db88a',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  comingSoonContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  comingSoonEmoji: {
    fontSize: 48,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  comingSoonDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  philosophyContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  philosophyText: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

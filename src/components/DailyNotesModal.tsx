import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDailyNote, saveDailyNote, toLocalDateStr } from '../services/storage';
import { SeasonTheme } from '../constants/seasonal';
import { Spacing, BorderRadius } from '../theme';

interface DailyNotesModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  season: SeasonTheme;
}

export default function DailyNotesModal({ visible, onClose, onSave, season }: DailyNotesModalProps) {
  const insets = useSafeAreaInsets();
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const todayStr = toLocalDateStr(new Date());

  // Load today's note when modal opens
  useEffect(() => {
    if (visible) {
      loadNote();
    }
  }, [visible]);

  const loadNote = async () => {
    const note = await getDailyNote(todayStr);
    if (note) {
      setNoteContent(note.content);
    } else {
      setNoteContent('');
    }
  };

  const handleTextChange = (text: string) => {
    setNoteContent(text);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (debounced 500ms)
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(text);
    }, 500);
  };

  const handleSave = async (text: string) => {
    const trimmed = text.trim();
    setIsSaving(true);
    await saveDailyNote(todayStr, trimmed);
    setIsSaving(false);
    onSave();
  };

  const handleClose = () => {
    // Save on close if there are pending changes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      handleSave(noteContent);
    }
    onClose();
  };

  const charCount = noteContent.length;
  const maxChars = 500;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.modalHandle} />

            <View style={styles.notesCard}>
              <Text style={styles.notesCardHeader}>✍️ DAILY NOTES</Text>
              <Text style={styles.notesDate}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>

              <TextInput
                style={styles.notesInput}
                value={noteContent}
                onChangeText={handleTextChange}
                placeholder="How are you feeling today? What's on your mind?"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                multiline
                maxLength={maxChars}
                textAlignVertical="top"
              />

              <View style={styles.footer}>
                <Text style={styles.charCount}>
                  {charCount}/{maxChars}
                </Text>
                {isSaving && <Text style={styles.savingText}>Saving...</Text>}
                {!isSaving && charCount > 0 && <Text style={styles.savedText}>Saved</Text>}
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
  notesCard: {
    gap: 12,
  },
  notesCardHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3db88a',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  notesDate: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: -4,
  },
  notesInput: {
    fontSize: 15,
    lineHeight: 23,
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 14,
    minHeight: 200,
    maxHeight: 300,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  savingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
  },
  savedText: {
    fontSize: 12,
    color: '#3db88a',
    fontWeight: '600',
  },
});

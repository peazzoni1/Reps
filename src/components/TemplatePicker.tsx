import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Template } from '../types';
import { getAllTemplates } from '../services/storage';
import { Colors, Spacing, BorderRadius, Typography, Shadows, TouchTarget } from '../theme';

interface TemplatePickerProps {
  visible: boolean;
  onSelect: (template: Template) => void;
  onAdHoc: () => void;
  onCancel: () => void;
}

export default function TemplatePicker({ visible, onSelect, onAdHoc, onCancel }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      loadTemplates();
    }
  }, [visible]);

  const loadTemplates = async () => {
    const data = await getAllTemplates();
    setTemplates(data);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton} activeOpacity={0.6}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Choose Template</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.adHocCard}
            onPress={onAdHoc}
            activeOpacity={0.6}
          >
            <View style={styles.adHocIconContainer}>
              <Ionicons name="flash" size={20} color={Colors.accent} />
            </View>
            <View style={styles.adHocContent}>
              <Text style={styles.adHocTitle}>Ad-hoc Workout</Text>
              <Text style={styles.adHocSubtitle}>
                Quick workout without a template
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </TouchableOpacity>

          {templates.length > 0 && (
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CHOOSE A TEMPLATE</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {templates.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.templateCard}
              onPress={() => onSelect(item)}
              activeOpacity={0.6}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="list" size={20} color={Colors.accent} />
              </View>
              <View style={styles.templateContent}>
                <Text style={styles.templateName}>{item.name}</Text>
                <Text style={styles.templateSubtitle}>
                  {item.exercises.length} {item.exercises.length === 1 ? 'exercise' : 'exercises'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}

          {templates.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="documents-outline" size={48} color={Colors.textTertiary} />
              </View>
              <Text style={styles.emptyText}>No Saved Templates</Text>
              <Text style={styles.emptySubtext}>
                Templates you create will appear here
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
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
  cancelButton: {
    minWidth: 60,
    minHeight: TouchTarget.min,
    justifyContent: 'center',
  },
  cancelText: {
    ...Typography.body,
    color: Colors.accent,
  },
  placeholder: {
    minWidth: 60,
  },
  list: {
    padding: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  adHocCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    ...Shadows.sm,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  adHocIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  adHocContent: {
    flex: 1,
  },
  adHocTitle: {
    ...Typography.headline,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  adHocSubtitle: {
    ...Typography.footnote,
    color: Colors.textSecondary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.separator,
  },
  dividerText: {
    ...Typography.caption2,
    color: Colors.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.md,
  },
  templateCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    ...Shadows.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  templateContent: {
    flex: 1,
  },
  templateName: {
    ...Typography.headline,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  templateSubtitle: {
    ...Typography.footnote,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.xxl,
  },
  emptyIconContainer: {
    marginBottom: Spacing.base,
    opacity: 0.5,
  },
  emptyText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    ...Typography.footnote,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

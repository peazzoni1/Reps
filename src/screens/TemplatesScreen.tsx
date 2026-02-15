import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Template } from '../types';
import {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../services/storage';
import TemplateModal from '../components/TemplateModal';
import { Colors, Spacing, BorderRadius, Typography, Shadows, TouchTarget } from '../theme';

export default function TemplatesScreen() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | undefined>();
  const insets = useSafeAreaInsets();

  const loadTemplates = async () => {
    const data = await getAllTemplates();
    setTemplates(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [])
  );

  const handleCreateTemplate = () => {
    setSelectedTemplate(undefined);
    setModalVisible(true);
  };

  const handleEditTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setModalVisible(true);
  };

  const handleSaveTemplate = async (name: string, exercises: { name: string }[]) => {
    if (selectedTemplate) {
      await updateTemplate(selectedTemplate.id, { name, exercises });
    } else {
      await createTemplate(name, exercises);
    }
    setModalVisible(false);
    loadTemplates();
  };

  const handleDeleteTemplate = (template: Template) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate(template.id);
            loadTemplates();
          },
        },
      ]
    );
  };

  const renderTemplate = ({ item }: { item: Template }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleEditTemplate(item)}
      onLongPress={() => handleDeleteTemplate(item)}
      activeOpacity={0.6}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>
          {item.exercises.length} {item.exercises.length === 1 ? 'exercise' : 'exercises'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.base }]}>
        <Text style={styles.title}>Templates</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateTemplate}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={28} color={Colors.cardBackground} />
        </TouchableOpacity>
      </View>

      {templates.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="documents-outline" size={64} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyText}>No Templates Yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the + button to create your first workout template
          </Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          renderItem={renderTemplate}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TemplateModal
        visible={modalVisible}
        template={selectedTemplate}
        onSave={handleSaveTemplate}
        onCancel={() => setModalVisible(false)}
      />
    </View>
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
    ...Typography.largeTitle,
    color: Colors.textPrimary,
  },
  addButton: {
    width: TouchTarget.min,
    height: TouchTarget.min,
    borderRadius: TouchTarget.min / 2,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  list: {
    padding: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
    ...Shadows.sm,
  },
  cardContent: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  cardTitle: {
    ...Typography.headline,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl * 2,
  },
  emptyIconContainer: {
    marginBottom: Spacing.lg,
    opacity: 0.5,
  },
  emptyText: {
    ...Typography.title3,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    ...Typography.subheadline,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

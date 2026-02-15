import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Template, WorkoutInstance } from '../types';
import { getRecentWorkouts, createWorkout, getTemplate, deleteWorkout, updateWorkout } from '../services/storage';
import TemplatePicker from '../components/TemplatePicker';
import WorkoutRecorder from '../components/WorkoutRecorder';
import AdHocWorkoutModal from '../components/AdHocWorkoutModal';
import { Colors, Spacing, BorderRadius, Typography, Shadows, TouchTarget } from '../theme';

export default function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState<WorkoutInstance[]>([]);
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [adHocModalVisible, setAdHocModalVisible] = useState(false);
  const [workoutRecorderVisible, setWorkoutRecorderVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutInstance | null>(null);
  const [templateNames, setTemplateNames] = useState<{ [key: string]: string }>({});
  const insets = useSafeAreaInsets();

  const loadWorkouts = async () => {
    const data = await getRecentWorkouts(10);
    setWorkouts(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [])
  );

  const handleStartWorkout = () => {
    setSelectedWorkout(null);
    setTemplatePickerVisible(true);
  };

  const handleAdHocWorkout = () => {
    setTemplatePickerVisible(false);
    setAdHocModalVisible(true);
  };

  const handleAdHocStart = (exercises: { name: string }[]) => {
    // Create a temporary template for ad-hoc workout
    const tempTemplate: Template = {
      id: 'ad-hoc',
      name: 'Ad-hoc Workout',
      exercises,
    };
    setSelectedTemplate(tempTemplate);
    setAdHocModalVisible(false);
    setWorkoutRecorderVisible(true);
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setTemplatePickerVisible(false);
    setWorkoutRecorderVisible(true);
  };

  const handleEditWorkout = async (workout: WorkoutInstance) => {
    const template = await getTemplate(workout.templateId);
    if (template) {
      setSelectedTemplate(template);
      setSelectedWorkout(workout);
      setWorkoutRecorderVisible(true);
    }
  };

  const handleSaveWorkout = async (exercises: WorkoutInstance['exercises']) => {
    if (selectedTemplate) {
      if (selectedWorkout) {
        // Updating existing workout
        await updateWorkout(selectedWorkout.id, { exercises });
      } else {
        // Creating new workout
        await createWorkout(selectedTemplate.id, exercises);
      }
      setWorkoutRecorderVisible(false);
      setSelectedTemplate(null);
      setSelectedWorkout(null);
      loadWorkouts();
    }
  };

  const handleCancelWorkout = () => {
    setWorkoutRecorderVisible(false);
    setSelectedTemplate(null);
    setSelectedWorkout(null);
  };

  const handleDeleteWorkout = (workout: WorkoutInstance) => {
    const templateName = templateNames[workout.templateId] || 'this workout';
    Alert.alert(
      'Delete Workout',
      `Are you sure you want to delete ${templateName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteWorkout(workout.id);
            loadWorkouts();
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (isYesterday) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const loadTemplateName = async (templateId: string) => {
    if (!templateNames[templateId]) {
      const template = await getTemplate(templateId);
      if (template) {
        setTemplateNames(prev => ({ ...prev, [templateId]: template.name }));
      }
    }
  };

  React.useEffect(() => {
    workouts.forEach(workout => {
      loadTemplateName(workout.templateId);
    });
  }, [workouts]);

  const renderWorkout = ({ item }: { item: WorkoutInstance }) => {
    const completedCount = item.exercises.length;

    return (
      <TouchableOpacity
        style={styles.workoutCard}
        onPress={() => handleEditWorkout(item)}
        onLongPress={() => handleDeleteWorkout(item)}
        activeOpacity={0.6}
      >
        <View style={styles.workoutHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="barbell" size={20} color={Colors.accent} />
          </View>
          <View style={styles.workoutContent}>
            <Text style={styles.workoutTemplate}>
              {templateNames[item.templateId] || 'Loading...'}
            </Text>
            <Text style={styles.workoutDetails}>
              {completedCount} {completedCount === 1 ? 'exercise' : 'exercises'}
            </Text>
          </View>
          <Text style={styles.workoutDate}>{formatDate(item.date)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.base }]}>
        <Text style={styles.title}>Workouts</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleStartWorkout}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={28} color={Colors.cardBackground} />
        </TouchableOpacity>
      </View>

      {workouts.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="barbell-outline" size={64} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyText}>No Workouts Yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the + button to start your first workout
          </Text>
        </View>
      ) : (
        <FlatList
          data={workouts}
          renderItem={renderWorkout}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TemplatePicker
        visible={templatePickerVisible}
        onSelect={handleTemplateSelect}
        onAdHoc={handleAdHocWorkout}
        onCancel={() => setTemplatePickerVisible(false)}
      />

      <AdHocWorkoutModal
        visible={adHocModalVisible}
        onStart={handleAdHocStart}
        onCancel={() => setAdHocModalVisible(false)}
      />

      <WorkoutRecorder
        visible={workoutRecorderVisible}
        template={selectedTemplate}
        workout={selectedWorkout}
        onSave={handleSaveWorkout}
        onCancel={handleCancelWorkout}
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
  workoutCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    minHeight: 72,
    ...Shadows.sm,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  workoutContent: {
    flex: 1,
  },
  workoutTemplate: {
    ...Typography.headline,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  workoutDetails: {
    ...Typography.footnote,
    color: Colors.textSecondary,
  },
  workoutDate: {
    ...Typography.caption1,
    color: Colors.textTertiary,
    marginLeft: Spacing.sm,
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

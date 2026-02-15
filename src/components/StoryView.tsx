import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SeasonTheme, MovementSession } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StoryViewProps {
  visible: boolean;
  season: SeasonTheme;
  sessions: MovementSession[];
  onClose: () => void;
}

export default function StoryView({ visible, season, sessions, onClose }: StoryViewProps) {
  const insets = useSafeAreaInsets();

  // Calculate stats
  const totalSessions = sessions.length;

  // Most common movement type
  const typeCounts: Record<string, number> = {};
  sessions.forEach((s) => {
    typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
  });
  const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  // Most common feeling
  const feelingCounts: Record<string, number> = {};
  sessions.forEach((s) => {
    feelingCounts[s.feeling] = (feelingCounts[s.feeling] || 0) + 1;
  });
  const mostCommonFeeling = Object.entries(feelingCounts).sort((a, b) => b[1] - a[1])[0];

  // Calculate longest streak
  const calculateLongestStreak = () => {
    const sortedSessions = [...sessions].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let longestStreak = 0;
    let currentStreak = 1;

    for (let i = 1; i < sortedSessions.length; i++) {
      const prevDate = new Date(sortedSessions[i - 1].date);
      const currDate = new Date(sortedSessions[i].date);
      prevDate.setHours(0, 0, 0, 0);
      currDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        currentStreak++;
      } else if (daysDiff > 1) {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }

    return Math.max(longestStreak, currentStreak);
  };

  const stats = [
    {
      label: 'Most common',
      value: mostCommonType ? mostCommonType[0].charAt(0).toUpperCase() + mostCommonType[0].slice(1) : 'N/A',
      sub: mostCommonType ? `${mostCommonType[1]} sessions` : '',
    },
    {
      label: 'Longest streak',
      value: totalSessions > 1 ? `${calculateLongestStreak()} days` : 'N/A',
      sub: '',
    },
    {
      label: 'Most felt',
      value: mostCommonFeeling ? mostCommonFeeling[0].charAt(0).toUpperCase() + mostCommonFeeling[0].slice(1) : 'N/A',
      sub: mostCommonFeeling ? `${mostCommonFeeling[1]} times` : '',
    },
    {
      label: 'This season',
      value: season.name,
      sub: `${totalSessions} sessions`,
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={[season.bgStart, season.bgMiddle, season.bgEnd]}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 60 }]}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { top: insets.top + 16 }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeButtonText, { color: season.text }]}>×</Text>
          </TouchableOpacity>

          <View>
            <Text style={[styles.seasonLabel, { color: season.color }]}>
              Your {season.name}
            </Text>
            <Text style={[styles.title, { color: season.text }]}>
              A Season of {season.theme}
            </Text>
          </View>

          <View style={styles.sessionCount}>
            <Text style={[styles.bigNumber, { color: season.color }]}>
              {totalSessions}
            </Text>
            <Text style={[styles.sessionLabel, { color: season.textSecondary }]}>
              sessions this season
            </Text>
          </View>

          <View style={styles.statsGrid}>
            {stats.map((stat, i) => (
              <View
                key={i}
                style={[styles.statCard, { backgroundColor: season.cardBg }]}
              >
                <Text style={[styles.statLabel, { color: season.textSecondary }]}>
                  {stat.label}
                </Text>
                <Text style={[styles.statValue, { color: season.text }]}>
                  {stat.value}
                </Text>
                {stat.sub && (
                  <Text style={[styles.statSub, { color: season.textSecondary }]}>
                    {stat.sub}
                  </Text>
                )}
              </View>
            ))}
          </View>

          <View style={[styles.patternCard, { backgroundColor: season.cardBg }]}>
            <Text style={[styles.patternLabel, { color: season.textSecondary }]}>
              Philosophy
            </Text>
            <Text style={[styles.patternText, { color: season.text }]}>
              {season.philosophy}
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 28,
    fontWeight: '300',
    marginTop: -4,
  },
  seasonLabel: {
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 38,
    marginBottom: 32,
  },
  sessionCount: {
    marginBottom: 32,
  },
  bigNumber: {
    fontSize: 48,
    fontWeight: '300',
    marginBottom: 4,
  },
  sessionLabel: {
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    borderRadius: 14,
    padding: 16,
    width: '48%',
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '400',
  },
  statSub: {
    fontSize: 11,
    marginTop: 4,
  },
  patternCard: {
    borderRadius: 16,
    padding: 20,
  },
  patternLabel: {
    fontSize: 11,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  patternText: {
    fontSize: 16,
    lineHeight: 25,
    fontStyle: 'italic',
    fontWeight: '300',
  },
});

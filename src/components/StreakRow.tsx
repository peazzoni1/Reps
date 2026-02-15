import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MovementSession } from '../types';

interface StreakRowProps {
  sessions: MovementSession[];
  seasonColor: string;
}

export default function StreakRow({ sessions, seasonColor }: StreakRowProps) {
  // Calculate days ago for each session
  const sessionsWithDaysAgo = sessions.map((session) => {
    const sessionDate = new Date(session.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    sessionDate.setHours(0, 0, 0, 0);
    const daysAgo = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
    return { ...session, daysAgo };
  });

  // Create array of last 14 days
  const days = Array.from({ length: 14 }, (_, i) => {
    const daysAgo = 13 - i;
    const session = sessionsWithDaysAgo.find((s) => s.daysAgo === daysAgo);
    return { daysAgo, session };
  });

  return (
    <View style={styles.container}>
      {days.map((d, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            d.session
              ? {
                  width: 10,
                  height: 10,
                  backgroundColor: seasonColor,
                }
              : {
                  width: 6,
                  height: 6,
                  backgroundColor: 'rgba(0,0,0,0.08)',
                  opacity: d.daysAgo === 0 && !d.session ? 0.4 : 1,
                },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: 50,
  },
});

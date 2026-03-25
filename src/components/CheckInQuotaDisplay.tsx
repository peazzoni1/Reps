import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckInQuota } from '../types';

interface CheckInQuotaDisplayProps {
  quota: CheckInQuota;
}

export default function CheckInQuotaDisplay({ quota }: CheckInQuotaDisplayProps) {
  // Don't show for premium users
  if (quota.isPremium) return null;

  const percentage = quota.total > 0 ? (quota.remaining / quota.total) * 100 : 0;

  // Color based on remaining quota
  const getColor = () => {
    if (percentage > 33) return '#3db88a'; // Green - plenty left
    if (percentage > 0) return '#f5a623'; // Orange - running low
    return '#ff6b6b'; // Red - exhausted
  };

  const color = getColor();

  return (
    <View style={styles.container}>
      <View style={styles.textRow}>
        <Text style={styles.label}>Weekly AI Check-ins</Text>
        <Text style={[styles.count, { color }]}>
          {quota.remaining} / {quota.total} remaining
        </Text>
      </View>
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            { width: `${percentage}%`, backgroundColor: color }
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginTop: 12,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  count: {
    fontSize: 13,
    fontWeight: '700',
  },
  barBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});

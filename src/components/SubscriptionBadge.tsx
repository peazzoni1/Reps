import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SubscriptionTier } from '../types';

interface SubscriptionBadgeProps {
  tier: SubscriptionTier;
}

export default function SubscriptionBadge({ tier }: SubscriptionBadgeProps) {
  if (tier === 'free') return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#f5a623',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});

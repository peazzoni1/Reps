import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Spacing } from '../theme';

interface QuickAccessTileProps {
  icon: string;
  label: string;
  status: string;
  color: string;
  onPress: () => void;
}

export default function QuickAccessTile({ icon, label, status, color, onPress }: QuickAccessTileProps) {
  return (
    <TouchableOpacity
      style={[
        styles.tile,
        {
          borderColor: `${color}40`, // 25% opacity of accent color
          shadowColor: color,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Inner glow effect */}
      <View style={[styles.innerGlow, { backgroundColor: `${color}15` }]} />

      <View style={styles.content}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        <Text style={styles.status}>{status}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: '47%',
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: Spacing.base,
    overflow: 'hidden',
    // Layered shadows for depth
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  innerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    opacity: 0.3,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});

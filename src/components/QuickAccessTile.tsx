import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Spacing } from '../theme';

interface QuickAccessTileProps {
  icon: string;
  label: string;
  status: string;
  color: string;
  onPress: () => void;
}

// Helper function to render the appropriate SVG icon based on label
function renderIcon(label: string, color: string) {
  const iconSize = 20;
  const strokeWidth = 2;

  switch (label) {
    case 'Activity':
      // Lightning bolt: diagonal from top-right to bottom-left with sharp bend
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 20 20">
          <Path
            d="M12 2 L6 11 L10 11 L8 18 L14 9 L10 9 Z"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'Food':
      // Takeaway cup with lid, sleeve, and straw
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 20 20">
          {/* Cup body */}
          <Path
            d="M6 7 L7 17 C7 17.5 7.5 18 8 18 L12 18 C12.5 18 13 17.5 13 17 L14 7"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Lid */}
          <Path
            d="M5 7 L15 7 C15 7 15.5 6 15 5 L5 5 C4.5 6 5 7 5 7 Z"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Sleeve */}
          <Path
            d="M6.5 11 L13.5 11"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Straw */}
          <Path
            d="M11 5 L11 2"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'Notes':
      // Document with 3 lines and folded corner
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 20 20">
          {/* Page */}
          <Path
            d="M5 2 L13 2 L13 6 L17 6 L17 18 L5 18 Z"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Folded corner */}
          <Path
            d="M13 2 L13 6 L17 6"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Text lines */}
          <Path d="M8 9 L14 9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M8 12 L14 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M8 15 L11 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );

    case 'Goals':
      // Three-ring bullseye with dot in center
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 20 20">
          {/* Outer ring */}
          <Circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          {/* Middle ring */}
          <Circle
            cx="10"
            cy="10"
            r="5"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          {/* Inner ring */}
          <Circle
            cx="10"
            cy="10"
            r="2.5"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          {/* Center dot */}
          <Circle
            cx="10"
            cy="10"
            r="1"
            fill={color}
          />
        </Svg>
      );

    default:
      return null;
  }
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
        {/* Icon container */}
        <View style={[styles.iconContainer, { backgroundColor: `${color}1F` }]}>
          {renderIcon(label, color)}
        </View>
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
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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

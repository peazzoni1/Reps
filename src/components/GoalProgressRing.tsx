import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

interface GoalProgressRingProps {
  progress: number; // 0 to 1 (0% to 100%)
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  children?: React.ReactNode;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function GoalProgressRing({
  progress,
  size = 100,
  strokeWidth = 8,
  color = '#3db88a',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  showPercentage = true,
  children,
}: GoalProgressRingProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;

  // Clamp progress between 0 and 1
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percentage = Math.round(clampedProgress * 100);

  // Animate progress
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: clampedProgress,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [clampedProgress]);

  // Interpolate strokeDashoffset
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress circle */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        {children ? (
          children
        ) : showPercentage ? (
          <Text style={[styles.percentageText, { fontSize: size * 0.22 }]}>
            {percentage}%
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontFamily: 'Nunito_700Bold',
    color: '#ffffff',
    fontWeight: '700',
  },
});

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface ProgressIndicatorProps {
  progress: number;
  total: number;
  label?: string;
  color?: string;
}

export function ProgressIndicator({ 
  progress, 
  total, 
  label,
  color = '#6BCF7F' 
}: ProgressIndicatorProps) {
  const animatedWidth = useSharedValue(0);
  const percentage = Math.min((progress / total) * 100, 100);

  useEffect(() => {
    animatedWidth.value = withTiming(percentage, { duration: 800 });
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.percentage}>{Math.round(percentage)}%</Text>
        </View>
      )}
      <View style={styles.track}>
        <Animated.View 
          style={[
            styles.fill, 
            { backgroundColor: color },
            animatedStyle
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#4A5568',
  },
  percentage: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#718096',
  },
  track: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});
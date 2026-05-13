import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { colors } from '../../theme';

interface Props {
  uri: string;
  blurIndex: number;
  maxAttempts: number;
}

const BLUR_INTENSITIES = [100, 80, 60, 40, 20, 0];

export function MovieImage({ uri, blurIndex, maxAttempts }: Props) {
  const intensity = BLUR_INTENSITIES[Math.min(blurIndex, BLUR_INTENSITIES.length - 1)] ?? 0;
  const blurAnim = useRef(new Animated.Value(intensity)).current;

  useEffect(() => {
    Animated.timing(blurAnim, {
      toValue: intensity,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [intensity]);

  return (
    <View style={styles.container}>
      <Image
        source={{ uri }}
        style={styles.image}
        contentFit="cover"
        transition={300}
        accessibilityLabel={`Image du défi - ${maxAttempts - blurIndex} tentatives restantes`}
      />
      {intensity > 0 && (
        <BlurView
          intensity={intensity}
          tint="dark"
          style={StyleSheet.absoluteFill}
          experimentalBlurMethod="dimezisBlurView"
        />
      )}
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});

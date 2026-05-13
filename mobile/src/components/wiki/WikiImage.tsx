import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors } from '../../theme';

interface Props {
  photoUrl: string | null;
  attemptsUsed: number;
  maxAttempts: number;
}

const BLUR_INTENSITIES = [90, 70, 50, 30, 10, 0];

export function WikiImage({ photoUrl, attemptsUsed, maxAttempts }: Props) {
  const intensity = BLUR_INTENSITIES[Math.min(attemptsUsed, BLUR_INTENSITIES.length - 1)] ?? 0;

  if (!photoUrl) {
    return (
      <View style={[styles.container, styles.placeholder]}>
        <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={colors.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="12" cy="7" r="4" stroke={colors.textMuted} strokeWidth="1.5" />
        </Svg>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: photoUrl }}
        style={styles.image}
        contentFit="cover"
        transition={300}
        accessibilityLabel={`Photo de la personnalité - ${maxAttempts - attemptsUsed} tentatives restantes`}
      />
      {intensity > 0 && (
        <BlurView
          intensity={intensity}
          tint="dark"
          style={StyleSheet.absoluteFill}
          experimentalBlurMethod="dimezisBlurView"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: colors.surface2,
  },
  image: StyleSheet.absoluteFillObject,
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});

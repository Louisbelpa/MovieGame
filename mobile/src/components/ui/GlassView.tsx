import React from 'react';
import { Platform, View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GlassView as NativeGlassView,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';

interface Props {
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
  intensity?: number;
  specular?: boolean;
  tintColor?: string;
  interactive?: boolean;
}

/**
 * Liquid Glass cross-platform :
 * - iOS 26+ avec expo-glass-effect disponible → GlassView natif (UIVisualEffectView)
 * - iOS < 26 → BlurView systemUltraThinMaterialDark + highlights speculaires
 * - Android → surface opaque sombre
 */
export function GlassView({
  style,
  children,
  intensity = 95,
  specular = true,
  tintColor,
  interactive = false,
}: Props) {
  if (Platform.OS === 'ios' && isGlassEffectAPIAvailable()) {
    return (
      <NativeGlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        tintColor={tintColor}
        isInteractive={interactive}
        style={[styles.base, style]}
      >
        {children}
      </NativeGlassView>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint="systemUltraThinMaterialDark"
        style={[styles.base, style]}
      >
        <View style={styles.glassBody} pointerEvents="none" />
        {specular && (
          <>
            <View style={styles.specTop} pointerEvents="none" />
            <View style={styles.specLeft} pointerEvents="none" />
            <View style={styles.specRight} pointerEvents="none" />
            <View style={styles.specBottom} pointerEvents="none" />
          </>
        )}
        {children}
      </BlurView>
    );
  }

  return (
    <View style={[styles.base, styles.androidFallback, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },

  glassBody: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  specTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.32)',
    zIndex: 10,
  },
  specLeft: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    width: 0.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    zIndex: 10,
  },
  specRight: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0,
    width: 0.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    zIndex: 10,
  },
  specBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 0.5,
    backgroundColor: 'rgba(0,0,0,0.18)',
    zIndex: 10,
  },

  androidFallback: {
    backgroundColor: 'rgba(13,17,23,0.97)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
});

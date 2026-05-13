import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '../../theme';

interface Props {
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export function Spinner({ size = 'large', fullScreen }: Props) {
  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size={size} color={colors.gold} />
      </View>
    );
  }
  return <ActivityIndicator size={size} color={colors.gold} />;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

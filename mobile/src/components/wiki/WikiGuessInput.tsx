import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  Text,
  Animated,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, font } from '../../theme';
import type { WikiSearchResult } from '../../types';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (guess: string) => void;
  onSkip: () => void;
  suggestions: WikiSearchResult[];
  isSuggestionsLoading: boolean;
  isSubmitting: boolean;
  disabled: boolean;
  shakeTrigger: number;
}

export function WikiGuessInput({
  value,
  onChangeText,
  onSubmit,
  onSkip,
  suggestions,
  isSuggestionsLoading,
  isSubmitting,
  disabled,
  shakeTrigger,
}: Props) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (shakeTrigger === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeTrigger]);

  useEffect(() => {
    setShowDropdown(suggestions.length > 0);
  }, [suggestions]);

  const handleSelect = (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDropdown(false);
    Keyboard.dismiss();
    onSubmit(name);
  };

  const handleSubmit = () => {
    if (!value.trim() || isSubmitting) return;
    setShowDropdown(false);
    Keyboard.dismiss();
    onSubmit(value.trim());
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowDropdown(false);
    Keyboard.dismiss();
    onSkip();
  };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ translateX: shakeAnim }] }]}>
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(t) => {
              onChangeText(t);
              setShowDropdown(t.length >= 2);
            }}
            placeholder="Entrez un nom de personnalité…"
            placeholderTextColor={colors.textMuted}
            editable={!disabled && !isSubmitting}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            accessibilityLabel="Saisir le nom d'une personnalité"
          />
          {isSuggestionsLoading && (
            <ActivityIndicator size="small" color={colors.textDim} style={styles.inputSpinner} />
          )}
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={!value.trim() || isSubmitting || disabled}
          style={({ pressed }) => [
            styles.submitBtn,
            (!value.trim() || disabled) && styles.disabled,
            pressed && styles.pressed,
          ]}
          accessibilityLabel="Valider"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.bg} />
          ) : (
            <Ionicons name="arrow-forward" size={20} color={colors.bg} />
          )}
        </Pressable>

        <Pressable
          onPress={handleSkip}
          disabled={isSubmitting || disabled}
          style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed, disabled && styles.disabled]}
          accessibilityLabel="Passer"
        >
          <Ionicons name="play-skip-forward-outline" size={18} color={colors.textDim} />
        </Pressable>
      </View>

      {showDropdown && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
                onPress={() => handleSelect(item.name)}
              >
                <Text style={styles.suggestionName}>{item.name}</Text>
                <Text style={styles.suggestionType}>{item.personType}</Text>
              </Pressable>
            )}
            keyboardShouldPersistTaps="always"
            scrollEnabled={false}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  input: { flex: 1, fontSize: font.md, color: colors.text, paddingVertical: spacing.sm },
  inputSpinner: { marginLeft: spacing.xs },
  submitBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  dropdown: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionPressed: { backgroundColor: colors.surface },
  suggestionName: { fontSize: font.md, color: colors.text, flex: 1 },
  suggestionType: { fontSize: font.sm, color: colors.textDim, marginLeft: spacing.sm, textTransform: 'capitalize' },
});

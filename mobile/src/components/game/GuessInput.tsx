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
import { Svg, Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, font } from '../../theme';

interface Suggestion {
  id: number;
  title: string;
  year: number;
}

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (guess: string) => void;
  onSkip: () => void;
  suggestions: Suggestion[];
  isSuggestionsLoading: boolean;
  isSubmitting: boolean;
  disabled: boolean;
  shakeTrigger: number;
  placeholder?: string;
  accentColor?: string;
  accentSoft?: string;
  accentRing?: string;
}

function SearchIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={colors.textFaint} strokeWidth="1.8" />
      <Path d="M21 21l-5-5" stroke={colors.textFaint} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function GuessInput({
  value,
  onChangeText,
  onSubmit,
  onSkip,
  suggestions,
  isSuggestionsLoading,
  isSubmitting,
  disabled,
  shakeTrigger,
  placeholder = 'Titre du film…',
  accentColor = colors.films,
  accentSoft = colors.filmsSoft,
  accentRing = colors.filmsRing,
}: Props) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<TextInput>(null);

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

  const handleSelect = (title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDropdown(false);
    Keyboard.dismiss();
    onSubmit(title);
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
      {/* Inline input row */}
      <View style={[styles.inputRow, { borderColor: accentRing, shadowColor: accentColor }]}>
        <View style={styles.iconWrap}>
          <SearchIcon />
        </View>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={(t) => {
            onChangeText(t);
            setShowDropdown(t.length >= 2);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          editable={!disabled && !isSubmitting}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
          accessibilityLabel="Saisir une réponse"
        />
        {isSuggestionsLoading && (
          <ActivityIndicator size="small" color={colors.textDim} style={styles.spinner} />
        )}
        <Pressable
          onPress={handleSubmit}
          disabled={!value.trim() || isSubmitting || disabled}
          style={[styles.submitBtn, { backgroundColor: accentColor }, (!value.trim() || disabled) && styles.submitBtnDisabled]}
          accessibilityLabel="Valider la réponse"
        >
          {isSubmitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.submitLabel}>Deviner</Text>
          }
        </Pressable>
      </View>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
                onPress={() => handleSelect(item.title)}
              >
                <Text style={styles.suggestionTitle}>{item.title}</Text>
                <Text style={styles.suggestionYear}>{item.year}</Text>
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 5,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  iconWrap: { marginRight: 6 },
  input: {
    flex: 1,
    fontSize: font.base + 0.5,
    color: colors.text,
    paddingVertical: spacing.sm + 2,
    minWidth: 0,
  },
  spinner: { marginRight: 6 },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 9,
    marginLeft: 4,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitLabel: {
    color: '#fff',
    fontSize: 13.5,
    fontWeight: '600',
  },
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
  suggestionTitle: { fontSize: font.md, color: colors.text, flex: 1 },
  suggestionYear: { fontSize: font.sm, color: colors.textDim, marginLeft: spacing.sm },
});

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTab?: 'login' | 'register';
}

export function EmailAuthModal({ visible, onClose, onSuccess, initialTab = 'login' }: Props) {
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetFields = () => {
    setError(null);
    setEmail('');
    setPassword('');
    setConfirm('');
    setDisplayName('');
  };

  const handleClose = () => {
    resetFields();
    setTab(initialTab);
    onClose();
  };

  const validateRegister = (): string | null => {
    if (!displayName.trim()) return 'Le pseudo est requis.';
    if (!email.includes('@')) return 'Adresse e-mail invalide.';
    if (password.length < 8) return 'Au moins 8 caractères pour le mot de passe.';
    if (password !== confirm) return 'Les mots de passe ne correspondent pas.';
    return null;
  };

  const submitLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      resetFields();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de connexion.');
    } finally {
      setBusy(false);
    }
  };

  const submitRegister = async () => {
    const v = validateRegister();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await register(email.trim(), password, displayName.trim());
      resetFields();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création du compte.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.md }]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>
          <Text style={styles.title}>{tab === 'login' ? 'Connexion' : 'Créer un compte'}</Text>

          <View style={styles.tabs}>
            <Pressable
              onPress={() => { setTab('login'); setError(null); }}
              style={[styles.tab, tab === 'login' && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, tab === 'login' && styles.tabLabelActive]}>Connexion</Text>
            </Pressable>
            <Pressable
              onPress={() => { setTab('register'); setError(null); }}
              style={[styles.tab, tab === 'register' && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, tab === 'register' && styles.tabLabelActive]}>Inscription</Text>
            </Pressable>
          </View>

          {tab === 'register' && (
            <TextInput
              placeholder="Pseudo"
              placeholderTextColor={colors.textFaint}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              style={styles.input}
              editable={!busy}
            />
          )}
          <TextInput
            placeholder="E-mail"
            placeholderTextColor={colors.textFaint}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            editable={!busy}
          />
          <TextInput
            placeholder="Mot de passe"
            placeholderTextColor={colors.textFaint}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            editable={!busy}
          />
          {tab === 'register' && (
            <TextInput
              placeholder="Confirmer le mot de passe"
              placeholderTextColor={colors.textFaint}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              style={styles.input}
              editable={!busy}
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
            onPress={() => void (tab === 'login' ? submitLogin() : submitRegister())}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#1a0f00" />
            ) : (
              <Text style={styles.primaryBtnText}>{tab === 'login' ? 'Se connecter' : 'Créer mon compte'}</Text>
            )}
          </Pressable>

          <Pressable onPress={handleClose} style={styles.secondaryBtn} disabled={busy}>
            <Text style={styles.secondaryBtnText}>Fermer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  handleRow: { alignItems: 'center', marginBottom: spacing.sm },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    backgroundColor: colors.surface2,
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  tabLabel: { fontSize: 13, color: colors.textDim, fontWeight: '500' },
  tabLabelActive: { color: colors.text, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.sm,
    backgroundColor: colors.bg,
  },
  error: {
    color: '#f87171',
    fontSize: 13,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: '#1a0f00' },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center', marginTop: spacing.xs },
  secondaryBtnText: { fontSize: 14, color: colors.textDim, fontWeight: '500' },
});

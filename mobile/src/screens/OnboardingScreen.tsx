import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Circle, Rect, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors, font, spacing, radius } from '../theme';
import { EmailAuthModal } from '../components/auth/EmailAuthModal';

// ── Icônes SVG ────────────────────────────────────────────────────────────────
function ImageIcon() {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="3" stroke={colors.textFaint} strokeWidth="1.5" />
      <Circle cx="8.5" cy="8.5" r="1.5" stroke={colors.textFaint} strokeWidth="1.5" />
      <Path d="M21 15l-5-5L5 21" stroke={colors.textFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function LockIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="11" width="14" height="11" rx="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 11V7a4 4 0 1 1 8 0v4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 9h18M8 2v4M16 2v4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function AppleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5.5C12 5.5 14 3 16.5 3c0 2.5-1.5 4.5-3.5 5M19 17.5C19 20 17.5 21 16 21s-2-1-4-1-2.5 1-4 1-3-1-3-3.5C5 14 8 11 8 11c1-1 1.5-2.5 1.5-2.5H14.5S15 12 16 13c0 0 3 3 3 4.5z" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function MailIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function UsersIcon({ color }: { color: string }) {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="1.5" />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Splash ────────────────────────────────────────────────────────────────────
export function SplashScreen() {
  return (
    <View style={styles.splashRoot}>
      <View style={styles.splashIconWrap}>
        <Text style={styles.splashLetter}>S</Text>
      </View>
      <Text style={styles.splashWordmark}>ShowGuessr</Text>
      <Text style={styles.splashTagline}>LE QUIZ CINÉMA QUOTIDIEN</Text>
    </View>
  );
}

// ── Slide visual placeholders ─────────────────────────────────────────────────
function SlideVisualImage() {
  return (
    <View style={styles.slideVisual}>
      <View style={styles.blurredImagePh}>
        <ImageIcon />
        <Text style={styles.blurredLabel}>IMAGE · FLOUTÉE</Text>
        <View style={styles.blurBadge}><Text style={styles.blurBadgeText}>2/6</Text></View>
      </View>
    </View>
  );
}
function SlideVisualHints() {
  return (
    <View style={styles.slideVisual}>
      <View style={styles.hintsPreview}>
        <HintPreviewCard label="Année" value="2010" locked={false} />
        <HintPreviewCard label="Réalisateur" value="C. Nolan" locked={false} />
        <HintPreviewCard label="Acteur principal" locked={true} />
      </View>
    </View>
  );
}
function SlideVisualSocial() {
  return (
    <View style={styles.slideVisual}>
      <View style={styles.hintsPreview}>
        <FriendPreviewRow name="Marc" score="2/6" rank={1} top />
        <FriendPreviewRow name="Toi" score="3/6" rank={2} self />
        <FriendPreviewRow name="Léa" score="4/6" rank={3} />
        <FriendPreviewRow name="Sami" score="—" rank={4} />
      </View>
    </View>
  );
}
function HintPreviewCard({ label, value, locked }: { label: string; value?: string; locked: boolean }) {
  return (
    <View style={[styles.hintPreviewCard, locked && styles.hintPreviewCardLocked]}>
      {locked ? <LockIcon color={colors.textFaint} /> : <CalendarIcon color={colors.gold} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.hintPreviewLabel}>{label}</Text>
        {!locked && <Text style={styles.hintPreviewValue}>{value}</Text>}
      </View>
    </View>
  );
}
function FriendPreviewRow({ name, score, rank, top, self }: { name: string; score: string; rank: number; top?: boolean; self?: boolean }) {
  return (
    <View style={[styles.friendPreviewRow, self && { backgroundColor: colors.goldSoft, borderColor: colors.goldRing }]}>
      <View style={[styles.friendPreviewRank, top && { backgroundColor: colors.gold }]}>
        <Text style={[styles.friendPreviewRankText, top && { color: '#1a0f00' }]}>{rank}</Text>
      </View>
      <Text style={[styles.friendPreviewName, self && { fontWeight: '600' }]}>{name}</Text>
      <Text style={[styles.friendPreviewScore, top && { color: colors.gold }]}>{score}</Text>
    </View>
  );
}

// ── Onboarding slides ─────────────────────────────────────────────────────────
const SLIDES = [
  {
    kicker: 'BIENVENUE',
    title: 'Une image,',
    titleAccent: 'six essais.',
    desc: "Chaque jour, devine le film ou la série caché derrière une scène floutée.",
    visual: 'image',
  },
  {
    kicker: 'INDICES',
    title: 'Bloqué ? Des',
    titleAccent: 'indices',
    titleSuffix: ' à débloquer.',
    desc: "Année, réalisateur, acteur principal… chaque mauvaise réponse révèle un nouvel indice.",
    visual: 'hints',
  },
  {
    kicker: 'AVEC TES AMIS',
    title: 'Compare',
    titleAccent: 'tes scores.',
    desc: "Ajoute tes amis pour voir leurs résultats du jour et défier ta streak.",
    visual: 'social',
  },
];

interface OnboardingSlideProps {
  index: number;
  onNext: () => void;
  onSkip: () => void;
}

function OnboardingSlide({ index, onNext, onSkip }: OnboardingSlideProps) {
  const insets = useSafeAreaInsets();
  const s = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <View style={[styles.slideRoot, { paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.slideBody}>
        {s.visual === 'image'  && <SlideVisualImage />}
        {s.visual === 'hints'  && <SlideVisualHints />}
        {s.visual === 'social' && <SlideVisualSocial />}

        <View style={styles.slideCopy}>
          <Text style={styles.slideKicker}>{s.kicker}</Text>
          <Text style={styles.slideTitle}>
            {s.title}{'\n'}
            <Text style={styles.slideTitleAccent}>{s.titleAccent}</Text>
            {s.titleSuffix ?? ''}
          </Text>
          <Text style={styles.slideDesc}>{s.desc}</Text>
        </View>
      </View>

      <View style={styles.slideFooter}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNext(); }}
        >
          <Text style={styles.ctaLabel}>{isLast ? 'Commencer' : 'Suivant'}</Text>
        </Pressable>

        {!isLast && (
          <Pressable onPress={onSkip} style={styles.skipBtn} hitSlop={12}>
            <Text style={styles.skipLabel}>Passer</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ── Auth gate ─────────────────────────────────────────────────────────────────
interface AuthGateProps {
  onContinueWithoutAccount: () => void;
  onEmail: () => void;
  onApple: () => void;
}

function AuthGate({ onContinueWithoutAccount, onEmail, onApple }: AuthGateProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.authRoot, { paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.authBody}>
        <Text style={styles.splashWordmark}>ShowGuessr</Text>
        <Text style={styles.authTitle}>
          Connecte-toi pour{'\n'}
          <Text style={styles.authTitleAccent}>défier tes amis</Text>
        </Text>
        <Text style={styles.authDesc}>
          Garde tes stats sur tous tes appareils et compare-toi à tes proches.
        </Text>

        <View style={styles.authBtns}>
          <Pressable
            style={({ pressed }) => [styles.authBtnApple, pressed && { opacity: 0.85 }]}
            onPress={onApple}
          >
            <AppleIcon />
            <Text style={styles.authBtnAppleLabel}>Continuer avec Apple</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.authBtnEmail, pressed && { opacity: 0.8 }]}
            onPress={onEmail}
          >
            <MailIcon color={colors.text} />
            <Text style={styles.authBtnEmailLabel}>Continuer avec un e-mail</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.authFooter}>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>
        <Pressable onPress={onContinueWithoutAccount} hitSlop={10}>
          <Text style={styles.guestLabel}>Jouer sans compte →</Text>
        </Pressable>
        <Text style={styles.legalText}>
          En continuant, tu acceptes les{' '}
          <Text style={{ textDecorationLine: 'underline' }}>CGU</Text>
          {' '}et la{' '}
          <Text style={{ textDecorationLine: 'underline' }}>politique de confidentialité</Text>.
        </Text>
      </View>
    </View>
  );
}

// ── OnboardingScreen (orchestrateur) ──────────────────────────────────────────
export type OnboardingStep = 'slides' | 'auth';

interface Props {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState<OnboardingStep>('slides');
  const [slideIndex, setSlideIndex] = useState(0);
  const [emailAuthOpen, setEmailAuthOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateNext = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0,   duration: 0,   useNativeDriver: true }),
    ]).start(callback);
  };

  const handleNext = () => {
    animateNext(() => {
      if (slideIndex < SLIDES.length - 1) {
        setSlideIndex(i => i + 1);
      } else {
        setStep('auth');
      }
    });
  };

  const handleSkip = () => {
    animateNext(() => setStep('auth'));
  };

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.root, { transform: [{ translateY: slideAnim }] }]}>
        {step === 'slides' && (
          <OnboardingSlide
            index={slideIndex}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        )}
        {step === 'auth' && (
          <AuthGate
            onContinueWithoutAccount={onComplete}
            onEmail={() => setEmailAuthOpen(true)}
            onApple={() =>
              Alert.alert('Bientôt disponible', 'La connexion Apple sera ajoutée dans une prochaine version.')
            }
          />
        )}
      </Animated.View>
      <EmailAuthModal
        visible={emailAuthOpen}
        onClose={() => setEmailAuthOpen(false)}
        onSuccess={() => {
          setEmailAuthOpen(false);
          onComplete();
        }}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Splash
  splashRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  splashIconWrap: {
    width: 88, height: 88,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.55,
    shadowRadius: 30,
  },
  splashLetter: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 52,
    fontWeight: '700',
    fontStyle: 'italic',
    color: colors.gold,
    lineHeight: 60,
  },
  splashWordmark: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  splashTagline: {
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 1.8,
    fontVariant: ['small-caps'],
  },

  // Slide
  slideRoot: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 70,
  },
  slideBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  slideVisual: {
    width: '100%',
    maxWidth: 280,
    aspectRatio: 4 / 5,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  blurredImagePh: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  blurredLabel: {
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 1.6,
  },
  blurBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blurBadgeText: { fontSize: 10, color: colors.textDim },
  hintsPreview: {
    flex: 1,
    padding: 20,
    gap: 8,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  hintPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hintPreviewCardLocked: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.06)',
    opacity: 0.55,
  },
  hintPreviewLabel: { fontSize: 9, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 1 },
  hintPreviewValue: { fontSize: 12, color: colors.text, marginTop: 1 },

  friendPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  friendPreviewRank: {
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendPreviewRankText: { fontSize: 11, fontWeight: '700', color: colors.textDim },
  friendPreviewName: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '500' },
  friendPreviewScore: { fontSize: 12, fontWeight: '600', color: colors.textDim, fontVariant: ['tabular-nums'] },

  slideCopy: { alignItems: 'center', maxWidth: 320 },
  slideKicker: {
    fontSize: 11,
    letterSpacing: 2,
    color: colors.textFaint,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  slideTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.5,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 14,
  },
  slideTitleAccent: {
    color: colors.gold,
    fontStyle: 'italic',
  },
  slideDesc: {
    fontSize: 15,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 23,
  },

  slideFooter: {
    gap: spacing.lg,
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.gold,
  },
  ctaBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.gold,
    alignItems: 'center',
  },
  ctaLabel: { fontSize: 15, fontWeight: '600', color: '#1a0f00' },
  skipBtn: { paddingVertical: 4 },
  skipLabel: { fontSize: 13, color: colors.textDim, fontWeight: '500' },

  // Auth gate
  authRoot: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 90,
  },
  authBody: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.md,
  },
  authTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xl,
    maxWidth: 280,
  },
  authTitleAccent: { color: colors.gold, fontStyle: 'italic' },
  authDesc: {
    fontSize: 14.5,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  authBtns: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  authBtnApple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: '#fff',
  },
  authBtnAppleLabel: { fontSize: 15, fontWeight: '600', color: '#000' },
  authBtnEmail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  authBtnEmailLabel: { fontSize: 15, fontWeight: '600', color: colors.text },

  authFooter: { alignItems: 'center', gap: spacing.md },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '100%' },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 11, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 1.6 },
  guestLabel: { fontSize: 14, color: colors.textDim, fontWeight: '500' },
  legalText: {
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
});

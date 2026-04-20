import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  getAppLock, hashPasscode, hashSecurityAnswer,
  verifySecurityAnswer, setAppLock, setUnlockedSession,
} from '../services/settings';
import { useAppThemeAndText } from '../hooks/useAppThemeAndText';
import { Lock, ShieldCheck, CalendarDays, KeyRound } from 'lucide-react-native';

// Setup steps
type SetupStep = 'passcode' | 'confirm' | 'security';
// Unlock steps
type UnlockStep = 'passcode' | 'recovery';

export default function LockScreen() {
  const router = useRouter();
  const { setup } = useLocalSearchParams<{ setup?: string }>();

  const [isSetup, setIsSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<SetupStep>('passcode');
  const [unlockStep, setUnlockStep] = useState<UnlockStep>('passcode');

  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'setup' | 'recovery'>('setup');

  const { Theme, text } = useAppThemeAndText();
  const styles = getStyles(Theme);

  useEffect(() => {
    setIsSetup(setup === 'true');
  }, [setup]);

  const formatDate = (date: Date): string => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const openCalendar = (target: 'setup' | 'recovery') => {
    setCalendarTarget(target);
    setShowCalendar(true);
  };

  // ── SETUP FLOW ──────────────────────────────────────────
  const handleSetupNext = async () => {
    if (setupStep === 'passcode') {
      if (code.length !== 4) {
        Alert.alert('Invalid', text.invalidCode);
        return;
      }
      setSetupStep('confirm');
    } else if (setupStep === 'confirm') {
      if (confirm.length !== 4) {
        Alert.alert('Invalid', text.invalidCode);
        return;
      }
      if (code !== confirm) {
        Alert.alert('Mismatch', 'Passcodes do not match. Please try again.');
        setConfirm('');
        return;
      }
      setSetupStep('security');
    } else if (setupStep === 'security') {
      if (birthDate.trim().length < 6) {
        Alert.alert('Required', 'Please enter your birth date (e.g. 01/01/1990).');
        return;
      }
      const passcodeHash = await hashPasscode(code);
      const securityAnswerHash = await hashSecurityAnswer(birthDate);
      await setAppLock({ enabled: true, passcodeHash, securityAnswerHash });
      await setUnlockedSession(true);
      Alert.alert('✅ App Lock Set', 'Your passcode and security answer have been saved.');
      router.replace('/(tabs)');
    }
  };

  // ── UNLOCK FLOW ─────────────────────────────────────────
  const handleUnlock = async () => {
    const lock = await getAppLock();
    if (!lock.enabled || !lock.passcodeHash) {
      router.replace('/(tabs)');
      return;
    }
    if (code.length !== 4) {
      Alert.alert('Invalid', text.invalidCode);
      return;
    }
    const hash = await hashPasscode(code);
    if (hash === lock.passcodeHash) {
      await setUnlockedSession(true);
      router.replace('/(tabs)');
    } else {
      Alert.alert('❌ Incorrect', text.wrongPasscode);
      setCode('');
    }
  };

  // ── RECOVERY FLOW ────────────────────────────────────────
  const handleRecovery = async () => {
    const lock = await getAppLock();
    if (!lock.securityAnswerHash) {
      Alert.alert('No Recovery', 'No security question was set. Cannot recover passcode.');
      return;
    }
    const isCorrect = await verifySecurityAnswer(recoveryAnswer, lock.securityAnswerHash);
    if (isCorrect) {
      await setAppLock({ enabled: false });
      await setUnlockedSession(false);
      Alert.alert('✅ Verified', 'App lock has been disabled. Please set a new passcode from Settings.');
      router.replace('/(tabs)');
    } else {
      Alert.alert('❌ Wrong Answer', 'Birth date does not match. Please try again.');
      setRecoveryAnswer('');
    }
  };

  // ── RENDER SETUP ─────────────────────────────────────────
  if (isSetup) {
    const stepIcons = [Lock, ShieldCheck, CalendarDays];
    const StepIcon = stepIcons[setupStep === 'passcode' ? 0 : setupStep === 'confirm' ? 1 : 2];

    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

          {/* Step Indicator */}
          <View style={styles.stepRow}>
            {['passcode', 'confirm', 'security'].map((s, i) => (
              <View key={s} style={[styles.stepDot, (setupStep === s || (setupStep === 'confirm' && i === 0) || (setupStep === 'security' && i <= 1)) && styles.stepDotActive]} />
            ))}
          </View>

          <View style={styles.iconCircle}>
            <StepIcon size={32} color={Theme.colors.primary} />
          </View>

          {setupStep === 'passcode' && (
            <>
              <Text style={styles.title}>Set Passcode</Text>
              <Text style={styles.subtitle}>Create a 4-digit PIN to lock the app</Text>
              <Text style={styles.fieldLabel}>ENTER 4-DIGIT PASSCODE</Text>
              <TextInput
                style={styles.pinInput}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={code}
                onChangeText={setCode}
                placeholder="• • • •"
                placeholderTextColor={Theme.colors.textMuted}
              />
            </>
          )}

          {setupStep === 'confirm' && (
            <>
              <Text style={styles.title}>Confirm Passcode</Text>
              <Text style={styles.subtitle}>Re-enter your 4-digit PIN</Text>
              <Text style={styles.fieldLabel}>CONFIRM 4-DIGIT PASSCODE</Text>
              <TextInput
                style={styles.pinInput}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
                placeholder="• • • •"
                placeholderTextColor={Theme.colors.textMuted}
              />
            </>
          )}

          {setupStep === 'security' && (
            <>
              <Text style={styles.title}>Security Question</Text>
              <Text style={styles.subtitle}>Used to recover access if you forget your PIN</Text>
              <View style={styles.questionCard}>
                <CalendarDays size={16} color={Theme.colors.primary} />
                <Text style={styles.questionText}>What is your date of birth?</Text>
              </View>
              <Text style={styles.fieldLabel}>YOUR BIRTH DATE (DD/MM/YYYY)</Text>
              <View style={styles.dateRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="e.g. 01/01/1990"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                />
                <TouchableOpacity activeOpacity={0.7} style={styles.calendarBtn} onPress={() => openCalendar('setup')}>
                  <CalendarDays size={20} color={Theme.colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.hintText}>⚠️ Remember this exactly — it will be used to reset your passcode.</Text>
            </>
          )}

          {showCalendar && calendarTarget === 'setup' && (
            <DateTimePicker
              value={birthDate ? new Date(birthDate.split('/').reverse().join('-')) : new Date(1990, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              maximumDate={new Date()}
              onChange={(_, date) => {
                setShowCalendar(false);
                if (date) setBirthDate(formatDate(date));
              }}
            />
          )}

          <TouchableOpacity activeOpacity={0.7} style={styles.btn} onPress={handleSetupNext}>
            <Text style={styles.btnText}>
              {setupStep === 'security' ? '✅ Save & Activate Lock' : 'Continue →'}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── RENDER UNLOCK ─────────────────────────────────────────
  if (unlockStep === 'recovery') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          <View style={styles.iconCircle}>
            <CalendarDays size={32} color={Theme.colors.primary} />
          </View>
          <Text style={styles.title}>Account Recovery</Text>
          <Text style={styles.subtitle}>Answer your security question to disable the lock</Text>

          <View style={styles.questionCard}>
            <CalendarDays size={16} color={Theme.colors.primary} />
            <Text style={styles.questionText}>What is your date of birth?</Text>
          </View>
          <Text style={styles.fieldLabel}>BIRTH DATE (DD/MM/YYYY)</Text>
          <View style={styles.dateRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={recoveryAnswer}
              onChangeText={setRecoveryAnswer}
              placeholder="e.g. 01/01/1990"
              placeholderTextColor={Theme.colors.textMuted}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
            <TouchableOpacity activeOpacity={0.7} style={styles.calendarBtn} onPress={() => openCalendar('recovery')}>
              <CalendarDays size={20} color={Theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {showCalendar && calendarTarget === 'recovery' && (
            <DateTimePicker
              value={recoveryAnswer ? new Date(recoveryAnswer.split('/').reverse().join('-')) : new Date(1990, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              maximumDate={new Date()}
              onChange={(_, date) => {
                setShowCalendar(false);
                if (date) setRecoveryAnswer(formatDate(date));
              }}
            />
          )}

          <TouchableOpacity activeOpacity={0.7} style={styles.btn} onPress={handleRecovery}>
            <Text style={styles.btnText}>Verify & Disable Lock</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7} style={styles.linkBtn} onPress={() => setUnlockStep('passcode')}>
            <Text style={styles.linkText}>← Back to Passcode</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.iconCircle}>
          <KeyRound size={32} color={Theme.colors.primary} />
        </View>
        <Text style={styles.title}>{text.enterPasscode}</Text>
        <Text style={styles.subtitle}>{text.appIsLocked}</Text>
        <Text style={styles.fieldLabel}>ENTER 4-DIGIT PASSCODE</Text>
        <TextInput
          style={styles.pinInput}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          value={code}
          onChangeText={setCode}
          placeholder="• • • •"
          placeholderTextColor={Theme.colors.textMuted}
        />

        <TouchableOpacity style={styles.btn} onPress={handleUnlock}>
          <Text style={styles.btnText}>{text.unlock}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={() => setUnlockStep('recovery')}>
          <Text style={styles.linkText}>🔑 {text.forgotCode}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Theme.spacing.l,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Theme.spacing.l,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.border,
  },
  stepDotActive: {
    backgroundColor: Theme.colors.primary,
    width: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Theme.spacing.l,
    borderWidth: 2,
    borderColor: Theme.isDark ? Theme.colors.border : '#C6E8D4',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.l,
    fontSize: 13,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: Theme.colors.textMuted,
    marginBottom: 8,
  },
  pinInput: {
    backgroundColor: Theme.colors.card,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.l,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: Theme.spacing.l,
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 20,
    color: Theme.colors.text,
    ...Theme.shadow.sm,
  },
  input: {
    backgroundColor: Theme.colors.card,
    borderWidth: 1.5,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.borderRadius.m,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: Theme.spacing.m,
    fontSize: 16,
    color: Theme.colors.text,
    textAlign: 'center',
    letterSpacing: 1,
  },
  questionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Theme.colors.primaryLight,
    borderRadius: Theme.borderRadius.m,
    padding: 14,
    marginBottom: Theme.spacing.m,
    borderWidth: 1,
    borderColor: Theme.isDark ? Theme.colors.border : '#C6E8D4',
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.primary,
    flex: 1,
  },
  hintText: {
    fontSize: 11,
    color: Theme.colors.accent,
    textAlign: 'center',
    marginBottom: Theme.spacing.l,
    lineHeight: 16,
  },
  btn: {
    backgroundColor: Theme.colors.primary,
    padding: 15,
    borderRadius: Theme.borderRadius.m,
    alignItems: 'center',
    ...Theme.shadow.sm,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  linkBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: Theme.colors.accent,
    fontWeight: '600',
    fontSize: 13,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Theme.spacing.m,
  },
  calendarBtn: {
    backgroundColor: Theme.colors.primaryLight,
    padding: 14,
    borderRadius: Theme.borderRadius.m,
    borderWidth: 1,
    borderColor: Theme.isDark ? Theme.colors.border : '#C6E8D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

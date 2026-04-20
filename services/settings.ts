import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const PROFILE_KEY = '@asif_profile';
const APP_LOCK_KEY = '@asif_app_lock';
const APP_LOCK_SESSION_KEY = '@asif_app_lock_unlocked';

export interface OwnerProfile {
  ownerName: string;
  photoUri?: string;
  phoneNumber?: string;
}

export interface AppLockConfig {
  enabled: boolean;
  passcodeHash?: string;
  securityAnswerHash?: string; // SHA-256 of birth date answer (DD/MM/YYYY)
}

export const getOwnerProfile = async (): Promise<OwnerProfile> => {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { ownerName: 'Asif & Company' };
};

export const setOwnerProfile = async (profile: OwnerProfile): Promise<void> => {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const getAppLock = async (): Promise<AppLockConfig> => {
  try {
    const raw = await AsyncStorage.getItem(APP_LOCK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: false };
};

export const setAppLock = async (config: AppLockConfig): Promise<void> => {
  await AsyncStorage.setItem(APP_LOCK_KEY, JSON.stringify(config));
};

export const hashPasscode = async (code: string): Promise<string> => {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, code);
};

// Normalize birth date answer: strip spaces, lowercase, so "01/01/1990" == "01/01/1990"
export const hashSecurityAnswer = async (answer: string): Promise<string> => {
  const normalized = answer.trim().toLowerCase().replace(/\s+/g, '');
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized);
};

export const verifySecurityAnswer = async (answer: string, storedHash: string): Promise<boolean> => {
  const hash = await hashSecurityAnswer(answer);
  return hash === storedHash;
};

export const setUnlockedSession = async (unlocked: boolean): Promise<void> => {
  if (unlocked) {
    await AsyncStorage.setItem(APP_LOCK_SESSION_KEY, '1');
  } else {
    await AsyncStorage.removeItem(APP_LOCK_SESSION_KEY);
  }
};

export const isSessionUnlocked = async (): Promise<boolean> => {
  const v = await AsyncStorage.getItem(APP_LOCK_SESSION_KEY);
  return v === '1';
};

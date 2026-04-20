import { useAppPreferences } from '../context/AppPreferencesContext';
import { en, hi } from '../constants/i18n';

const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

const borderRadius = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  round: 999,
};

const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
};

const lightColors = {
  background: '#F4F6F3',
  surface: '#FFFFFF',
  primary: '#1B3D2B',
  primaryLight: '#E8F5ED',
  secondary: '#27AE60',
  accent: '#E74C3C',
  accentLight: '#FDEDEC',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  inputBackground: '#F9FAFB',
  inputBorder: '#D1D5DB',
  card: '#FFFFFF',
  success: '#D1FAE5',
  successText: '#065F46',
  error: '#FEE2E2',
  errorText: '#991B1B',
  tabBarBg: '#FFFFFF',
};

const darkColors = {
  background: '#0F1117',
  surface: '#1A1D27',
  primary: '#4ADE80',
  primaryLight: '#1A3A2D',
  secondary: '#22C55E',
  accent: '#F87171',
  accentLight: '#3B1515',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#1E2535',
  inputBackground: '#1E2535',
  inputBorder: '#2D3748',
  card: '#1A1D27',
  success: '#14532D',
  successText: '#4ADE80',
  error: '#450A0A',
  errorText: '#F87171',
  tabBarBg: '#1A1D27',
};

export const useAppThemeAndText = () => {
  const { theme, language, setTheme, setLanguage } = useAppPreferences();

  const colors = theme === 'dark' ? darkColors : lightColors;
  const isDark = theme === 'dark';
  const text = language === 'hi' ? hi : en;

  const Theme = {
    colors,
    spacing,
    borderRadius,
    shadow,
    isDark,
  };

  return { Theme, text, language, setLanguage, theme, setTheme };
};

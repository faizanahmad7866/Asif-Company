import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'hi';
export type ThemeType = 'light' | 'dark';

export interface AppPreferences {
  language: Language;
  theme: ThemeType;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeType) => void;
}

const AppPreferencesContext = createContext<AppPreferences>({
  language: 'en',
  theme: 'light',
  setLanguage: () => {},
  setTheme: () => {},
});

export const AppPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [theme, setThemeState] = useState<ThemeType>('light');

  useEffect(() => {
    (async () => {
      try {
        const lang = await AsyncStorage.getItem('@app_lang');
        const th = await AsyncStorage.getItem('@app_theme');
        if (lang === 'en' || lang === 'hi') setLanguageState(lang);
        if (th === 'light' || th === 'dark') setThemeState(th);
      } catch (e) {
        console.error("Failed to load preferences", e);
      }
    })();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem('@app_lang', lang);
  };

  const setTheme = async (th: ThemeType) => {
    setThemeState(th);
    await AsyncStorage.setItem('@app_theme', th);
  };

  return (
    <AppPreferencesContext.Provider value={{ language, theme, setLanguage, setTheme }}>
      {children}
    </AppPreferencesContext.Provider>
  );
};

export const useAppPreferences = () => useContext(AppPreferencesContext);

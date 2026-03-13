import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

import type { AuthUser } from '@/constants/api';

const TOKEN_KEY = 'fenceai_auth_token';
const USER_KEY = 'fenceai_auth_user';
const BIOMETRIC_PREFIX = 'fenceai_bio_';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  ready: boolean;
};

type AuthContextValue = AuthState & {
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, user: null, ready: false });

  useEffect(() => {
    (async () => {
      try {
        const [token, userJson] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        const user = userJson ? (JSON.parse(userJson) as AuthUser) : null;
        let nextToken: string | null = token && user ? token : null;
        let nextUser: AuthUser | null = token && user ? user : null;

        if (nextToken && nextUser) {
          try {
            const bioKey = `${BIOMETRIC_PREFIX}${nextUser.id}`;
            const bioEnabled = (await AsyncStorage.getItem(bioKey)) === '1';
            if (bioEnabled) {
              const hasHardware = await LocalAuthentication.hasHardwareAsync();
              const isEnrolled = await LocalAuthentication.isEnrolledAsync();
              if (hasHardware && isEnrolled) {
                const res = await LocalAuthentication.authenticateAsync({
                  promptMessage: 'Разблокировка FenceAI',
                  cancelLabel: 'Отмена',
                });
                if (!res.success) {
                  nextToken = null;
                  nextUser = null;
                  await Promise.all([
                    AsyncStorage.removeItem(TOKEN_KEY),
                    AsyncStorage.removeItem(USER_KEY),
                  ]);
                }
              }
            }
          } catch {
            // игнорируем ошибки биометрии, даём войти по паролю
          }
        }

        setState({ token: nextToken, user: nextUser, ready: true });
      } catch {
        setState({ token: null, user: null, ready: true });
      }
    })();
  }, []);

  const signIn = useCallback(async (token: string, user: AuthUser) => {
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
    setState({ token, user, ready: true });
  }, []);

  const signOut = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    setState((s) => ({ ...s, token: null, user: null }));
  }, []);

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

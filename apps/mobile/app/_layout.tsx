import 'react-native-url-polyfill/auto';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { useRouter, useSegments } from 'expo-router';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!initialized) {
        setTimedOut(true);
        setInitialized(true);
      }
    }, 8000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setInitialized(true);
    }).catch(() => {
      clearTimeout(timeout);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [session, initialized, segments]);

  if (!initialized) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>KD</Text>
        </View>
        <ActivityIndicator size="large" color="#1e40af" style={styles.spinner} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (timedOut) {
    return (
      <View style={styles.loadingContainer}>
        <View style={[styles.logoContainer, styles.logoError]}>
          <Text style={styles.logoText}>KD</Text>
        </View>
        <Text style={styles.errorTitle}>Bağlantı Hatası</Text>
        <Text style={styles.errorText}>Sunucuya bağlanılamadı.{'\n'}İnternet bağlantınızı kontrol edin.</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#1e40af',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  logoError: {
    backgroundColor: '#dc2626',
  },
  logoText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
  spinner: {
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
});

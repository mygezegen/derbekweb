import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { DrawerProvider } from './src/contexts/DrawerContext';
import MainNavigator from './src/navigation/MainNavigator';
import {
  registerForPushNotifications,
  registerGuestDeviceToken,
  registerNotificationListeners,
} from './src/lib/pushNotifications';

function RootNavigator() {
  const { loading, member } = useAuth();
  const guestTokenRegistered = useRef(false);
  const lastMemberId = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (member?.id) {
      if (lastMemberId.current !== member.id) {
        lastMemberId.current = member.id;
        registerForPushNotifications(member.id).catch(console.error);
      }
    } else {
      if (!guestTokenRegistered.current) {
        guestTokenRegistered.current = true;
        registerGuestDeviceToken().catch(console.error);
      }
    }
  }, [loading, member?.id]);

  useEffect(() => {
    const cleanup = registerNotificationListeners(
      (_notification) => {},
      (_response) => {}
    );
    return cleanup;
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#b91c1c" />
      </View>
    );
  }

  return <MainNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <AuthProvider>
          <DrawerProvider>
            <NavigationContainer>
              <StatusBar style="light" />
              <RootNavigator />
            </NavigationContainer>
          </DrawerProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
});

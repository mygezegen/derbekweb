import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getDeviceName(): string {
  const brand = Device.brand || '';
  const modelName = Device.modelName || '';
  const osName = Device.osName || Platform.OS;
  const osVersion = Device.osVersion || '';

  if (brand && modelName) return `${brand} ${modelName}`;
  if (modelName) return modelName;
  if (osName) return `${osName} ${osVersion}`.trim();
  return Platform.OS === 'ios' ? 'iPhone/iPad' : 'Android Cihaz';
}

const FALLBACK_PROJECT_ID = '2b5b2ab6-b84a-4ec0-8b1c-cf40c046d340';

function getProjectId(): string {
  // Expo SDK 49+ — EAS projectId öncelikli, sonra expoConfig.extra.eas, son olarak hardcoded fallback
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra as any)?.eas?.projectId ??
    FALLBACK_PROJECT_ID
  );
}

async function requestAndGetToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[Push] Gerçek bir cihaz değil, token alınamaz.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Bildirim izni verilmedi, durum:', finalStatus);
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Varsayilan',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#059669',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: getProjectId(),
    });
    return tokenData.data;
  } catch (err) {
    console.error('[Push] Token alınamadı:', err);
    return null;
  }
}

export async function registerForPushNotifications(memberId: string): Promise<string | null> {
  const token = await requestAndGetToken();
  if (!token) return null;

  await linkTokenToMember(memberId, token);
  return token;
}

export async function registerGuestDeviceToken(): Promise<string | null> {
  const token = await requestAndGetToken();
  if (!token) return null;

  await saveGuestToken(token);
  return token;
}

async function saveGuestToken(token: string): Promise<void> {
  const platform = Platform.OS as 'ios' | 'android';
  const deviceName = getDeviceName();

  const { error } = await supabase.rpc('upsert_device_token', {
    p_token: token,
    p_platform: platform,
    p_member_id: null,
    p_is_guest: true,
    p_device_name: deviceName,
  });

  if (error) {
    console.error('[Push] Guest token kaydetme hatası:', error);
  }
}

async function linkTokenToMember(memberId: string, token: string): Promise<void> {
  const platform = Platform.OS as 'ios' | 'android';
  const deviceName = getDeviceName();

  const { error } = await supabase.rpc('upsert_device_token', {
    p_token: token,
    p_platform: platform,
    p_member_id: memberId,
    p_is_guest: false,
    p_device_name: deviceName,
  });

  if (error) {
    console.error('[Push] Member token kaydetme hatası:', error);
  }
}

export async function deactivateDeviceToken(memberId: string): Promise<void> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: getProjectId(),
    });
    await supabase
      .from('device_tokens')
      .update({ is_active: false, member_id: null, is_guest: true })
      .eq('token', tokenData.data);
  } catch {
    // Token alınamazsa zaten pasif sayılır
  }
}

export function registerNotificationListeners(
  onNotification: (notification: Notifications.Notification) => void,
  onResponse: (response: Notifications.NotificationResponse) => void
) {
  const notifSub = Notifications.addNotificationReceivedListener(onNotification);
  const responseSub = Notifications.addNotificationResponseReceivedListener(onResponse);
  return () => {
    notifSub.remove();
    responseSub.remove();
  };
}

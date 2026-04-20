import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
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

async function requestAndGetToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Varsayilan',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#059669',
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
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
    console.error('Guest device token kaydetme hatasi:', error);
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
    console.error('Device token kaydetme hatasi:', error);
  }
}

export async function deactivateDeviceToken(memberId: string): Promise<void> {
  const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
  if (!tokenData) return;

  await supabase
    .from('device_tokens')
    .update({ is_active: false, member_id: null, is_guest: true })
    .eq('token', tokenData.data);
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

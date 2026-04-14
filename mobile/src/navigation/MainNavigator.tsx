import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useDrawer } from '../contexts/DrawerContext';

import HomeScreen from '../screens/main/HomeScreen';
import AnnouncementsScreen from '../screens/main/AnnouncementsScreen';
import AnnouncementDetailScreen from '../screens/main/AnnouncementDetailScreen';
import EventsScreen from '../screens/main/EventsScreen';
import EventDetailScreen from '../screens/main/EventDetailScreen';
import DuesScreen from '../screens/main/DuesScreen';
import GalleryScreen from '../screens/main/GalleryScreen';
import GalleryDetailScreen from '../screens/main/GalleryDetailScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import MembersScreen from '../screens/main/MembersScreen';
import MemberDetailScreen from '../screens/main/MemberDetailScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import PharmacyScreen from '../screens/main/PharmacyScreen';
import ContactScreen from '../screens/main/ContactScreen';
import WhatsAppScreen from '../screens/main/WhatsAppScreen';
import TreasuryScreen from '../screens/main/TreasuryScreen';
import DuesAdminScreen from '../screens/main/DuesAdminScreen';
import DrawerMenu from '../components/DrawerMenu';

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopColor: '#f3f4f6',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  menuBtn: {
    marginLeft: 16,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function MenuButton() {
  const { openDrawer } = useDrawer();
  return (
    <TouchableOpacity style={styles.menuBtn} onPress={openDrawer}>
      <Ionicons name="menu" size={22} color="#fff" />
    </TouchableOpacity>
  );
}

const sharedHeaderOptions = {
  headerStyle: { backgroundColor: '#b91c1c' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' as const },
  headerLeft: () => <MenuButton />,
};

const sharedTabOptions = {
  tabBarStyle: styles.tabBar,
  tabBarActiveTintColor: '#b91c1c',
  tabBarInactiveTintColor: '#9ca3af',
  tabBarLabelStyle: styles.tabLabel,
};

const tabBarIcon = (routeName: string, focused: boolean, color: string, size: number) => {
  const icons: Record<string, [string, string]> = {
    HomeTab: ['home', 'home-outline'],
    AnnouncementsTab: ['megaphone', 'megaphone-outline'],
    EventsTab: ['calendar', 'calendar-outline'],
    DuesTab: ['wallet', 'wallet-outline'],
    MembersTab: ['people', 'people-outline'],
    NotificationsTab: ['notifications', 'notifications-outline'],
    ProfileTab: ['person', 'person-outline'],
    AuthTab: ['log-in', 'log-in-outline'],
  };
  const [activeIcon, inactiveIcon] = icons[routeName] || ['ellipse', 'ellipse-outline'];
  return <Ionicons name={(focused ? activeIcon : inactiveIcon) as any} size={size} color={color} />;
};

type HomeStackParamList = {
  HomeMain: undefined;
  Pharmacy: undefined;
  Contact: undefined;
  WhatsApp: undefined;
  GalleryList: undefined;
  GalleryDetail: { galleryId: string; title: string };
  Treasury: undefined;
  DuesAdmin: undefined;
};

type AnnouncementsStackParamList = {
  AnnouncementsMain: undefined;
  AnnouncementDetail: { id: string };
};

type EventsStackParamList = {
  EventsMain: undefined;
  EventDetail: { id: string };
};

type MembersStackParamList = {
  MembersMain: undefined;
  MemberDetail: { memberId: string };
};

type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const AnnouncementsStack = createNativeStackNavigator<AnnouncementsStackParamList>();
const EventsStack = createNativeStackNavigator<EventsStackParamList>();
const MembersStack = createNativeStackNavigator<MembersStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const GuestTab = createBottomTabNavigator();
const MemberTab = createBottomTabNavigator();

const HOME_STACK_SCREENS: Record<string, boolean> = {
  Pharmacy: true,
  Contact: true,
  WhatsApp: true,
  Gallery: true,
  Treasury: true,
  DuesAdmin: true,
};

function HomeMainWrapper({ navigation }: { navigation: any }) {
  const { pendingNavigation, clearPendingNavigation } = useDrawer();

  useEffect(() => {
    if (!pendingNavigation) return;
    if (HOME_STACK_SCREENS[pendingNavigation]) {
      const screenName = pendingNavigation === 'Gallery' ? 'GalleryList' : pendingNavigation;
      clearPendingNavigation();
      navigation.navigate(screenName);
    }
  }, [pendingNavigation, clearPendingNavigation, navigation]);

  return <HomeScreen navigation={navigation} />;
}

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ ...sharedHeaderOptions }}>
      <HomeStack.Screen name="HomeMain" component={HomeMainWrapper} options={{ title: 'Ana Sayfa' }} />
      <HomeStack.Screen name="GalleryList" component={GalleryScreen} options={{ title: 'Galeri', headerLeft: undefined }} />
      <HomeStack.Screen name="GalleryDetail" component={GalleryDetailScreen} options={({ route }) => ({ title: route.params.title, headerLeft: undefined })} />
      <HomeStack.Screen name="Pharmacy" component={PharmacyScreen} options={{ title: 'Nöbetçi Eczane', headerLeft: undefined }} />
      <HomeStack.Screen name="Contact" component={ContactScreen} options={{ title: 'İletişim', headerLeft: undefined }} />
      <HomeStack.Screen name="WhatsApp" component={WhatsAppScreen} options={{ title: 'WhatsApp', headerLeft: undefined }} />
      <HomeStack.Screen name="Treasury" component={TreasuryScreen} options={{ title: 'Kasa Yönetimi', headerLeft: undefined }} />
      <HomeStack.Screen name="DuesAdmin" component={DuesAdminScreen} options={{ title: 'Aidat Yönetimi', headerLeft: undefined }} />
    </HomeStack.Navigator>
  );
}

function AnnouncementsStackNavigator() {
  return (
    <AnnouncementsStack.Navigator screenOptions={{ ...sharedHeaderOptions }}>
      <AnnouncementsStack.Screen name="AnnouncementsMain" component={AnnouncementsScreen} options={{ title: 'Duyurular' }} />
      <AnnouncementsStack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} options={{ title: 'Duyuru Detayı', headerLeft: undefined }} />
    </AnnouncementsStack.Navigator>
  );
}

function EventsStackNavigator() {
  return (
    <EventsStack.Navigator screenOptions={{ ...sharedHeaderOptions }}>
      <EventsStack.Screen name="EventsMain" component={EventsScreen} options={{ title: 'Etkinlikler' }} />
      <EventsStack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Etkinlik Detayı', headerLeft: undefined }} />
    </EventsStack.Navigator>
  );
}

function MembersStackNavigator() {
  return (
    <MembersStack.Navigator screenOptions={{ ...sharedHeaderOptions }}>
      <MembersStack.Screen name="MembersMain" component={MembersScreen} options={{ title: 'Üyeler' }} />
      <MembersStack.Screen name="MemberDetail" component={MemberDetailScreen} options={{ title: 'Üye Detayı', headerLeft: undefined }} />
    </MembersStack.Navigator>
  );
}

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

const TAB_SCREEN_MAP: Record<string, string> = {
  Home: 'HomeTab',
  Announcements: 'AnnouncementsTab',
  Events: 'EventsTab',
  Dues: 'DuesTab',
  Members: 'MembersTab',
  Notifications: 'NotificationsTab',
  Profile: 'ProfileTab',
  Login: 'AuthTab',
};

function GuestNavigatorInner() {
  const { pendingNavigation, clearPendingNavigation } = useDrawer();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!pendingNavigation) return;
    if (HOME_STACK_SCREENS[pendingNavigation]) {
      try { navigation.navigate('HomeTab'); } catch {}
      return;
    }
    const tabName = TAB_SCREEN_MAP[pendingNavigation];
    if (tabName) {
      clearPendingNavigation();
      try { navigation.navigate(tabName); } catch {}
    }
  }, [pendingNavigation, clearPendingNavigation, navigation]);

  return (
    <GuestTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        ...sharedTabOptions,
        tabBarIcon: ({ focused, color, size }) => tabBarIcon(route.name, focused, color, size),
      })}
    >
      <GuestTab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: 'Ana Sayfa' }} />
      <GuestTab.Screen name="AnnouncementsTab" component={AnnouncementsStackNavigator} options={{ title: 'Duyurular' }} />
      <GuestTab.Screen name="EventsTab" component={EventsStackNavigator} options={{ title: 'Etkinlikler' }} />
      <GuestTab.Screen name="MembersTab" component={MembersStackNavigator} options={{ title: 'Üyeler' }} />
      <GuestTab.Screen
        name="NotificationsTab"
        options={{
          title: 'Bildirimler',
          headerShown: true,
          ...sharedHeaderOptions,
        }}
      >
        {() => <NotificationsScreen navigation={undefined} />}
      </GuestTab.Screen>
      <GuestTab.Screen name="AuthTab" component={AuthStackNavigator} options={{ title: 'Giriş Yap' }} />
    </GuestTab.Navigator>
  );
}

function MemberNavigatorInner() {
  const { pendingNavigation, clearPendingNavigation } = useDrawer();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!pendingNavigation) return;
    if (HOME_STACK_SCREENS[pendingNavigation]) {
      try { navigation.navigate('HomeTab'); } catch {}
      return;
    }
    const tabName = TAB_SCREEN_MAP[pendingNavigation];
    if (tabName) {
      clearPendingNavigation();
      try { navigation.navigate(tabName); } catch {}
    }
  }, [pendingNavigation, clearPendingNavigation, navigation]);

  return (
    <MemberTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        ...sharedTabOptions,
        tabBarIcon: ({ focused, color, size }) => tabBarIcon(route.name, focused, color, size),
      })}
    >
      <MemberTab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: 'Ana Sayfa' }} />
      <MemberTab.Screen name="AnnouncementsTab" component={AnnouncementsStackNavigator} options={{ title: 'Duyurular' }} />
      <MemberTab.Screen name="EventsTab" component={EventsStackNavigator} options={{ title: 'Etkinlikler' }} />
      <MemberTab.Screen
        name="DuesTab"
        options={{ title: 'Aidat', headerShown: true, ...sharedHeaderOptions }}
      >
        {() => <DuesScreen />}
      </MemberTab.Screen>
      <MemberTab.Screen name="MembersTab" component={MembersStackNavigator} options={{ title: 'Üyeler' }} />
      <MemberTab.Screen
        name="NotificationsTab"
        options={{ title: 'Bildirimler', headerShown: true, ...sharedHeaderOptions }}
      >
        {() => <NotificationsScreen navigation={undefined} />}
      </MemberTab.Screen>
      <MemberTab.Screen
        name="ProfileTab"
        options={{ title: 'Profilim', headerShown: true, ...sharedHeaderOptions }}
      >
        {() => <ProfileScreen />}
      </MemberTab.Screen>
    </MemberTab.Navigator>
  );
}

export default function MainNavigator() {
  const { user } = useAuth();

  return (
    <View style={{ flex: 1 }}>
      {user ? <MemberNavigatorInner /> : <GuestNavigatorInner />}
      <DrawerMenu />
    </View>
  );
}

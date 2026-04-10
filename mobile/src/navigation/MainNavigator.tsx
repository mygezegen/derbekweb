import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

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

export type HomeStackParamList = {
  Home: undefined;
  GalleryList: undefined;
  GalleryDetail: { galleryId: string; title: string };
};

export type AnnouncementsStackParamList = {
  Announcements: undefined;
  AnnouncementDetail: { id: string };
};

export type EventsStackParamList = {
  Events: undefined;
  EventDetail: { id: string };
};

export type MembersStackParamList = {
  Members: undefined;
  MemberDetail: { memberId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

export type GuestTabParamList = {
  HomeTab: undefined;
  AnnouncementsTab: undefined;
  EventsTab: undefined;
  MembersTab: undefined;
  AuthTab: undefined;
};

export type MemberTabParamList = {
  HomeTab: undefined;
  AnnouncementsTab: undefined;
  EventsTab: undefined;
  DuesTab: undefined;
  MembersTab: undefined;
  ProfileTab: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const AnnouncementsStack = createNativeStackNavigator<AnnouncementsStackParamList>();
const EventsStack = createNativeStackNavigator<EventsStackParamList>();
const MembersStack = createNativeStackNavigator<MembersStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const GuestTab = createBottomTabNavigator<GuestTabParamList>();
const MemberTab = createBottomTabNavigator<MemberTabParamList>();

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
});

const stackHeaderOptions = {
  headerStyle: { backgroundColor: '#b91c1c' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' as const },
};

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackHeaderOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ title: 'Ana Sayfa' }} />
      <HomeStack.Screen name="GalleryList" component={GalleryScreen} options={{ title: 'Galeri' }} />
      <HomeStack.Screen name="GalleryDetail" component={GalleryDetailScreen} options={({ route }) => ({ title: route.params.title })} />
    </HomeStack.Navigator>
  );
}

function AnnouncementsStackNavigator() {
  return (
    <AnnouncementsStack.Navigator screenOptions={stackHeaderOptions}>
      <AnnouncementsStack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Duyurular' }} />
      <AnnouncementsStack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} options={{ title: 'Duyuru Detayı' }} />
    </AnnouncementsStack.Navigator>
  );
}

function EventsStackNavigator() {
  return (
    <EventsStack.Navigator screenOptions={stackHeaderOptions}>
      <EventsStack.Screen name="Events" component={EventsScreen} options={{ title: 'Etkinlikler' }} />
      <EventsStack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Etkinlik Detayı' }} />
    </EventsStack.Navigator>
  );
}

function MembersStackNavigator() {
  return (
    <MembersStack.Navigator screenOptions={stackHeaderOptions}>
      <MembersStack.Screen name="Members" component={MembersScreen} options={{ title: 'Üyeler' }} />
      <MembersStack.Screen name="MemberDetail" component={MemberDetailScreen} options={{ title: 'Üye Detayı' }} />
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

const tabBarIcon = (routeName: string, focused: boolean, color: string, size: number) => {
  let iconName: any;
  if (routeName === 'HomeTab') iconName = focused ? 'home' : 'home-outline';
  else if (routeName === 'AnnouncementsTab') iconName = focused ? 'megaphone' : 'megaphone-outline';
  else if (routeName === 'EventsTab') iconName = focused ? 'calendar' : 'calendar-outline';
  else if (routeName === 'DuesTab') iconName = focused ? 'wallet' : 'wallet-outline';
  else if (routeName === 'MembersTab') iconName = focused ? 'people' : 'people-outline';
  else if (routeName === 'ProfileTab') iconName = focused ? 'person' : 'person-outline';
  else if (routeName === 'AuthTab') iconName = focused ? 'log-in' : 'log-in-outline';
  return <Ionicons name={iconName} size={size} color={color} />;
};

const sharedTabOptions = {
  tabBarStyle: styles.tabBar,
  tabBarActiveTintColor: '#b91c1c',
  tabBarInactiveTintColor: '#9ca3af',
  tabBarLabelStyle: styles.tabLabel,
};

function GuestNavigator() {
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
      <GuestTab.Screen name="AuthTab" component={AuthStackNavigator} options={{ title: 'Giriş Yap' }} />
    </GuestTab.Navigator>
  );
}

function MemberNavigator() {
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
        options={{
          title: 'Aidat',
          headerShown: true,
          headerStyle: { backgroundColor: '#b91c1c' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        {() => <DuesScreen />}
      </MemberTab.Screen>
      <MemberTab.Screen name="MembersTab" component={MembersStackNavigator} options={{ title: 'Üyeler' }} />
      <MemberTab.Screen
        name="ProfileTab"
        options={{
          title: 'Profilim',
          headerShown: true,
          headerStyle: { backgroundColor: '#b91c1c' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        {() => <ProfileScreen />}
      </MemberTab.Screen>
    </MemberTab.Navigator>
  );
}

export default function MainNavigator() {
  const { user } = useAuth();
  return user ? <MemberNavigator /> : <GuestNavigator />;
}

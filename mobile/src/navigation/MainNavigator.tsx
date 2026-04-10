import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

export type MainTabParamList = {
  HomeTab: undefined;
  AnnouncementsTab: undefined;
  EventsTab: undefined;
  DuesTab: undefined;
  MembersTab: undefined;
  ProfileTab: undefined;
};

export type MembersStackParamList = {
  Members: undefined;
  MemberDetail: { memberId: string };
};

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

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const AnnouncementsStack = createNativeStackNavigator<AnnouncementsStackParamList>();
const EventsStack = createNativeStackNavigator<EventsStackParamList>();
const MembersStack = createNativeStackNavigator<MembersStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#b91c1c' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ title: 'Ana Sayfa' }} />
      <HomeStack.Screen name="GalleryList" component={GalleryScreen} options={{ title: 'Galeri' }} />
      <HomeStack.Screen name="GalleryDetail" component={GalleryDetailScreen} options={({ route }) => ({ title: route.params.title })} />
    </HomeStack.Navigator>
  );
}

function AnnouncementsStackNavigator() {
  return (
    <AnnouncementsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#b91c1c' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <AnnouncementsStack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Duyurular' }} />
      <AnnouncementsStack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} options={{ title: 'Duyuru Detayı' }} />
    </AnnouncementsStack.Navigator>
  );
}

function EventsStackNavigator() {
  return (
    <EventsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#b91c1c' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <EventsStack.Screen name="Events" component={EventsScreen} options={{ title: 'Etkinlikler' }} />
      <EventsStack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Etkinlik Detayı' }} />
    </EventsStack.Navigator>
  );
}

function MembersStackNavigator() {
  return (
    <MembersStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#b91c1c' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <MembersStack.Screen name="Members" component={MembersScreen} options={{ title: 'Üyeler' }} />
      <MembersStack.Screen name="MemberDetail" component={MemberDetailScreen} options={{ title: 'Üye Detayı' }} />
    </MembersStack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#b91c1c',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          if (route.name === 'HomeTab') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'AnnouncementsTab') iconName = focused ? 'megaphone' : 'megaphone-outline';
          else if (route.name === 'EventsTab') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'DuesTab') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'MembersTab') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'ProfileTab') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: 'Ana Sayfa' }} />
      <Tab.Screen name="AnnouncementsTab" component={AnnouncementsStackNavigator} options={{ title: 'Duyurular' }} />
      <Tab.Screen name="EventsTab" component={EventsStackNavigator} options={{ title: 'Etkinlikler' }} />
      <Tab.Screen
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
      </Tab.Screen>
      <Tab.Screen name="MembersTab" component={MembersStackNavigator} options={{ title: 'Üyeler' }} />
      <Tab.Screen
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
      </Tab.Screen>
    </Tab.Navigator>
  );
}

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

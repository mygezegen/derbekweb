import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useDrawer } from '../contexts/DrawerContext';
import { useModuleConfig } from '../hooks/useModuleConfig';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);

interface DrawerMenuItem {
  key: string;
  label: string;
  icon: any;
  iconColor?: string;
  screen: string;
  dividerAfter?: boolean;
  requiresAuth?: boolean;
}

const ALL_MEMBER_ITEMS: DrawerMenuItem[] = [
  { key: 'home',          label: 'Ana Sayfa',       icon: 'home-outline',          screen: 'Home' },
  { key: 'announcements', label: 'Duyurular',        icon: 'megaphone-outline',     screen: 'Announcements' },
  { key: 'events',        label: 'Etkinlikler',      icon: 'calendar-outline',      screen: 'Events' },
  { key: 'dues',          label: 'Aidatlarım',       icon: 'wallet-outline',        screen: 'Dues', dividerAfter: true },
  { key: 'gallery',       label: 'Galeri',           icon: 'images-outline',        screen: 'Gallery' },
  { key: 'members',       label: 'Üyeler',           icon: 'people-outline',        screen: 'Members' },
  { key: 'surveys',       label: 'Anketler',          icon: 'clipboard-outline',     screen: 'Surveys', dividerAfter: true },
  { key: 'pharmacy',      label: 'Nöbetçi Eczane',  icon: 'medkit-outline',        iconColor: '#16a34a', screen: 'Pharmacy' },
  { key: 'contact',       label: 'İletişim',         icon: 'call-outline',          iconColor: '#2563eb', screen: 'Contact' },
  { key: 'whatsapp',      label: 'WhatsApp',         icon: 'logo-whatsapp',         iconColor: '#16a34a', screen: 'WhatsApp', dividerAfter: true },
  { key: 'treasury',      label: 'Kasa Yönetimi',   icon: 'cash-outline',          iconColor: '#15803d', screen: 'Treasury' },
  { key: 'dues_admin',    label: 'Aidat Yönetimi',  icon: 'receipt-outline',       iconColor: '#1d4ed8', screen: 'DuesAdmin', dividerAfter: true },
  { key: 'notifications', label: 'Bildirimler',      icon: 'notifications-outline', screen: 'Notifications' },
  { key: 'profile',       label: 'Profilim',         icon: 'person-outline',        screen: 'Profile' },
];

const GUEST_ITEMS: DrawerMenuItem[] = [
  { key: 'home',          label: 'Ana Sayfa',       icon: 'home-outline',      screen: 'Home' },
  { key: 'announcements', label: 'Duyurular',        icon: 'megaphone-outline', screen: 'Announcements', dividerAfter: true },
  { key: 'events',        label: 'Etkinlikler',      icon: 'calendar-outline',  screen: 'Events' },
  { key: 'gallery',       label: 'Galeri',           icon: 'images-outline',    screen: 'Gallery' },
  { key: 'surveys',       label: 'Anketler',          icon: 'clipboard-outline', screen: 'Surveys', dividerAfter: true },
  { key: 'pharmacy',      label: 'Nöbetçi Eczane',  icon: 'medkit-outline',    iconColor: '#16a34a', screen: 'Pharmacy' },
  { key: 'contact',       label: 'İletişim',         icon: 'call-outline',      iconColor: '#2563eb', screen: 'Contact' },
  { key: 'whatsapp',      label: 'WhatsApp',         icon: 'logo-whatsapp',     iconColor: '#16a34a', screen: 'WhatsApp', dividerAfter: true },
  { key: 'login',         label: 'Giriş Yap',        icon: 'log-in-outline',    iconColor: '#b91c1c', screen: 'Login' },
];

export default function DrawerMenu() {
  const { member, user, signOut } = useAuth();
  const { isOpen, closeDrawer, navigateTo } = useDrawer();
  const { isModuleEnabled } = useModuleConfig();

  const slideAnim = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -DRAWER_WIDTH,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, overlayAnim]);

  const initials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').filter(n => n).slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  const menuItems = user
    ? ALL_MEMBER_ITEMS.filter(item => isModuleEnabled(item.key))
    : GUEST_ITEMS.filter(item => item.key === 'login' || isModuleEnabled(item.key));

  return (
    <Modal
      transparent
      visible={isOpen}
      onRequestClose={closeDrawer}
      statusBarTranslucent
      animationType="none"
    >
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeDrawer} activeOpacity={1} />
        </Animated.View>

        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          <LinearGradient colors={['#b91c1c', '#7f1d1d']} style={styles.drawerHeader}>
            <StatusBar barStyle="light-content" />
            <TouchableOpacity style={styles.closeBtn} onPress={closeDrawer}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            {user && member ? (
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(member.full_name)}</Text>
                </View>
                <Text style={styles.userName}>{member.full_name || 'Üye'}</Text>
                <Text style={styles.userEmail} numberOfLines={1}>{member.email}</Text>
                <View style={styles.roleBadge}>
                  <Ionicons
                    name={member.is_root ? 'shield' : member.is_admin ? 'shield-checkmark' : 'person'}
                    size={11}
                    color="#fff"
                  />
                  <Text style={styles.roleText}>
                    {member.is_root ? 'Root Yönetici' : member.is_admin ? 'Yönetici' : 'Üye'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.guestInfo}>
                <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Ionicons name="person-outline" size={28} color="#fff" />
                </View>
                <Text style={styles.userName}>Hoş Geldiniz</Text>
                <Text style={styles.userEmail}>Üye girişi yapın</Text>
              </View>
            )}
          </LinearGradient>

          <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
            {menuItems.map((item) => (
              <React.Fragment key={item.key}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => navigateTo(item.screen)}
                  activeOpacity={0.65}
                >
                  <View style={[styles.menuIconBg, item.iconColor ? { backgroundColor: item.iconColor + '18' } : {}]}>
                    <Ionicons name={item.icon} size={20} color={item.iconColor || '#374151'} />
                  </View>
                  <Text style={[styles.menuLabel, item.iconColor ? { color: item.iconColor } : {}]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={15} color="#d1d5db" />
                </TouchableOpacity>
                {item.dividerAfter && <View style={styles.divider} />}
              </React.Fragment>
            ))}

            {user && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={[styles.menuItem, { marginBottom: 12 }]}
                  onPress={() => { closeDrawer(); signOut(); }}
                  activeOpacity={0.65}
                >
                  <View style={[styles.menuIconBg, { backgroundColor: '#fee2e2' }]}>
                    <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                  </View>
                  <Text style={[styles.menuLabel, { color: '#dc2626' }]}>Çıkış Yap</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>

          <View style={styles.drawerFooter}>
            <Text style={styles.footerText}>Dernek Yönetim Sistemi</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerHeader: {
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: { alignItems: 'flex-start', gap: 4, marginTop: 8 },
  guestInfo: { alignItems: 'flex-start', gap: 4, marginTop: 8 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 17, fontWeight: '800', color: '#fff' },
  userEmail: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
  },
  roleText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  menuList: { flex: 1, paddingTop: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  menuIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1f2937' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16, marginVertical: 4 },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingVertical: 14,
    alignItems: 'center',
  },
  footerText: { fontSize: 11, color: '#9ca3af' },
});

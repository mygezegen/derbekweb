import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { ContactInfo, ManagementInfo } from '../../types';

interface BankAccount {
  bank_name: string;
  iban: string;
  account_holder: string;
  account_no?: string;
}

interface ContactInfoExtended extends ContactInfo {
  bank_accounts?: BankAccount[];
}

export default function ContactScreen() {
  const [contact, setContact] = useState<ContactInfoExtended | null>(null);
  const [management, setManagement] = useState<ManagementInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from('contact_info').select('*').maybeSingle(),
      supabase
        .from('management_info')
        .select('*, members(full_name, email, phone, profession)')
        .eq('is_active', true)
        .order('display_order'),
    ]);
    setContact(c as ContactInfoExtended | null);
    setManagement((m || []) as ManagementInfo[]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);

  const openPhone = (phone: string) => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  const openEmail = (email: string) => Linking.openURL(`mailto:${email}`);
  const openWhatsApp = (number: string) => Linking.openURL(`https://wa.me/${number.replace(/\D/g, '')}`);
  const openURL = (url: string) => {
    if (!url.startsWith('http')) url = `https://${url}`;
    Linking.openURL(url);
  };

  const socialIcons: Record<string, { icon: any; color: string; label: string }> = {
    youtube: { icon: 'logo-youtube', color: '#dc2626', label: 'YouTube' },
    instagram: { icon: 'logo-instagram', color: '#e1306c', label: 'Instagram' },
    facebook: { icon: 'logo-facebook', color: '#1877f2', label: 'Facebook' },
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#b91c1c" />
      </View>
    );
  }

  const initials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').filter(n => n).slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#b91c1c" />}
    >
      <LinearGradient colors={['#b91c1c', '#7f1d1d']} style={styles.hero}>
        <Ionicons name="business" size={32} color="rgba(255,255,255,0.8)" />
        <Text style={styles.heroTitle}>İletişim</Text>
        <Text style={styles.heroSubtitle}>Bizimle iletişime geçin</Text>
      </LinearGradient>

      {contact && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>

          {contact.phone && (
            <TouchableOpacity style={styles.contactItem} onPress={() => openPhone(contact.phone!)}>
              <View style={[styles.iconBg, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="call" size={20} color="#2563eb" />
              </View>
              <View style={styles.contactItemText}>
                <Text style={styles.contactLabel}>Telefon</Text>
                <Text style={styles.contactValue}>{contact.phone}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}

          {contact.whatsapp_number && (
            <TouchableOpacity style={styles.contactItem} onPress={() => openWhatsApp(contact.whatsapp_number!)}>
              <View style={[styles.iconBg, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="logo-whatsapp" size={20} color="#16a34a" />
              </View>
              <View style={styles.contactItemText}>
                <Text style={styles.contactLabel}>WhatsApp</Text>
                <Text style={styles.contactValue}>{contact.whatsapp_number}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}

          {contact.email && (
            <TouchableOpacity style={styles.contactItem} onPress={() => openEmail(contact.email!)}>
              <View style={[styles.iconBg, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="mail" size={20} color="#d97706" />
              </View>
              <View style={styles.contactItemText}>
                <Text style={styles.contactLabel}>E-posta</Text>
                <Text style={styles.contactValue}>{contact.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}

          {contact.address && (
            <View style={styles.contactItem}>
              <View style={[styles.iconBg, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="location" size={20} color="#dc2626" />
              </View>
              <View style={styles.contactItemText}>
                <Text style={styles.contactLabel}>Adres</Text>
                <Text style={styles.contactValue}>{contact.address}</Text>
              </View>
            </View>
          )}

          {contact.social_media && Object.keys(contact.social_media).length > 0 && (
            <View style={styles.socialRow}>
              {Object.entries(contact.social_media).map(([key, url]) => {
                const s = socialIcons[key];
                if (!s || !url) return null;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.socialBtn, { backgroundColor: s.color + '15', borderColor: s.color + '30' }]}
                    onPress={() => openURL(url)}
                  >
                    <Ionicons name={s.icon} size={22} color={s.color} />
                    <Text style={[styles.socialLabel, { color: s.color }]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {contact?.bank_accounts && contact.bank_accounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Banka Hesap Bilgileri</Text>
          {contact.bank_accounts.map((bank, i) => (
            <View key={i} style={styles.bankCard}>
              <View style={styles.bankHeader}>
                <Ionicons name="card" size={18} color="#b91c1c" />
                <Text style={styles.bankName}>{bank.bank_name}</Text>
              </View>
              <View style={styles.bankDetail}>
                <Text style={styles.bankLabel}>Hesap Sahibi</Text>
                <Text style={styles.bankValue}>{bank.account_holder}</Text>
              </View>
              <View style={styles.bankDetail}>
                <Text style={styles.bankLabel}>IBAN</Text>
                <Text style={styles.ibanValue}>{bank.iban}</Text>
              </View>
              {bank.account_no && (
                <View style={styles.bankDetail}>
                  <Text style={styles.bankLabel}>Hesap No</Text>
                  <Text style={styles.bankValue}>{bank.account_no}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {management.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yönetim Kurulu</Text>
          {management.map((m) => (
            <View key={m.id} style={styles.boardCard}>
              <View style={styles.boardAvatar}>
                <Text style={styles.boardAvatarText}>{initials(m.members?.full_name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.boardName}>{m.members?.full_name || 'İsimsiz'}</Text>
                <Text style={styles.boardPosition}>{m.position}</Text>
                {m.members?.phone && (
                  <TouchableOpacity style={styles.boardPhone} onPress={() => openPhone(m.members!.phone!)}>
                    <Ionicons name="call-outline" size={13} color="#6b7280" />
                    <Text style={styles.boardPhoneText}>{m.members.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 36,
    gap: 8,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  iconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactItemText: { flex: 1 },
  contactLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500', marginBottom: 1 },
  contactValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  socialRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 12 },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  socialLabel: { fontSize: 13, fontWeight: '600' },
  bankCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    backgroundColor: '#fafafa',
    padding: 14,
    marginBottom: 10,
  },
  bankHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  bankName: { fontSize: 15, fontWeight: '700', color: '#b91c1c' },
  bankDetail: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  bankLabel: { fontSize: 13, color: '#6b7280' },
  bankValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  ibanValue: { fontSize: 13, fontWeight: '700', color: '#111827', fontVariant: ['tabular-nums'] },
  boardCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  boardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fca5a5',
  },
  boardAvatarText: { fontSize: 18, fontWeight: '700', color: '#b91c1c' },
  boardName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  boardPosition: { fontSize: 13, color: '#b91c1c', fontWeight: '600', marginTop: 2 },
  boardPhone: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  boardPhoneText: { fontSize: 13, color: '#6b7280' },
});

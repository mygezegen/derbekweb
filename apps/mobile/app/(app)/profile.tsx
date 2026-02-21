import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import type { Member } from '@dernek/core';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('members').select('*').eq('auth_id', user.id).maybeSingle();
      setMember(data);
      setLoading(false);
    })();
  }, []);

  async function handleLogout() {
    Alert.alert('Çıkış', 'Çıkış yapmak istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => { await supabase.auth.signOut(); },
      },
    ]);
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#1e40af" /></View>;

  function InfoRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    );
  }

  const initials = member?.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{member?.full_name}</Text>
        <View style={[styles.roleBadge, member?.is_admin && styles.roleBadgeAdmin]}>
          <Text style={styles.roleText}>
            {member?.is_root ? 'Root Yönetici' : member?.is_admin ? 'Yönetici' : 'Üye'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
        <InfoRow label="E-posta" value={member?.email} />
        <InfoRow label="Telefon" value={member?.phone} />
        <InfoRow label="Adres" value={member?.address} />
        <InfoRow label="Meslek" value={member?.profession} />
        <InfoRow label="İl" value={member?.province} />
        <InfoRow label="İlçe" value={member?.district} />
      </View>

      {(member?.registry_number || member?.member_type) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Üyelik Bilgileri</Text>
          <InfoRow label="Sicil No" value={member?.registry_number} />
          <InfoRow label="Üyelik Tipi" value={member?.member_type} />
          <InfoRow label="Kayıt Tarihi" value={member?.registration_date ? new Date(member.registration_date).toLocaleDateString('tr-TR') : null} />
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    alignItems: 'center', backgroundColor: '#1e40af',
    paddingTop: 56, paddingBottom: 32, paddingHorizontal: 20,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  roleBadgeAdmin: { backgroundColor: '#fbbf24' },
  roleText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  section: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, letterSpacing: 0.5 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  infoLabel: { fontSize: 14, color: '#64748b', flex: 1 },
  infoValue: { fontSize: 14, color: '#1e293b', fontWeight: '500', flex: 2, textAlign: 'right' },
  logoutButton: {
    margin: 16, backgroundColor: '#fee2e2', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  logoutText: { color: '#dc2626', fontSize: 15, fontWeight: '700' },
});

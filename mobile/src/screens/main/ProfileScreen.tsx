import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface DuesWithDues {
  id: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_amount: number;
  paid_at?: string;
  dues?: {
    title: string;
    amount: number;
    period_month: number;
    period_year: number;
    due_date: string;
  };
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Erkek',
  female: 'Kadın',
  other: 'Diğer',
};

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const STATUS_CONFIG = {
  paid: { label: 'Ödendi', color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle' as const },
  pending: { label: 'Bekliyor', color: '#d97706', bg: '#fef3c7', icon: 'time' as const },
  overdue: { label: 'Gecikmiş', color: '#dc2626', bg: '#fee2e2', icon: 'alert-circle' as const },
  cancelled: { label: 'İptal', color: '#9ca3af', bg: '#f3f4f6', icon: 'close-circle' as const },
};

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { member, signOut, refreshMember } = useAuth();
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(member?.phone || '');
  const [address, setAddress] = useState(member?.address || '');
  const [saving, setSaving] = useState(false);

  const [dues, setDues] = useState<DuesWithDues[]>([]);
  const [duesLoading, setDuesLoading] = useState(true);
  const [debtSummary, setDebtSummary] = useState({
    totalDebt: 0,
    overdueDebt: 0,
    pendingDebt: 0,
    paidTotal: 0,
  });

  const loadDues = useCallback(async () => {
    if (!member) return;
    const { data } = await supabase
      .from('member_dues')
      .select('id, status, paid_amount, paid_at, dues:dues_id(title, amount, period_month, period_year, due_date)')
      .eq('member_id', member.id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    const items = (data || []) as DuesWithDues[];
    setDues(items.slice(0, 5));

    const summary = items.reduce((acc, d) => {
      const amount = d.dues?.amount || 0;
      const paid = d.paid_amount || 0;
      const remaining = amount - paid;
      if (d.status === 'overdue') acc.overdueDebt += remaining;
      if (d.status === 'pending') acc.pendingDebt += remaining;
      if (d.status === 'paid') acc.paidTotal += paid;
      if (d.status !== 'paid') acc.totalDebt += remaining;
      return acc;
    }, { totalDebt: 0, overdueDebt: 0, pendingDebt: 0, paidTotal: 0 });
    setDebtSummary(summary);
    setDuesLoading(false);
  }, [member]);

  useEffect(() => { loadDues(); }, [loadDues]);

  const handleSave = async () => {
    if (!member) return;
    setSaving(true);
    const { error } = await supabase
      .from('members')
      .update({ phone, address })
      .eq('id', member.id);
    setSaving(false);
    if (error) {
      Alert.alert('Hata', 'Bilgiler kaydedilemedi.');
    } else {
      await refreshMember();
      setEditing(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
    ]);
  };

  if (!member) return null;

  const initials = (member.full_name || '')
    .split(' ')
    .filter(n => n.length > 0)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={['#b91c1c', '#7f1d1d']} style={styles.headerBg}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{member.full_name || ''}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name={member.is_root ? 'shield' : member.is_admin ? 'shield-checkmark' : 'person'} size={12} color="#fff" />
          <Text style={styles.roleText}>{member.is_root ? 'Root Yönetici' : member.is_admin ? 'Yönetici' : 'Üye'}</Text>
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Üyelik Bilgileri</Text>
        </View>
        <InfoRow icon="mail" label="E-posta" value={member.email} />
        {member.registry_number && <InfoRow icon="id-card" label="Sicil No" value={member.registry_number} />}
        {member.member_type && <InfoRow icon="people" label="Üyelik Tipi" value={member.member_type} />}
        {member.gender && <InfoRow icon="person" label="Cinsiyet" value={GENDER_LABELS[member.gender] || member.gender} />}
        {member.profession && <InfoRow icon="briefcase" label="Meslek" value={member.profession} />}
        {member.province && <InfoRow icon="location" label="İl" value={`${member.province}${member.district ? ` / ${member.district}` : ''}`} />}
        <InfoRow
          icon="calendar"
          label="Üyelik Tarihi"
          value={member.joined_at ? new Date(member.joined_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belirtilmemiş'}
        />
        <View style={[styles.infoRow, { alignItems: 'center' }]}>
          <View style={styles.infoIconBg}>
            <Ionicons name="checkmark-circle" size={16} color={member.is_active ? '#16a34a' : '#dc2626'} />
          </View>
          <View>
            <Text style={styles.infoLabel}>Durum</Text>
            <Text style={[styles.infoValue, { color: member.is_active ? '#16a34a' : '#dc2626' }]}>
              {member.is_active ? 'Aktif' : 'Pasif'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
          {!editing && (
            <TouchableOpacity onPress={() => { setPhone(member.phone || ''); setAddress(member.address || ''); setEditing(true); }}>
              <Text style={styles.editLink}>Düzenle</Text>
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefon</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="05XX XXX XX XX"
                keyboardType="phone-pad"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Adres</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholder="Adresinizi girin"
                multiline
                numberOfLines={3}
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.editBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <InfoRow icon="call" label="Telefon" value={member.phone || 'Belirtilmemiş'} />
            <InfoRow icon="location" label="Adres" value={member.address || 'Belirtilmemiş'} />
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="wallet-outline" size={18} color="#b91c1c" />
            <Text style={styles.sectionTitle}>Borç Durumu</Text>
          </View>
        </View>

        {duesLoading ? (
          <ActivityIndicator color="#b91c1c" style={{ marginVertical: 16 }} />
        ) : (
          <>
            <View style={styles.debtGrid}>
              <DebtCard
                label="Toplam Borç"
                amount={debtSummary.totalDebt}
                color={debtSummary.totalDebt > 0 ? '#dc2626' : '#16a34a'}
                icon={debtSummary.totalDebt > 0 ? 'alert-circle' : 'checkmark-circle'}
              />
              <DebtCard label="Gecikmiş" amount={debtSummary.overdueDebt} color="#dc2626" icon="time" />
              <DebtCard label="Bekliyor" amount={debtSummary.pendingDebt} color="#d97706" icon="hourglass" />
              <DebtCard label="Ödendi" amount={debtSummary.paidTotal} color="#16a34a" icon="checkmark-circle" />
            </View>

            {debtSummary.totalDebt === 0 && (
              <View style={styles.noDeptBox}>
                <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
                <Text style={styles.noDebtText}>Tüm aidatlarınız ödenmiş!</Text>
              </View>
            )}

            {dues.length > 0 && (
              <>
                <Text style={styles.recentLabel}>Son Aidat Hareketleri</Text>
                {dues.map((d) => {
                  const config = STATUS_CONFIG[d.status] || STATUS_CONFIG.pending;
                  const month = d.dues?.period_month ? MONTHS_TR[d.dues.period_month - 1] : '';
                  return (
                    <View key={d.id} style={styles.duesRow}>
                      <View style={[styles.duesStatusDot, { backgroundColor: config.bg }]}>
                        <Ionicons name={config.icon} size={14} color={config.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.duesTitle}>{d.dues?.title}</Text>
                        {(month || d.dues?.period_year) && (
                          <Text style={styles.duesPeriod}>{month} {d.dues?.period_year}</Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.duesStatus, { color: config.color }]}>{config.label}</Text>
                        <Text style={styles.duesAmount}>{(d.dues?.amount ?? 0).toFixed(0)} TL</Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteAccountBtn}
        onPress={() => navigation.navigate('DeleteAccount')}
      >
        <Ionicons name="trash-outline" size={15} color="#9ca3af" />
        <Text style={styles.deleteAccountText}>Hesabımı silmek istiyorum</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBg}>
        <Ionicons name={`${icon}-outline` as any} size={16} color="#6b7280" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function DebtCard({ label, amount, color, icon }: { label: string; amount: number; color: string; icon: any }) {
  return (
    <View style={[styles.debtCard, { borderTopColor: color }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.debtAmount}>{amount.toFixed(0)} TL</Text>
      <Text style={styles.debtLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingBottom: 40 },
  headerBg: { alignItems: 'center', paddingTop: 32, paddingBottom: 32, paddingHorizontal: 24 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  roleText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  section: {
    backgroundColor: '#fff', borderRadius: 16, margin: 16, marginBottom: 0, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  editLink: { fontSize: 13, color: '#b91c1c', fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, gap: 12 },
  infoIconBg: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500', marginBottom: 1 },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  editForm: {},
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  editBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#b91c1c', alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  debtGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  debtCard: {
    backgroundColor: '#f9fafb', borderRadius: 12, padding: 12,
    width: '47%', borderTopWidth: 3, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  debtAmount: { fontSize: 17, fontWeight: '800', color: '#111827' },
  debtLabel: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  noDeptBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 8,
  },
  noDebtText: { fontSize: 14, fontWeight: '600', color: '#16a34a' },
  recentLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 4 },
  duesRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  duesStatusDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  duesTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  duesPeriod: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  duesStatus: { fontSize: 12, fontWeight: '700' },
  duesAmount: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: 16, marginTop: 20, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#fee2e2',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#dc2626' },
  deleteAccountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 16, marginTop: 8, marginBottom: 16, paddingVertical: 12,
  },
  deleteAccountText: { fontSize: 13, color: '#9ca3af' },
});

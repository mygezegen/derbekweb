import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Member, MemberDues } from '../../types';

type Props = {
  route: { params: { memberId: string } };
  navigation: any;
};

type DebtItem = MemberDues & {
  dues?: {
    title: string;
    amount: number;
    period_month: number;
    period_year: number;
    due_date: string;
  };
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  paid: { label: 'Ödendi', color: '#059669', bg: '#d1fae5', icon: 'checkmark-circle' },
  pending: { label: 'Bekliyor', color: '#d97706', bg: '#fef3c7', icon: 'time' },
  overdue: { label: 'Gecikmiş', color: '#dc2626', bg: '#fee2e2', icon: 'alert-circle' },
  cancelled: { label: 'İptal', color: '#6b7280', bg: '#f3f4f6', icon: 'close-circle' },
};

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export default function MemberDetailScreen({ route, navigation }: Props) {
  const { memberId } = route.params;
  const [member, setMember] = useState<Member | null>(null);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'debts'>('info');

  const loadData = useCallback(async () => {
    try {
      const [memberRes, debtsRes] = await Promise.all([
        supabase.from('members').select('*').eq('id', memberId).maybeSingle(),
        supabase
          .from('member_dues')
          .select('*, dues(title, amount, period_month, period_year, due_date)')
          .eq('member_id', memberId)
          .order('created_at', { ascending: false }),
      ]);
      setMember(memberRes.data);
      setDebts(debtsRes.data || []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [memberId]);

  useEffect(() => {
    loadData();
    if (member?.full_name) {
      navigation.setOptions({ title: member.full_name });
    }
  }, [loadData]);

  useEffect(() => {
    if (member?.full_name) {
      navigation.setOptions({ title: member.full_name });
    }
  }, [member]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const totalDebt = debts
    .filter(d => d.status === 'pending' || d.status === 'overdue')
    .reduce((sum, d) => sum + ((d.dues?.amount || 0) - (d.paid_amount || 0)), 0);

  const paidCount = debts.filter(d => d.status === 'paid').length;
  const pendingCount = debts.filter(d => d.status === 'pending').length;
  const overdueCount = debts.filter(d => d.status === 'overdue').length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#b91c1c" />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-outline" size={48} color="#d1d5db" />
        <Text style={styles.emptyText}>Üye bulunamadı</Text>
      </View>
    );
  }

  const roleColor = member.is_root ? '#b91c1c' : member.is_admin ? '#f59e0b' : '#10b981';
  const roleLabel = member.is_root ? 'Root' : member.is_admin ? 'Yönetici' : 'Üye';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b91c1c" />}
    >
      <View style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: roleColor + '20', borderColor: roleColor + '40' }]}>
          <Text style={[styles.avatarText, { color: roleColor }]}>{getInitials(member.full_name)}</Text>
        </View>
        <Text style={styles.fullName}>{member.full_name || '-'}</Text>
        <View style={styles.roleRow}>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '15' }]}>
            <Ionicons name={member.is_admin ? 'shield-checkmark' : 'person'} size={13} color={roleColor} />
            <Text style={[styles.roleText, { color: roleColor }]}>{roleLabel}</Text>
          </View>
          {!member.is_active && (
            <View style={[styles.roleBadge, { backgroundColor: '#f3f4f6' }]}>
              <Text style={[styles.roleText, { color: '#6b7280' }]}>Pasif</Text>
            </View>
          )}
        </View>
        {member.registry_number ? (
          <Text style={styles.registry}>Sicil No: #{member.registry_number}</Text>
        ) : null}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.tabActive]}
          onPress={() => setActiveTab('info')}
        >
          <Ionicons name="person-circle-outline" size={16} color={activeTab === 'info' ? '#b91c1c' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Bilgiler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'debts' && styles.tabActive]}
          onPress={() => setActiveTab('debts')}
        >
          <Ionicons name="wallet-outline" size={16} color={activeTab === 'debts' ? '#b91c1c' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'debts' && styles.tabTextActive]}>Aidat Durumu</Text>
          {overdueCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{overdueCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === 'info' ? (
        <View style={styles.section}>
          <InfoRow icon="mail-outline" label="E-posta" value={member.email} onPress={() => Linking.openURL(`mailto:${member.email}`)} />
          <InfoRow icon="call-outline" label="Telefon" value={member.phone} onPress={member.phone ? () => Linking.openURL(`tel:${member.phone}`) : undefined} />
          <InfoRow icon="calendar-outline" label="Kayıt Tarihi" value={formatDate(member.joined_at)} />
          <InfoRow icon="card-outline" label="TC Kimlik" value={member.tc_identity_no ? '••••••••' + member.tc_identity_no.slice(-3) : undefined} />
          <InfoRow icon="briefcase-outline" label="Meslek" value={member.profession} />
          <InfoRow icon="school-outline" label="Eğitim" value={member.education_level} />
          <InfoRow icon="person-outline" label="Cinsiyet" value={member.gender === 'male' ? 'Erkek' : member.gender === 'female' ? 'Kadın' : member.gender === 'other' ? 'Diğer' : undefined} />
          <InfoRow icon="location-outline" label="İl / İlçe" value={[member.province, member.district].filter(Boolean).join(' / ')} />
          <InfoRow icon="home-outline" label="Adres" value={member.address} />
          <InfoRow icon="people-outline" label="Anne Adı" value={member.mother_name} />
          <InfoRow icon="people-outline" label="Baba Adı" value={member.father_name} />
          <InfoRow icon="ribbon-outline" label="Üye Tipi" value={member.member_type} />
          <InfoRow icon="star-outline" label="Unvan" value={member.title} />
        </View>
      ) : (
        <View>
          <View style={styles.debtSummary}>
            <DebtSummaryCard label="Toplam Gecikmiş" value={overdueCount} color="#dc2626" />
            <DebtSummaryCard label="Bekleyen" value={pendingCount} color="#d97706" />
            <DebtSummaryCard label="Ödenen" value={paidCount} color="#059669" />
          </View>

          {totalDebt > 0 && (
            <View style={styles.totalDebtBox}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" />
              <Text style={styles.totalDebtText}>
                Toplam Borç: <Text style={styles.totalDebtAmount}>{totalDebt.toLocaleString('tr-TR')} ₺</Text>
              </Text>
            </View>
          )}

          <View style={styles.section}>
            {debts.length === 0 ? (
              <View style={styles.emptyDebts}>
                <Ionicons name="wallet-outline" size={40} color="#d1d5db" />
                <Text style={styles.emptyText}>Aidat kaydı yok</Text>
              </View>
            ) : (
              debts.map(debt => {
                const cfg = STATUS_CONFIG[debt.status] || STATUS_CONFIG.pending;
                const month = debt.dues?.period_month ? MONTHS[(debt.dues.period_month - 1) % 12] : '';
                const year = debt.dues?.period_year || '';
                const remaining = (debt.dues?.amount || 0) - (debt.paid_amount || 0);
                return (
                  <View key={debt.id} style={styles.debtCard}>
                    <View style={[styles.debtStatusBar, { backgroundColor: cfg.color }]} />
                    <View style={styles.debtContent}>
                      <View style={styles.debtHeader}>
                        <Text style={styles.debtTitle} numberOfLines={1}>{debt.dues?.title || 'Aidat'}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                          <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                      </View>
                      {(month || year) ? (
                        <Text style={styles.debtPeriod}>{month} {year}</Text>
                      ) : null}
                      <View style={styles.debtAmounts}>
                        <View style={styles.debtAmountItem}>
                          <Text style={styles.debtAmountLabel}>Tutar</Text>
                          <Text style={styles.debtAmountValue}>{(debt.dues?.amount || 0).toLocaleString('tr-TR')} ₺</Text>
                        </View>
                        {debt.paid_amount > 0 && (
                          <View style={styles.debtAmountItem}>
                            <Text style={styles.debtAmountLabel}>Ödenen</Text>
                            <Text style={[styles.debtAmountValue, { color: '#059669' }]}>{debt.paid_amount.toLocaleString('tr-TR')} ₺</Text>
                          </View>
                        )}
                        {(debt.status === 'pending' || debt.status === 'overdue') && remaining > 0 && (
                          <View style={styles.debtAmountItem}>
                            <Text style={styles.debtAmountLabel}>Kalan</Text>
                            <Text style={[styles.debtAmountValue, { color: cfg.color }]}>{remaining.toLocaleString('tr-TR')} ₺</Text>
                          </View>
                        )}
                      </View>
                      {debt.dues?.due_date && (
                        <View style={styles.dueDateRow}>
                          <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                          <Text style={styles.dueDate}>Son ödeme: {formatDate(debt.dues.due_date)}</Text>
                        </View>
                      )}
                      {debt.paid_at && (
                        <View style={styles.dueDateRow}>
                          <Ionicons name="checkmark-outline" size={12} color="#059669" />
                          <Text style={[styles.dueDate, { color: '#059669' }]}>Ödeme tarihi: {formatDate(debt.paid_at)}</Text>
                        </View>
                      )}
                      {debt.notes ? (
                        <Text style={styles.debtNotes}>{debt.notes}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, onPress }: { icon: any; label: string; value?: string; onPress?: () => void }) {
  if (!value) return null;
  const Inner = (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconBox}>
        <Ionicons name={icon} size={16} color="#6b7280" />
      </View>
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={[infoStyles.value, onPress && infoStyles.link]}>{value}</Text>
      </View>
      {onPress && <Ionicons name="open-outline" size={14} color="#b91c1c" />}
    </View>
  );
  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{Inner}</TouchableOpacity>;
  }
  return Inner;
}

function DebtSummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[debtSummaryStyles.card, { borderTopColor: color }]}>
      <Text style={[debtSummaryStyles.value, { color }]}>{value}</Text>
      <Text style={debtSummaryStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  profileCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
  },
  avatarText: { fontSize: 28, fontWeight: '900' },
  fullName: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleText: { fontSize: 13, fontWeight: '700' },
  registry: { fontSize: 13, color: '#9ca3af', fontWeight: '500', marginTop: 4 },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: { backgroundColor: '#fff1f1' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#b91c1c' },
  tabBadge: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 10, color: '#fff', fontWeight: '800' },
  section: { paddingHorizontal: 16 },
  debtSummary: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  totalDebtBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
  },
  totalDebtText: { fontSize: 14, color: '#7f1d1d', fontWeight: '600' },
  totalDebtAmount: { fontWeight: '800', color: '#dc2626' },
  debtCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    flexDirection: 'row',
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  debtStatusBar: { width: 4 },
  debtContent: { flex: 1, padding: 14 },
  debtHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  debtTitle: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  debtPeriod: { fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: '500' },
  debtAmounts: { flexDirection: 'row', gap: 16, marginBottom: 6 },
  debtAmountItem: {},
  debtAmountLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  debtAmountValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  dueDate: { fontSize: 12, color: '#9ca3af' },
  debtNotes: { fontSize: 12, color: '#6b7280', marginTop: 6, fontStyle: 'italic' },
  emptyDebts: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
});

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: { flex: 1 },
  label: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 1 },
  value: { fontSize: 14, color: '#111827', fontWeight: '600' },
  link: { color: '#b91c1c' },
});

const debtSummaryStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  value: { fontSize: 22, fontWeight: '900' },
  label: { fontSize: 11, color: '#6b7280', fontWeight: '500', marginTop: 2, textAlign: 'center' },
});

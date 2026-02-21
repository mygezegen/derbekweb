import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import type { MemberDuesWithDetails, Member } from '@dernek/core';

export default function DuesScreen() {
  const [member, setMember] = useState<Member | null>(null);
  const [dues, setDues] = useState<MemberDuesWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: m } = await supabase.from('members').select('*').eq('auth_id', user.id).maybeSingle();
    setMember(m);
    if (!m) return;
    const { data } = await supabase
      .from('member_dues')
      .select('*, dues(*)')
      .eq('member_id', m.id)
      .order('created_at', { ascending: false });
    setDues(data || []);
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const totalDebt = dues.filter(d => d.status !== 'paid').reduce((sum, d) => sum + ((d.dues?.amount || 0) - (d.paid_amount || 0)), 0);
  const paidCount = dues.filter(d => d.status === 'paid').length;
  const pendingCount = dues.filter(d => d.status !== 'paid').length;

  const statusConfig = {
    paid: { label: 'Ödendi', bg: '#d1fae5', text: '#059669' },
    pending: { label: 'Bekliyor', bg: '#fef3c7', text: '#d97706' },
    overdue: { label: 'Gecikmiş', bg: '#fee2e2', text: '#dc2626' },
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#1e40af" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Aidatlarım</Text>
      </View>
      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{paidCount}</Text>
          <Text style={styles.summaryLabel}>Ödenen</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryDebt]}>
          <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Bekleyen</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: totalDebt > 0 ? '#dc2626' : '#059669' }]}>
            {totalDebt.toLocaleString('tr-TR')} ₺
          </Text>
          <Text style={styles.summaryLabel}>Toplam Borç</Text>
        </View>
      </View>
      <FlatList
        data={dues}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor="#1e40af" />}
        renderItem={({ item }) => {
          const cfg = statusConfig[item.status] || statusConfig.pending;
          const amount = item.dues?.amount || 0;
          const remaining = amount - (item.paid_amount || 0);
          return (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardTitle}>{item.dues?.title || 'Aidat'}</Text>
                <Text style={styles.cardPeriod}>
                  {item.dues?.period_month}/{item.dues?.period_year}
                </Text>
                {item.paid_at && (
                  <Text style={styles.cardDate}>Ödeme: {new Date(item.paid_at).toLocaleDateString('tr-TR')}</Text>
                )}
              </View>
              <View style={styles.cardRight}>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
                </View>
                <Text style={styles.amountText}>{amount.toLocaleString('tr-TR')} ₺</Text>
                {item.status !== 'paid' && remaining > 0 && (
                  <Text style={styles.remainingText}>Kalan: {remaining.toLocaleString('tr-TR')} ₺</Text>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Aidat kaydı yok</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1e40af', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  summary: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  summaryCard: { flex: 1, padding: 16, alignItems: 'center' },
  summaryDebt: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e2e8f0' },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  summaryLabel: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '500' },
  list: { padding: 16 },
  card: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', marginLeft: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  cardPeriod: { fontSize: 12, color: '#64748b', marginTop: 2 },
  cardDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginBottom: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  amountText: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  remainingText: { fontSize: 11, color: '#dc2626', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyText: { fontSize: 16, color: '#94a3b8' },
});

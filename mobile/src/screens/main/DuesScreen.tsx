import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MemberDues } from '../../types';

type DuesWithDues = MemberDues & {
  dues: {
    title: string;
    amount: number;
    period_month: number;
    period_year: number;
    due_date: string;
    description?: string;
  };
};

const STATUS_CONFIG = {
  paid: { label: 'Ödendi', color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle' as const },
  pending: { label: 'Bekliyor', color: '#d97706', bg: '#fef3c7', icon: 'time' as const },
  overdue: { label: 'Gecikmiş', color: '#dc2626', bg: '#fee2e2', icon: 'alert-circle' as const },
  cancelled: { label: 'İptal', color: '#9ca3af', bg: '#f3f4f6', icon: 'close-circle' as const },
};

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function DuesScreen() {
  const { member, user } = useAuth();
  const [dues, setDues] = useState<DuesWithDues[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, overdue: 0 });

  const loadDues = useCallback(async () => {
    if (!member) return;
    const { data } = await supabase
      .from('member_dues')
      .select('*, dues:dues_id(title, amount, period_month, period_year, due_date, description)')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false });

    const items = (data || []) as DuesWithDues[];
    setDues(items);

    const sum = items.reduce((acc, d) => {
      acc.total += d.dues?.amount || 0;
      if (d.status === 'paid') acc.paid += d.dues?.amount || 0;
      if (d.status === 'pending') acc.pending += d.dues?.amount || 0;
      if (d.status === 'overdue') acc.overdue += d.dues?.amount || 0;
      return acc;
    }, { total: 0, paid: 0, pending: 0, overdue: 0 });
    setSummary(sum);
    setLoading(false);
    setRefreshing(false);
  }, [member]);

  useEffect(() => { loadDues(); }, [loadDues]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={48} color="#d1d5db" />
        <Text style={styles.guestTitle}>Giriş Yapmanız Gerekiyor</Text>
        <Text style={styles.guestText}>Aidat bilgilerinizi görmek için lütfen giriş yapın.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#b91c1c" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={dues}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDues(); }} tintColor="#b91c1c" />}
      ListHeaderComponent={
        <>
          <View style={styles.summaryGrid}>
            <SummaryCard label="Toplam" amount={summary.total} color="#b91c1c" icon="wallet" />
            <SummaryCard label="Ödendi" amount={summary.paid} color="#16a34a" icon="checkmark-circle" />
            <SummaryCard label="Bekliyor" amount={summary.pending} color="#d97706" icon="time" />
            <SummaryCard label="Gecikmiş" amount={summary.overdue} color="#dc2626" icon="alert-circle" />
          </View>
          <Text style={styles.listTitle}>Aidat Detayları</Text>
        </>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="wallet-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>Aidat kaydı bulunamadı</Text>
        </View>
      }
      renderItem={({ item }) => {
        const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
        const monthName = item.dues?.period_month ? MONTHS_TR[item.dues.period_month - 1] : '';
        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                <Ionicons name={config.icon} size={14} color={config.color} />
                <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
              </View>
              <Text style={styles.amount}>{(item.dues?.amount ?? 0).toFixed(2)} TL</Text>
            </View>
            <Text style={styles.duesTitle}>{item.dues?.title}</Text>
            {(monthName || item.dues?.period_year) && (
              <Text style={styles.period}>{monthName} {item.dues?.period_year}</Text>
            )}
            <View style={styles.cardFooter}>
              {item.dues?.due_date && (
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                  <Text style={styles.metaText}>Son ödeme: {new Date(item.dues.due_date).toLocaleDateString('tr-TR')}</Text>
                </View>
              )}
              {item.paid_at && (
                <View style={styles.metaItem}>
                  <Ionicons name="checkmark-circle-outline" size={12} color="#16a34a" />
                  <Text style={[styles.metaText, { color: '#16a34a' }]}>Ödendi: {new Date(item.paid_at).toLocaleDateString('tr-TR')}</Text>
                </View>
              )}
              {item.payment_method && (
                <View style={styles.metaItem}>
                  <Ionicons name="card-outline" size={12} color="#9ca3af" />
                  <Text style={styles.metaText}>
                    {item.payment_method === 'cash' ? 'Nakit' : item.payment_method === 'bank_transfer' ? 'Banka Havalesi' : item.payment_method === 'credit_card' ? 'Kredi Kartı' : 'Diğer'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      }}
    />
  );
}

function SummaryCard({ label, amount, color, icon }: { label: string; amount: number; color: string; icon: any }) {
  return (
    <View style={[summaryStyles.card, { borderTopColor: color }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={summaryStyles.amount}>{amount.toFixed(0)} TL</Text>
      <Text style={summaryStyles.label}>{label}</Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    width: '47%',
    borderTopWidth: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 4,
  },
  amount: { fontSize: 18, fontWeight: '800', color: '#111827' },
  label: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  guestTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  guestText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  list: { padding: 16, paddingBottom: 40 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  listTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  amount: { fontSize: 18, fontWeight: '800', color: '#111827' },
  duesTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 2 },
  period: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  cardFooter: { gap: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: '#9ca3af' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
});

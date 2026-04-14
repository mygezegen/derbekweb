import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type Transaction = {
  id: string;
  transaction_date: string;
  transaction_type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  payment_method?: string;
  reference_number?: string;
  member_id?: string;
  members?: { full_name: string };
  created_at: string;
};

type Summary = {
  income: number;
  expense: number;
  balance: number;
};

const PAYMENT_METHODS: Record<string, string> = {
  cash: 'Nakit',
  bank_transfer: 'Banka Havalesi',
  credit_card: 'Kredi Kartı',
  other: 'Diğer',
};

const CATEGORIES = [
  'Aidat', 'Bağış', 'Etkinlik Geliri', 'Diğer Gelir',
  'Kira', 'Fatura', 'Malzeme', 'Etkinlik Gideri', 'Personel', 'Diğer Gider',
];

export default function TreasuryScreen() {
  const { member } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({ income: 0, expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    transaction_type: 'income' as 'income' | 'expense',
    category: '',
    description: '',
    amount: '',
    payment_method: 'cash',
    transaction_date: new Date().toISOString().slice(0, 10),
    reference_number: '',
  });

  const loadData = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*, members(full_name)')
        .order('transaction_date', { ascending: false })
        .limit(200);

      const list = (data || []) as Transaction[];
      setTransactions(list);

      const inc = list.filter(t => t.transaction_type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = list.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + t.amount, 0);
      setSummary({ income: inc, expense: exp, balance: inc - exp });
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    let list = transactions;
    if (typeFilter !== 'all') list = list.filter(t => t.transaction_type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.members?.full_name?.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [transactions, typeFilter, search]);

  const handleSave = async () => {
    if (!form.category || !form.description || !form.amount) {
      Alert.alert('Hata', 'Kategori, açıklama ve tutar zorunludur.');
      return;
    }
    const amount = parseFloat(form.amount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar giriniz.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        transaction_type: form.transaction_type,
        category: form.category,
        description: form.description,
        amount,
        payment_method: form.payment_method,
        transaction_date: form.transaction_date,
        reference_number: form.reference_number || null,
        created_by: member?.id,
      });
      if (error) throw error;
      setModalVisible(false);
      setForm({
        transaction_type: 'income',
        category: '',
        description: '',
        amount: '',
        payment_method: 'cash',
        transaction_date: new Date().toISOString().slice(0, 10),
        reference_number: '',
      });
      loadData();
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'İşlem kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Sil', 'Bu işlemi silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('transactions').delete().eq('id', id);
          loadData();
        },
      },
    ]);
  };

  const formatAmount = (amount: number) =>
    amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

  if (!member?.is_admin && !member?.is_root) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={48} color="#d1d5db" />
        <Text style={styles.guestTitle}>Erişim Yetkiniz Yok</Text>
        <Text style={styles.guestText}>Kasa modülüne erişmek için yönetici yetkisi gereklidir.</Text>
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
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#b91c1c" />}
        ListHeaderComponent={
          <>
            <View style={styles.summaryRow}>
              <SummaryCard label="Gelir" amount={summary.income} color="#16a34a" icon="trending-up" />
              <SummaryCard label="Gider" amount={summary.expense} color="#dc2626" icon="trending-down" />
            </View>
            <View style={[styles.balanceCard, { borderLeftColor: summary.balance >= 0 ? '#16a34a' : '#dc2626' }]}>
              <Text style={styles.balanceLabel}>Kasa Bakiyesi</Text>
              <Text style={[styles.balanceAmount, { color: summary.balance >= 0 ? '#16a34a' : '#dc2626' }]}>
                {formatAmount(summary.balance)}
              </Text>
            </View>

            <View style={styles.toolbar}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color="#9ca3af" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Ara..."
                  placeholderTextColor="#9ca3af"
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="none"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterRow}>
              {(['all', 'income', 'expense'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.filterBtn, typeFilter === type && styles.filterBtnActive]}
                  onPress={() => setTypeFilter(type)}
                >
                  <Text style={[styles.filterBtnText, typeFilter === type && styles.filterBtnTextActive]}>
                    {type === 'all' ? 'Tümü' : type === 'income' ? 'Gelirler' : 'Giderler'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.listTitle}>{filtered.length} işlem</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>İşlem bulunamadı</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.txCard}>
            <View style={[styles.txTypeBadge, { backgroundColor: item.transaction_type === 'income' ? '#dcfce7' : '#fee2e2' }]}>
              <Ionicons
                name={item.transaction_type === 'income' ? 'arrow-down' : 'arrow-up'}
                size={16}
                color={item.transaction_type === 'income' ? '#16a34a' : '#dc2626'}
              />
            </View>
            <View style={styles.txInfo}>
              <View style={styles.txHeader}>
                <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
                <Text style={[styles.txAmount, { color: item.transaction_type === 'income' ? '#16a34a' : '#dc2626' }]}>
                  {item.transaction_type === 'income' ? '+' : '-'}{formatAmount(item.amount)}
                </Text>
              </View>
              <Text style={styles.txCategory}>{item.category}</Text>
              <View style={styles.txMeta}>
                <Text style={styles.txDate}>{formatDate(item.transaction_date)}</Text>
                {item.payment_method && (
                  <Text style={styles.txMethod}>{PAYMENT_METHODS[item.payment_method] || item.payment_method}</Text>
                )}
                {item.members?.full_name && (
                  <Text style={styles.txMember} numberOfLines={1}>{item.members.full_name}</Text>
                )}
              </View>
            </View>
            {member?.is_root && (
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={16} color="#dc2626" />
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni İşlem</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeBtn, form.transaction_type === 'income' && styles.typeBtnIncomeActive]}
                  onPress={() => setForm(f => ({ ...f, transaction_type: 'income' }))}
                >
                  <Ionicons name="trending-up" size={18} color={form.transaction_type === 'income' ? '#fff' : '#16a34a'} />
                  <Text style={[styles.typeBtnText, form.transaction_type === 'income' && { color: '#fff' }]}>Gelir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, form.transaction_type === 'expense' && styles.typeBtnExpenseActive]}
                  onPress={() => setForm(f => ({ ...f, transaction_type: 'expense' }))}
                >
                  <Ionicons name="trending-down" size={18} color={form.transaction_type === 'expense' ? '#fff' : '#dc2626'} />
                  <Text style={[styles.typeBtnText, form.transaction_type === 'expense' && { color: '#fff' }]}>Gider</Text>
                </TouchableOpacity>
              </View>

              <FormField
                label="Kategori"
                value={form.category}
                onChangeText={v => setForm(f => ({ ...f, category: v }))}
                placeholder="Örn: Aidat, Kira..."
              />

              <Text style={styles.fieldLabel}>Kategori Seç</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, form.category === cat && styles.catChipActive]}
                    onPress={() => setForm(f => ({ ...f, category: cat }))}
                  >
                    <Text style={[styles.catChipText, form.category === cat && styles.catChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <FormField
                label="Açıklama *"
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholder="İşlem açıklaması"
              />

              <FormField
                label="Tutar (₺) *"
                value={form.amount}
                onChangeText={v => setForm(f => ({ ...f, amount: v }))}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />

              <FormField
                label="Tarih"
                value={form.transaction_date}
                onChangeText={v => setForm(f => ({ ...f, transaction_date: v }))}
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.fieldLabel}>Ödeme Yöntemi</Text>
              <View style={styles.paymentRow}>
                {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.paymentBtn, form.payment_method === key && styles.paymentBtnActive]}
                    onPress={() => setForm(f => ({ ...f, payment_method: key }))}
                  >
                    <Text style={[styles.paymentBtnText, form.payment_method === key && styles.paymentBtnTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FormField
                label="Referans No"
                value={form.reference_number}
                onChangeText={v => setForm(f => ({ ...f, reference_number: v }))}
                placeholder="Opsiyonel"
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SummaryCard({ label, amount, color, icon }: { label: string; amount: number; color: string; icon: any }) {
  return (
    <View style={[summaryStyles.card, { borderTopColor: color }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[summaryStyles.amount, { color }]}>
        {amount.toLocaleString('tr-TR', { minimumFractionDigits: 0 })} ₺
      </Text>
      <Text style={summaryStyles.label}>{label}</Text>
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: any;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
      />
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderTopWidth: 3,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  amount: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  guestTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  guestText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  list: { padding: 16, paddingBottom: 40 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  balanceLabel: { fontSize: 15, fontWeight: '700', color: '#374151' },
  balanceAmount: { fontSize: 20, fontWeight: '900' },
  toolbar: { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#b91c1c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#b91c1c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  filterBtnActive: { backgroundColor: '#b91c1c', borderColor: '#b91c1c' },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  filterBtnTextActive: { color: '#fff' },
  listTitle: { fontSize: 12, color: '#9ca3af', fontWeight: '500', marginBottom: 8 },
  txCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  txTypeBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  txDesc: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  txAmount: { fontSize: 15, fontWeight: '800' },
  txCategory: { fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: '500' },
  txMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  txDate: { fontSize: 11, color: '#9ca3af' },
  txMethod: { fontSize: 11, color: '#9ca3af' },
  txMember: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  deleteBtn: { padding: 6 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  typeToggle: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  typeBtnIncomeActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  typeBtnExpenseActive: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  typeBtnText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  categoryScroll: { marginBottom: 16 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  catChipActive: { backgroundColor: '#b91c1c', borderColor: '#b91c1c' },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  catChipTextActive: { color: '#fff' },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  paymentBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  paymentBtnActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  paymentBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  paymentBtnTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: '#b91c1c',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#b91c1c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

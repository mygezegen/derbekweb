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

type Due = {
  id: string;
  title: string;
  amount: number;
  period_month?: number;
  period_year?: number;
  due_date?: string;
  description?: string;
  created_at: string;
};

type MemberDueItem = {
  id: string;
  member_id: string;
  dues_id: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_amount: number;
  paid_at?: string;
  payment_method?: string;
  notes?: string;
  receipt_no?: string;
  members?: { full_name: string; email?: string; registry_number?: string };
  dues?: { title: string; amount: number; period_month?: number; period_year?: number };
};

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: 'Ödendi', color: '#16a34a', bg: '#dcfce7' },
  pending: { label: 'Bekliyor', color: '#d97706', bg: '#fef3c7' },
  overdue: { label: 'Gecikmiş', color: '#dc2626', bg: '#fee2e2' },
  cancelled: { label: 'İptal', color: '#9ca3af', bg: '#f3f4f6' },
};

type TabKey = 'dues' | 'payments';

export default function DuesAdminScreen() {
  const { member } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('dues');
  const [dues, setDues] = useState<Due[]>([]);
  const [memberDues, setMemberDues] = useState<MemberDueItem[]>([]);
  const [filteredMemberDues, setFilteredMemberDues] = useState<MemberDueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  const [newDueModal, setNewDueModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedMemberDue, setSelectedMemberDue] = useState<MemberDueItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [dueForm, setDueForm] = useState({
    title: '',
    amount: '',
    period_month: '',
    period_year: new Date().getFullYear().toString(),
    due_date: '',
    description: '',
  });

  const [payForm, setPayForm] = useState({
    paid_amount: '',
    payment_method: 'cash',
    paid_at: new Date().toISOString().slice(0, 10),
    receipt_no: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [duesRes, memberDuesRes] = await Promise.all([
        supabase.from('dues').select('*').order('created_at', { ascending: false }),
        supabase
          .from('member_dues')
          .select('*, members(full_name, email, registry_number), dues(title, amount, period_month, period_year)')
          .order('created_at', { ascending: false })
          .limit(300),
      ]);
      setDues(duesRes.data || []);
      setMemberDues(memberDuesRes.data || []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    let list = memberDues;
    if (statusFilter !== 'all') list = list.filter(md => md.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(md =>
        md.members?.full_name?.toLowerCase().includes(q) ||
        md.members?.registry_number?.toLowerCase().includes(q) ||
        md.dues?.title?.toLowerCase().includes(q)
      );
    }
    setFilteredMemberDues(list);
  }, [memberDues, search, statusFilter]);

  const handleCreateDue = async () => {
    if (!dueForm.title || !dueForm.amount) {
      Alert.alert('Hata', 'Başlık ve tutar zorunludur.');
      return;
    }
    const amount = parseFloat(dueForm.amount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar giriniz.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('dues').insert({
        title: dueForm.title,
        amount,
        period_month: dueForm.period_month ? parseInt(dueForm.period_month) : null,
        period_year: dueForm.period_year ? parseInt(dueForm.period_year) : null,
        due_date: dueForm.due_date || null,
        description: dueForm.description || null,
      });
      if (error) throw error;
      setNewDueModal(false);
      setDueForm({ title: '', amount: '', period_month: '', period_year: new Date().getFullYear().toString(), due_date: '', description: '' });
      loadData();
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Aidat oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedMemberDue) return;
    const amount = parseFloat(payForm.paid_amount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar giriniz.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('member_dues')
        .update({
          status: 'paid',
          paid_amount: amount,
          payment_method: payForm.payment_method,
          paid_at: payForm.paid_at,
          receipt_no: payForm.receipt_no || null,
          notes: payForm.notes || null,
        })
        .eq('id', selectedMemberDue.id);
      if (error) throw error;
      setPaymentModal(false);
      setSelectedMemberDue(null);
      setPayForm({ paid_amount: '', payment_method: 'cash', paid_at: new Date().toISOString().slice(0, 10), receipt_no: '', notes: '' });
      loadData();
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Ödeme kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDue = (id: string) => {
    Alert.alert('Sil', 'Bu aidatı silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          await supabase.from('dues').delete().eq('id', id);
          loadData();
        },
      },
    ]);
  };

  if (!member?.is_admin && !member?.is_root) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={48} color="#d1d5db" />
        <Text style={styles.guestTitle}>Erişim Yetkiniz Yok</Text>
        <Text style={styles.guestText}>Bu modüle erişmek için yönetici yetkisi gereklidir.</Text>
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
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'dues' && styles.tabActive]} onPress={() => setActiveTab('dues')}>
          <Text style={[styles.tabText, activeTab === 'dues' && styles.tabTextActive]}>Aidat Listesi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'payments' && styles.tabActive]} onPress={() => setActiveTab('payments')}>
          <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>Tahsilat</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'dues' ? (
        <FlatList
          data={dues}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#b91c1c" />}
          ListHeaderComponent={
            <TouchableOpacity style={styles.createBtn} onPress={() => setNewDueModal(true)}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.createBtnText}>Yeni Aidat Oluştur</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>Aidat tanımı bulunamadı</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.dueCard}>
              <View style={styles.dueInfo}>
                <Text style={styles.dueTitle}>{item.title}</Text>
                {(item.period_month || item.period_year) && (
                  <Text style={styles.duePeriod}>
                    {item.period_month ? MONTHS_TR[item.period_month - 1] : ''} {item.period_year || ''}
                  </Text>
                )}
                {item.due_date && (
                  <Text style={styles.dueMeta}>Son ödeme: {new Date(item.due_date).toLocaleDateString('tr-TR')}</Text>
                )}
              </View>
              <View style={styles.dueRight}>
                <Text style={styles.dueAmount}>{item.amount.toLocaleString('tr-TR')} ₺</Text>
                {member?.is_root && (
                  <TouchableOpacity onPress={() => handleDeleteDue(item.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={16} color="#dc2626" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      ) : (
        <View style={styles.flex}>
          <View style={styles.searchToolbar}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={16} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Üye adı, sicil no..."
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
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(['all', 'pending', 'overdue', 'paid'] as const).map(s => {
              const cfg = s === 'all' ? null : STATUS_CONFIG[s];
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterChip, statusFilter === s && (s === 'all' ? styles.filterChipAllActive : { backgroundColor: cfg?.bg, borderColor: cfg?.color })]}
                  onPress={() => setStatusFilter(s)}
                >
                  <Text style={[styles.filterChipText, statusFilter === s && s !== 'all' && { color: cfg?.color }]}>
                    {s === 'all' ? 'Tümü' : cfg?.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.countLabel}>{filteredMemberDues.length} kayıt</Text>

          <FlatList
            data={filteredMemberDues}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#b91c1c" />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>Kayıt bulunamadı</Text>
              </View>
            }
            renderItem={({ item }) => {
              const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
              const month = item.dues?.period_month ? MONTHS_TR[item.dues.period_month - 1] : '';
              return (
                <View style={styles.memberDueCard}>
                  <View style={styles.memberDueInfo}>
                    <Text style={styles.memberName}>{item.members?.full_name || 'İsimsiz Üye'}</Text>
                    {item.members?.registry_number && (
                      <Text style={styles.memberReg}>#{item.members.registry_number}</Text>
                    )}
                    <Text style={styles.dueNameText}>{item.dues?.title}</Text>
                    {(month || item.dues?.period_year) && (
                      <Text style={styles.duePeriodSmall}>{month} {item.dues?.period_year}</Text>
                    )}
                  </View>
                  <View style={styles.memberDueRight}>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.memberDueAmount}>{(item.dues?.amount ?? 0).toLocaleString('tr-TR')} ₺</Text>
                    {item.status !== 'paid' && item.status !== 'cancelled' && (
                      <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() => {
                          setSelectedMemberDue(item);
                          setPayForm(f => ({ ...f, paid_amount: (item.dues?.amount ?? '').toString() }));
                          setPaymentModal(true);
                        }}
                      >
                        <Ionicons name="checkmark" size={14} color="#fff" />
                        <Text style={styles.payBtnText}>Tahsil Et</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      <Modal visible={newDueModal} animationType="slide" transparent onRequestClose={() => setNewDueModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Aidat</Text>
              <TouchableOpacity onPress={() => setNewDueModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <ModalField label="Başlık *" value={dueForm.title} onChangeText={v => setDueForm(f => ({ ...f, title: v }))} placeholder="Örn: 2025 Yıllık Aidat" />
              <ModalField label="Tutar (₺) *" value={dueForm.amount} onChangeText={v => setDueForm(f => ({ ...f, amount: v }))} placeholder="0.00" keyboardType="decimal-pad" />
              <ModalField label="Dönem Ay (1-12)" value={dueForm.period_month} onChangeText={v => setDueForm(f => ({ ...f, period_month: v }))} placeholder="Opsiyonel" keyboardType="number-pad" />
              <ModalField label="Dönem Yıl" value={dueForm.period_year} onChangeText={v => setDueForm(f => ({ ...f, period_year: v }))} placeholder="2025" keyboardType="number-pad" />
              <ModalField label="Son Ödeme Tarihi" value={dueForm.due_date} onChangeText={v => setDueForm(f => ({ ...f, due_date: v }))} placeholder="YYYY-MM-DD" />
              <ModalField label="Açıklama" value={dueForm.description} onChangeText={v => setDueForm(f => ({ ...f, description: v }))} placeholder="Opsiyonel" />
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleCreateDue} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Oluştur</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={paymentModal} animationType="slide" transparent onRequestClose={() => setPaymentModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tahsilat Kaydı</Text>
              <TouchableOpacity onPress={() => setPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {selectedMemberDue && (
              <View style={styles.selectedMemberBox}>
                <Text style={styles.selectedMemberName}>{selectedMemberDue.members?.full_name}</Text>
                <Text style={styles.selectedDueName}>{selectedMemberDue.dues?.title} — {(selectedMemberDue.dues?.amount ?? 0).toLocaleString('tr-TR')} ₺</Text>
              </View>
            )}
            <ScrollView showsVerticalScrollIndicator={false}>
              <ModalField label="Tahsil Edilen Tutar (₺) *" value={payForm.paid_amount} onChangeText={v => setPayForm(f => ({ ...f, paid_amount: v }))} placeholder="0.00" keyboardType="decimal-pad" />
              <ModalField label="Ödeme Tarihi" value={payForm.paid_at} onChangeText={v => setPayForm(f => ({ ...f, paid_at: v }))} placeholder="YYYY-MM-DD" />

              <Text style={styles.fieldLabel}>Ödeme Yöntemi</Text>
              <View style={styles.paymentRow}>
                {[['cash', 'Nakit'], ['bank_transfer', 'Havale'], ['credit_card', 'Kart'], ['other', 'Diğer']].map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.paymentBtn, payForm.payment_method === key && styles.paymentBtnActive]}
                    onPress={() => setPayForm(f => ({ ...f, payment_method: key }))}
                  >
                    <Text style={[styles.paymentBtnText, payForm.payment_method === key && { color: '#fff' }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ModalField label="Makbuz No" value={payForm.receipt_no} onChangeText={v => setPayForm(f => ({ ...f, receipt_no: v }))} placeholder="Opsiyonel" />
              <ModalField label="Notlar" value={payForm.notes} onChangeText={v => setPayForm(f => ({ ...f, notes: v }))} placeholder="Opsiyonel" />
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#16a34a' }, saving && { opacity: 0.7 }]} onPress={handleMarkPaid} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Tahsilatı Kaydet</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function ModalField({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder: string; keyboardType?: any;
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  guestTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  guestText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#b91c1c' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#b91c1c' },
  list: { padding: 16, paddingBottom: 40 },
  createBtn: {
    backgroundColor: '#b91c1c',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    shadowColor: '#b91c1c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dueCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  dueInfo: { flex: 1 },
  dueTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  duePeriod: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  dueMeta: { fontSize: 12, color: '#9ca3af' },
  dueRight: { alignItems: 'flex-end', gap: 6 },
  dueAmount: { fontSize: 18, fontWeight: '800', color: '#b91c1c' },
  deleteBtn: { padding: 4 },
  searchToolbar: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: {
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
  filterScroll: { paddingLeft: 16, paddingBottom: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipAllActive: { backgroundColor: '#b91c1c', borderColor: '#b91c1c' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  countLabel: { fontSize: 12, color: '#9ca3af', marginHorizontal: 16, marginBottom: 4, fontWeight: '500' },
  memberDueCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  memberDueInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  memberReg: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  dueNameText: { fontSize: 13, color: '#374151', fontWeight: '500', marginBottom: 1 },
  duePeriodSmall: { fontSize: 12, color: '#9ca3af' },
  memberDueRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  memberDueAmount: { fontSize: 15, fontWeight: '800', color: '#111827' },
  payBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  payBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
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
  selectedMemberBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  selectedMemberName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  selectedDueName: { fontSize: 13, color: '#b91c1c', fontWeight: '600' },
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

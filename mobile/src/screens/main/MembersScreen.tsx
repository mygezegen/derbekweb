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
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Member } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

type Props = {
  navigation: any;
};

const MEMBER_STATUSES = [
  { value: 'active', label: 'Aktif' },
  { value: 'passive', label: 'Pasif' },
];

const MEMBER_TYPES = ['Asil Üye', 'Fahri Üye', 'Onursal Üye', 'Aday Üye'];

export default function MembersScreen({ navigation }: Props) {
  const { member: currentMember } = useAuth();
  const isAdmin = currentMember?.is_admin || currentMember?.is_root;

  const [members, setMembers] = useState<Member[]>([]);
  const [filtered, setFiltered] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    profession: '',
    province: '',
    district: '',
    address: '',
    member_type: '',
    is_active: true,
    is_admin: false,
  });

  const loadMembers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('members')
        .select('id, full_name, email, phone, registry_number, member_type, profession, province, district, is_active, is_admin, is_root, joined_at, tc_identity_no, address, education_level, gender, title, mother_name, father_name')
        .order('full_name', { ascending: true });
      const list = data || [];
      setMembers(list);
      setFiltered(list);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(members); return; }
    const q = search.toLowerCase();
    setFiltered(members.filter(m =>
      m.full_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.includes(q) ||
      m.registry_number?.toLowerCase().includes(q)
    ));
  }, [search, members]);

  const openEdit = (m: Member) => {
    setEditTarget(m);
    setEditForm({
      full_name: m.full_name || '',
      phone: m.phone || '',
      profession: m.profession || '',
      province: m.province || '',
      district: m.district || '',
      address: (m as any).address || '',
      member_type: m.member_type || '',
      is_active: m.is_active,
      is_admin: m.is_admin,
    });
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('members').update({
        full_name: editForm.full_name,
        phone: editForm.phone,
        profession: editForm.profession,
        province: editForm.province,
        district: editForm.district,
        address: editForm.address,
        member_type: editForm.member_type,
        is_active: editForm.is_active,
        is_admin: editTarget.is_root ? editTarget.is_admin : editForm.is_admin,
      }).eq('id', editTarget.id);
      if (error) throw error;
      setEditModal(false);
      loadMembers();
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Güncelleme başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (m: Member) => {
    if (m.is_root) { Alert.alert('Hata', 'Root kullanıcı silinemez.'); return; }
    Alert.alert('Üyeyi Sil', `${m.full_name} üyesini silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          await supabase.from('members').delete().eq('id', m.id);
          loadMembers();
        },
      },
    ]);
  };

  const getStatusColor = (m: Member) => {
    if (!m.is_active) return '#9ca3af';
    if (m.is_root) return '#b91c1c';
    if (m.is_admin) return '#d97706';
    return '#16a34a';
  };

  const getStatusLabel = (m: Member) => {
    if (!m.is_active) return 'Pasif';
    if (m.is_root) return 'Root';
    if (m.is_admin) return 'Yönetici';
    return 'Üye';
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const renderItem = ({ item }: { item: Member }) => {
    const color = getStatusColor(item);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('MemberDetail', { memberId: item.id })}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: color + '20', borderColor: color + '40' }]}>
          <Text style={[styles.avatarText, { color }]}>{getInitials(item.full_name)}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.full_name || '-'}</Text>
            <View style={[styles.badge, { backgroundColor: color + '15' }]}>
              <Text style={[styles.badgeText, { color }]}>{getStatusLabel(item)}</Text>
            </View>
          </View>
          {item.registry_number ? <Text style={styles.sub}>#{item.registry_number}</Text> : null}
          {(item.province || item.district) ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color="#9ca3af" />
              <Text style={styles.meta}>{[item.district, item.province].filter(Boolean).join(', ')}</Text>
            </View>
          ) : null}
          {item.profession ? (
            <View style={styles.metaRow}>
              <Ionicons name="briefcase-outline" size={12} color="#9ca3af" />
              <Text style={styles.meta}>{item.profession}</Text>
            </View>
          ) : null}
        </View>
        {isAdmin && item.id !== currentMember?.id && !item.is_root && (
          <View style={styles.actionBtns}>
            <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
              <Ionicons name="create-outline" size={16} color="#2563eb" />
            </TouchableOpacity>
            {currentMember?.is_root && (
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.delBtn}>
                <Ionicons name="trash-outline" size={16} color="#dc2626" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#b91c1c" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Ad, e-posta, telefon veya sicil no..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.count}>{filtered.length} üye listeleniyor</Text>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMembers(); }} tintColor="#b91c1c" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Üye bulunamadı</Text>
          </View>
        }
      />

      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Üyeyi Düzenle</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <EditField label="Ad Soyad" value={editForm.full_name} onChangeText={v => setEditForm(f => ({ ...f, full_name: v }))} />
              <EditField label="Telefon" value={editForm.phone} onChangeText={v => setEditForm(f => ({ ...f, phone: v }))} keyboardType="phone-pad" />
              <EditField label="Meslek" value={editForm.profession} onChangeText={v => setEditForm(f => ({ ...f, profession: v }))} />
              <EditField label="İl" value={editForm.province} onChangeText={v => setEditForm(f => ({ ...f, province: v }))} />
              <EditField label="İlçe" value={editForm.district} onChangeText={v => setEditForm(f => ({ ...f, district: v }))} />
              <EditField label="Adres" value={editForm.address} onChangeText={v => setEditForm(f => ({ ...f, address: v }))} />

              <Text style={styles.fieldLabel}>Üye Tipi</Text>
              <View style={styles.chipRow}>
                {MEMBER_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, editForm.member_type === t && styles.chipActive]}
                    onPress={() => setEditForm(f => ({ ...f, member_type: t }))}
                  >
                    <Text style={[styles.chipText, editForm.member_type === t && styles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Durum</Text>
              <View style={styles.chipRow}>
                {MEMBER_STATUSES.map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.chip, editForm.is_active === (s.value === 'active') && styles.chipActive]}
                    onPress={() => setEditForm(f => ({ ...f, is_active: s.value === 'active' }))}
                  >
                    <Text style={[styles.chipText, editForm.is_active === (s.value === 'active') && styles.chipTextActive]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {currentMember?.is_root && !editTarget?.is_root && (
                <>
                  <Text style={styles.fieldLabel}>Yetki</Text>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.chip, !editForm.is_admin && styles.chipActive]}
                      onPress={() => setEditForm(f => ({ ...f, is_admin: false }))}
                    >
                      <Text style={[styles.chipText, !editForm.is_admin && styles.chipTextActive]}>Üye</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.chip, editForm.is_admin && styles.chipActive]}
                      onPress={() => setEditForm(f => ({ ...f, is_admin: true }))}
                    >
                      <Text style={[styles.chipText, editForm.is_admin && styles.chipTextActive]}>Yönetici</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function EditField({ label, value, onChangeText, keyboardType }: {
  label: string; value: string; onChangeText: (v: string) => void; keyboardType?: any;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  count: { fontSize: 12, color: '#9ca3af', marginHorizontal: 20, marginBottom: 8, fontWeight: '500' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
  },
  avatarText: { fontSize: 16, fontWeight: '800' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  sub: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  meta: { fontSize: 12, color: '#9ca3af' },
  actionBtns: { flexDirection: 'row', gap: 6, marginLeft: 4 },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  delBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#9ca3af', fontWeight: '500' },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  chipActive: { backgroundColor: '#b91c1c', borderColor: '#b91c1c' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  chipTextActive: { color: '#fff' },
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

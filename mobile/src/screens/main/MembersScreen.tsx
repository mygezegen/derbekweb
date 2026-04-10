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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Member } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

type Props = {
  navigation: any;
};

export default function MembersScreen({ navigation }: Props) {
  const { member: currentMember } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [filtered, setFiltered] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('members')
        .select('id, full_name, email, phone, registry_number, member_type, profession, province, district, is_active, is_admin, is_root, joined_at')
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
    if (!search.trim()) {
      setFiltered(members);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(members.filter(m =>
      m.full_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.includes(q) ||
      m.registry_number?.toLowerCase().includes(q)
    ));
  }, [search, members]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMembers();
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
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
          {item.registry_number ? (
            <Text style={styles.sub}>#{item.registry_number}</Text>
          ) : null}
          {item.province || item.district ? (
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
        <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#b91c1c" />
      </View>
    );
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b91c1c" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Üye bulunamadı</Text>
          </View>
        }
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  sub: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  meta: { fontSize: 12, color: '#9ca3af' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#9ca3af', fontWeight: '500' },
});

import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import type { Member } from '@dernek/core';

export default function MembersScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filtered, setFiltered] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadMembers() {
    const { data } = await supabase
      .from('members')
      .select('*')
      .order('full_name', { ascending: true });
    setMembers(data || []);
    setFiltered(data || []);
  }

  useEffect(() => {
    loadMembers().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search) { setFiltered(members); return; }
    const q = search.toLowerCase();
    setFiltered(members.filter(m =>
      m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    ));
  }, [search, members]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#1e40af" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Üyeler</Text>
        <Text style={styles.count}>{members.length} üye</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Ad veya e-posta ara..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1e40af" />}
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <View style={[styles.avatar, item.is_admin ? styles.avatarAdmin : item.is_root ? styles.avatarRoot : null]}>
              <Text style={styles.avatarText}>{getInitials(item.full_name)}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{item.full_name}</Text>
              <Text style={styles.memberEmail} numberOfLines={1}>{item.email}</Text>
              {item.phone && <Text style={styles.memberPhone}>{item.phone}</Text>}
            </View>
            <View style={[styles.badge, item.is_root ? styles.badgeRoot : item.is_admin ? styles.badgeAdmin : styles.badgeMember]}>
              <Text style={[styles.badgeText, item.is_root ? styles.badgeTextRoot : item.is_admin ? styles.badgeTextAdmin : styles.badgeTextMember]}>
                {item.is_root ? 'Root' : item.is_admin ? 'Yönetici' : 'Üye'}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Üye bulunamadı</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1e40af', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  count: { fontSize: 14, color: '#bfdbfe', fontWeight: '500' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  searchInput: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
    padding: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e40af', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarAdmin: { backgroundColor: '#059669' },
  avatarRoot: { backgroundColor: '#dc2626' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  memberEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  memberPhone: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginLeft: 8 },
  badgeMember: { backgroundColor: '#f1f5f9' },
  badgeAdmin: { backgroundColor: '#d1fae5' },
  badgeRoot: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextMember: { color: '#64748b' },
  badgeTextAdmin: { color: '#059669' },
  badgeTextRoot: { color: '#dc2626' },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyText: { fontSize: 16, color: '#94a3b8' },
});

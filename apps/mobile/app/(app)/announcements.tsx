import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import type { AnnouncementWithCreator } from '@dernek/core';

export default function AnnouncementsScreen() {
  const [items, setItems] = useState<AnnouncementWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const { data } = await supabase
      .from('announcements')
      .select('*, members(full_name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setItems(data || []);
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#1e40af" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Duyurular</Text>
        <Text style={styles.count}>{items.length} duyuru</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor="#1e40af" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardContent} numberOfLines={4}>{item.content.replace(/<[^>]*>/g, '')}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardAuthor}>{item.members?.full_name || 'Yönetim'}</Text>
              <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Aktif duyuru yok</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1e40af', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  count: { fontSize: 14, color: '#bfdbfe' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
    borderLeftWidth: 4, borderLeftColor: '#1e40af',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  cardContent: { fontSize: 14, color: '#475569', lineHeight: 21, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  cardAuthor: { fontSize: 12, color: '#1e40af', fontWeight: '600' },
  cardDate: { fontSize: 12, color: '#94a3b8' },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyText: { fontSize: 16, color: '#94a3b8' },
});

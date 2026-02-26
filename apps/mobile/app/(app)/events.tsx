import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import type { EventWithCreator } from '@dernek/core';

export default function EventsScreen() {
  const [items, setItems] = useState<EventWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  async function load() {
    const now = new Date().toISOString();
    const query = supabase
      .from('events')
      .select('*, members(full_name)')
      .order('event_date', { ascending: tab === 'upcoming' });
    const { data } = tab === 'upcoming'
      ? await query.gte('event_date', now)
      : await query.lt('event_date', now);
    setItems(data || []);
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, [tab]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Etkinlikler</Text>
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'upcoming' && styles.tabActive]}
          onPress={() => setTab('upcoming')}
        >
          <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>Yaklaşan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'past' && styles.tabActive]}
          onPress={() => setTab('past')}
        >
          <Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>Geçmiş</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color="#1e40af" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor="#1e40af" />}
          renderItem={({ item }) => {
            const d = new Date(item.event_date);
            return (
              <View style={styles.card}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateDay}>{d.getDate()}</Text>
                  <Text style={styles.dateMonth}>{d.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase()}</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  {item.location && <Text style={styles.eventLocation}>📍 {item.location}</Text>}
                  {item.description && <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Etkinlik yok</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#1e40af', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#1e40af' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#1e40af' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  dateBox: { width: 64, backgroundColor: '#1e40af', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  dateDay: { fontSize: 26, fontWeight: '700', color: '#fff' },
  dateMonth: { fontSize: 11, color: '#bfdbfe', fontWeight: '600', marginTop: 2 },
  eventInfo: { flex: 1, padding: 14 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  eventLocation: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  eventDesc: { fontSize: 13, color: '#475569', lineHeight: 18 },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyText: { fontSize: 16, color: '#94a3b8' },
});

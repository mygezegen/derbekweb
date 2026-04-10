import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Event } from '../../types';

type Props = { navigation: any };
type Filter = 'upcoming' | 'past' | 'all';

export default function EventsScreen({ navigation }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('upcoming');

  const loadEvents = useCallback(async () => {
    let query = supabase
      .from('events')
      .select('*, event_participants(id)')
      .order('event_date', { ascending: false });

    if (filter === 'upcoming') {
      query = query.gte('event_date', new Date().toISOString().split('T')[0]);
    } else if (filter === 'past') {
      query = query.lt('event_date', new Date().toISOString().split('T')[0]);
    }

    const { data } = await query.limit(30);
    const items = (data || []).map(e => ({
      ...e,
      participant_count: e.event_participants?.length || 0,
    }));
    setEvents(items);
    setLoading(false);
    setRefreshing(false);
  }, [filter]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Tarih belirtilmedi';
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const isUpcoming = (dateStr?: string) => {
    if (!dateStr) return false;
    return new Date(dateStr) >= new Date();
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
      <View style={styles.filterRow}>
        {(['upcoming', 'past', 'all'] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'upcoming' ? 'Yaklaşan' : f === 'past' ? 'Geçmiş' : 'Tümü'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={events}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(); }} tintColor="#b91c1c" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Etkinlik bulunamadı</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('EventDetail', { id: item.id })}
            activeOpacity={0.7}
          >
            <View style={[styles.dateBadge, !isUpcoming(item.event_date || item.date) && styles.dateBadgePast]}>
              <Text style={styles.dateBadgeDay}>
                {item.event_date ? new Date(item.event_date).getDate() : '--'}
              </Text>
              <Text style={styles.dateBadgeMonth}>
                {item.event_date ? new Date(item.event_date).toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase() : ''}
              </Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                {isUpcoming(item.event_date || item.date) && (
                  <View style={styles.upcomingBadge}>
                    <Text style={styles.upcomingBadgeText}>Yaklaşan</Text>
                  </View>
                )}
              </View>
              {item.location && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={13} color="#9ca3af" />
                  <Text style={styles.infoText}>{item.location}</Text>
                </View>
              )}
              {item.time && (
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={13} color="#9ca3af" />
                  <Text style={styles.infoText}>{item.time}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={13} color="#9ca3af" />
                <Text style={styles.infoText}>{(item as any).participant_count || 0} katılımcı</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  filterBtnActive: {
    backgroundColor: '#b91c1c',
    borderColor: '#b91c1c',
  },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dateBadge: {
    width: 52,
    height: 56,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  dateBadgePast: { backgroundColor: '#f3f4f6' },
  dateBadgeDay: { fontSize: 20, fontWeight: '800', color: '#b91c1c', lineHeight: 24 },
  dateBadgeMonth: { fontSize: 10, fontWeight: '700', color: '#b91c1c', letterSpacing: 0.5 },
  cardContent: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827', lineHeight: 20 },
  upcomingBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  upcomingBadgeText: { fontSize: 10, fontWeight: '700', color: '#065f46' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  infoText: { fontSize: 12, color: '#6b7280' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Announcement } from '../../types';

type Props = { navigation: any };

export default function AnnouncementsScreen({ navigation }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filtered, setFiltered] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadAnnouncements = useCallback(async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*, members(full_name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    const items = data || [];
    setAnnouncements(items);
    setFiltered(items);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(announcements);
    } else {
      setFiltered(announcements.filter(a =>
        a.title.toLowerCase().includes(search.toLowerCase())
      ));
    }
  }, [search, announcements]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
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
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Duyuru ara..."
          placeholderTextColor="#9ca3af"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAnnouncements(); }} tintColor="#b91c1c" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="megaphone-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Duyuru bulunamadı</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('AnnouncementDetail', { id: item.id })}
            activeOpacity={0.7}
          >
            <View style={styles.cardTop}>
              <View style={styles.iconBg}>
                <Ionicons name="megaphone" size={18} color="#b91c1c" />
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
                {(item as any).members?.full_name && (
                  <Text style={styles.cardAuthor}>{(item as any).members?.full_name}</Text>
                )}
              </View>
              {item.expires_at && new Date(item.expires_at) > new Date() && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Aktif</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardPreview} numberOfLines={2}>
              {item.content.replace(/<[^>]*>/g, '').trim()}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.readMore}>Devamını Oku</Text>
              <Ionicons name="arrow-forward" size={14} color="#b91c1c" />
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
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
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardMeta: { flex: 1 },
  cardDate: { fontSize: 12, color: '#6b7280' },
  cardAuthor: { fontSize: 12, color: '#374151', fontWeight: '500', marginTop: 1 },
  activeBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  activeBadgeText: { fontSize: 11, color: '#15803d', fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6, lineHeight: 22 },
  cardPreview: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readMore: { fontSize: 13, color: '#b91c1c', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
});

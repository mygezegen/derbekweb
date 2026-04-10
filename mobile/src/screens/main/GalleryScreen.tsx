import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Gallery } from '../../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

type Props = { navigation: any };

type GalleryWithCount = Gallery & { image_count: number };

export default function GalleryScreen({ navigation }: Props) {
  const [galleries, setGalleries] = useState<GalleryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGalleries = useCallback(async () => {
    const { data } = await supabase
      .from('galleries')
      .select('*, gallery_images(id)')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    const items = (data || []).map(g => ({
      ...g,
      image_count: g.gallery_images?.length || 0,
    }));
    setGalleries(items);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadGalleries(); }, [loadGalleries]);

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
      data={galleries}
      keyExtractor={item => item.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGalleries(); }} tintColor="#b91c1c" />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>Galeri bulunamadı</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('GalleryDetail', { galleryId: item.id, title: item.title })}
          activeOpacity={0.7}
        >
          {item.cover_image_url ? (
            <Image source={{ uri: item.cover_image_url }} style={styles.cover} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="images" size={36} color="#d1d5db" />
            </View>
          )}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.countRow}>
              <Ionicons name="images-outline" size={12} color="#9ca3af" />
              <Text style={styles.countText}>{item.image_count} medya</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  row: { justifyContent: 'space-between' },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cover: { width: '100%', height: CARD_WIDTH * 0.75, backgroundColor: '#f3f4f6' },
  coverPlaceholder: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#1f2937', marginBottom: 4, lineHeight: 18 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countText: { fontSize: 11, color: '#9ca3af' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { GalleryImage } from '../../types';

const { width, height } = Dimensions.get('window');
const ITEM_SIZE = (width - 4) / 3;

type Props = { route: any };

export default function GalleryDetailScreen({ route }: Props) {
  const { galleryId } = route.params;
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from('gallery_images')
      .select('*')
      .eq('gallery_id', galleryId)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        setImages(data || []);
        setLoading(false);
      });
  }, [galleryId]);

  const imageItems = images.filter(img => img.media_type === 'image');

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
        data={images}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="images-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Bu galeride medya yok</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => {
              if (item.media_type === 'image') {
                const imgIndex = imageItems.findIndex(i => i.id === item.id);
                setSelectedIndex(imgIndex >= 0 ? imgIndex : null);
              }
            }}
            activeOpacity={0.8}
          >
            {item.media_type === 'image' ? (
              <Image source={{ uri: item.image_url }} style={styles.gridImage} />
            ) : (
              <View style={styles.videoThumb}>
                <Ionicons
                  name={item.media_type === 'youtube' ? 'logo-youtube' : 'play-circle'}
                  size={28}
                  color="#fff"
                />
                <Text style={styles.videoLabel}>
                  {item.media_type === 'youtube' ? 'YouTube' : 'Video'}
                </Text>
              </View>
            )}
            {item.caption ? (
              <View style={styles.captionOverlay}>
                <Text style={styles.captionText} numberOfLines={1}>{item.caption}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
      />

      <Modal visible={selectedIndex !== null} transparent animationType="fade" onRequestClose={() => setSelectedIndex(null)}>
        <StatusBar hidden />
        <View style={styles.lightbox}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setSelectedIndex(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {selectedIndex !== null && imageItems[selectedIndex] && (
            <Image
              source={{ uri: imageItems[selectedIndex].image_url }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
          {selectedIndex !== null && imageItems[selectedIndex]?.caption ? (
            <View style={styles.lightboxCaption}>
              <Text style={styles.lightboxCaptionText}>{imageItems[selectedIndex].caption}</Text>
            </View>
          ) : null}
          <View style={styles.lightboxNav}>
            <TouchableOpacity
              onPress={() => setSelectedIndex(i => i !== null && i > 0 ? i - 1 : i)}
              disabled={selectedIndex === 0}
              style={[styles.navBtn, selectedIndex === 0 && styles.navBtnDisabled]}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.navCounter}>{(selectedIndex || 0) + 1} / {imageItems.length}</Text>
            <TouchableOpacity
              onPress={() => setSelectedIndex(i => i !== null && i < imageItems.length - 1 ? i + 1 : i)}
              disabled={selectedIndex === imageItems.length - 1}
              style={[styles.navBtn, selectedIndex === imageItems.length - 1 && styles.navBtnDisabled]}
            >
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  grid: { paddingBottom: 16 },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: 0.5,
    backgroundColor: '#111',
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: { width: '100%', height: '100%' },
  videoThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  videoLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  captionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  captionText: { fontSize: 10, color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12, backgroundColor: '#f9fafb', flex: 1 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  lightboxImage: { width, height: height * 0.75 },
  lightboxCaption: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  lightboxCaptionText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center' },
  lightboxNav: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  navBtn: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  navBtnDisabled: { opacity: 0.3 },
  navCounter: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

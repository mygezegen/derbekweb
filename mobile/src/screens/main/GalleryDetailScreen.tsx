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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { GalleryImage } from '../../types';

const { width, height } = Dimensions.get('window');
const ITEM_SIZE = (width - 4) / 3;

type Props = { route: any; navigation: any };

type MediaType = GalleryImage['media_type'];

function getMediaIcon(type: MediaType): { name: any; color: string; label: string } {
  switch (type) {
    case 'youtube':     return { name: 'logo-youtube',   color: '#ff0000', label: 'YouTube' };
    case 'instagram':   return { name: 'logo-instagram', color: '#e1306c', label: 'Instagram' };
    case 'facebook':
    case 'facebook_embed': return { name: 'logo-facebook', color: '#1877f2', label: 'Facebook' };
    default:            return { name: 'play-circle',    color: '#fff',     label: 'Video' };
  }
}

function getOpenUrl(item: GalleryImage): string | null {
  if (item.video_url) return item.video_url;
  if (item.image_url && item.media_type !== 'image') return item.image_url;
  return null;
}

function getThumbnailUrl(item: GalleryImage): string | null {
  // For image type use image_url directly; for others it may also be a thumbnail or null
  if (item.media_type === 'image') return item.image_url || null;
  // Some entries store a thumbnail image_url even for social media types
  if (item.image_url && !item.image_url.includes('instagram.com') && !item.image_url.includes('facebook.com') && !item.image_url.includes('youtube.com')) {
    return item.image_url;
  }
  return null;
}

export default function GalleryDetailScreen({ route }: Props) {
  const { galleryId } = route.params;
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  const imageOnlyItems = images.filter(img => img.media_type === 'image');

  const handleItemPress = (item: GalleryImage, index: number) => {
    if (item.media_type === 'image') {
      const imgIdx = imageOnlyItems.findIndex(i => i.id === item.id);
      if (imgIdx >= 0) setLightboxIndex(imgIdx);
    } else {
      const url = getOpenUrl(item);
      if (url) Linking.openURL(url).catch(() => {});
    }
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
      <FlatList
        data={images}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={images.length === 0 ? styles.emptyContainer : styles.grid}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="images-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Bu galeride medya yok</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const thumb = getThumbnailUrl(item);
          const isImage = item.media_type === 'image';
          const mediaInfo = isImage ? null : getMediaIcon(item.media_type);

          return (
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleItemPress(item, index)}
              activeOpacity={0.8}
            >
              {thumb ? (
                <Image source={{ uri: thumb }} style={styles.gridImage} />
              ) : (
                <View style={[styles.gridImage, styles.mediaBg]} />
              )}

              {/* Overlay for non-image media */}
              {!isImage && mediaInfo && (
                <View style={styles.mediaOverlay}>
                  <View style={styles.mediaIconCircle}>
                    <Ionicons name={mediaInfo.name} size={22} color={mediaInfo.color} />
                  </View>
                  <Text style={styles.mediaLabel}>{mediaInfo.label}</Text>
                </View>
              )}

              {item.caption ? (
                <View style={styles.captionOverlay}>
                  <Text style={styles.captionText} numberOfLines={1}>{item.caption}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      {/* Lightbox for images */}
      <Modal
        visible={lightboxIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxIndex(null)}
      >
        <StatusBar hidden />
        <View style={styles.lightbox}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxIndex(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {lightboxIndex !== null && imageOnlyItems[lightboxIndex] && (
            <Image
              source={{ uri: imageOnlyItems[lightboxIndex].image_url }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}

          {lightboxIndex !== null && imageOnlyItems[lightboxIndex]?.caption ? (
            <View style={styles.lightboxCaption}>
              <Text style={styles.lightboxCaptionText}>{imageOnlyItems[lightboxIndex].caption}</Text>
            </View>
          ) : null}

          {imageOnlyItems.length > 1 && (
            <View style={styles.lightboxNav}>
              <TouchableOpacity
                onPress={() => setLightboxIndex(i => (i !== null && i > 0 ? i - 1 : i))}
                disabled={lightboxIndex === 0}
                style={[styles.navBtn, lightboxIndex === 0 && styles.navBtnDisabled]}
              >
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.navCounter}>
                {(lightboxIndex || 0) + 1} / {imageOnlyItems.length}
              </Text>
              <TouchableOpacity
                onPress={() => setLightboxIndex(i => (i !== null && i < imageOnlyItems.length - 1 ? i + 1 : i))}
                disabled={lightboxIndex === imageOnlyItems.length - 1}
                style={[styles.navBtn, lightboxIndex === imageOnlyItems.length - 1 && styles.navBtnDisabled]}
              >
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  grid: { paddingBottom: 16 },
  emptyContainer: { flex: 1 },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: 0.5,
    backgroundColor: '#1a1a2e',
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: { width: '100%', height: '100%' },
  mediaBg: { backgroundColor: '#1a1a2e' },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 4,
  },
  mediaIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaLabel: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '700', letterSpacing: 0.3 },
  captionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  captionText: { fontSize: 10, color: '#fff' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#f9fafb',
    paddingTop: 80,
  },
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
    backgroundColor: 'rgba(255,255,255,0.12)',
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

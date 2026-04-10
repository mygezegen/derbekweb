import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Announcement } from '../../types';

type Props = { route: any };

export default function AnnouncementDetailScreen({ route }: Props) {
  const { id } = route.params;
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('announcements')
      .select('*, members(full_name)')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setAnnouncement(data);
        setLoading(false);
      });
  }, [id]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#b91c1c" />
      </View>
    );
  }

  if (!announcement) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Duyuru bulunamadı</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="megaphone" size={24} color="#3b82f6" />
        </View>
        <Text style={styles.title}>{announcement.title}</Text>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
          <Text style={styles.metaText}>{formatDate(announcement.created_at)}</Text>
        </View>
        {(announcement as any).members?.full_name && (
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={14} color="#9ca3af" />
            <Text style={styles.metaText}>{(announcement as any).members?.full_name}</Text>
          </View>
        )}
      </View>

      {announcement.expires_at && (
        <View style={styles.expiryBanner}>
          <Ionicons name="time-outline" size={14} color="#92400e" />
          <Text style={styles.expiryText}>
            Son geçerlilik: {formatDate(announcement.expires_at)}
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.bodyText}>{stripHtml(announcement.content)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFound: { fontSize: 16, color: '#9ca3af' },
  header: { marginBottom: 16 },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', lineHeight: 30 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#6b7280' },
  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  expiryText: { fontSize: 13, color: '#92400e', fontWeight: '500' },
  body: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  bodyText: { fontSize: 15, color: '#374151', lineHeight: 24 },
});

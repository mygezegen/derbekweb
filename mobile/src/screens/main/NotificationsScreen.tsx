import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { PushNotification } from '../../types';

type Props = { navigation: any };

export default function NotificationsScreen({ navigation }: Props) {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('push_notifications')
      .select('*, members(full_name)')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(50);
    setNotifications(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Az önce';
    if (diffMin < 60) return `${diffMin} dakika önce`;
    if (diffHr < 24) return `${diffHr} saat önce`;
    if (diffDay < 7) return `${diffDay} gün önce`;
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getRecipientLabel = (type: string) => {
    return type === 'all' ? 'Tüm Kullanıcılar' : 'Belirli Üyeler';
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
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadNotifications(); }}
            tintColor="#b91c1c"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="notifications-off-outline" size={40} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>Bildirim Yok</Text>
            <Text style={styles.emptySubtitle}>Henüz gönderilmiş bildirim bulunmuyor</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.iconBg}>
                <Ionicons name="notifications" size={20} color="#b91c1c" />
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardMessage} numberOfLines={3}>{item.body}</Text>
              <View style={styles.cardMeta}>
                <View style={styles.metaTag}>
                  <Ionicons name="people-outline" size={11} color="#6b7280" />
                  <Text style={styles.metaText}>{getRecipientLabel(item.recipient_type)}</Text>
                </View>
                {item.total_sent > 0 && (
                  <View style={[styles.metaTag, styles.metaTagGreen]}>
                    <Ionicons name="checkmark-circle-outline" size={11} color="#15803d" />
                    <Text style={[styles.metaText, styles.metaTextGreen]}>{item.total_sent} cihaz</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardFooter}>
                {item.members?.full_name && (
                  <Text style={styles.sender}>{item.members.full_name}</Text>
                )}
                <Text style={styles.cardDate}>{formatDate(item.sent_at || item.created_at)}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLeft: { marginRight: 12 },
  iconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 21,
  },
  cardMessage: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 19,
    marginBottom: 10,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  metaTagGreen: {
    backgroundColor: '#f0fdf4',
  },
  metaText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  metaTextGreen: {
    color: '#15803d',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sender: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 100,
    gap: 12,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

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

type Survey = {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'closed';
  ends_at?: string;
  is_anonymous: boolean;
  show_results_to_members: boolean;
  created_at: string;
  question_count?: number;
};

type Props = { navigation: any };

export default function SurveysScreen({ navigation }: Props) {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSurveys = useCallback(async () => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('surveys')
      .select('*, survey_questions(id)')
      .eq('status', 'published')
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order('created_at', { ascending: false });

    const mapped = (data || []).map(s => ({
      ...s,
      question_count: s.survey_questions?.length || 0,
    }));
    setSurveys(mapped);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadSurveys(); }, [loadSurveys]);

  const formatDate = (str?: string) => {
    if (!str) return null;
    return new Date(str).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const isExpiringSoon = (str?: string) => {
    if (!str) return false;
    const diff = new Date(str).getTime() - Date.now();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
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
        data={surveys}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadSurveys(); }}
            tintColor="#b91c1c"
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Anketler</Text>
            <Text style={styles.headerSub}>Görüşlerinizi paylaşın</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={52} color="#d1d5db" />
            <Text style={styles.emptyTitle}>Aktif anket yok</Text>
            <Text style={styles.emptyText}>Şu anda katılabileceğiniz anket bulunmuyor.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('SurveyDetail', { id: item.id, title: item.title })}
            activeOpacity={0.7}
          >
            <View style={styles.cardIconWrap}>
              <Ionicons name="clipboard-outline" size={24} color="#b91c1c" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="help-circle-outline" size={13} color="#9ca3af" />
                  <Text style={styles.metaText}>{item.question_count} soru</Text>
                </View>
                {item.is_anonymous && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Anonim</Text>
                  </View>
                )}
                {item.ends_at && (
                  <View style={[styles.badge, isExpiringSoon(item.ends_at) && styles.badgeWarn]}>
                    <Ionicons
                      name="time-outline"
                      size={11}
                      color={isExpiringSoon(item.ends_at) ? '#d97706' : '#6b7280'}
                    />
                    <Text style={[styles.badgeText, isExpiringSoon(item.ends_at) && styles.badgeWarnText]}>
                      {formatDate(item.ends_at)}
                    </Text>
                  </View>
                )}
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
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
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
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4, lineHeight: 20 },
  cardDesc: { fontSize: 12, color: '#6b7280', marginBottom: 8, lineHeight: 17 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: '#9ca3af' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  badgeWarn: { backgroundColor: '#fef3c7' },
  badgeWarnText: { color: '#d97706' },
});

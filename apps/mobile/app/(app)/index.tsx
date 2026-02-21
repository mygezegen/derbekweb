import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import type { Member, Announcement, Event } from '@dernek/core';

interface Stats {
  totalMembers: number;
  pendingDues: number;
  upcomingEvents: number;
  recentAnnouncements: number;
}

export default function DashboardScreen() {
  const [member, setMember] = useState<Member | null>(null);
  const [stats, setStats] = useState<Stats>({ totalMembers: 0, pendingDues: 0, upcomingEvents: 0, recentAnnouncements: 0 });
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [memberRes, membersRes, announcementsRes, eventsRes] = await Promise.all([
      supabase.from('members').select('*').eq('auth_id', user.id).maybeSingle(),
      supabase.from('members').select('id', { count: 'exact', head: true }),
      supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(3),
      supabase.from('events').select('*').gte('event_date', new Date().toISOString()).order('event_date', { ascending: true }).limit(3),
    ]);

    setMember(memberRes.data);
    setStats(prev => ({
      ...prev,
      totalMembers: membersRes.count || 0,
      recentAnnouncements: announcementsRes.data?.length || 0,
      upcomingEvents: eventsRes.data?.length || 0,
    }));
    setRecentAnnouncements(announcementsRes.data || []);
    setUpcomingEvents(eventsRes.data || []);
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  const statCards = [
    { label: 'Toplam Üye', value: stats.totalMembers, color: '#1e40af', bg: '#eff6ff' },
    { label: 'Etkinlik', value: stats.upcomingEvents, color: '#059669', bg: '#ecfdf5' },
    { label: 'Duyuru', value: stats.recentAnnouncements, color: '#d97706', bg: '#fffbeb' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1e40af" />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Merhaba,</Text>
          <Text style={styles.memberName}>{member?.full_name || 'Üye'}</Text>
        </View>
        <View style={[styles.roleBadge, member?.is_admin && styles.roleBadgeAdmin]}>
          <Text style={[styles.roleText, member?.is_admin && styles.roleTextAdmin]}>
            {member?.is_root ? 'Root' : member?.is_admin ? 'Yönetici' : 'Üye'}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        {statCards.map((card) => (
          <View key={card.label} style={[styles.statCard, { backgroundColor: card.bg }]}>
            <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      {recentAnnouncements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Son Duyurular</Text>
          {recentAnnouncements.map((ann) => (
            <View key={ann.id} style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={2}>{ann.title}</Text>
              <Text style={styles.cardDate}>{new Date(ann.created_at).toLocaleDateString('tr-TR')}</Text>
            </View>
          ))}
        </View>
      )}

      {upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yaklaşan Etkinlikler</Text>
          {upcomingEvents.map((event) => (
            <View key={event.id} style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={1}>{event.title}</Text>
              <Text style={styles.cardDate}>
                {new Date(event.event_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                {event.location ? ` • ${event.location}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e40af',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
  },
  greeting: { fontSize: 14, color: '#bfdbfe', fontWeight: '500' },
  memberName: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 2 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  roleBadgeAdmin: { backgroundColor: '#fbbf24' },
  roleText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  roleTextAdmin: { color: '#1e40af' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  statCard: {
    flex: 1, borderRadius: 12, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2, textAlign: 'center' },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  cardDate: { fontSize: 12, color: '#64748b' },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Announcement, Event } from '../../types';

type Props = {
  navigation: any;
};

type Stats = {
  totalAnnouncements: number;
  upcomingEvents: number;
  myPendingDues: number;
  totalMembers: number;
};

export default function HomeScreen({ navigation }: Props) {
  const { member, user, signOut } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalAnnouncements: 0, upcomingEvents: 0, myPendingDues: 0, totalMembers: 0 });
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString();

      const [announcementsRes, eventsRes, membersRes, duesRes] = await Promise.all([
        supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('events')
          .select('*')
          .gte('event_date', today.split('T')[0])
          .order('event_date', { ascending: true })
          .limit(3),
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('is_active', true),
        member ? supabase.from('member_dues').select('id', { count: 'exact', head: true }).eq('member_id', member.id).in('status', ['pending', 'overdue']) : Promise.resolve({ count: 0 }),
      ]);

      setRecentAnnouncements(announcementsRes.data || []);
      setUpcomingEvents(eventsRes.data || []);
      setStats({
        totalAnnouncements: announcementsRes.data?.length || 0,
        upcomingEvents: eventsRes.data?.length || 0,
        myPendingDues: (duesRes as any).count || 0,
        totalMembers: membersRes.count || 0,
      });
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [member]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b91c1c" />}
    >
      <LinearGradient colors={['#b91c1c', '#7f1d1d']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{user ? 'Merhaba,' : 'Hoş Geldiniz'}</Text>
              {user && <Text style={styles.memberName}>{member?.full_name || 'Üye'}</Text>}
            </View>
            {user ? (
              <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
                <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => navigation.navigate('AuthTab')} style={styles.loginBtn}>
                <Ionicons name="log-in-outline" size={18} color="#b91c1c" />
                <Text style={styles.loginBtnText}>Giriş Yap</Text>
              </TouchableOpacity>
            )}
          </View>
          {user && (
            <View style={styles.badge}>
              <Ionicons name={member?.is_admin ? 'shield-checkmark' : 'person'} size={12} color="#fff" />
              <Text style={styles.badgeText}>{member?.is_root ? 'Root Yönetici' : member?.is_admin ? 'Yönetici' : 'Üye'}</Text>
            </View>
          )}
          {!user && (
            <Text style={styles.guestSubtitle}>Çüngüş Çaybaşı Köyü Derneği</Text>
          )}
        </View>
      </LinearGradient>

      <View style={styles.statsGrid}>
        <StatCard icon="megaphone" label="Duyurular" value={stats.totalAnnouncements} color="#b91c1c" />
        <StatCard icon="calendar" label="Yaklaşan Etkinlik" value={stats.upcomingEvents} color="#16a34a" />
        {user && <StatCard icon="wallet" label="Bekleyen Aidat" value={stats.myPendingDues} color="#d97706" />}
        <StatCard icon="people" label="Toplam Üye" value={stats.totalMembers} color="#0369a1" />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Son Duyurular</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AnnouncementsTab')}>
            <Text style={styles.seeAll}>Tümünü Gör</Text>
          </TouchableOpacity>
        </View>
        {recentAnnouncements.length === 0 ? (
          <EmptyCard text="Henüz duyuru yok" />
        ) : (
          recentAnnouncements.map(a => (
            <TouchableOpacity
              key={a.id}
              style={styles.card}
              onPress={() => navigation.navigate('AnnouncementsTab', { screen: 'AnnouncementDetail', params: { id: a.id } })}
              activeOpacity={0.7}
            >
              <View style={[styles.cardAccent, { backgroundColor: '#b91c1c' }]} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>{a.title}</Text>
                <Text style={styles.cardDate}>{formatDate(a.created_at)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Yaklaşan Etkinlikler</Text>
          <TouchableOpacity onPress={() => navigation.navigate('EventsTab')}>
            <Text style={styles.seeAll}>Tümünü Gör</Text>
          </TouchableOpacity>
        </View>
        {upcomingEvents.length === 0 ? (
          <EmptyCard text="Yaklaşan etkinlik yok" />
        ) : (
          upcomingEvents.map(e => (
            <TouchableOpacity
              key={e.id}
              style={styles.card}
              onPress={() => navigation.navigate('EventsTab', { screen: 'EventDetail', params: { id: e.id } })}
              activeOpacity={0.7}
            >
              <View style={[styles.cardAccent, { backgroundColor: '#16a34a' }]} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>{e.title}</Text>
                <View style={styles.cardMeta}>
                  <Ionicons name="calendar-outline" size={13} color="#6b7280" />
                  <Text style={styles.cardDate}> {formatDate(e.event_date || e.date)}</Text>
                  {e.location ? (
                    <>
                      <Text style={styles.cardDate}>  </Text>
                      <Ionicons name="location-outline" size={13} color="#6b7280" />
                      <Text style={styles.cardDate}> {e.location}</Text>
                    </>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={[styles.section, { marginBottom: 32 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
        </View>
        <View style={styles.quickGrid}>
          <QuickBtn icon="images" label="Galeri" color="#b91c1c" onPress={() => navigation.navigate('GalleryList')} />
          <QuickBtn icon="calendar" label="Etkinlikler" color="#16a34a" onPress={() => navigation.navigate('EventsTab')} />
          <QuickBtn icon="people" label="Üyeler" color="#0369a1" onPress={() => navigation.navigate('MembersTab')} />
          {user ? (
            <QuickBtn icon="wallet" label="Aidatlarım" color="#d97706" onPress={() => navigation.navigate('DuesTab')} />
          ) : (
            <QuickBtn icon="log-in" label="Giriş Yap" color="#d97706" onPress={() => navigation.navigate('AuthTab')} />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <View style={[statStyles.card, { borderTopColor: color }]}>
      <View style={[statStyles.iconBg, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function QuickBtn({ icon, label, color, onPress }: { icon: any; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={quickStyles.btn} onPress={onPress} activeOpacity={0.7}>
      <View style={[quickStyles.iconBg, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <Text style={quickStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 28, paddingHorizontal: 24 },
  headerContent: {},
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '400' },
  memberName: { fontSize: 24, color: '#fff', fontWeight: '800', marginTop: 2 },
  logoutBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loginBtnText: { fontSize: 13, fontWeight: '700', color: '#b91c1c' },
  guestSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8, fontWeight: '500' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
    gap: 4,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    marginTop: -12,
  },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 13, color: '#b91c1c', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardAccent: { width: 4, height: '100%', borderRadius: 2, marginRight: 12, alignSelf: 'stretch', minHeight: 40 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  cardDate: { fontSize: 12, color: '#6b7280' },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});

const statStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    width: '47%',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: { fontSize: 24, fontWeight: '800', color: '#111827' },
  label: { fontSize: 12, color: '#6b7280', marginTop: 2, fontWeight: '500' },
});

const quickStyles = StyleSheet.create({
  btn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
});

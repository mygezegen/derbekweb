import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Event, EventParticipant } from '../../types';
import { stripHtml } from '../../lib/htmlUtils';

type Props = { route: any };

export default function EventDetailScreen({ route }: Props) {
  const { id } = route.params;
  const { member } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [myParticipation, setMyParticipation] = useState<EventParticipant | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [joining, setJoining] = useState(false);

  const loadEvent = async () => {
    const [eventRes, participantsRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).maybeSingle(),
      supabase.from('event_participants').select('*').eq('event_id', id),
    ]);
    setEvent(eventRes.data);
    const participants = participantsRes.data || [];
    setParticipantCount(participants.filter(p => p.status === 'attending').length);
    if (member) {
      setMyParticipation(participants.find(p => p.member_id === member.id) || null);
    }
    setLoading(false);
  };

  useEffect(() => { loadEvent(); }, [id]);

  const handleJoin = async () => {
    if (!member) return;
    setJoining(true);
    try {
      if (myParticipation) {
        await supabase.from('event_participants').delete().eq('id', myParticipation.id);
        setMyParticipation(null);
        setParticipantCount(c => c - 1);
      } else {
        const { data } = await supabase
          .from('event_participants')
          .insert({ event_id: id, member_id: member.id, status: 'attending' })
          .select()
          .single();
        setMyParticipation(data);
        setParticipantCount(c => c + 1);
      }
    } catch {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
    } finally {
      setJoining(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Tarih belirtilmedi';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#b91c1c" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Etkinlik bulunamadı</Text>
      </View>
    );
  }

  const isUpcoming = event.event_date ? new Date(event.event_date) >= new Date() : false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="calendar" size={32} color="#b91c1c" />
        </View>
        <Text style={styles.title}>{event.title}</Text>
        {isUpcoming && (
          <View style={styles.upcomingBadge}>
            <Ionicons name="time" size={12} color="#15803d" />
            <Text style={styles.upcomingText}>Yaklaşan Etkinlik</Text>
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        <InfoRow icon="calendar-outline" label="Tarih" value={formatDate(event.event_date || event.date)} />
        {event.time && <InfoRow icon="time-outline" label="Saat" value={event.time} />}
        {event.location && <InfoRow icon="location-outline" label="Konum" value={event.location} />}
        <InfoRow icon="people-outline" label="Katılımcı" value={`${participantCount} kişi`} />
      </View>

      {event.description && (
        <View style={styles.descCard}>
          <Text style={styles.descTitle}>Etkinlik Hakkında</Text>
          <Text style={styles.descText}>{stripHtml(event.description)}</Text>
        </View>
      )}

      {isUpcoming && (
        <TouchableOpacity
          style={[styles.joinBtn, myParticipation ? styles.leaveBtn : styles.attendBtn, joining && styles.btnDisabled]}
          onPress={handleJoin}
          disabled={joining}
        >
          <Ionicons
            name={myParticipation ? 'close-circle-outline' : 'checkmark-circle-outline'}
            size={20}
            color="#fff"
          />
          <Text style={styles.joinBtnText}>
            {joining ? 'İşleniyor...' : myParticipation ? 'Katılımdan Vazgeç' : 'Katılacağım'}
          </Text>
        </TouchableOpacity>
      )}

      {myParticipation && (
        <View style={styles.myStatusCard}>
          <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
          <Text style={styles.myStatusText}>Bu etkinliğe katılacaksınız</Text>
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconBg}>
        <Ionicons name={icon} size={16} color="#6b7280" />
      </View>
      <View>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  iconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 11, color: '#9ca3af', fontWeight: '500', marginBottom: 1 },
  value: { fontSize: 14, color: '#111827', fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFound: { fontSize: 16, color: '#9ca3af' },
  hero: { alignItems: 'flex-start', marginBottom: 20 },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', lineHeight: 32 },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 10,
  },
  upcomingText: { fontSize: 12, color: '#15803d', fontWeight: '600' },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  descCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  descTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  descText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  joinBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  attendBtn: { backgroundColor: '#16a34a', shadowColor: '#16a34a' },
  leaveBtn: { backgroundColor: '#dc2626', shadowColor: '#dc2626' },
  btnDisabled: { opacity: 0.6 },
  joinBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  myStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 12,
  },
  myStatusText: { fontSize: 14, color: '#15803d', fontWeight: '600' },
});

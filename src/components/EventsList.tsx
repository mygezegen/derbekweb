import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Event, EventParticipant } from '../types';
import { Trash2, Plus, Calendar, MapPin, Check, X, Users, List, CalendarDays } from 'lucide-react';
import { CalendarView } from './CalendarView';
import { logAction, getCurrentMemberId } from '../lib/auditLog';
import { HTMLEditor } from './HTMLEditor';

interface EventsListProps {
  events: Event[];
  isAdmin: boolean;
  onRefresh: () => void;
}

export function EventsList({ events, isAdmin, onRefresh }: EventsListProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [myParticipation, setMyParticipation] = useState<Record<string, EventParticipant | null>>({});
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    loadCurrentMember();
  }, []);

  useEffect(() => {
    if (currentMemberId) {
      loadParticipationData();
    }
  }, [currentMemberId, events]);

  const loadCurrentMember = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (memberData) {
        setCurrentMemberId(memberData.id);
      }
    } catch (error) {
      console.error('Error loading current member:', error);
    }
  };

  const loadParticipationData = async () => {
    if (!currentMemberId) return;

    try {
      const eventIds = events.map(e => e.id);

      const { data: participationData } = await supabase
        .from('event_participants')
        .select('*')
        .eq('member_id', currentMemberId)
        .in('event_id', eventIds);

      const participationMap: Record<string, EventParticipant | null> = {};
      participationData?.forEach(p => {
        participationMap[p.event_id] = p;
      });
      setMyParticipation(participationMap);

      const counts: Record<string, number> = {};
      for (const eventId of eventIds) {
        const { count } = await supabase
          .from('event_participants')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('status', 'attending');
        counts[eventId] = count || 0;
      }
      setParticipantCounts(counts);
    } catch (error) {
      console.error('Error loading participation data:', error);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (!memberData) throw new Error('Member not found');

      const fullDateTime = new Date(`${eventDate}T${eventTime}`).toISOString();

      const { error: insertError } = await supabase
        .from('events')
        .insert({
          title,
          description,
          event_date: fullDateTime,
          location,
          created_by: memberData.id,
        });

      if (insertError) throw insertError;

      const logMemberId = await getCurrentMemberId();
      if (logMemberId) {
        await logAction(logMemberId, 'create', 'events', undefined, undefined, {
          title,
          description,
          event_date: fullDateTime,
          location
        });
      }

      setTitle('');
      setDescription('');
      setEventDate('');
      setEventTime('');
      setLocation('');
      setShowForm(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating event');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Etkinliği silmek istediğinize emin misiniz?')) return;

    try {
      const event = events.find(e => e.id === id);

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const logMemberId = await getCurrentMemberId();
      if (logMemberId && event) {
        await logAction(logMemberId, 'delete', 'events', id, {
          title: event.title,
          description: event.description,
          event_date: event.event_date,
          location: event.location
        });
      }

      onRefresh();
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleParticipationToggle = async (eventId: string, newStatus: 'attending' | 'not_attending') => {
    if (!currentMemberId) return;

    try {
      const existing = myParticipation[eventId];

      if (existing) {
        if (existing.status === newStatus) {
          await supabase
            .from('event_participants')
            .delete()
            .eq('id', existing.id);
        } else {
          await supabase
            .from('event_participants')
            .update({ status: newStatus })
            .eq('id', existing.id);
        }
      } else {
        await supabase
          .from('event_participants')
          .insert({
            event_id: eventId,
            member_id: currentMemberId,
            status: newStatus
          });
      }

      await loadParticipationData();
    } catch (error) {
      console.error('Error updating participation:', error);
    }
  };

  const upcomingEvents = events.filter(e => new Date(e.event_date) > new Date());
  const pastEvents = events.filter(e => new Date(e.event_date) <= new Date());

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Etkinlikler</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <List size={18} />
              Liste
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                viewMode === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <CalendarDays size={18} />
              Takvim
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Yeni Etkinlik
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreateEvent} className="mb-8 p-4 bg-gray-50 rounded-lg">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Başlık
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Etkinlik başlığı"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Konum
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Etkinlik konumu"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarih
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saat
              </label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Açıklama
            </label>
            <HTMLEditor
              value={description}
              onChange={setDescription}
              placeholder="Etkinlik açıklaması yazın..."
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Yükleniyor...' : 'Oluştur'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setTitle('');
                setDescription('');
                setEventDate('');
                setEventTime('');
                setLocation('');
                setError('');
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              İptal
            </button>
          </div>
        </form>
      )}

      {viewMode === 'calendar' ? (
        <CalendarView
          events={events}
          myParticipation={myParticipation}
          participantCounts={participantCounts}
          onParticipationToggle={handleParticipationToggle}
        />
      ) : (
        <>
          {upcomingEvents.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Yaklaşan Etkinlikler</h3>
          <div className="space-y-4">
            {upcomingEvents.map((event) => {
              const participation = myParticipation[event.id];
              const isAttending = participation?.status === 'attending';
              const isNotAttending = participation?.status === 'not_attending';
              const attendeeCount = participantCounts[event.id] || 0;

              return (
                <div key={event.id} className="border-l-4 border-green-500 bg-green-50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        {event.title}
                      </h4>
                      <div className="space-y-1 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          {formatEventDate(event.event_date)}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin size={16} />
                            {event.location}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users size={16} />
                          {attendeeCount} katılımcı
                        </div>
                      </div>
                      {event.description && (
                        <div
                          className="text-gray-600 mb-3 announcement-content"
                          dangerouslySetInnerHTML={{ __html: event.description }}
                        />
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleParticipationToggle(event.id, 'attending')}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            isAttending
                              ? 'bg-green-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <Check size={16} />
                          Katılacağım
                        </button>
                        <button
                          onClick={() => handleParticipationToggle(event.id, 'not_attending')}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            isNotAttending
                              ? 'bg-red-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <X size={16} />
                          Katılamayacağım
                        </button>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="ml-4 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pastEvents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Geçmiş Etkinlikler</h3>
          <div className="space-y-4">
            {pastEvents.map((event) => (
              <div key={event.id} className="border border-gray-200 rounded-lg p-4 opacity-75">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">
                      {event.title}
                    </h4>
                    <div className="space-y-1 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        {formatEventDate(event.event_date)}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={16} />
                          {event.location}
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <div
                        className="text-gray-600 announcement-content"
                        dangerouslySetInnerHTML={{ __html: event.description }}
                      />
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="ml-4 text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">Henüz etkinlik yok</p>
        </div>
      )}
        </>
      )}
    </div>
  );
}

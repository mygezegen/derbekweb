import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Event, EventParticipant } from '../types';
import { Trash2, Plus, Calendar, MapPin, Check, X, Users, List, CalendarDays, Image as ImageIcon, FileText } from 'lucide-react';
import { CalendarView } from './CalendarView';
import { logAction, getCurrentMemberId } from '../lib/auditLog';
import { HTMLEditor } from './HTMLEditor';
import { MemberSelectionModal } from './MemberSelectionModal';

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showParticipantReport, setShowParticipantReport] = useState(false);
  const [reportEventId, setReportEventId] = useState<string | null>(null);
  const [eventParticipants, setEventParticipants] = useState<any[]>([]);

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
          .eq('status', 'confirmed');
        counts[eventId] = count || 0;
      }
      setParticipantCounts(counts);
    } catch (error) {
      console.error('Error loading participation data:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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

      let imageUrl = '';
      let imagePublicId = '';

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `events/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
        imagePublicId = filePath;
      }

      const { error: insertError } = await supabase
        .from('events')
        .insert({
          title,
          description,
          event_date: fullDateTime,
          location,
          created_by: memberData.id,
          image_url: imageUrl || undefined,
          image_public_id: imagePublicId || undefined,
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
      setImageFile(null);
      setImagePreview('');
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

  const handleParticipationToggle = async (eventId: string, newStatus: 'confirmed' | 'cancelled') => {
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

  const handleAddParticipants = async (memberIds: string[]) => {
    if (!selectedEventId) return;

    try {
      const participants = memberIds.map(memberId => ({
        event_id: selectedEventId,
        member_id: memberId,
        status: 'confirmed'
      }));

      const { error } = await supabase
        .from('event_participants')
        .insert(participants);

      if (error) throw error;

      await loadParticipationData();
      setShowParticipantModal(false);
      setSelectedEventId(null);
    } catch (error) {
      console.error('Error adding participants:', error);
      alert('Katılımcılar eklenirken bir hata oluştu');
    }
  };

  const loadEventParticipants = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          *,
          members:member_id (
            full_name,
            email,
            phone
          )
        `)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false });

      if (error) throw error;

      setEventParticipants(data || []);
      setReportEventId(eventId);
      setShowParticipantReport(true);
    } catch (error) {
      console.error('Error loading event participants:', error);
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Etkinlik Görseli
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Önizleme"
                  className="max-w-xs rounded-lg border border-gray-300"
                />
              </div>
            )}
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
                setImageFile(null);
                setImagePreview('');
                setError('');
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              İptal
            </button>
          </div>
        </form>
      )}

      {showParticipantModal && (
        <MemberSelectionModal
          onClose={() => {
            setShowParticipantModal(false);
            setSelectedEventId(null);
          }}
          onSelect={handleAddParticipants}
          title="Katılımcı Ekle"
        />
      )}

      {showParticipantReport && reportEventId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">
                  Katılımcı Raporu
                </h3>
                <button
                  onClick={() => {
                    setShowParticipantReport(false);
                    setReportEventId(null);
                    setEventParticipants([]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-lg font-semibold text-gray-700">
                  Toplam Katılımcı: <span className="text-blue-600">{eventParticipants.length}</span>
                </p>
              </div>

              {eventParticipants.length === 0 ? (
                <p className="text-center text-gray-600 py-8">Henüz katılımcı yok</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left">Ad Soyad</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">E-posta</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Telefon</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Durum</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Kayıt Tarihi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventParticipants.map((participant) => (
                        <tr key={participant.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2">
                            {participant.members?.full_name || '-'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {participant.members?.email || '-'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {participant.members?.phone || '-'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              participant.status === 'confirmed'
                                ? 'bg-green-100 text-green-800'
                                : participant.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {participant.status === 'confirmed' ? 'Onaylandı' :
                               participant.status === 'pending' ? 'Bekliyor' : 'İptal'}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {new Date(participant.registered_at).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => {
                    const event = events.find(e => e.id === reportEventId);
                    const csv = [
                      ['Ad Soyad', 'E-posta', 'Telefon', 'Durum', 'Kayıt Tarihi'],
                      ...eventParticipants.map(p => [
                        p.members?.full_name || '',
                        p.members?.email || '',
                        p.members?.phone || '',
                        p.status === 'confirmed' ? 'Onaylandı' : p.status === 'pending' ? 'Bekliyor' : 'İptal',
                        new Date(p.registered_at).toLocaleDateString('tr-TR')
                      ])
                    ].map(row => row.join(',')).join('\n');

                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `${event?.title || 'etkinlik'}-katilimcilar.csv`;
                    link.click();
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  CSV İndir
                </button>
                <button
                  onClick={() => {
                    setShowParticipantReport(false);
                    setReportEventId(null);
                    setEventParticipants([]);
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
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
              const isAttending = participation?.status === 'confirmed';
              const isNotAttending = participation?.status === 'cancelled';
              const attendeeCount = participantCounts[event.id] || 0;

              return (
                <div key={event.id} className="border-l-4 border-green-500 bg-green-50 rounded-lg p-4">
                  {(event as any).image_url && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <img
                        src={(event as any).image_url}
                        alt={event.title}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
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
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleParticipationToggle(event.id, 'confirmed')}
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
                          onClick={() => handleParticipationToggle(event.id, 'cancelled')}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            isNotAttending
                              ? 'bg-red-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <X size={16} />
                          Katılamayacağım
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedEventId(event.id);
                                setShowParticipantModal(true);
                              }}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                              <Users size={16} />
                              Katılımcı Ekle
                            </button>
                            <button
                              onClick={() => loadEventParticipants(event.id)}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium bg-gray-700 text-white hover:bg-gray-800 transition-colors"
                            >
                              <FileText size={16} />
                              Katılımcı Raporu
                            </button>
                          </>
                        )}
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

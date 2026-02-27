import { useState, useEffect } from 'react';
import { Plus, List, Calendar as CalendarIcon } from 'lucide-react';
import { supabase, Event } from '../lib/supabase';
import { EventForm } from './EventForm';
import { EventList } from './EventList';

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error loading events:', error);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const handleSaveEvent = async () => {
    await loadEvents();
    setShowForm(false);
    setEditingEvent(null);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Bu etkinliği silmek istediğinizden emin misiniz?')) {
      return;
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Etkinlik silinirken bir hata oluştu.');
      console.error('Error deleting event:', error);
    } else {
      await loadEvents();
    }
  };

  return (
    <div className="flex-1 bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Etkinlikler</h1>
          <button
            onClick={() => {
              setEditingEvent(null);
              setShowForm(true);
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Etkinlik</span>
          </button>
        </div>
      </div>

      {showForm ? (
        <div className="p-6">
          <EventForm
            event={editingEvent}
            onSave={handleSaveEvent}
            onCancel={() => {
              setShowForm(false);
              setEditingEvent(null);
            }}
          />
        </div>
      ) : (
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center space-x-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded flex items-center space-x-2 text-sm ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <List className="w-4 h-4" />
                <span>Liste</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded flex items-center space-x-2 text-sm ${
                  viewMode === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Takvim</span>
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Yükleniyor...
              </div>
            ) : (
              <EventList
                events={events}
                viewMode={viewMode}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

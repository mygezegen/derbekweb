import { Edit2, Trash2 } from 'lucide-react';
import { Event } from '../lib/supabase';

type EventListProps = {
  events: Event[];
  viewMode: 'list' | 'calendar';
  onEdit: (event: Event) => void;
  onDelete: (id: string) => void;
};

export function EventList({ events, viewMode, onEdit, onDelete }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        Henüz etkinlik eklenmemiş.
      </div>
    );
  }

  if (viewMode === 'calendar') {
    return (
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-800">{event.title}</h3>
                <p className="text-sm text-gray-600">{event.location}</p>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => onEdit(event)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(event.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                <span className="font-medium">Tarih:</span> {new Date(event.date).toLocaleDateString('tr-TR')}
              </div>
              <div>
                <span className="font-medium">Saat:</span> {event.time}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Başlık</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Konum</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tarih</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Saat</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {events.map((event) => (
            <tr key={event.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-800">{event.title}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{event.location}</td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {new Date(event.date).toLocaleDateString('tr-TR')}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{event.time}</td>
              <td className="px-4 py-3 text-sm text-right">
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => onEdit(event)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="Düzenle"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(event.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

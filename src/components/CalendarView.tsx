import { useState } from 'react';
import { Event, EventParticipant } from '../types';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Users, Check, X } from 'lucide-react';

interface CalendarViewProps {
  events: Event[];
  myParticipation: Record<string, EventParticipant | null>;
  participantCounts: Record<string, number>;
  onParticipationToggle: (eventId: string, status: 'attending' | 'not_attending') => void;
}

export function CalendarView({
  events,
  myParticipation,
  participantCounts,
  onParticipationToggle
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.event_date);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50"></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayEvents = getEventsForDate(date);
    const isToday =
      date.getDate() === new Date().getDate() &&
      date.getMonth() === new Date().getMonth() &&
      date.getFullYear() === new Date().getFullYear();

    days.push(
      <div
        key={day}
        className={`h-24 border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
          isToday ? 'bg-blue-50 border-blue-300' : ''
        }`}
        onClick={() => setSelectedDate(date)}
      >
        <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
          {day}
        </div>
        {dayEvents.length > 0 && (
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map(event => (
              <div
                key={event.id}
                className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded truncate"
                title={event.title}
              >
                {formatEventTime(event.event_date)} - {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-600 px-2">
                +{dayEvents.length - 2} daha
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-xl font-bold text-gray-800">
            {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0">
          {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map(day => (
            <div key={day} className="p-2 text-center font-semibold text-gray-700 bg-gray-100 border border-gray-200">
              {day}
            </div>
          ))}
          {days}
        </div>
      </div>

      {selectedDate && selectedDateEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} - Etkinlikler
          </h3>
          <div className="space-y-4">
            {selectedDateEvents.map(event => {
              const participation = myParticipation[event.id];
              const isAttending = participation?.status === 'attending';
              const isNotAttending = participation?.status === 'not_attending';
              const attendeeCount = participantCounts[event.id] || 0;

              return (
                <div key={event.id} className="border-l-4 border-green-500 bg-green-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    {event.title}
                  </h4>
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      {formatFullDate(event.event_date)}
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
                    <p className="text-gray-600 mb-3">{event.description}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onParticipationToggle(event.id, 'attending')}
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
                      onClick={() => onParticipationToggle(event.id, 'not_attending')}
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

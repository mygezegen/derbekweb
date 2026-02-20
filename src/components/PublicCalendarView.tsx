import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, X, List, LayoutGrid, Clock } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
}

interface PublicCalendarViewProps {
  events: Event[];
}

export function PublicCalendarView({ events }: PublicCalendarViewProps) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
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
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    setSelectedDate(null);
  };

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
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

  const formatListDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) >= new Date(new Date().setHours(0, 0, 0, 0));
  };

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  const upcomingEvents = sortedEvents.filter(e => isUpcoming(e.event_date));
  const pastEvents = sortedEvents.filter(e => !isUpcoming(e.event_date));

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="h-20 bg-gray-50"></div>);
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
        className={`h-20 border border-gray-200 p-2 transition-all ${
          dayEvents.length > 0 ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''
        } ${isToday ? 'bg-blue-50 border-blue-300' : ''} ${
          dayEvents.length > 0 ? 'bg-emerald-50' : 'bg-white'
        }`}
        onClick={() => dayEvents.length > 0 && setSelectedDate(date)}
      >
        <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
          {day}
        </div>
        {dayEvents.length > 0 && (
          <div className="flex items-center justify-center">
            <div className="bg-emerald-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
              {dayEvents.length}
            </div>
          </div>
        )}
      </div>
    );
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-200 p-1">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              view === 'list'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List size={16} />
            Liste
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              view === 'calendar'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutGrid size={16} />
            Takvim
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="space-y-6">
          {upcomingEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Yaklaşan Etkinlikler
              </h3>
              <div className="space-y-3">
                {upcomingEvents.map(event => (
                  <div
                    key={event.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="flex">
                      <div className="bg-gradient-to-b from-emerald-500 to-green-600 text-white flex flex-col items-center justify-center px-4 py-4 min-w-[72px]">
                        <span className="text-2xl font-extrabold leading-none">
                          {new Date(event.event_date).getDate()}
                        </span>
                        <span className="text-xs font-semibold uppercase opacity-90 mt-1">
                          {new Date(event.event_date).toLocaleDateString('tr-TR', { month: 'short' })}
                        </span>
                        <span className="text-xs opacity-75 mt-0.5">
                          {new Date(event.event_date).getFullYear()}
                        </span>
                      </div>
                      <div className="flex-1 p-4">
                        <h4 className="text-base font-bold text-gray-800 mb-1">{event.title}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-emerald-500" />
                            {formatEventTime(event.event_date)}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-emerald-500" />
                              {event.location}
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <div
                            className="text-sm text-gray-600 line-clamp-2 announcement-content"
                            dangerouslySetInnerHTML={{ __html: event.description }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-300 inline-block"></span>
                Geçmiş Etkinlikler
              </h3>
              <div className="space-y-3">
                {pastEvents.map(event => (
                  <div
                    key={event.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden opacity-70"
                  >
                    <div className="flex">
                      <div className="bg-gradient-to-b from-gray-400 to-gray-500 text-white flex flex-col items-center justify-center px-4 py-4 min-w-[72px]">
                        <span className="text-2xl font-extrabold leading-none">
                          {new Date(event.event_date).getDate()}
                        </span>
                        <span className="text-xs font-semibold uppercase opacity-90 mt-1">
                          {new Date(event.event_date).toLocaleDateString('tr-TR', { month: 'short' })}
                        </span>
                        <span className="text-xs opacity-75 mt-0.5">
                          {new Date(event.event_date).getFullYear()}
                        </span>
                      </div>
                      <div className="flex-1 p-4">
                        <h4 className="text-base font-bold text-gray-600 mb-1">{event.title}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-2">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatEventTime(event.event_date)}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {event.location}
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <div
                            className="text-sm text-gray-500 line-clamp-2 announcement-content"
                            dangerouslySetInnerHTML={{ __html: event.description }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <h3 className="text-xl font-bold">
                {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0">
              {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map(day => (
                <div key={day} className="p-3 text-center font-semibold text-gray-700 bg-gray-100 border border-gray-200">
                  {day}
                </div>
              ))}
              {days}
            </div>
          </div>

          {selectedDate && selectedDateEvents.length > 0 && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedDate(null)}>
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-800">
                    {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="space-y-4">
                  {selectedDateEvents.map(event => (
                    <div key={event.id} className="border-l-4 border-emerald-500 bg-emerald-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">{event.title}</h4>
                      <div className="space-y-2 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-emerald-600" />
                          <span className="font-medium">{formatFullDate(event.event_date)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-emerald-600" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                      {event.description && (
                        <div
                          className="text-gray-700 mt-2 announcement-content"
                          dangerouslySetInnerHTML={{ __html: event.description }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

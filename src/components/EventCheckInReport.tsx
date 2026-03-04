import { useEffect, useState } from 'react';
import { X, Download, Users, CheckCircle, Clock, TrendingUp, MapPin, Calendar, UserCheck, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReportParticipant {
  id: string;
  member_id: string;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by_name: string | null;
  walk_in: boolean;
  members: {
    full_name: string;
    email: string | null;
    phone: string | null;
    tc_identity_no: string | null;
  } | null;
}

interface EventInfo {
  title: string;
  event_date: string | null;
  location: string | null;
}

interface CheckInTimeSlot {
  label: string;
  count: number;
}

interface EventCheckInReportProps {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}

export function EventCheckInReport({ eventId, eventTitle, onClose }: EventCheckInReportProps) {
  const [participants, setParticipants] = useState<ReportParticipant[]>([]);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked_in' | 'not_checked_in'>('all');
  const [timeSlots, setTimeSlots] = useState<CheckInTimeSlot[]>([]);

  useEffect(() => {
    loadReport();
  }, [eventId]);

  const loadReport = async () => {
    setLoading(true);

    const [eventRes, participantsRes] = await Promise.all([
      supabase.from('events').select('title, event_date, location').eq('id', eventId).maybeSingle(),
      supabase
        .from('event_participants')
        .select(`
          id, member_id, status, checked_in, checked_in_at, checked_in_by, walk_in,
          members:member_id (full_name, email, phone, tc_identity_no)
        `)
        .eq('event_id', eventId)
        .order('checked_in', { ascending: false })
        .order('checked_in_at', { ascending: true }),
    ]);

    if (eventRes.data) setEventInfo(eventRes.data);

    if (participantsRes.data) {
      const checkedInByIds = participantsRes.data
        .map((p: any) => p.checked_in_by)
        .filter(Boolean);

      let staffMap: Record<string, string> = {};
      if (checkedInByIds.length > 0) {
        const { data: staffData } = await supabase
          .from('members')
          .select('id, full_name')
          .in('id', [...new Set(checkedInByIds)]);
        staffData?.forEach(s => { staffMap[s.id] = s.full_name; });
      }

      const enriched = participantsRes.data.map((p: any) => ({
        ...p,
        checked_in_by_name: p.checked_in_by ? (staffMap[p.checked_in_by] || null) : null,
      })) as ReportParticipant[];

      setParticipants(enriched);
      buildTimeSlots(enriched, eventRes.data?.event_date || null);
    }
    setLoading(false);
  };

  const buildTimeSlots = (data: ReportParticipant[], eventDate: string | null) => {
    const checkedInOnes = data.filter(p => p.checked_in && p.checked_in_at);
    if (checkedInOnes.length === 0) { setTimeSlots([]); return; }

    const timestamps = checkedInOnes.map(p => new Date(p.checked_in_at!).getTime());
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    const range = maxTs - minTs;

    if (range < 60 * 60 * 1000) {
      const slotSize = 10 * 60 * 1000;
      const numSlots = Math.ceil(range / slotSize) + 1;
      const slots: CheckInTimeSlot[] = [];
      for (let i = 0; i < numSlots; i++) {
        const slotStart = minTs + i * slotSize;
        const slotEnd = slotStart + slotSize;
        const count = checkedInOnes.filter(p => {
          const t = new Date(p.checked_in_at!).getTime();
          return t >= slotStart && t < slotEnd;
        }).length;
        if (count > 0 || slots.length > 0) {
          slots.push({
            label: new Date(slotStart).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            count,
          });
        }
      }
      setTimeSlots(slots);
    } else {
      const slotSize = 30 * 60 * 1000;
      const numSlots = Math.min(Math.ceil(range / slotSize) + 1, 24);
      const slots: CheckInTimeSlot[] = [];
      for (let i = 0; i < numSlots; i++) {
        const slotStart = minTs + i * slotSize;
        const slotEnd = slotStart + slotSize;
        const count = checkedInOnes.filter(p => {
          const t = new Date(p.checked_in_at!).getTime();
          return t >= slotStart && t < slotEnd;
        }).length;
        slots.push({
          label: new Date(slotStart).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          count,
        });
      }
      setTimeSlots(slots.filter(s => s.count > 0));
    }
    void eventDate;
  };

  const filtered = participants.filter(p => {
    if (filterStatus === 'checked_in') return p.checked_in;
    if (filterStatus === 'not_checked_in') return !p.checked_in;
    return true;
  });

  const total = participants.length;
  const checkedIn = participants.filter(p => p.checked_in).length;
  const pending = total - checkedIn;
  const rate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
  const maxSlotCount = timeSlots.length > 0 ? Math.max(...timeSlots.map(s => s.count)) : 1;

  const handleExportCSV = () => {
    const headers = ['Ad Soyad', 'TC Kimlik No', 'Telefon', 'E-posta', 'Katılım Durumu', 'Giriş Durumu', 'Kapıdan Giriş', 'Giriş Zamanı', 'Girişi Yapan'];
    const rows = participants.map(p => [
      p.members?.full_name || '',
      p.members?.tc_identity_no || '',
      p.members?.phone || '',
      p.members?.email || '',
      p.status === 'confirmed' ? 'Onaylandı' : p.status === 'pending' ? 'Bekliyor' : 'İptal',
      p.checked_in ? 'Giriş Yaptı' : 'Giriş Yapmadı',
      p.walk_in ? 'Evet' : 'Hayır',
      p.checked_in_at ? new Date(p.checked_in_at).toLocaleString('tr-TR') : '',
      p.checked_in_by_name || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `giris-raporu-${eventTitle.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-teal-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Giriş Raporu</h3>
              <p className="text-xs text-gray-500">{eventTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {eventInfo && (
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {eventInfo.event_date && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-gray-400" />
                      {new Date(eventInfo.event_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {eventInfo.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-gray-400" />
                      {eventInfo.location}
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                    <Users size={13} />
                    <span className="text-xs font-medium uppercase tracking-wide">Toplam</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{total}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                  <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                    <CheckCircle size={13} />
                    <span className="text-xs font-medium uppercase tracking-wide">Giriş</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{checkedIn}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                  <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                    <Clock size={13} />
                    <span className="text-xs font-medium uppercase tracking-wide">Gelmedi</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">{pending}</p>
                </div>
                <div className="bg-teal-50 rounded-xl p-3 text-center border border-teal-100">
                  <div className="flex items-center justify-center gap-1 text-teal-500 mb-1">
                    <UserCheck size={13} />
                    <span className="text-xs font-medium uppercase tracking-wide">Oran</span>
                  </div>
                  <p className="text-2xl font-bold text-teal-700">%{rate}</p>
                </div>
              </div>

              {total > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Katılım oranı</span>
                    <span className="font-medium">%{rate}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-green-500 h-3 rounded-full transition-all duration-700"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              )}

              {timeSlots.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Saatlik Giriş Dağılımı</h4>
                  <div className="flex items-end gap-1.5 h-24 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    {timeSlots.map((slot, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                        <div
                          className="w-full bg-teal-400 rounded-t transition-all"
                          style={{ height: `${Math.max(4, (slot.count / maxSlotCount) * 52)}px` }}
                          title={`${slot.label}: ${slot.count} kişi`}
                        />
                        <span className="text-gray-400 truncate w-full text-center" style={{ fontSize: '9px' }}>
                          {slot.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Katılımcı Listesi</h4>
                  <div className="flex gap-1">
                    {(['all', 'checked_in', 'not_checked_in'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFilterStatus(f)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          filterStatus === f ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {f === 'all' ? `Tümü (${total})` : f === 'checked_in' ? `Giriş (${checkedIn})` : `Gelmedi (${pending})`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  {filtered.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Kayıt bulunamadı</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ad Soyad</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">TC / Telefon</th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Giriş</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Zaman</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Yapan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filtered.map(p => (
                          <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.checked_in ? 'bg-green-50/30' : ''}`}>
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-gray-900 text-sm">{p.members?.full_name || '—'}</p>
                              {p.members?.email && <p className="text-xs text-gray-400">{p.members.email}</p>}
                            </td>
                            <td className="px-4 py-2.5 hidden sm:table-cell">
                              {p.members?.tc_identity_no && <p className="font-mono text-xs text-gray-600">{p.members.tc_identity_no}</p>}
                              {p.members?.phone && <p className="text-xs text-gray-500">{p.members.phone}</p>}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {p.checked_in ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                    <CheckCircle size={10} />Girdi
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                                    <Clock size={10} />Gelmedi
                                  </span>
                                )}
                                {p.walk_in && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                    <UserPlus size={10} />Kapıdan
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">
                              {p.checked_in_at
                                ? new Date(p.checked_in_at).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' })
                                : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 hidden lg:table-cell">
                              {p.checked_in_by_name || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex justify-between items-center">
          <button
            onClick={handleExportCSV}
            disabled={participants.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            <Download size={14} />
            CSV İndir
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

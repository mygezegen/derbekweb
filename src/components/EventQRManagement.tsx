import { useEffect, useState } from 'react';
import { X, Users, CheckCircle, Clock, Download, QrCode, Upload, TrendingUp, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BulkParticipantImport } from './BulkParticipantImport';
import { EventCheckInReport } from './EventCheckInReport';

interface Participant {
  id: string;
  member_id: string;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  walk_in: boolean;
  members: {
    full_name: string;
    email: string | null;
    phone: string | null;
    tc_identity_no: string | null;
  } | null;
}

interface EventQRManagementProps {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}

export function EventQRManagement({ eventId, eventTitle, onClose }: EventQRManagementProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    loadParticipants();
  }, [eventId]);

  const loadParticipants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('event_participants')
      .select(`
        id, member_id, status, checked_in, checked_in_at, walk_in,
        members:member_id (full_name, email, phone, tc_identity_no)
      `)
      .eq('event_id', eventId)
      .order('checked_in', { ascending: false });

    if (data) setParticipants(data as unknown as Participant[]);
    setLoading(false);
  };

  const total = participants.length;
  const checkedIn = participants.filter(p => p.checked_in).length;
  const pending = total - checkedIn;
  const walkIns = participants.filter(p => p.walk_in).length;

  const handleExportCSV = () => {
    const headers = ['Ad Soyad', 'E-posta', 'Telefon', 'TC No', 'Katılım Durumu', 'Giriş Durumu', 'Kapıdan Giriş', 'Giriş Zamanı'];
    const rows = participants.map(p => [
      p.members?.full_name || '',
      p.members?.email || '',
      p.members?.phone || '',
      p.members?.tc_identity_no || '',
      p.status === 'confirmed' ? 'Onaylandı' : p.status === 'pending' ? 'Bekliyor' : 'İptal',
      p.checked_in ? 'Giriş Yaptı' : 'Giriş Yapmadı',
      p.walk_in ? 'Evet' : 'Hayır',
      p.checked_in_at ? new Date(p.checked_in_at).toLocaleString('tr-TR') : '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-giris-${eventTitle.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <QrCode size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">QR Giriş Yönetimi</h3>
              <p className="text-xs text-gray-500">{eventTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100 flex-shrink-0">
          <div className="px-4 py-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1">
              <Users size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Toplam</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-green-500 mb-1">
              <CheckCircle size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Girdi</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{checkedIn}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-amber-500 mb-1">
              <Clock size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Bekliyor</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{pending}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-blue-500 mb-1">
              <UserPlus size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">Kapıdan</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{walkIns}</p>
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Katılım oranı</span>
              <span className="font-medium">{Math.round((checkedIn / total) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(checkedIn / total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : participants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Users size={40} className="mb-3 opacity-40" />
              <p className="text-sm">Henüz kayıtlı katılımcı yok</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ad Soyad</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Telefon / TC</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Giriş</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Zaman</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {participants.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.checked_in ? 'bg-green-50/30' : ''}`}>
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{p.members?.full_name || '—'}</p>
                      {p.members?.email && <p className="text-xs text-gray-400">{p.members.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {p.members?.phone && <p className="text-gray-700">{p.members.phone}</p>}
                      {p.members?.tc_identity_no && <p className="text-xs text-gray-400">{p.members.tc_identity_no}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {p.checked_in ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <CheckCircle size={10} />
                            Girdi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                            <Clock size={10} />
                            Bekliyor
                          </span>
                        )}
                        {p.walk_in && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            <UserPlus size={10} />
                            Kapıdan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.checked_in_at ? new Date(p.checked_in_at).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex flex-wrap justify-between items-center gap-2">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              disabled={participants.length === 0}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              <Download size={14} />
              CSV İndir
            </button>
            <button
              onClick={() => setShowBulkImport(true)}
              className="flex items-center gap-2 px-3 py-2 border border-green-300 rounded-lg text-sm text-green-700 font-medium hover:bg-green-50 transition-colors"
            >
              <Upload size={14} />
              Toplu Ekle
            </button>
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-2 px-3 py-2 border border-teal-300 rounded-lg text-sm text-teal-700 font-medium hover:bg-teal-50 transition-colors"
            >
              <TrendingUp size={14} />
              Giriş Raporu
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
          >
            Kapat
          </button>
        </div>
      </div>

      {showBulkImport && (
        <BulkParticipantImport
          eventId={eventId}
          eventTitle={eventTitle}
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => { loadParticipants(); }}
        />
      )}

      {showReport && (
        <EventCheckInReport
          eventId={eventId}
          eventTitle={eventTitle}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

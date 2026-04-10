import { useState, useEffect } from 'react';
import {
  Search, RefreshCw, Filter, CheckCircle, XCircle, Clock, User,
  ChevronDown, ChevronUp, Loader2, AlertCircle, Eye,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { QueryLog, STATUS_CONFIG } from './types';

interface Props {
  logs: QueryLog[];
  loading: boolean;
  onRefresh: () => void;
}

interface MemberDetail {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  tc_identity_no: string | null;
  membership_status: string | null;
  is_active: boolean;
  member_since: string | null;
  occupation: string | null;
  neighborhood: string | null;
  city: string | null;
  address: string | null;
}

function MemberDetailPanel({ tc, onClose }: { tc: string; onClose: () => void }) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'found' | 'not_found' | 'error'>('loading');

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('members')
        .select('id, full_name, email, phone, tc_identity_no, membership_status, is_active, member_since, occupation, neighborhood, city, address')
        .eq('tc_identity_no', tc)
        .maybeSingle();

      if (error) { setLoadState('error'); return; }
      if (!data) { setLoadState('not_found'); return; }
      setMember(data);
      setLoadState('found');
    };
    load();
  }, [tc]);

  const rows: { label: string; value: string | boolean | null | undefined }[] = member ? [
    { label: 'Ad Soyad', value: member.full_name },
    { label: 'E-posta', value: member.email },
    { label: 'Telefon', value: member.phone },
    { label: 'Üyelik Durumu', value: member.membership_status },
    { label: 'Aktif Mi', value: member.is_active },
    { label: 'Üyelik Başlangıcı', value: member.member_since },
    { label: 'Meslek', value: member.occupation },
    { label: 'Mahalle/Köy', value: member.neighborhood },
    { label: 'Şehir', value: member.city },
    { label: 'Adres', value: member.address },
  ] : [];

  return (
    <div className="mt-2 mb-1 mx-2 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
          <Eye size={13} className="text-blue-500" />
          Üye Detayı
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <XCircle size={14} />
        </button>
      </div>

      <div className="px-4 py-3">
        {loadState === 'loading' && (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
            <Loader2 size={13} className="animate-spin" />
            Yükleniyor...
          </div>
        )}

        {loadState === 'error' && (
          <div className="flex items-center gap-2 text-xs text-red-500 py-2">
            <AlertCircle size={13} />
            Üye bilgisi yüklenemedi.
          </div>
        )}

        {loadState === 'not_found' && (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
            <User size={13} />
            Bu TC'ye ait kayıt bulunamadı.
          </div>
        )}

        {loadState === 'found' && member && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
            {rows.map(({ label, value }) => {
              if (value === null || value === undefined || value === '') return null;
              let display: React.ReactNode;
              if (typeof value === 'boolean') {
                display = value ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle size={11} /> Evet
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                    <XCircle size={11} /> Hayır
                  </span>
                );
              } else {
                display = <span className="text-gray-800">{String(value)}</span>;
              }
              return (
                <div key={label}>
                  <p className="text-xs text-gray-400 font-medium">{label}</p>
                  <p className="text-xs mt-0.5">{display}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function QueryLogs({ logs, loading, onRefresh }: Props) {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = logs.filter(l => {
    if (filterStatus && l.status !== filterStatus) return false;
    if (filterClient && l.client_name !== filterClient) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.queried_tc?.includes(q) ||
        l.ip_address?.includes(q) ||
        l.client_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const uniqueClients = [...new Set(logs.map(l => l.client_name).filter(Boolean))];

  const statusCounts = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'success') return <CheckCircle size={13} className="text-green-500" />;
    if (status === 'not_found') return <User size={13} className="text-gray-400" />;
    if (status === 'rate_limited') return <Clock size={13} className="text-amber-500" />;
    return <XCircle size={13} className="text-red-500" />;
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Sorgu Kayıtları</h3>
          <p className="text-xs text-gray-400 mt-0.5">Tüm sorguların detaylı audit logu — satıra tıklayarak üye bilgilerini görüntüleyin</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['success', 'not_found', 'rate_limited', 'error'] as const).map(s => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              className={`p-3 rounded-xl border text-left transition-all ${
                filterStatus === s
                  ? `${cfg.bg} border-current`
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className={`text-xl font-bold ${cfg.color}`}>{statusCounts[s] || 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="TC, IP veya istemci ara..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Tüm Durumlar</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        {uniqueClients.length > 0 && (
          <select
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Tüm İstemciler</option>
            {uniqueClients.map(c => (
              <option key={c} value={c!}>{c}</option>
            ))}
          </select>
        )}
        {(filterStatus || filterClient || search) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterClient(''); setSearch(''); }}
            className="flex items-center gap-1 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            <Filter size={13} /> Temizle
          </button>
        )}
      </div>

      {(filterStatus || filterClient || search) && (
        <p className="text-xs text-gray-500">{filtered.length} / {logs.length} kayıt gösteriliyor</p>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-200">
          <p className="text-sm">Kayıt bulunamadı</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="w-8 px-3 py-3" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Zaman</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">İstemci</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">TC No</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP Adresi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Durum</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Detay</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map(log => {
                  const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG['error'];
                  const isExpanded = expandedId === log.id;
                  const canExpand = log.found && log.queried_tc;

                  return (
                    <>
                      <tr
                        key={log.id}
                        onClick={() => canExpand && toggleExpand(log.id)}
                        className={`border-b border-gray-100 transition-colors ${
                          canExpand ? 'cursor-pointer hover:bg-blue-50/40' : 'hover:bg-gray-50'
                        } ${isExpanded ? 'bg-blue-50/30' : ''}`}
                      >
                        <td className="px-3 py-3 text-center">
                          {canExpand ? (
                            <span className={`transition-colors ${isExpanded ? 'text-blue-500' : 'text-gray-300'}`}>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </span>
                          ) : (
                            <span className="text-gray-100"><ChevronDown size={14} /></span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('tr-TR', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-gray-700">
                            {log.client_name || <span className="text-gray-400 italic">bilinmiyor</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {log.queried_tc ? (
                            <span className="font-mono text-xs text-gray-700">
                              {log.queried_tc.slice(0, 3)}••••{log.queried_tc.slice(-4)}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-600">{log.ip_address || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full w-fit ${cfg.bg} ${cfg.color}`}>
                            <StatusIcon status={log.status} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-48 truncate">
                          {log.error_message || (log.found ? 'Üye bulundu' : log.status === 'not_found' ? 'Üye bulunamadı' : '—')}
                        </td>
                      </tr>
                      {isExpanded && log.queried_tc && (
                        <tr key={`${log.id}-detail`} className="bg-blue-50/20">
                          <td colSpan={7} className="px-0 py-0">
                            <MemberDetailPanel
                              tc={log.queried_tc}
                              onClose={() => setExpandedId(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 200 && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
              Son 200 kayıt gösteriliyor. Toplam: {filtered.length}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <Eye size={13} className="text-blue-400 flex-shrink-0" />
        <span>Üye bulunan sorgularda satıra tıklayarak detaylı üye bilgilerini görüntüleyebilirsiniz.</span>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Search, RefreshCw, Filter, CheckCircle, XCircle, AlertTriangle, Clock, User } from 'lucide-react';
import { QueryLog, STATUS_CONFIG } from './types';

interface Props {
  logs: QueryLog[];
  loading: boolean;
  onRefresh: () => void;
}

export function QueryLogs({ logs, loading, onRefresh }: Props) {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [search, setSearch] = useState('');

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Sorgu Kayitlari</h3>
          <p className="text-xs text-gray-400 mt-0.5">Tum sorgularin detayli audit logu</p>
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
          <option value="">Tum Durumlar</option>
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
            <option value="">Tum Istemciler</option>
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
        <p className="text-xs text-gray-500">{filtered.length} / {logs.length} kayit gosteriliyor</p>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-200">
          <p className="text-sm">Kayit bulunamadi</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Zaman</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Istemci</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">TC No</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP Adresi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Durum</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.slice(0, 200).map(log => {
                  const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG['error'];
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
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
                        {log.error_message || (log.found ? 'Uye bulundu' : log.status === 'not_found' ? 'Uye bulunamadi' : '—')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 200 && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
              Son 200 kayit gosteriliyor. Toplam: {filtered.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

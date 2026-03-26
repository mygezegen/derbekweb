import { useState, useEffect } from 'react';
import { FileText, Zap, Trash2, AlertCircle, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Member } from '../../types';

interface Report {
  id: string;
  title: string;
  content: string;
  keywords_used: string[] | null;
  accounts_used: string[] | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

interface Props {
  currentMember: Member;
}

export function ReportsPanel({ currentMember }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [periodDays, setPeriodDays] = useState(7);
  const [error, setError] = useState('');
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('social_monitor_reports')
      .select('*')
      .order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  const generateReport = async () => {
    setError('');
    setGenerating(true);

    try {
      const [kwRes, accRes] = await Promise.all([
        supabase.from('social_monitor_keywords').select('keyword').eq('is_active', true),
        supabase.from('social_monitor_accounts').select('account_handle').eq('is_active', true),
      ]);

      const keywords = (kwRes.data || []).map(k => k.keyword);
      const accounts = (accRes.data || []).map(a => `@${a.account_handle}`);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-media-monitor`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'generate_report',
            keywords,
            accounts,
            period_days: periodDays,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rapor oluşturma başarısız');
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beklenmeyen hata');
    } finally {
      setGenerating(false);
    }
  };

  const deleteReport = async (id: string) => {
    await supabase.from('social_monitor_reports').delete().eq('id', id);
    await loadReports();
  };

  const toggleReport = (id: string) => {
    setExpandedReports(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const downloadReport = (report: Report) => {
    const blob = new Blob([report.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-base font-bold text-gray-800 mt-4 mb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-lg font-bold text-gray-800 mt-4 mb-2">{line.replace('# ', '')}</h1>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="text-sm text-gray-700 ml-4 mb-1">{line.replace(/^[-*] /, '')}</li>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="text-sm font-semibold text-gray-800 mb-1">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line === '') {
        return <div key={i} className="h-2" />;
      }
      return <p key={i} className="text-sm text-gray-700 mb-1 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <FileText size={15} className="text-gray-500" />
          YZ Raporu Oluştur
        </h3>

        <p className="text-xs text-gray-500">
          Aktif tüm anahtar kelimeler ve hesaplar için kapsamlı bir YZ analiz raporu oluşturulur.
        </p>

        <div>
          <p className="text-xs text-gray-500 mb-2">Analiz dönemi:</p>
          <div className="flex gap-2">
            {[3, 7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => setPeriodDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  periodDays === d
                    ? 'bg-gray-800 border-gray-800 text-white'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {d} gün
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <button
          onClick={generateReport}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          <Zap size={16} className={generating ? 'animate-pulse' : ''} />
          {generating ? 'Rapor Oluşturuluyor...' : 'YZ Raporu Oluştur'}
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Yükleniyor...
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Henüz rapor oluşturulmadı.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => {
            const expanded = expandedReports.has(report.id);
            return (
              <div key={report.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      className="flex-1 text-left"
                      onClick={() => toggleReport(report.id)}
                    >
                      <p className="text-sm font-semibold text-gray-800 hover:text-red-600 transition-colors">
                        {report.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">
                          {new Date(report.created_at).toLocaleDateString('tr-TR', {
                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        {report.keywords_used && report.keywords_used.length > 0 && (
                          <span className="text-xs text-gray-400">
                            {report.keywords_used.length} kelime
                          </span>
                        )}
                        {report.accounts_used && report.accounts_used.length > 0 && (
                          <span className="text-xs text-gray-400">
                            {report.accounts_used.length} hesap
                          </span>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => downloadReport(report)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                        title="İndir"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        onClick={() => deleteReport(report.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        onClick={() => toggleReport(report.id)}
                        className="p-1.5 text-gray-400"
                      >
                        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    <div className="prose max-w-none">
                      {renderMarkdown(report.content)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Trash2, Calendar, Hash, AtSign } from 'lucide-react';

interface Report {
  id: string;
  title: string;
  report_type: string;
  content: string;
  keywords_used: string[] | null;
  accounts_used: string[] | null;
  period_start: string | null;
  period_end: string | null;
  created_by: string | null;
  created_at: string;
}

interface Props {
  reports: Report[];
  onDelete: (id: string) => Promise<void>;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

const reportTypeLabels: Record<string, string> = {
  trend: 'Trend Analizi',
  sentiment: 'Duygu Analizi',
  keyword: 'Anahtar Kelime Raporu',
  account: 'Hesap Raporu',
  summary: 'Genel Özet',
};

export function SocialMonitorReports({ reports, onDelete }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (reports.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText size={24} className="text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">Henüz rapor yok</p>
        <p className="text-sm text-gray-400 mt-1">YZ analizi yaptıktan sonra raporlar burada görünecek.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map(r => {
        const isExpanded = expandedId === r.id;
        return (
          <div key={r.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
            <div
              className="flex items-center gap-3 p-4 cursor-pointer select-none"
              onClick={() => setExpandedId(isExpanded ? null : r.id)}
            >
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{r.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                    {reportTypeLabels[r.report_type] || r.report_type}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-0.5">
                    <Calendar size={10} />
                    {formatDate(r.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); onDelete(r.id); }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
                {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 p-4 space-y-4">
                {(r.keywords_used?.length || r.accounts_used?.length || r.period_start) ? (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {r.period_start && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-lg">
                        <Calendar size={11} />
                        {formatDate(r.period_start)} – {formatDate(r.period_end)}
                      </span>
                    )}
                    {(r.keywords_used || []).map(kw => (
                      <span key={kw} className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg">
                        <Hash size={11} />
                        {kw}
                      </span>
                    ))}
                    {(r.accounts_used || []).map(acc => (
                      <span key={acc} className="flex items-center gap-1 px-2 py-1 bg-sky-50 text-sky-700 rounded-lg">
                        <AtSign size={11} />
                        {acc}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="prose prose-sm max-w-none">
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {r.content}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { useState } from 'react';
import { ExternalLink, TrendingUp, TrendingDown, Minus, Star, MessageSquare, X, Calendar, User, Tag, Brain, Globe, Hash, AtSign } from 'lucide-react';

interface Result {
  id: string;
  source_type: string;
  source_keyword: string | null;
  source_account: string | null;
  platform: string;
  post_url: string | null;
  post_text: string | null;
  post_date: string | null;
  author_handle: string | null;
  author_name: string | null;
  engagement_score: number | null;
  sentiment: string | null;
  ai_summary: string | null;
  tags: string[] | null;
  fetched_at: string;
}

interface Props {
  results: Result[];
}

const sentimentConfig = {
  positive: { label: 'Olumlu', color: 'text-green-600 bg-green-50 border-green-200', barColor: 'bg-green-500', icon: TrendingUp },
  negative: { label: 'Olumsuz', color: 'text-red-600 bg-red-50 border-red-200', barColor: 'bg-red-500', icon: TrendingDown },
  neutral: { label: 'Nötr', color: 'text-gray-600 bg-gray-50 border-gray-200', barColor: 'bg-gray-400', icon: Minus },
  mixed: { label: 'Karışık', color: 'text-amber-600 bg-amber-50 border-amber-200', barColor: 'bg-amber-500', icon: Star },
};

const platformConfig: Record<string, { color: string; bg: string; border: string }> = {
  twitter:   { color: 'text-sky-700',   bg: 'bg-sky-100',   border: 'border-sky-200' },
  instagram: { color: 'text-pink-700',  bg: 'bg-pink-100',  border: 'border-pink-200' },
  facebook:  { color: 'text-blue-700',  bg: 'bg-blue-100',  border: 'border-blue-200' },
  youtube:   { color: 'text-red-700',   bg: 'bg-red-100',   border: 'border-red-200' },
};

function formatDate(dateStr: string | null, full = false) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('tr-TR', full
    ? { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' }
  );
}

function PostDetailModal({ result, onClose }: { result: Result; onClose: () => void }) {
  const sentiment = result.sentiment ? sentimentConfig[result.sentiment as keyof typeof sentimentConfig] : null;
  const SentimentIcon = sentiment?.icon;
  const platform = platformConfig[result.platform] || { color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${platform.bg} ${platform.border} border`}>
              <Globe size={16} className={platform.color} />
            </div>
            <div>
              <p className={`text-sm font-semibold capitalize ${platform.color}`}>{result.platform}</p>
              {result.post_date && (
                <p className="text-xs text-gray-400">{formatDate(result.post_date, true)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {result.post_url && (
              <a
                href={result.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-medium transition-colors border border-blue-100"
              >
                <ExternalLink size={12} />
                Orijinal Gönderiye Git
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-6 space-y-5">
            <div className="flex flex-wrap gap-2">
              {sentiment && SentimentIcon && (
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${sentiment.color}`}>
                  <SentimentIcon size={12} />
                  {sentiment.label}
                </span>
              )}
              {result.source_keyword && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  <Hash size={11} />
                  {result.source_keyword}
                </span>
              )}
              {result.source_account && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  <AtSign size={11} />
                  {result.source_account}
                </span>
              )}
              {result.engagement_score !== null && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                  <Star size={11} />
                  {result.engagement_score} etkileşim
                </span>
              )}
            </div>

            {(result.author_name || result.author_handle) && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-gray-500" />
                </div>
                <div>
                  {result.author_name && (
                    <p className="text-sm font-semibold text-gray-800">{result.author_name}</p>
                  )}
                  {result.author_handle && (
                    <p className="text-xs text-gray-500">@{result.author_handle}</p>
                  )}
                </div>
              </div>
            )}

            {result.post_text && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Gönderi</p>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4 border border-gray-100">
                  {result.post_text}
                </p>
              </div>
            )}

            {result.ai_summary && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Brain size={13} className="text-blue-600" />
                  </div>
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">YZ Özeti</p>
                </div>
                <p className="text-sm text-blue-800 leading-relaxed">{result.ai_summary}</p>
              </div>
            )}

            {result.tags && result.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag size={13} className="text-gray-400" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Etiketler</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium border border-gray-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={13} className="text-gray-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Zaman Bilgisi</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {result.post_date && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-0.5">Paylaşım Tarihi</p>
                    <p className="text-sm font-medium text-gray-700">{formatDate(result.post_date, true)}</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-0.5">Tespit Tarihi</p>
                  <p className="text-sm font-medium text-gray-700">{formatDate(result.fetched_at, true)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SocialMonitorResults({ results }: Props) {
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare size={24} className="text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">Henüz sonuç yok</p>
        <p className="text-sm text-gray-400 mt-1">Analiz yapıldıktan sonra burada görünecek.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {results.map(r => {
          const sentiment = r.sentiment ? sentimentConfig[r.sentiment as keyof typeof sentimentConfig] : null;
          const SentimentIcon = sentiment?.icon;

          return (
            <div
              key={r.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
              onClick={() => setSelectedResult(r)}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(platformConfig[r.platform] || { bg: 'bg-gray-100', color: 'text-gray-600' }).bg} ${(platformConfig[r.platform] || { color: 'text-gray-600' }).color}`}>
                    {r.platform}
                  </span>
                  {r.source_keyword && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      #{r.source_keyword}
                    </span>
                  )}
                  {r.source_account && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      @{r.source_account}
                    </span>
                  )}
                  {sentiment && SentimentIcon && (
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sentiment.color}`}>
                      <SentimentIcon size={11} />
                      {sentiment.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.engagement_score !== null && (
                    <span className="text-xs text-gray-400 flex items-center gap-0.5">
                      <Star size={11} />
                      {r.engagement_score}
                    </span>
                  )}
                  {r.post_url && (
                    <a
                      href={r.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>

              {r.author_name || r.author_handle ? (
                <p className="text-xs text-gray-500 mb-1.5">
                  {r.author_name && <span className="font-medium text-gray-700">{r.author_name}</span>}
                  {r.author_handle && <span className="ml-1 text-gray-400">@{r.author_handle}</span>}
                  {r.post_date && <span className="ml-2 text-gray-400">{formatDate(r.post_date)}</span>}
                </p>
              ) : null}

              {r.post_text && (
                <p className="text-sm text-gray-700 line-clamp-3 mb-2">{r.post_text}</p>
              )}

              {r.ai_summary && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-2">
                  <p className="text-xs font-semibold text-blue-600 mb-0.5">YZ Özeti</p>
                  <p className="text-xs text-blue-700 line-clamp-2">{r.ai_summary}</p>
                </div>
              )}

              {r.tags && r.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                <p className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors font-medium">
                  Detayları gormek icin tiklayin
                </p>
                <ExternalLink size={11} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>

      {selectedResult && (
        <PostDetailModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </>
  );
}

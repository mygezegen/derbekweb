import { useState, useEffect } from 'react';
import { Search, Zap, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TrendResult {
  keyword: string;
  platform: string;
  trend_score: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  volume_estimate: string;
  summary: string;
  related_topics: string[];
  recommendation: string;
}

interface Keyword {
  id: string;
  keyword: string;
  platforms: string[];
  is_active: boolean;
}

const sentimentConfig = {
  positive: { label: 'Pozitif', color: 'text-green-600 bg-green-50 border-green-200', icon: <TrendingUp size={13} /> },
  neutral: { label: 'Nötr', color: 'text-gray-500 bg-gray-50 border-gray-200', icon: <Minus size={13} /> },
  negative: { label: 'Negatif', color: 'text-red-600 bg-red-50 border-red-200', icon: <TrendingDown size={13} /> },
};

const platformColors: Record<string, string> = {
  twitter: 'bg-sky-100 text-sky-700',
  instagram: 'bg-pink-100 text-pink-700',
  facebook: 'bg-blue-100 text-blue-700',
  youtube: 'bg-red-100 text-red-700',
  tiktok: 'bg-gray-100 text-gray-700',
};

export function TrendAnalysisPanel() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>(['twitter', 'instagram', 'facebook']);
  const [periodDays, setPeriodDays] = useState(7);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<TrendResult[]>([]);
  const [error, setError] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadKeywords();
  }, []);

  const loadKeywords = async () => {
    const { data } = await supabase
      .from('social_monitor_keywords')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setKeywords(data || []);
  };

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords(prev =>
      prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw]
    );
  };

  const togglePlatform = (p: string) => {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const analyze = async () => {
    if (selectedKeywords.length === 0) {
      setError('Lütfen en az bir anahtar kelime seçin.');
      return;
    }
    setError('');
    setAnalyzing(true);
    setResults([]);

    try {
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
            action: 'analyze_trends',
            keywords: selectedKeywords,
            platforms,
            period_days: periodDays,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analiz başarısız');
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beklenmeyen hata');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleCard = (key: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.trend_score, 0) / results.length)
    : 0;

  const sentimentCounts = results.reduce((acc, r) => {
    acc[r.sentiment] = (acc[r.sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Search size={15} className="text-gray-500" />
          Trend Analizi Parametreleri
        </h3>

        {keywords.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            Henüz aktif anahtar kelime yok. "Anahtar Kelimeler" sekmesinden ekleyin.
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-2">Analiz edilecek kelimeler:</p>
            <div className="flex flex-wrap gap-2">
              {keywords.map(kw => (
                <button
                  key={kw.id}
                  onClick={() => toggleKeyword(kw.keyword)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    selectedKeywords.includes(kw.keyword)
                      ? 'bg-red-600 border-red-600 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'
                  }`}
                >
                  {kw.keyword}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-2">Platformlar:</p>
            <div className="flex flex-wrap gap-2">
              {['twitter', 'instagram', 'facebook', 'youtube'].map(p => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                    platforms.includes(p)
                      ? 'bg-gray-800 border-gray-800 text-white'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {p === 'twitter' ? 'Twitter/X' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

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
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <button
          onClick={analyze}
          disabled={analyzing || selectedKeywords.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          <Zap size={16} className={analyzing ? 'animate-pulse' : ''} />
          {analyzing ? 'YZ ile Analiz Ediliyor...' : 'Trend Analizi Başlat'}
        </button>
      </div>

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{results.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Analiz Sonucu</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{avgScore}</p>
              <p className="text-xs text-gray-500 mt-0.5">Ort. Trend Skoru</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{sentimentCounts.positive || 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Pozitif Trend</p>
            </div>
          </div>

          <div className="space-y-3">
            {results.map((result, i) => {
              const key = `${result.keyword}-${result.platform}-${i}`;
              const expanded = expandedCards.has(key);
              const sentiment = sentimentConfig[result.sentiment] || sentimentConfig.neutral;

              return (
                <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
                    onClick={() => toggleCard(key)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-semibold text-gray-800 text-sm">{result.keyword}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${platformColors[result.platform] || 'bg-gray-100 text-gray-600'}`}>
                          {result.platform}
                        </span>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${sentiment.color}`}>
                          {sentiment.icon}
                          {sentiment.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-800">{result.trend_score}</p>
                          <p className="text-xs text-gray-400">skor</p>
                        </div>
                        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </div>

                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${result.trend_score}%`,
                          backgroundColor: result.trend_score > 70 ? '#16a34a' : result.trend_score > 40 ? '#d97706' : '#dc2626',
                        }}
                      />
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Trend Özeti</p>
                        <p className="text-sm text-gray-700">{result.summary}</p>
                      </div>

                      {result.related_topics?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">İlgili Konular</p>
                          <div className="flex flex-wrap gap-1.5">
                            {result.related_topics.map((t, ti) => (
                              <span key={ti} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.recommendation && (
                        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
                          <CheckCircle size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-blue-700 mb-0.5">Öneri</p>
                            <p className="text-xs text-blue-700">{result.recommendation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

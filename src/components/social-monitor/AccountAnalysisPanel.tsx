import { useState, useEffect } from 'react';
import { Users, Zap, TrendingUp, TrendingDown, Minus, AlertCircle, ChevronDown, ChevronUp, Activity, Heart, MessageCircle, Share2, ExternalLink, Trophy, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TopPost {
  title: string;
  post_type: string;
  likes: number;
  comments: number;
  shares: number;
  total_engagement: number;
  posted_at: string;
  url?: string;
  description: string;
}

interface AccountResult {
  account: string;
  platform: string;
  activity_level: string;
  content_type: string;
  audience_estimate: string;
  engagement_rate: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
  recent_topics: string[];
  insight: string;
  top_posts?: TopPost[];
}

interface MonitorAccount {
  id: string;
  platform: string;
  account_handle: string;
  display_name: string | null;
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

const activityColors: Record<string, string> = {
  'düşük': 'text-gray-500 bg-gray-50',
  'orta': 'text-amber-600 bg-amber-50',
  'yüksek': 'text-green-600 bg-green-50',
};

const postTypeColors: Record<string, string> = {
  'görsel': 'bg-pink-50 text-pink-700',
  'video': 'bg-red-50 text-red-700',
  'metin': 'bg-gray-50 text-gray-700',
  'etkinlik': 'bg-blue-50 text-blue-700',
  'haber': 'bg-amber-50 text-amber-700',
  'duyuru': 'bg-green-50 text-green-700',
};

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function AccountAnalysisPanel() {
  const [accounts, setAccounts] = useState<MonitorAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AccountResult[]>([]);
  const [error, setError] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const { data } = await supabase
      .from('social_monitor_accounts')
      .select('*')
      .eq('is_active', true)
      .order('platform');
    setAccounts(data || []);
  };

  const toggleAccount = (handle: string) => {
    setSelectedAccounts(prev =>
      prev.includes(handle) ? prev.filter(a => a !== handle) : [...prev, handle]
    );
  };

  const analyze = async () => {
    if (selectedAccounts.length === 0) {
      setError('Lütfen en az bir hesap seçin.');
      return;
    }
    setError('');
    setAnalyzing(true);
    setResults([]);

    try {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        session = refreshed.session;
      }
      if (!session?.access_token) throw new Error('Oturum geçersiz. Lütfen tekrar giriş yapın.');

      const selectedWithPlatforms = selectedAccounts.map(handle => {
        const acc = accounts.find(a => a.account_handle === handle);
        return { handle, platform: acc?.platform || 'unknown' };
      });

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-media-monitor`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'analyze_account',
            accounts: selectedWithPlatforms.map(a => a.handle),
            platforms: selectedWithPlatforms.map(a => a.platform),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Analiz başarısız (HTTP ${res.status})`);
      if (!data.success) throw new Error(data.error || 'Analiz tamamlanamadı');
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

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Users size={15} className="text-gray-500" />
          Hesap Analizi Parametreleri
        </h3>

        {accounts.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            Henüz aktif hesap yok. "Hesaplar" sekmesinden ekleyin.
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-2">Analiz edilecek hesaplar:</p>
            <div className="flex flex-wrap gap-2">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => toggleAccount(acc.account_handle)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    selectedAccounts.includes(acc.account_handle)
                      ? 'bg-red-600 border-red-600 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'
                  }`}
                >
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${platformColors[acc.platform] || 'bg-gray-100 text-gray-600'}`}>
                    {acc.platform}
                  </span>
                  @{acc.account_handle}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <button
          onClick={analyze}
          disabled={analyzing || selectedAccounts.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          <Zap size={16} className={analyzing ? 'animate-pulse' : ''} />
          {analyzing ? 'YZ ile Analiz Ediliyor...' : 'Hesap Analizi Başlat'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, i) => {
            const key = `${result.account}-${i}`;
            const expanded = expandedCards.has(key);
            const sentiment = sentimentConfig[result.sentiment] || sentimentConfig.neutral;

            return (
              <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <button
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCard(key)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-semibold text-gray-800 text-sm">@{result.account}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${platformColors[result.platform] || 'bg-gray-100 text-gray-600'}`}>
                        {result.platform}
                      </span>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${sentiment.color}`}>
                        {sentiment.icon}
                        {sentiment.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${activityColors[result.activity_level] || 'text-gray-500 bg-gray-50'}`}>
                        <Activity size={11} />
                        {result.activity_level}
                      </span>
                      {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">{result.summary}</p>
                </button>

                {expanded && (
                  <div className="border-t border-gray-100">
                    <div className="px-5 pt-4 pb-5 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-0.5">İçerik Türü</p>
                          <p className="text-sm font-medium text-gray-700">{result.content_type}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-0.5">Kitle Büyüklüğü</p>
                          <p className="text-sm font-medium text-gray-700">{result.audience_estimate}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-0.5">Etkileşim Oranı</p>
                          <p className="text-sm font-medium text-gray-700">{result.engagement_rate}</p>
                        </div>
                      </div>

                      {result.recent_topics?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">Son Konular</p>
                          <div className="flex flex-wrap gap-1.5">
                            {result.recent_topics.map((t, ti) => (
                              <span key={ti} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.insight && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
                          <Activity size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-amber-700 mb-0.5">İçgörü</p>
                            <p className="text-xs text-amber-700">{result.insight}</p>
                          </div>
                        </div>
                      )}

                      {result.top_posts && result.top_posts.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Trophy size={14} className="text-amber-500" />
                            <p className="text-sm font-semibold text-gray-700">En Çok Etkileşim Alan Gönderiler</p>
                          </div>
                          <div className="space-y-2">
                            {result.top_posts.map((post, pi) => (
                              <div key={pi} className="border border-gray-100 rounded-lg p-3 hover:border-gray-200 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">#{pi + 1}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${postTypeColors[post.post_type] || 'bg-gray-50 text-gray-600'}`}>
                                      {post.post_type}
                                    </span>
                                    <p className="text-xs font-semibold text-gray-800 truncate">{post.title}</p>
                                  </div>
                                  {post.url && (
                                    <a
                                      href={post.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                      <ExternalLink size={13} />
                                    </a>
                                  )}
                                </div>

                                <p className="text-xs text-gray-500 mb-2 ml-7 line-clamp-1">{post.description}</p>

                                <div className="flex items-center gap-3 ml-7">
                                  <span className="flex items-center gap-1 text-xs text-rose-500">
                                    <Heart size={11} />
                                    {formatNumber(post.likes)}
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-blue-500">
                                    <MessageCircle size={11} />
                                    {formatNumber(post.comments)}
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-green-500">
                                    <Share2 size={11} />
                                    {formatNumber(post.shares)}
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                                    <Calendar size={10} />
                                    {formatDate(post.posted_at)}
                                  </span>
                                  <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {formatNumber(post.total_engagement)} toplam
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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

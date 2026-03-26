import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Hash, AtSign, FileText, RefreshCw, Sparkles,
  AlertCircle, CheckCircle, BarChart2, Activity, Bell,
  Search, ChevronRight, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SocialMonitorKeywords } from './SocialMonitorKeywords';
import { SocialMonitorAccounts } from './SocialMonitorAccounts';
import { SocialMonitorResults } from './SocialMonitorResults';
import { SocialMonitorReports } from './SocialMonitorReports';

type Tab = 'dashboard' | 'keywords' | 'accounts' | 'results' | 'reports';

interface Keyword {
  id: string;
  keyword: string;
  platforms: string[];
  is_active: boolean;
  created_at: string;
}

interface Account {
  id: string;
  platform: string;
  account_handle: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
}

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

const sentimentColors: Record<string, string> = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-gray-500',
  mixed: 'text-amber-500',
};

const sentimentBg: Record<string, string> = {
  positive: 'bg-green-50 border-green-200',
  negative: 'bg-red-50 border-red-200',
  neutral: 'bg-gray-50 border-gray-200',
  mixed: 'bg-amber-50 border-amber-200',
};

export function SocialMediaMonitoring() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState('');
  const [analyzeError, setAnalyzeError] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [analysisPeriod, setAnalysisPeriod] = useState('7');
  const [showAnalyzePanel, setShowAnalyzePanel] = useState(false);
  const [filterSentiment, setFilterSentiment] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kwRes, accRes, resRes, repRes] = await Promise.all([
        supabase.from('social_monitor_keywords').select('*').order('created_at', { ascending: false }),
        supabase.from('social_monitor_accounts').select('*').order('created_at', { ascending: false }),
        supabase.from('social_monitor_results').select('*').order('fetched_at', { ascending: false }).limit(100),
        supabase.from('social_monitor_reports').select('*').order('created_at', { ascending: false }),
      ]);
      setKeywords(kwRes.data || []);
      setAccounts(accRes.data || []);
      setResults(resRes.data || []);
      setReports(repRes.data || []);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addKeyword = async (keyword: string, platforms: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('social_monitor_keywords').insert({
      keyword,
      platforms,
      is_active: true,
      created_by: user?.id,
    });
    if (!error) await loadData();
  };

  const deleteKeyword = async (id: string) => {
    if (!confirm('Bu anahtar kelimeyi silmek istediğinize emin misiniz?')) return;
    await supabase.from('social_monitor_keywords').delete().eq('id', id);
    await loadData();
  };

  const toggleKeyword = async (id: string, is_active: boolean) => {
    await supabase.from('social_monitor_keywords').update({ is_active }).eq('id', id);
    await loadData();
  };

  const updateKeyword = async (id: string, keyword: string, platforms: string[]) => {
    await supabase.from('social_monitor_keywords').update({ keyword, platforms }).eq('id', id);
    await loadData();
  };

  const addAccount = async (platform: string, handle: string, displayName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('social_monitor_accounts').insert({
      platform,
      account_handle: handle,
      display_name: displayName,
      is_active: true,
      created_by: user?.id,
    });
    if (!error) await loadData();
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('Bu hesabı silmek istediğinize emin misiniz?')) return;
    await supabase.from('social_monitor_accounts').delete().eq('id', id);
    await loadData();
  };

  const toggleAccount = async (id: string, is_active: boolean) => {
    await supabase.from('social_monitor_accounts').update({ is_active }).eq('id', id);
    await loadData();
  };

  const deleteReport = async (id: string) => {
    if (!confirm('Bu raporu silmek istediğinize emin misiniz?')) return;
    await supabase.from('social_monitor_reports').delete().eq('id', id);
    await loadData();
  };

  const runAnalysis = async () => {
    if (selectedKeywords.length === 0 && selectedAccounts.length === 0) {
      setAnalyzeError('Lütfen en az bir anahtar kelime veya hesap seçin.');
      return;
    }
    setAnalyzing(true);
    setAnalyzeMsg('');
    setAnalyzeError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-media-analyze`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: selectedKeywords,
          accounts: selectedAccounts,
          period_days: parseInt(analysisPeriod),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Analiz başarısız oldu.');
      setAnalyzeMsg('Analiz tamamlandı! Rapor oluşturuldu.');
      setShowAnalyzePanel(false);
      await loadData();
      setActiveTab('reports');
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleSelectKeyword = (kw: string) => {
    setSelectedKeywords(prev => prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw]);
  };

  const toggleSelectAccount = (handle: string) => {
    setSelectedAccounts(prev => prev.includes(handle) ? prev.filter(a => a !== handle) : [...prev, handle]);
  };

  const filteredResults = results.filter(r => {
    if (filterSentiment && r.sentiment !== filterSentiment) return false;
    if (filterPlatform && r.platform !== filterPlatform) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.post_text?.toLowerCase().includes(q) ||
        r.source_keyword?.toLowerCase().includes(q) ||
        r.source_account?.toLowerCase().includes(q) ||
        r.ai_summary?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sentimentCounts = results.reduce<Record<string, number>>((acc, r) => {
    if (r.sentiment) acc[r.sentiment] = (acc[r.sentiment] || 0) + 1;
    return acc;
  }, {});

  const platformCounts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.platform] = (acc[r.platform] || 0) + 1;
    return acc;
  }, {});

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { id: 'dashboard', label: 'Genel Bakış', icon: BarChart2 },
    { id: 'keywords', label: 'Anahtar Kelimeler', icon: Hash },
    { id: 'accounts', label: 'Hesaplar', icon: AtSign },
    { id: 'results', label: 'Sonuçlar', icon: Activity },
    { id: 'reports', label: 'Raporlar', icon: FileText },
  ];

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sosyal Medya İzleme</h1>
              <p className="text-sm text-gray-500">Trend takibi ve YZ destekli analiz</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Yenile
            </button>
            <button
              onClick={() => { setShowAnalyzePanel(v => !v); setAnalyzeMsg(''); setAnalyzeError(''); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-cyan-700 transition-all shadow-sm"
            >
              <Sparkles size={14} />
              YZ Analizi Yap
            </button>
          </div>
        </div>

        {showAnalyzePanel && (
          <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl space-y-4">
            <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
              <Sparkles size={14} />
              Yapay Zeka Trend Analizi
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                  <Hash size={11} />
                  Anahtar Kelimeler
                </p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {keywords.filter(k => k.is_active).map(kw => (
                    <button
                      key={kw.id}
                      onClick={() => toggleSelectKeyword(kw.keyword)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        selectedKeywords.includes(kw.keyword)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      #{kw.keyword}
                    </button>
                  ))}
                  {keywords.filter(k => k.is_active).length === 0 && (
                    <p className="text-xs text-gray-400">Aktif anahtar kelime yok.</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                  <AtSign size={11} />
                  Hesaplar
                </p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {accounts.filter(a => a.is_active).map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => toggleSelectAccount(acc.account_handle)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        selectedAccounts.includes(acc.account_handle)
                          ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-cyan-400'
                      }`}
                    >
                      @{acc.account_handle}
                    </button>
                  ))}
                  {accounts.filter(a => a.is_active).length === 0 && (
                    <p className="text-xs text-gray-400">Aktif hesap yok.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Analiz Dönemi</label>
                <select
                  value={analysisPeriod}
                  onChange={e => setAnalysisPeriod(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="1">Son 24 saat</option>
                  <option value="7">Son 7 gün</option>
                  <option value="30">Son 30 gün</option>
                  <option value="90">Son 3 ay</option>
                </select>
              </div>
              <div className="flex-1 flex items-end justify-end gap-2">
                {(selectedKeywords.length > 0 || selectedAccounts.length > 0) && (
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-lg">
                    {selectedKeywords.length + selectedAccounts.length} seçili
                  </span>
                )}
                <button
                  onClick={runAnalysis}
                  disabled={analyzing || (selectedKeywords.length === 0 && selectedAccounts.length === 0)}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {analyzing ? (
                    <><RefreshCw size={14} className="animate-spin" />Analiz ediliyor...</>
                  ) : (
                    <><Sparkles size={14} />Analizi Başlat</>
                  )}
                </button>
              </div>
            </div>

            {analyzeMsg && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-sm">
                <CheckCircle size={14} />
                {analyzeMsg}
              </div>
            )}
            {analyzeError && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm">
                <AlertCircle size={14} />
                {analyzeError}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 pt-4">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.id === 'results' && results.length > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === 'results' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {results.length}
                  </span>
                )}
                {tab.id === 'reports' && reports.length > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === 'reports' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {reports.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 p-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Hash size={18} className="text-blue-600" />
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{keywords.filter(k => k.is_active).length}</p>
                <p className="text-sm text-gray-500 mt-0.5">Aktif Anahtar Kelime</p>
                <p className="text-xs text-gray-400 mt-1">Toplam: {keywords.length}</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center">
                    <AtSign size={18} className="text-cyan-600" />
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{accounts.filter(a => a.is_active).length}</p>
                <p className="text-sm text-gray-500 mt-0.5">Aktif Hesap</p>
                <p className="text-xs text-gray-400 mt-1">Toplam: {accounts.length}</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <Activity size={18} className="text-green-600" />
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{results.length}</p>
                <p className="text-sm text-gray-500 mt-0.5">Toplam Sonuç</p>
                <p className="text-xs text-gray-400 mt-1">
                  {results.filter(r => r.sentiment === 'positive').length} olumlu
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <FileText size={18} className="text-amber-600" />
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{reports.length}</p>
                <p className="text-sm text-gray-500 mt-0.5">Analiz Raporu</p>
                <p className="text-xs text-gray-400 mt-1">YZ tarafından oluşturuldu</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-500" />
                  Duygu Dağılımı
                </h3>
                {Object.keys(sentimentCounts).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Henüz veri yok.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(sentimentCounts).map(([s, count]) => {
                      const pct = Math.round((count / results.length) * 100);
                      return (
                        <div key={s}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={`font-medium ${sentimentColors[s] || 'text-gray-600'}`}>
                              {s === 'positive' ? 'Olumlu' : s === 'negative' ? 'Olumsuz' : s === 'neutral' ? 'Nötr' : 'Karışık'}
                            </span>
                            <span className="text-gray-500">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                s === 'positive' ? 'bg-green-500' :
                                s === 'negative' ? 'bg-red-500' :
                                s === 'neutral' ? 'bg-gray-400' : 'bg-amber-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <BarChart2 size={16} className="text-cyan-500" />
                  Platform Dağılımı
                </h3>
                {Object.keys(platformCounts).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Henüz veri yok.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(platformCounts).sort((a, b) => b[1] - a[1]).map(([p, count]) => {
                      const pct = Math.round((count / results.length) * 100);
                      return (
                        <div key={p}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700 capitalize">{p}</span>
                            <span className="text-gray-500">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                p === 'twitter' ? 'bg-sky-500' :
                                p === 'instagram' ? 'bg-pink-500' :
                                p === 'facebook' ? 'bg-blue-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {reports.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Bell size={16} className="text-amber-500" />
                    Son Raporlar
                  </h3>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
                  >
                    Tümünü gör <ChevronRight size={12} />
                  </button>
                </div>
                <div className="space-y-2">
                  {reports.slice(0, 3).map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <FileText size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('reports')}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {keywords.length === 0 && accounts.length === 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Search size={28} className="text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">İzlemeye Başlayın</h3>
                <p className="text-sm text-blue-700 mb-5 max-w-sm mx-auto">
                  Anahtar kelimeler ve hashtag'ler ekleyerek veya hesap takibi başlatarak sosyal medyayı izleyin.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('keywords')}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Hash size={14} />
                    Anahtar Kelime Ekle
                  </button>
                  <button
                    onClick={() => setActiveTab('accounts')}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-blue-600 border border-blue-300 rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors"
                  >
                    <AtSign size={14} />
                    Hesap Ekle
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'keywords' && (
          <div className="max-w-2xl">
            <SocialMonitorKeywords
              keywords={keywords}
              onAdd={addKeyword}
              onDelete={deleteKeyword}
              onToggle={toggleKeyword}
              onUpdate={updateKeyword}
            />
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="max-w-2xl">
            <SocialMonitorAccounts
              accounts={accounts}
              onAdd={addAccount}
              onDelete={deleteAccount}
              onToggle={toggleAccount}
            />
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Sonuçlarda ara..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterSentiment}
                onChange={e => setFilterSentiment(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Tüm Duygular</option>
                <option value="positive">Olumlu</option>
                <option value="negative">Olumsuz</option>
                <option value="neutral">Nötr</option>
                <option value="mixed">Karışık</option>
              </select>
              <select
                value={filterPlatform}
                onChange={e => setFilterPlatform(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Tüm Platformlar</option>
                <option value="twitter">Twitter</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
            {(filterSentiment || filterPlatform || searchQuery) && (
              <p className="text-xs text-gray-500">
                {filteredResults.length} / {results.length} sonuç gösteriliyor
              </p>
            )}
            <SocialMonitorResults results={filteredResults} />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="max-w-3xl">
            <SocialMonitorReports reports={reports} onDelete={deleteReport} />
          </div>
        )}
      </div>
    </div>
  );
}

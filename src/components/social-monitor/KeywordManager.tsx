import { useState, useEffect } from 'react';
import { Plus, Trash2, Hash, ToggleLeft, ToggleRight, Twitter, Instagram, Facebook } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Member } from '../../types';

interface Keyword {
  id: string;
  keyword: string;
  platforms: string[];
  is_active: boolean;
  created_at: string;
}

interface Props {
  currentMember: Member;
}

const platformIcons: Record<string, JSX.Element> = {
  twitter: <Twitter size={12} className="text-sky-500" />,
  instagram: <Instagram size={12} className="text-pink-500" />,
  facebook: <Facebook size={12} className="text-blue-600" />,
};

const platformLabels: Record<string, string> = {
  twitter: 'Twitter/X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
};

export function KeywordManager({ currentMember }: Props) {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['twitter', 'instagram', 'facebook']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadKeywords();
  }, []);

  const loadKeywords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('social_monitor_keywords')
      .select('*')
      .order('created_at', { ascending: false });
    setKeywords(data || []);
    setLoading(false);
  };

  const addKeyword = async () => {
    const trimmed = newKeyword.trim();
    if (!trimmed || selectedPlatforms.length === 0) {
      setError('Anahtar kelime ve en az bir platform seçin.');
      return;
    }
    setError('');
    setSaving(true);
    const { error: err } = await supabase.from('social_monitor_keywords').insert({
      keyword: trimmed,
      platforms: selectedPlatforms,
      created_by: currentMember.id,
    });
    if (err) {
      setError(err.message);
    } else {
      setNewKeyword('');
      await loadKeywords();
    }
    setSaving(false);
  };

  const toggleActive = async (kw: Keyword) => {
    await supabase
      .from('social_monitor_keywords')
      .update({ is_active: !kw.is_active })
      .eq('id', kw.id);
    await loadKeywords();
  };

  const deleteKeyword = async (id: string) => {
    await supabase.from('social_monitor_keywords').delete().eq('id', id);
    await loadKeywords();
  };

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Hash size={15} className="text-gray-500" />
          Yeni Anahtar Kelime / Hashtag Ekle
        </h3>

        <div className="space-y-3">
          <input
            type="text"
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()}
            placeholder="#köy, dernek, Çüngüş..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />

          <div>
            <p className="text-xs text-gray-500 mb-2">Platform seçin:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(platformLabels).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePlatform(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    selectedPlatforms.includes(key)
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {platformIcons[key] || null}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={addKeyword}
            disabled={saving || !newKeyword.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <Plus size={15} />
            {saving ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            İzlenen Anahtar Kelimeler ({keywords.filter(k => k.is_active).length} aktif)
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Yükleniyor...</div>
        ) : keywords.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Henüz anahtar kelime eklenmedi.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {keywords.map(kw => (
              <li key={kw.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-sm font-medium truncate ${kw.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                    {kw.keyword}
                  </span>
                  <div className="flex gap-1 flex-shrink-0">
                    {kw.platforms.map(p => (
                      <span key={p} className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
                        {platformIcons[p] || null}
                        <span className="hidden sm:inline">{platformLabels[p] || p}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <button
                    onClick={() => toggleActive(kw)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title={kw.is_active ? 'Pasife al' : 'Aktif et'}
                  >
                    {kw.is_active
                      ? <ToggleRight size={20} className="text-green-500" />
                      : <ToggleLeft size={20} />
                    }
                  </button>
                  <button
                    onClick={() => deleteKeyword(kw.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Plus, Trash2, AtSign, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Member } from '../../types';

interface MonitorAccount {
  id: string;
  platform: string;
  account_handle: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface Props {
  currentMember: Member;
}

const platforms = [
  { key: 'twitter', label: 'Twitter/X', color: 'sky' },
  { key: 'instagram', label: 'Instagram', color: 'pink' },
  { key: 'facebook', label: 'Facebook', color: 'blue' },
  { key: 'youtube', label: 'YouTube', color: 'red' },
  { key: 'tiktok', label: 'TikTok', color: 'gray' },
];

const platformColor: Record<string, string> = {
  twitter: 'bg-sky-50 text-sky-700 border-sky-200',
  instagram: 'bg-pink-50 text-pink-700 border-pink-200',
  facebook: 'bg-blue-50 text-blue-700 border-blue-200',
  youtube: 'bg-red-50 text-red-700 border-red-200',
  tiktok: 'bg-gray-50 text-gray-700 border-gray-200',
};

export function AccountManager({ currentMember }: Props) {
  const [accounts, setAccounts] = useState<MonitorAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHandle, setNewHandle] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPlatform, setNewPlatform] = useState('twitter');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('social_monitor_accounts')
      .select('*')
      .order('created_at', { ascending: false });
    setAccounts(data || []);
    setLoading(false);
  };

  const addAccount = async () => {
    const handle = newHandle.trim().replace(/^@/, '');
    if (!handle) {
      setError('Hesap adı girin.');
      return;
    }
    setError('');
    setSaving(true);
    const { error: err } = await supabase.from('social_monitor_accounts').insert({
      platform: newPlatform,
      account_handle: handle,
      display_name: newDisplayName.trim() || null,
      created_by: currentMember.id,
    });
    if (err) {
      setError(err.message.includes('unique') ? 'Bu hesap zaten eklenmiş.' : err.message);
    } else {
      setNewHandle('');
      setNewDisplayName('');
      await loadAccounts();
    }
    setSaving(false);
  };

  const toggleActive = async (acc: MonitorAccount) => {
    await supabase
      .from('social_monitor_accounts')
      .update({ is_active: !acc.is_active })
      .eq('id', acc.id);
    await loadAccounts();
  };

  const deleteAccount = async (id: string) => {
    await supabase.from('social_monitor_accounts').delete().eq('id', id);
    await loadAccounts();
  };

  const byPlatform: Record<string, MonitorAccount[]> = {};
  for (const acc of accounts) {
    if (!byPlatform[acc.platform]) byPlatform[acc.platform] = [];
    byPlatform[acc.platform].push(acc);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <AtSign size={15} className="text-gray-500" />
          Yeni Hesap Ekle
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Platform</label>
            <select
              value={newPlatform}
              onChange={e => setNewPlatform(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              {platforms.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hesap Adı (@olmadan)</label>
            <input
              type="text"
              value={newHandle}
              onChange={e => setNewHandle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAccount()}
              placeholder="cumhurbaskanligi"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Görünen Ad (opsiyonel)</label>
            <input
              type="text"
              value={newDisplayName}
              onChange={e => setNewDisplayName(e.target.value)}
              placeholder="Cumhurbaşkanlığı"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

        <button
          onClick={addAccount}
          disabled={saving || !newHandle.trim()}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <Plus size={15} />
          {saving ? 'Ekleniyor...' : 'Hesap Ekle'}
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Yükleniyor...
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Henüz hesap eklenmedi.
        </div>
      ) : (
        <div className="space-y-3">
          {platforms.filter(p => byPlatform[p.key]?.length > 0).map(platform => (
            <div key={platform.key} className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${platformColor[platform.key]}`}>
                  {platform.label}
                </span>
                <span className="text-xs text-gray-400">{byPlatform[platform.key].length} hesap</span>
              </div>
              <ul className="divide-y divide-gray-50">
                {byPlatform[platform.key].map(acc => (
                  <li key={acc.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${acc.is_active ? 'text-gray-800' : 'text-gray-400'}`}>
                        @{acc.account_handle}
                      </p>
                      {acc.display_name && (
                        <p className="text-xs text-gray-400">{acc.display_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => toggleActive(acc)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {acc.is_active
                          ? <ToggleRight size={20} className="text-green-500" />
                          : <ToggleLeft size={20} />
                        }
                      </button>
                      <button
                        onClick={() => deleteAccount(acc.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

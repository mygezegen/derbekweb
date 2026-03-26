import { useState } from 'react';
import { Plus, Trash2, AtSign, ToggleLeft, ToggleRight, Twitter, Instagram, Facebook, Youtube } from 'lucide-react';

interface Account {
  id: string;
  platform: string;
  account_handle: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
}

interface Props {
  accounts: Account[];
  onAdd: (platform: string, handle: string, displayName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, is_active: boolean) => Promise<void>;
}

const PLATFORM_OPTIONS = [
  { value: 'twitter', label: 'Twitter / X', icon: Twitter, color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'youtube', label: 'YouTube', icon: Youtube, color: 'bg-red-100 text-red-700 border-red-200' },
];

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const opt = PLATFORM_OPTIONS.find(p => p.value === platform);
  if (!opt) return <AtSign className={className} />;
  const Icon = opt.icon;
  return <Icon className={className} />;
}

export function SocialMonitorAccounts({ accounts, onAdd, onDelete, onToggle }: Props) {
  const [platform, setPlatform] = useState('twitter');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!handle.trim()) return;
    setAdding(true);
    await onAdd(platform, handle.trim().replace(/^@/, ''), displayName.trim() || handle.trim());
    setHandle('');
    setDisplayName('');
    setAdding(false);
  };

  const getPlatformStyle = (p: string) => PLATFORM_OPTIONS.find(o => o.value === p)?.color || 'bg-gray-100 text-gray-600 border-gray-200';
  const getPlatformLabel = (p: string) => PLATFORM_OPTIONS.find(o => o.value === p)?.label || p;

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <AtSign size={12} />
          Hesap Takibi Ekle
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORM_OPTIONS.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setPlatform(opt.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                  platform === opt.value
                    ? opt.color + ' shadow-sm'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon size={14} />
                {opt.label}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={handle}
          onChange={e => setHandle(e.target.value)}
          placeholder="@kullanici_adi"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Görünen Ad (opsiyonel)"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !handle.trim()}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <Plus size={16} />
          Hesap Ekle
        </button>
      </div>

      <div className="space-y-2">
        {accounts.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">Henüz takip edilen hesap yok.</p>
        )}
        {accounts.map(acc => (
          <div
            key={acc.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              acc.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${getPlatformStyle(acc.platform)}`}>
              <PlatformIcon platform={acc.platform} className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {acc.display_name || acc.account_handle}
              </p>
              <p className="text-xs text-gray-400">@{acc.account_handle} · {getPlatformLabel(acc.platform)}</p>
            </div>
            <button onClick={() => onToggle(acc.id, !acc.is_active)} className="p-1.5 transition-colors">
              {acc.is_active
                ? <ToggleRight size={20} className="text-green-500" />
                : <ToggleLeft size={20} className="text-gray-400" />
              }
            </button>
            <button onClick={() => onDelete(acc.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

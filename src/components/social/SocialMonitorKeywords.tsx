import { useState } from 'react';
import { Plus, Trash2, Hash, Search, ToggleLeft, ToggleRight, CreditCard as Edit2, Check, X } from 'lucide-react';

interface Keyword {
  id: string;
  keyword: string;
  platforms: string[];
  is_active: boolean;
  created_at: string;
}

interface Props {
  keywords: Keyword[];
  onAdd: (keyword: string, platforms: string[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, is_active: boolean) => Promise<void>;
  onUpdate: (id: string, keyword: string, platforms: string[]) => Promise<void>;
}

const PLATFORMS = ['twitter', 'instagram', 'facebook', 'youtube'];

const platformColors: Record<string, string> = {
  twitter: 'bg-sky-100 text-sky-700',
  instagram: 'bg-pink-100 text-pink-700',
  facebook: 'bg-blue-100 text-blue-700',
  youtube: 'bg-red-100 text-red-700',
};

export function SocialMonitorKeywords({ keywords, onAdd, onDelete, onToggle, onUpdate }: Props) {
  const [newKeyword, setNewKeyword] = useState('');
  const [newPlatforms, setNewPlatforms] = useState<string[]>(['twitter', 'instagram', 'facebook']);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editPlatforms, setEditPlatforms] = useState<string[]>([]);

  const handleAdd = async () => {
    if (!newKeyword.trim() || newPlatforms.length === 0) return;
    setAdding(true);
    await onAdd(newKeyword.trim(), newPlatforms);
    setNewKeyword('');
    setNewPlatforms(['twitter', 'instagram', 'facebook']);
    setAdding(false);
  };

  const startEdit = (kw: Keyword) => {
    setEditId(kw.id);
    setEditValue(kw.keyword);
    setEditPlatforms(kw.platforms || []);
  };

  const saveEdit = async () => {
    if (!editId) return;
    await onUpdate(editId, editValue.trim(), editPlatforms);
    setEditId(null);
  };

  const togglePlatform = (p: string, current: string[], setter: (v: string[]) => void) => {
    setter(current.includes(p) ? current.filter(x => x !== p) : [...current, p]);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <Hash size={12} />
          Yeni Anahtar Kelime / Hashtag Ekle
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="#hashtag veya anahtar kelime..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !newKeyword.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <Plus size={16} />
            Ekle
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p}
              onClick={() => togglePlatform(p, newPlatforms, setNewPlatforms)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                newPlatforms.includes(p)
                  ? platformColors[p] + ' border-transparent'
                  : 'border-gray-300 text-gray-400 bg-white'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {keywords.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">Henüz anahtar kelime eklenmedi.</p>
        )}
        {keywords.map(kw => (
          <div
            key={kw.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              kw.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
            }`}
          >
            {editId === kw.id ? (
              <>
                <input
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="flex gap-1">
                  {PLATFORMS.map(p => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p, editPlatforms, setEditPlatforms)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                        editPlatforms.includes(p)
                          ? platformColors[p] + ' border-transparent'
                          : 'border-gray-300 text-gray-400 bg-white'
                      }`}
                    >
                      {p.slice(0, 2).toUpperCase()}
                    </button>
                  ))}
                </div>
                <button onClick={saveEdit} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                  <Check size={14} />
                </button>
                <button onClick={() => setEditId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Hash size={14} className="text-gray-500" />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">{kw.keyword}</span>
                <div className="flex gap-1 flex-wrap">
                  {(kw.platforms || []).map(p => (
                    <span key={p} className={`px-2 py-0.5 rounded-full text-xs font-medium ${platformColors[p] || 'bg-gray-100 text-gray-600'}`}>
                      {p.slice(0, 2).toUpperCase()}
                    </span>
                  ))}
                </div>
                <button onClick={() => startEdit(kw)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => onToggle(kw.id, !kw.is_active)} className="p-1.5 transition-colors">
                  {kw.is_active
                    ? <ToggleRight size={20} className="text-green-500" />
                    : <ToggleLeft size={20} className="text-gray-400" />
                  }
                </button>
                <button onClick={() => onDelete(kw.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

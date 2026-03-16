import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, TrendingUp, TrendingDown, Tag, AlertCircle } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  description: string;
  is_active: boolean;
}

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<'income' | 'expense'>('income');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('transaction_categories')
      .select('*')
      .order('name', { ascending: true });
    setCategories(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      setError('Kategori adı zorunludur.');
      return;
    }
    const duplicate = categories.some(
      c => c.type === activeType && c.name.trim().toLowerCase() === newName.trim().toLowerCase()
    );
    if (duplicate) {
      setError('Bu isimde bir kategori zaten mevcut.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('transaction_categories').insert({
      name: newName.trim(),
      type: activeType,
      description: newDescription.trim(),
      is_active: true,
    });
    if (err) {
      setError('Kategori eklenirken bir hata oluştu.');
    } else {
      setNewName('');
      setNewDescription('');
      await loadCategories();
    }
    setSaving(false);
  };

  const handleToggleActive = async (cat: Category) => {
    await supabase
      .from('transaction_categories')
      .update({ is_active: !cat.is_active })
      .eq('id', cat.id);
    await loadCategories();
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`"${cat.name}" kategorisini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    const { error: err } = await supabase
      .from('transaction_categories')
      .delete()
      .eq('id', cat.id);
    if (err) {
      alert('Bu kategori mevcut işlemlerde kullanılıyor, silinemez. Bunun yerine pasife alabilirsiniz.');
    } else {
      await loadCategories();
    }
  };

  const filtered = categories.filter(c => c.type === activeType);
  const activeFiltered = filtered.filter(c => c.is_active);
  const inactiveFiltered = filtered.filter(c => !c.is_active);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveType('income'); setError(''); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeType === 'income'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <TrendingUp size={16} />
          Gelir Kategorileri
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeType === 'income' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {categories.filter(c => c.type === 'income' && c.is_active).length}
          </span>
        </button>
        <button
          onClick={() => { setActiveType('expense'); setError(''); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeType === 'expense'
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <TrendingDown size={16} />
          Gider Kategorileri
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeType === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {categories.filter(c => c.type === 'expense' && c.is_active).length}
          </span>
        </button>
      </div>

      <div className={`rounded-2xl border-2 p-5 space-y-3 ${activeType === 'income' ? 'border-emerald-100 bg-emerald-50/40' : 'border-red-100 bg-red-50/40'}`}>
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <Plus size={15} />
          Yeni Kategori Ekle
        </h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => { setNewName(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Kategori adı *"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            placeholder="Açıklama (opsiyonel)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !newName.trim()}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              activeType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            <Plus size={15} />
            {saving ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </div>
        {error && (
          <p className="text-red-600 text-xs flex items-center gap-1">
            <AlertCircle size={13} />
            {error}
          </p>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Yükleniyor...</div>
      ) : (
        <div className="space-y-4">
          {activeFiltered.length === 0 && inactiveFiltered.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Tag size={32} className="mx-auto mb-2 opacity-30" />
              Bu tipte henüz kategori yok.
            </div>
          ) : (
            <>
              {activeFiltered.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Aktif ({activeFiltered.length})</p>
                  <div className="space-y-2">
                    {activeFiltered.map(cat => (
                      <CategoryRow
                        key={cat.id}
                        cat={cat}
                        type={activeType}
                        onToggle={handleToggleActive}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}
              {inactiveFiltered.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pasif ({inactiveFiltered.length})</p>
                  <div className="space-y-2">
                    {inactiveFiltered.map(cat => (
                      <CategoryRow
                        key={cat.id}
                        cat={cat}
                        type={activeType}
                        onToggle={handleToggleActive}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface CategoryRowProps {
  cat: Category;
  type: 'income' | 'expense';
  onToggle: (cat: Category) => void;
  onDelete: (cat: Category) => void;
}

function CategoryRow({ cat, type, onToggle, onDelete }: CategoryRowProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
      cat.is_active
        ? 'bg-white border-gray-200 shadow-sm'
        : 'bg-gray-50 border-gray-100 opacity-60'
    }`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cat.is_active ? (type === 'income' ? 'bg-emerald-500' : 'bg-red-500') : 'bg-gray-300'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${cat.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
          {cat.name}
        </p>
        {cat.description && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{cat.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onToggle(cat)}
          title={cat.is_active ? 'Pasife Al' : 'Aktif Yap'}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            cat.is_active
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {cat.is_active ? 'Pasife Al' : 'Aktif Yap'}
        </button>
        <button
          onClick={() => onDelete(cat)}
          title="Sil"
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

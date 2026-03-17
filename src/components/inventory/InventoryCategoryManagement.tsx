import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, ChevronRight, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { InventoryCategory } from '../../types';

export function InventoryCategoryManagement() {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', parent_id: '', description: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('inventory_categories')
      .select('*')
      .order('display_order', { ascending: true });
    setCategories((data as InventoryCategory[]) || []);
    setLoading(false);
  };

  const parentCategories = categories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        parent_id: form.parent_id || null,
        description: form.description.trim(),
      };
      if (editingId) {
        await supabase.from('inventory_categories').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId);
      } else {
        await supabase.from('inventory_categories').insert({ ...payload, display_order: categories.length });
      }
      setForm({ name: '', parent_id: '', description: '' });
      setEditingId(null);
      setShowAdd(false);
      loadCategories();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (cat: InventoryCategory) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, parent_id: cat.parent_id || '', description: cat.description || '' });
    setShowAdd(true);
  };

  const deleteCategory = async (id: string) => {
    const hasChildren = categories.some(c => c.parent_id === id);
    if (hasChildren) {
      alert('Bu kategorinin alt kategorileri var. Önce alt kategorileri silin.');
      return;
    }
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return;
    await supabase.from('inventory_categories').delete().eq('id', id);
    loadCategories();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAdd(false);
    setForm({ name: '', parent_id: '', description: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Tag size={18} className="text-gray-500" />
          Envanter Kategorileri
        </h3>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus size={15} />
            Kategori Ekle
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleSave} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            {editingId ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Kategori Adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
                placeholder="Kategori adı..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Üst Kategori (Opsiyonel)</label>
              <select
                value={form.parent_id}
                onChange={e => setForm(p => ({ ...p, parent_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              >
                <option value="">Ana Kategori</option>
                {parentCategories
                  .filter(c => c.id !== editingId)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Kısa açıklama..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={cancelEdit} className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Vazgeç
            </button>
            <button type="submit" disabled={saving} className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
        </div>
      ) : (
        <div className="space-y-1">
          {parentCategories.map(parent => {
            const children = getChildren(parent.id);
            return (
              <div key={parent.id}>
                <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <Tag size={15} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{parent.name}</p>
                    {parent.description && <p className="text-xs text-gray-400">{parent.description}</p>}
                  </div>
                  <span className="text-xs text-gray-400">{children.length} alt kategori</span>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(parent)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteCategory(parent.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {children.map(child => (
                  <div key={child.id} className="flex items-center gap-3 p-2.5 ml-6 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors mt-1">
                    <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">{child.name}</p>
                      {child.description && <p className="text-xs text-gray-400">{child.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(child)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => deleteCategory(child.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {categories.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              Henüz kategori eklenmemiş.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

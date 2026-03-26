import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, ChevronRight, Tag, FolderOpen, Folder } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { InventoryCategory } from '../../types';

interface CategoryFormState {
  name: string;
  description: string;
  parent_id: string | null;
}

const emptyForm = (): CategoryFormState => ({ name: '', description: '', parent_id: null });

export function InventoryCategoryManagement() {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [showMainForm, setShowMainForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [subFormParentId, setSubFormParentId] = useState<string | null>(null);

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
      cancelAll();
      loadCategories();
    } finally {
      setSaving(false);
    }
  };

  const startEditMain = (cat: InventoryCategory) => {
    cancelAll();
    setEditingId(cat.id);
    setForm({ name: cat.name, description: cat.description || '', parent_id: cat.parent_id });
    if (cat.parent_id) {
      setSubFormParentId(cat.parent_id);
    } else {
      setShowMainForm(true);
    }
  };

  const startAddSub = (parentId: string) => {
    cancelAll();
    setSubFormParentId(parentId);
    setForm({ ...emptyForm(), parent_id: parentId });
  };

  const startAddMain = () => {
    cancelAll();
    setShowMainForm(true);
    setForm(emptyForm());
  };

  const cancelAll = () => {
    setShowMainForm(false);
    setSubFormParentId(null);
    setEditingId(null);
    setForm(emptyForm());
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

  const CategoryForm = ({ title }: { title: string }) => (
    <form onSubmit={handleSave} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-medium text-gray-700">{title}</h4>
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
            autoFocus
            placeholder="Kategori adı..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <div>
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
        <button type="button" onClick={cancelAll} className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
          Vazgeç
        </button>
        <button type="submit" disabled={saving} className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
          {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Ekle'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">

      {/* Ana Kategoriler */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FolderOpen size={16} className="text-gray-500" />
            Ana Kategoriler
          </h3>
          {!showMainForm && (
            <button
              onClick={startAddMain}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus size={13} />
              Ana Kategori Ekle
            </button>
          )}
        </div>

        {showMainForm && !subFormParentId && (
          <CategoryForm title={editingId ? 'Ana Kategoriyi Düzenle' : 'Yeni Ana Kategori'} />
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-red-600" />
          </div>
        ) : parentCategories.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
            Henüz ana kategori eklenmemiş.
          </div>
        ) : (
          <div className="space-y-3">
            {parentCategories.map(parent => {
              const children = getChildren(parent.id);
              const isEditingThisParent = editingId === parent.id && showMainForm;

              return (
                <div key={parent.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Ana kategori satırı */}
                  <div className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50 transition-colors">
                    <Folder size={16} className="text-red-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{parent.name}</p>
                      {parent.description && <p className="text-xs text-gray-400 mt-0.5">{parent.description}</p>}
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {children.length} alt kategori
                    </span>
                    <div className="flex gap-1 items-center">
                      <button
                        onClick={() => startAddSub(parent.id)}
                        className="flex items-center gap-1 text-xs px-2 py-1 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Plus size={12} />
                        Alt Ekle
                      </button>
                      <button onClick={() => startEditMain(parent)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deleteCategory(parent.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Edit form for this parent */}
                  {isEditingThisParent && (
                    <div className="p-3 border-t border-gray-100 bg-gray-50">
                      <CategoryForm title="Ana Kategoriyi Düzenle" />
                    </div>
                  )}

                  {/* Alt kategori form */}
                  {subFormParentId === parent.id && (
                    <div className="p-3 border-t border-gray-100 bg-gray-50">
                      <CategoryForm title={editingId ? 'Alt Kategoriyi Düzenle' : `"${parent.name}" altına yeni alt kategori`} />
                    </div>
                  )}

                  {/* Alt kategoriler */}
                  {children.length > 0 && (
                    <div className="divide-y divide-gray-50 border-t border-gray-100">
                      {children.map(child => {
                        const isEditingChild = editingId === child.id && subFormParentId === parent.id;
                        return (
                          <div key={child.id}>
                            <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
                              <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
                              <Tag size={13} className="text-gray-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700">{child.name}</p>
                                {child.description && <p className="text-xs text-gray-400">{child.description}</p>}
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => startEditMain(child)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors">
                                  <Edit2 size={13} />
                                </button>
                                <button onClick={() => deleteCategory(child.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            {isEditingChild && (
                              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                                <CategoryForm title="Alt Kategoriyi Düzenle" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

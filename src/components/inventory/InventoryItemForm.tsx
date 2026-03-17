import { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { InventoryCategory, InventoryItem } from '../../types';

interface Props {
  item?: InventoryItem | null;
  onClose: () => void;
  onSave: () => void;
}

export function InventoryItemForm({ item, onClose, onSave }: Props) {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: item?.name || '',
    category_id: item?.category_id || '',
    quantity: item?.quantity ?? 1,
    location: item?.location || '',
    status: item?.status || 'available',
    image_url: item?.image_url || '',
    description: item?.description || '',
    donor_name: item?.donor_name || '',
    serial_number: item?.serial_number || '',
    purchase_date: item?.purchase_date || '',
    purchase_price: item?.purchase_price ?? '',
    notes: item?.notes || '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('inventory_categories')
      .select('*')
      .order('display_order', { ascending: true });
    setCategories(data || []);
  };

  const parentCategories = categories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('auth_id', user!.id)
        .maybeSingle();

      const payload = {
        name: form.name.trim(),
        category_id: form.category_id || null,
        quantity: Number(form.quantity),
        available_quantity: item ? item.available_quantity : Number(form.quantity),
        location: form.location.trim(),
        status: form.status,
        image_url: form.image_url.trim(),
        description: form.description.trim(),
        donor_name: form.donor_name.trim(),
        serial_number: form.serial_number.trim(),
        purchase_date: form.purchase_date || null,
        purchase_price: form.purchase_price !== '' ? Number(form.purchase_price) : null,
        notes: form.notes.trim(),
        created_by: memberData?.id || null,
      };

      if (item) {
        const quantityDiff = Number(form.quantity) - item.quantity;
        const newAvailable = Math.max(0, item.available_quantity + quantityDiff);
        await supabase
          .from('inventory_items')
          .update({ ...payload, available_quantity: newAvailable, updated_at: new Date().toISOString() })
          .eq('id', item.id);
      } else {
        await supabase.from('inventory_items').insert(payload);
      }
      onSave();
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string, v: string | number) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <Package size={18} className="text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">
              {item ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Ürün Adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
                placeholder="Ürün adını girin..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ana Kategori</label>
              <select
                value={categories.find(c => c.id === form.category_id)?.parent_id ? '' : form.category_id}
                onChange={e => set('category_id', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              >
                <option value="">Seçiniz...</option>
                {parentCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Alt Kategori</label>
              <select
                value={form.category_id}
                onChange={e => set('category_id', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              >
                <option value="">Seçiniz...</option>
                {parentCategories.map(parent => {
                  const children = getChildren(parent.id);
                  if (children.length === 0) return null;
                  return (
                    <optgroup key={parent.id} label={parent.name}>
                      {children.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  );
                })}
                <optgroup label="Ana Kategoriler">
                  {parentCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Adet <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
                min="1"
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Konum / Lokasyon</label>
              <input
                type="text"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="Depo, salon, ofis..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Durum</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              >
                <option value="available">Mevcut</option>
                <option value="assigned">Zimmette</option>
                <option value="maintenance">Bakımda</option>
                <option value="retired">Hizmet Dışı</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bağış Yapan Kişi</label>
              <input
                type="text"
                value={form.donor_name}
                onChange={e => set('donor_name', e.target.value)}
                placeholder="Bağış yapanın adı..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-gray-400" />
                Fotoğraf URL
              </label>
              <input
                type="url"
                value={form.image_url}
                onChange={e => set('image_url', e.target.value)}
                placeholder="https://example.com/resim.jpg"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              {form.image_url && (
                <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={form.image_url}
                    alt="Önizleme"
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Açıklama</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                placeholder="Ürün hakkında kısa açıklama..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Seri No</label>
              <input
                type="text"
                value={form.serial_number}
                onChange={e => set('serial_number', e.target.value)}
                placeholder="Seri / barkod numarası..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Alım Tarihi</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={e => set('purchase_date', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Alım Fiyatı (₺)</label>
              <input
                type="number"
                value={form.purchase_price}
                onChange={e => set('purchase_price', e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notlar</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={2}
                placeholder="Ek notlar..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : item ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { X, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { InventoryItem, Member } from '../../types';

interface Props {
  item: InventoryItem;
  onClose: () => void;
  onSave: () => void;
}

export function AssignmentModal({ item, onClose, onSave }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    assigned_to_member_id: '',
    assigned_to_name: '',
    quantity: 1,
    due_date: '',
    notes: '',
    useManualName: false,
  });

  useEffect(() => {
    supabase
      .from('members')
      .select('id, full_name, email')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => setMembers(data || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assigned_to_name.trim() && !form.assigned_to_member_id) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('auth_id', user!.id)
        .maybeSingle();

      const selectedMember = members.find(m => m.id === form.assigned_to_member_id);
      const name = form.useManualName
        ? form.assigned_to_name.trim()
        : (selectedMember?.full_name || form.assigned_to_name.trim());

      await supabase.from('inventory_assignments').insert({
        item_id: item.id,
        assigned_to_member_id: form.assigned_to_member_id || null,
        assigned_to_name: name,
        quantity: form.quantity,
        due_date: form.due_date || null,
        notes: form.notes.trim(),
        created_by: memberData?.id || null,
      });

      const newAvailable = item.available_quantity - form.quantity;
      await supabase
        .from('inventory_items')
        .update({
          available_quantity: newAvailable,
          status: newAvailable <= 0 ? 'assigned' : 'available',
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      onSave();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <UserCheck size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Zimmete Ver</h2>
              <p className="text-xs text-gray-500">{item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            Mevcut stok: <strong>{item.available_quantity}</strong> adet
          </div>

          <div className="flex items-center gap-2 mb-1">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.useManualName}
                onChange={e => setForm(p => ({ ...p, useManualName: e.target.checked, assigned_to_member_id: '' }))}
                className="w-4 h-4 text-red-600 border-gray-300 rounded"
              />
              Üye listesi dışında kişiye ver
            </label>
          </div>

          {form.useManualName ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Ad Soyad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.assigned_to_name}
                onChange={e => setForm(p => ({ ...p, assigned_to_name: e.target.value }))}
                required
                placeholder="Kişinin adını girin..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Üye Seç <span className="text-red-500">*</span>
              </label>
              <select
                value={form.assigned_to_member_id}
                onChange={e => setForm(p => ({ ...p, assigned_to_member_id: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              >
                <option value="">Üye seçiniz...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Adet <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.quantity}
              onChange={e => setForm(p => ({ ...p, quantity: Math.min(item.available_quantity, Math.max(1, Number(e.target.value))) }))}
              min="1"
              max={item.available_quantity}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">İade Tarihi (Opsiyonel)</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notlar</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              placeholder="Ek notlar..."
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Vazgeç
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              {loading ? 'Kaydediliyor...' : 'Zimmete Ver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

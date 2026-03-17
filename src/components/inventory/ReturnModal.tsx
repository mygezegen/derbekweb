import { useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { InventoryAssignment, InventoryItem } from '../../types';

interface Props {
  item: InventoryItem;
  onClose: () => void;
  onSave: () => void;
}

export function ReturnModal({ item, onClose, onSave }: Props) {
  const [assignments, setAssignments] = useState<InventoryAssignment[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from('inventory_assignments')
      .select('*, members(full_name)')
      .eq('item_id', item.id)
      .is('returned_at', null)
      .order('assigned_at', { ascending: false })
      .then(({ data }) => setAssignments((data as InventoryAssignment[]) || []));
  }, [item.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setLoading(true);
    try {
      const assignment = assignments.find(a => a.id === selectedId);
      if (!assignment) return;

      await supabase
        .from('inventory_assignments')
        .update({ returned_at: new Date().toISOString(), notes: notes || assignment.notes })
        .eq('id', selectedId);

      const newAvailable = item.available_quantity + assignment.quantity;
      await supabase
        .from('inventory_items')
        .update({
          available_quantity: newAvailable,
          status: newAvailable >= item.quantity ? 'available' : item.status,
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
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <RotateCcw size={18} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">İade Al</h2>
              <p className="text-xs text-gray-500">{item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {assignments.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              Bu ürün için aktif zimmet kaydı bulunamadı.
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Zimmet Kaydı Seçin <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {assignments.map(a => (
                    <label
                      key={a.id}
                      className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                        selectedId === a.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="assignment"
                        value={a.id}
                        checked={selectedId === a.id}
                        onChange={() => setSelectedId(a.id)}
                        className="mt-0.5 w-4 h-4 text-green-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{a.assigned_to_name}</p>
                        <p className="text-xs text-gray-500">
                          {a.quantity} adet · {new Date(a.assigned_at).toLocaleDateString('tr-TR')}
                          {a.due_date && ` · İade: ${new Date(a.due_date).toLocaleDateString('tr-TR')}`}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">İade Notu</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="İade durumu hakkında not..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                  Vazgeç
                </button>
                <button type="submit" disabled={loading || !selectedId} className="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                  {loading ? 'Kaydediliyor...' : 'İadeyi Onayla'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

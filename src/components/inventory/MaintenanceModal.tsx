import { useState, useEffect } from 'react';
import { X, Wrench, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { InventoryItem, InventoryMaintenance } from '../../types';

interface Props {
  item: InventoryItem;
  onClose: () => void;
  onSave: () => void;
}

const STATUS_LABELS = {
  reported: { label: 'Raporlandı', color: 'text-red-600 bg-red-50 border-red-200' },
  in_progress: { label: 'İşlemde', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  resolved: { label: 'Çözüldü', color: 'text-green-600 bg-green-50 border-green-200' },
};

export function MaintenanceModal({ item, onClose, onSave }: Props) {
  const [records, setRecords] = useState<InventoryMaintenance[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [item.id]);

  const loadRecords = async () => {
    const { data } = await supabase
      .from('inventory_maintenance')
      .select('*')
      .eq('item_id', item.id)
      .order('created_at', { ascending: false });
    setRecords((data as InventoryMaintenance[]) || []);
  };

  const reportMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('auth_id', user!.id)
        .maybeSingle();

      await supabase.from('inventory_maintenance').insert({
        item_id: item.id,
        reported_by: memberData?.id || null,
        description: description.trim(),
        status: 'reported',
      });

      await supabase
        .from('inventory_items')
        .update({ status: 'maintenance', updated_at: new Date().toISOString() })
        .eq('id', item.id);

      setDescription('');
      setShowForm(false);
      loadRecords();
      onSave();
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (record: InventoryMaintenance, newStatus: InventoryMaintenance['status']) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: memberData } = await supabase
      .from('members')
      .select('id')
      .eq('auth_id', user!.id)
      .maybeSingle();

    await supabase
      .from('inventory_maintenance')
      .update({
        status: newStatus,
        resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null,
        resolved_by: newStatus === 'resolved' ? (memberData?.id || null) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    if (newStatus === 'resolved') {
      await supabase
        .from('inventory_items')
        .update({ status: 'available', updated_at: new Date().toISOString() })
        .eq('id', item.id);
    }

    loadRecords();
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <Wrench size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Arıza / Bakım</h2>
              <p className="text-xs text-gray-500">{item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-2.5 border-2 border-dashed border-amber-300 text-amber-600 rounded-xl text-sm font-medium hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
            >
              <Wrench size={16} />
              Yeni Arıza / Bakım Kaydı Oluştur
            </button>
          ) : (
            <form onSubmit={reportMaintenance} className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-amber-800">Yeni Kayıt</h3>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                required
                placeholder="Arıza veya bakım ihtiyacını açıklayın..."
                className="w-full border border-amber-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none bg-white"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          )}

          {records.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Henüz arıza / bakım kaydı yok.
            </div>
          ) : (
            <div className="space-y-3">
              {records.map(r => {
                const s = STATUS_LABELS[r.status];
                return (
                  <div key={r.id} className="border border-gray-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-800 flex-1">{r.description}</p>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border ${s.color} flex-shrink-0`}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    {r.status !== 'resolved' && (
                      <div className="flex gap-2 pt-1">
                        {r.status === 'reported' && (
                          <button
                            onClick={() => updateStatus(r, 'in_progress')}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                          >
                            <Clock size={12} />
                            İşleme Al
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(r, 'resolved')}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                        >
                          <CheckCircle2 size={12} />
                          Çözüldü İşaretle
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

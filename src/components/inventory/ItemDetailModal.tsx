import { useState, useEffect } from 'react';
import { X, Package, MapPin, Tag, User, Calendar, AlertTriangle, RotateCcw, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { InventoryItem, InventoryAssignment, InventoryMaintenance, InventoryEventUsage } from '../../types';

interface Props {
  item: InventoryItem;
  onClose: () => void;
}

const STATUS_MAP = {
  available: { label: 'Mevcut', color: 'bg-green-100 text-green-700' },
  assigned: { label: 'Zimmette', color: 'bg-blue-100 text-blue-700' },
  maintenance: { label: 'Bakımda', color: 'bg-amber-100 text-amber-700' },
  retired: { label: 'Hizmet Dışı', color: 'bg-gray-100 text-gray-600' },
};

export function ItemDetailModal({ item, onClose }: Props) {
  const [tab, setTab] = useState<'info' | 'assignments' | 'maintenance' | 'events'>('info');
  const [assignments, setAssignments] = useState<InventoryAssignment[]>([]);
  const [maintenance, setMaintenance] = useState<InventoryMaintenance[]>([]);
  const [eventUsage, setEventUsage] = useState<InventoryEventUsage[]>([]);

  useEffect(() => {
    if (tab === 'assignments') {
      supabase
        .from('inventory_assignments')
        .select('*')
        .eq('item_id', item.id)
        .order('assigned_at', { ascending: false })
        .then(({ data }) => setAssignments((data as InventoryAssignment[]) || []));
    } else if (tab === 'maintenance') {
      supabase
        .from('inventory_maintenance')
        .select('*')
        .eq('item_id', item.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setMaintenance((data as InventoryMaintenance[]) || []));
    } else if (tab === 'events') {
      supabase
        .from('inventory_event_usage')
        .select('*')
        .eq('item_id', item.id)
        .order('used_at', { ascending: false })
        .then(({ data }) => setEventUsage((data as InventoryEventUsage[]) || []));
    }
  }, [tab, item.id]);

  const status = STATUS_MAP[item.status];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-gray-200" />
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Package size={22} className="text-gray-400" />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-gray-800">{item.name}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-5">
          {[
            { id: 'info', label: 'Bilgiler' },
            { id: 'assignments', label: 'Zimmet' },
            { id: 'maintenance', label: 'Bakım' },
            { id: 'events', label: 'Etkinlikler' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Toplam Stok</p>
                  <p className="text-xl font-bold text-gray-800">{item.quantity}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Mevcut Stok</p>
                  <p className="text-xl font-bold text-green-700">{item.available_quantity}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {item.location && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">Konum:</span>
                    <span className="font-medium text-gray-800">{item.location}</span>
                  </div>
                )}
                {item.inventory_categories && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Tag size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">Kategori:</span>
                    <span className="font-medium text-gray-800">{item.inventory_categories.name}</span>
                  </div>
                )}
                {item.donor_name && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <User size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">Bağış Yapan:</span>
                    <span className="font-medium text-gray-800">{item.donor_name}</span>
                  </div>
                )}
                {item.purchase_date && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">Alım Tarihi:</span>
                    <span className="font-medium text-gray-800">{new Date(item.purchase_date).toLocaleDateString('tr-TR')}</span>
                  </div>
                )}
                {item.purchase_price && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <span className="text-gray-400 w-4 text-center flex-shrink-0">₺</span>
                    <span className="text-gray-600">Alım Fiyatı:</span>
                    <span className="font-medium text-gray-800">{item.purchase_price.toLocaleString('tr-TR')} ₺</span>
                  </div>
                )}
                {item.serial_number && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <span className="text-gray-400 text-xs mt-0.5 w-4 flex-shrink-0">#</span>
                    <span className="text-gray-600">Seri No:</span>
                    <span className="font-medium text-gray-800 font-mono">{item.serial_number}</span>
                  </div>
                )}
              </div>

              {item.description && (
                <div>
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Açıklama</p>
                  <p className="text-sm text-gray-700">{item.description}</p>
                </div>
              )}
              {item.notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Notlar</p>
                  <p className="text-sm text-gray-700">{item.notes}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'assignments' && (
            <div className="space-y-3">
              {assignments.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Zimmet kaydı yok.</p>
              ) : assignments.map(a => (
                <div key={a.id} className={`border rounded-xl p-4 ${a.returned_at ? 'border-gray-200 bg-gray-50' : 'border-blue-200 bg-blue-50'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{a.assigned_to_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {a.quantity} adet · {new Date(a.assigned_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    {a.returned_at ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        <RotateCcw size={11} />
                        İade Edildi
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                        <Clock size={11} />
                        Zimmette
                      </span>
                    )}
                  </div>
                  {a.returned_at && (
                    <p className="text-xs text-gray-400 mt-1">İade: {new Date(a.returned_at).toLocaleDateString('tr-TR')}</p>
                  )}
                  {a.notes && <p className="text-xs text-gray-500 mt-1 italic">{a.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {tab === 'maintenance' && (
            <div className="space-y-3">
              {maintenance.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Bakım / arıza kaydı yok.</p>
              ) : maintenance.map(m => (
                <div key={m.id} className={`border rounded-xl p-4 ${m.status === 'resolved' ? 'border-gray-200 bg-gray-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-800">{m.description}</p>
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                      m.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      m.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {m.status === 'resolved' ? 'Çözüldü' : m.status === 'in_progress' ? 'İşlemde' : 'Raporlandı'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{new Date(m.created_at).toLocaleDateString('tr-TR')}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'events' && (
            <div className="space-y-3">
              {eventUsage.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Etkinlik kullanım kaydı yok.</p>
              ) : eventUsage.map(eu => (
                <div key={eu.id} className="border border-gray-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-800">{eu.event_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {eu.quantity} adet · {new Date(eu.used_at).toLocaleDateString('tr-TR')}
                    {eu.returned_at && ` · İade: ${new Date(eu.returned_at).toLocaleDateString('tr-TR')}`}
                  </p>
                  {eu.notes && <p className="text-xs text-gray-400 mt-1 italic">{eu.notes}</p>}
                </div>
              ))}
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

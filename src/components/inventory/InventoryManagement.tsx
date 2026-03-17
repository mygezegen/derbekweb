import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Search, Filter, Grid3x3 as Grid3X3, List, Eye, CreditCard as Edit2, Trash2, UserCheck, RotateCcw, Wrench, AlertTriangle, Tag, MapPin, TrendingDown, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { InventoryItem, InventoryCategory } from '../../types';
import { InventoryItemForm } from './InventoryItemForm';
import { AssignmentModal } from './AssignmentModal';
import { ReturnModal } from './ReturnModal';
import { MaintenanceModal } from './MaintenanceModal';
import { ItemDetailModal } from './ItemDetailModal';

const STATUS_MAP = {
  available: { label: 'Mevcut', color: 'bg-green-100 text-green-700 border-green-200' },
  assigned: { label: 'Zimmette', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  maintenance: { label: 'Bakımda', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  retired: { label: 'Hizmet Dışı', color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

type Modal = 'add' | 'edit' | 'assign' | 'return' | 'maintenance' | 'detail' | null;

interface Stats {
  total: number;
  assigned: number;
  maintenance: number;
  critical: number;
}

export function InventoryManagement() {
  const { member } = useAuth();
  const isAdmin = member?.is_admin || member?.is_root;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, assigned: 0, maintenance: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [modal, setModal] = useState<Modal>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, catRes] = await Promise.all([
        supabase
          .from('inventory_items')
          .select('*, inventory_categories(id, name, parent_id)')
          .order('name', { ascending: true }),
        supabase
          .from('inventory_categories')
          .select('*')
          .order('display_order', { ascending: true }),
      ]);

      const allItems = (itemsRes.data as InventoryItem[]) || [];
      setItems(allItems);
      setCategories((catRes.data as InventoryCategory[]) || []);

      setStats({
        total: allItems.length,
        assigned: allItems.filter(i => i.available_quantity < i.quantity).length,
        maintenance: allItems.filter(i => i.status === 'maintenance').length,
        critical: allItems.filter(i => i.available_quantity === 0 && i.status !== 'retired').length,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openModal = (m: Modal, item?: InventoryItem) => {
    setSelectedItem(item || null);
    setModal(m);
  };

  const closeModal = () => { setModal(null); setSelectedItem(null); };

  const handleSave = () => { closeModal(); loadData(); };

  const deleteItem = async (item: InventoryItem) => {
    if (!confirm(`"${item.name}" silinecek. Onaylıyor musunuz?`)) return;
    await supabase.from('inventory_items').delete().eq('id', item.id);
    loadData();
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.location?.toLowerCase().includes(search.toLowerCase()) ||
      item.donor_name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || item.category_id === filterCategory ||
      item.inventory_categories?.parent_id === filterCategory;
    const matchStatus = !filterStatus || item.status === filterStatus;
    const matchLocation = !filterLocation ||
      item.location?.toLowerCase().includes(filterLocation.toLowerCase());
    return matchSearch && matchCat && matchStatus && matchLocation;
  });

  const parentCats = categories.filter(c => !c.parent_id);
  const locations = [...new Set(items.map(i => i.location).filter(Boolean))];

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Envanter Yönetimi</h1>
            <p className="text-sm text-gray-500 mt-1">Demirbaş ve malzeme takibi</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => openModal('add')}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Plus size={18} />
              Ürün Ekle
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Toplam Ürün', value: stats.total, icon: Package, color: 'text-gray-600', bg: 'bg-gray-100' },
            { label: 'Zimmetteki', value: stats.assigned, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-100' },
            { label: 'Kritik Stok', value: stats.critical, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100' },
            { label: 'Bakımda', value: stats.maintenance, icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-100' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Ürün adı, konum, bağışçı..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white min-w-[140px]"
            >
              <option value="">Tüm Kategoriler</option>
              {parentCats.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white min-w-[130px]"
            >
              <option value="">Tüm Durumlar</option>
              <option value="available">Mevcut</option>
              <option value="assigned">Zimmette</option>
              <option value="maintenance">Bakımda</option>
              <option value="retired">Hizmet Dışı</option>
            </select>
            {locations.length > 0 && (
              <select
                value={filterLocation}
                onChange={e => setFilterLocation(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white min-w-[130px]"
              >
                <option value="">Tüm Konumlar</option>
                {locations.map(l => (
                  <option key={l} value={l!}>{l}</option>
                ))}
              </select>
            )}
            <div className="flex gap-1 border border-gray-300 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid3X3 size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">{filteredItems.length} ürün gösteriliyor</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Package size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Ürün bulunamadı</p>
            <p className="text-gray-400 text-sm mt-1">Arama kriterlerinizi değiştirin veya yeni ürün ekleyin.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <GridCard
                key={item.id}
                item={item}
                isAdmin={!!isAdmin}
                onDetail={() => openModal('detail', item)}
                onEdit={() => openModal('edit', item)}
                onAssign={() => openModal('assign', item)}
                onReturn={() => openModal('return', item)}
                onMaintenance={() => openModal('maintenance', item)}
                onDelete={() => deleteItem(item)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Ürün</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Kategori</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Konum</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Stok</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Durum</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map(item => (
                  <ListRow
                    key={item.id}
                    item={item}
                    isAdmin={!!isAdmin}
                    onDetail={() => openModal('detail', item)}
                    onEdit={() => openModal('edit', item)}
                    onAssign={() => openModal('assign', item)}
                    onReturn={() => openModal('return', item)}
                    onMaintenance={() => openModal('maintenance', item)}
                    onDelete={() => deleteItem(item)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal === 'add' && <InventoryItemForm onClose={closeModal} onSave={handleSave} />}
      {modal === 'edit' && selectedItem && <InventoryItemForm item={selectedItem} onClose={closeModal} onSave={handleSave} />}
      {modal === 'assign' && selectedItem && <AssignmentModal item={selectedItem} onClose={closeModal} onSave={handleSave} />}
      {modal === 'return' && selectedItem && <ReturnModal item={selectedItem} onClose={closeModal} onSave={handleSave} />}
      {modal === 'maintenance' && selectedItem && <MaintenanceModal item={selectedItem} onClose={closeModal} onSave={handleSave} />}
      {modal === 'detail' && selectedItem && <ItemDetailModal item={selectedItem} onClose={closeModal} />}
    </div>
  );
}

interface CardProps {
  item: InventoryItem;
  isAdmin: boolean;
  onDetail: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onReturn: () => void;
  onMaintenance: () => void;
  onDelete: () => void;
}

function GridCard({ item, isAdmin, onDetail, onEdit, onAssign, onReturn, onMaintenance, onDelete }: CardProps) {
  const status = STATUS_MAP[item.status];
  const isCritical = item.available_quantity === 0 && item.status !== 'retired';

  return (
    <div className={`bg-white rounded-xl border transition-shadow hover:shadow-md ${isCritical ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="relative">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-36 object-cover rounded-t-xl"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-36 bg-gray-50 rounded-t-xl flex items-center justify-center">
            <Package size={32} className="text-gray-300" />
          </div>
        )}
        <span className={`absolute top-2 right-2 text-xs font-medium px-2 py-1 rounded-full border ${status.color}`}>
          {status.label}
        </span>
        {isCritical && (
          <span className="absolute top-2 left-2 text-xs font-medium px-2 py-1 rounded-full bg-red-600 text-white">
            Stok Yok
          </span>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-gray-800 text-sm truncate">{item.name}</h3>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-gray-400">
            {item.available_quantity}/{item.quantity} adet
          </span>
          {item.location && (
            <span className="flex items-center gap-1 text-xs text-gray-400 truncate">
              <MapPin size={11} />
              {item.location}
            </span>
          )}
        </div>
        {item.inventory_categories && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400 mt-1">
            <Tag size={10} />
            {item.inventory_categories.name}
          </span>
        )}
        {item.donor_name && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">Bağış: {item.donor_name}</p>
        )}

        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <button
            onClick={onDetail}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Eye size={12} />
            Detay
          </button>
          {isAdmin && (
            <>
              {item.available_quantity > 0 && item.status === 'available' && (
                <button
                  onClick={onAssign}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <UserCheck size={12} />
                  Zimmet
                </button>
              )}
              {item.available_quantity < item.quantity && (
                <button
                  onClick={onReturn}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                >
                  <RotateCcw size={12} />
                  İade
                </button>
              )}
              <button
                onClick={onMaintenance}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors"
              >
                <Wrench size={12} />
                Bakım
              </button>
              <button
                onClick={onEdit}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ListRow({ item, isAdmin, onDetail, onEdit, onAssign, onReturn, onMaintenance, onDelete }: CardProps) {
  const status = STATUS_MAP[item.status];
  const isCritical = item.available_quantity === 0 && item.status !== 'retired';

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${isCritical ? 'bg-red-50/30' : ''}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-9 h-9 rounded-lg object-cover border border-gray-200 flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package size={16} className="text-gray-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-800">{item.name}</p>
            {item.donor_name && <p className="text-xs text-gray-400">Bağış: {item.donor_name}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="text-xs text-gray-500">{item.inventory_categories?.name || '—'}</span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-gray-500">{item.location || '—'}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`text-sm font-semibold ${isCritical ? 'text-red-600' : 'text-gray-800'}`}>
          {item.available_quantity}/{item.quantity}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${status.color}`}>
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button onClick={onDetail} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Detay">
            <Eye size={15} />
          </button>
          {isAdmin && (
            <>
              {item.available_quantity > 0 && item.status === 'available' && (
                <button onClick={onAssign} className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Zimmete ver">
                  <UserCheck size={15} />
                </button>
              )}
              {item.available_quantity < item.quantity && (
                <button onClick={onReturn} className="p-1.5 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="İade al">
                  <RotateCcw size={15} />
                </button>
              )}
              <button onClick={onMaintenance} className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Arıza/Bakım">
                <Wrench size={15} />
              </button>
              <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Düzenle">
                <Edit2 size={15} />
              </button>
              <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

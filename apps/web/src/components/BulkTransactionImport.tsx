import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Upload, Plus, Trash2, Save } from 'lucide-react';
import { Member } from '../types';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  description: string;
  is_active: boolean;
}

interface BulkTransactionImportProps {
  onClose: () => void;
  categories: Category[];
}

interface TransactionRow {
  id: string;
  type: 'income' | 'expense';
  category_id: string;
  amount: string;
  description: string;
  transaction_date: string;
  payment_method: string;
  reference_number: string;
  member_id: string;
}

export function BulkTransactionImport({ onClose, categories }: BulkTransactionImportProps) {
  const [rows, setRows] = useState<TransactionRow[]>([
    {
      id: crypto.randomUUID(),
      type: 'income',
      category_id: '',
      amount: '',
      description: '',
      transaction_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      reference_number: '',
      member_id: ''
    }
  ]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);

  useEffect(() => {
    loadMembers();
    loadCurrentMember();
  }, []);

  const loadMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('is_active', true)
      .order('full_name');

    if (data) setMembers(data);
  };

  const loadCurrentMember = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: member } = await supabase
        .from('members')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (member) setCurrentMember(member);
    }
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: crypto.randomUUID(),
        type: 'income',
        category_id: '',
        amount: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        reference_number: '',
        member_id: ''
      }
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      alert('En az bir işlem satırı olmalıdır');
      return;
    }
    setRows(rows.filter((row) => row.id !== id));
  };

  const updateRow = (id: string, field: keyof TransactionRow, value: string) => {
    setRows(
      rows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentMember) {
      alert('Kullanıcı bilgisi alınamadı');
      return;
    }

    const invalidRows = rows.filter(
      (row) => !row.category_id || !row.amount || !row.description
    );

    if (invalidRows.length > 0) {
      alert('Lütfen tüm satırlarda zorunlu alanları doldurun (Kategori, Tutar, Açıklama)');
      return;
    }

    setLoading(true);
    try {
      const transactions = rows.map((row) => ({
        category_id: row.category_id,
        member_id: row.member_id || null,
        amount: parseFloat(row.amount),
        type: row.type,
        description: row.description,
        transaction_date: new Date(row.transaction_date).toISOString(),
        payment_method: row.payment_method,
        reference_number: row.reference_number || null,
        created_by: currentMember.id
      }));

      const { error } = await supabase.from('transactions').insert(transactions);

      if (error) throw error;

      alert(`${transactions.length} işlem başarıyla kaydedildi`);
      onClose();
    } catch (error) {
      console.error('Error saving bulk transactions:', error);
      alert('İşlemler kaydedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCategories = (type: 'income' | 'expense') => {
    return categories.filter((cat) => cat.type === type);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-800">Toplu İşlem Girişi</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Birden fazla işlemi aynı anda ekleyebilirsiniz
            </p>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={20} />
              Satır Ekle
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">
                    Tip *
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-40">
                    Kategori *
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
                    Tutar (₺) *
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Açıklama *
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-36">
                    Tarih *
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-36">
                    Ödeme
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
                    Referans
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-40">
                    Üye
                  </th>
                  <th className="px-2 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2">
                      <select
                        value={row.type}
                        onChange={(e) => {
                          updateRow(row.id, 'type', e.target.value);
                          updateRow(row.id, 'category_id', '');
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="income">Gelir</option>
                        <option value="expense">Gider</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={row.category_id}
                        onChange={(e) => updateRow(row.id, 'category_id', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Seçiniz</option>
                        {getFilteredCategories(row.type).map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.amount}
                        onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="İşlem açıklaması"
                        required
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        value={row.transaction_date}
                        onChange={(e) => updateRow(row.id, 'transaction_date', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={row.payment_method}
                        onChange={(e) => updateRow(row.id, 'payment_method', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="cash">Nakit</option>
                        <option value="bank_transfer">Havale</option>
                        <option value="credit_card">Kredi Kartı</option>
                        <option value="other">Diğer</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.reference_number}
                        onChange={(e) => updateRow(row.id, 'reference_number', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ref no"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={row.member_id}
                        onChange={(e) => updateRow(row.id, 'member_id', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seçiniz</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.full_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Satırı Sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center gap-3 pt-6 border-t mt-6">
            <div className="text-sm text-gray-600">
              Toplam {rows.length} işlem eklenecek
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                <Save size={20} />
                {loading ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

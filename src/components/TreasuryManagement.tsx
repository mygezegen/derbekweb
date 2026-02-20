import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Calendar, Filter, Download, Plus, Edit2, Trash2 } from 'lucide-react';
import { TransactionEntry } from './TransactionEntry';
import { BulkTransactionImport } from './BulkTransactionImport';
import { FinancialReport } from './FinancialReport';

interface TreasurySummary {
  total_income: number;
  total_expense: number;
  current_balance: number;
  last_updated: string;
}

interface Transaction {
  id: string;
  category_id: string;
  member_id: string | null;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  transaction_date: string;
  payment_method: string;
  reference_number: string | null;
  created_at: string;
  transaction_categories?: {
    name: string;
    type: string;
  };
  members?: {
    full_name: string;
  };
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  description: string;
  is_active: boolean;
}

interface TreasuryManagementProps {
  isRoot?: boolean;
}

export function TreasuryManagement({ isRoot = false }: TreasuryManagementProps) {
  const [summary, setSummary] = useState<TreasurySummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadData();
  }, [filterType, filterCategory, dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryResult, transactionsResult, categoriesResult] = await Promise.all([
        supabase.from('treasury_summary').select('*').maybeSingle(),
        loadTransactions(),
        supabase.from('transaction_categories').select('*').eq('is_active', true).order('name')
      ]);

      if (summaryResult.data) setSummary(summaryResult.data);
      if (transactionsResult) setTransactions(transactionsResult);
      if (categoriesResult.data) setCategories(categoriesResult.data);
    } catch (error) {
      console.error('Error loading treasury data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        transaction_categories (name, type),
        members!transactions_member_id_fkey (full_name)
      `)
      .order('transaction_date', { ascending: false });

    if (filterType !== 'all') {
      query = query.eq('type', filterType);
    }

    if (filterCategory !== 'all') {
      query = query.eq('category_id', filterCategory);
    }

    if (dateRange.start) {
      query = query.gte('transaction_date', dateRange.start);
    }

    if (dateRange.end) {
      query = query.lte('transaction_date', dateRange.end);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading transactions:', error);
    } else {
      console.log('Loaded transactions:', data);
    }

    return data || [];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Nakit',
      bank_transfer: 'Banka Havalesi',
      credit_card: 'Kredi Kartı',
      other: 'Diğer'
    };
    return labels[method] || method;
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!isRoot) {
      alert('Sadece root kullanıcısı işlem silebilir');
      return;
    }

    if (!confirm('Bu işlemi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('İşlem başarıyla silindi');
      await loadData();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert(err instanceof Error ? err.message : 'İşlem silinirken hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-sm opacity-90">Toplam Gelir</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(summary?.total_income || 0)}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <TrendingDown className="w-6 h-6" />
            </div>
            <span className="text-sm opacity-90">Toplam Gider</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(summary?.total_expense || 0)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <span className="text-sm opacity-90">Kasa Bakiyesi</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(summary?.current_balance || 0)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-blue-600" />
            Hesap Hareketleri
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowTransactionForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Yeni İşlem
            </button>
            <button
              onClick={() => setShowBulkImport(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={20} />
              Toplu İşlem
            </button>
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download size={20} />
              Rapor Al
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter size={16} className="inline mr-1" />
              İşlem Tipi
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="income">Gelir</option>
              <option value="expense">Gider</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter size={16} className="inline mr-1" />
              Kategori
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.type === 'income' ? 'Gelir' : 'Gider'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-1" />
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-1" />
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Açıklama
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Üye
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ödeme Yöntemi
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tutar
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Henüz işlem bulunmamaktadır
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.type === 'income'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {transaction.transaction_categories?.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {transaction.description}
                      {transaction.reference_number && (
                        <span className="text-xs text-gray-500 block">
                          Ref: {transaction.reference_number}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {transaction.members?.full_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {getPaymentMethodLabel(transaction.payment_method)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span
                        className={`text-sm font-semibold ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isRoot && (
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Sadece root kullanıcısı silebilir"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showTransactionForm && (
        <TransactionEntry
          onClose={() => {
            setShowTransactionForm(false);
            loadData();
          }}
          categories={categories}
        />
      )}

      {showBulkImport && (
        <BulkTransactionImport
          onClose={() => {
            setShowBulkImport(false);
            loadData();
          }}
          categories={categories}
        />
      )}

      {showReport && (
        <FinancialReport
          onClose={() => setShowReport(false)}
          transactions={transactions}
          summary={summary}
        />
      )}
    </div>
  );
}

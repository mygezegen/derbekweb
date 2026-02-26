import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MemberDuesWithDetails } from '../types';
import { Search, Check, DollarSign } from 'lucide-react';

export function MemberDuesPayment() {
  const [memberDues, setMemberDues] = useState<MemberDuesWithDetails[]>([]);
  const [filteredDues, setFilteredDues] = useState<MemberDuesWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDues, setSelectedDues] = useState<MemberDuesWithDetails | null>(null);
  const [paymentData, setPaymentData] = useState({
    paid_amount: '',
    payment_method: 'cash',
    notes: ''
  });

  useEffect(() => {
    loadMemberDues();
  }, []);

  useEffect(() => {
    filterDues();
  }, [searchTerm, statusFilter, memberDues]);

  const loadMemberDues = async () => {
    try {
      const { data } = await supabase
        .from('member_dues')
        .select('*, dues(*), members(*)')
        .order('created_at', { ascending: false });
      setMemberDues(data || []);
    } catch (error) {
      console.error('Error loading member dues:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDues = () => {
    let filtered = [...memberDues];

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.members?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.members?.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredDues(filtered);
  };

  const handleMarkAsPaid = (duesItem: MemberDuesWithDetails) => {
    setSelectedDues(duesItem);
    setPaymentData({
      paid_amount: (duesItem.dues?.amount || 0).toString(),
      payment_method: 'cash',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDues) return;

    try {
      await supabase
        .from('member_dues')
        .update({
          status: 'paid',
          paid_amount: parseFloat(paymentData.paid_amount),
          paid_at: new Date().toISOString(),
          payment_method: paymentData.payment_method,
          notes: paymentData.notes || null
        })
        .eq('id', selectedDues.id);

      setShowPaymentModal(false);
      setSelectedDues(null);
      setPaymentData({
        paid_amount: '',
        payment_method: 'cash',
        notes: ''
      });
      loadMemberDues();
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Ödeme kaydedilirken hata oluştu');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Ödendi';
      case 'overdue': return 'Gecikmiş';
      default: return 'Bekliyor';
    }
  };

  const stats = {
    total: memberDues.length,
    paid: memberDues.filter(d => d.status === 'paid').length,
    pending: memberDues.filter(d => d.status === 'pending').length,
    overdue: memberDues.filter(d => d.status === 'overdue').length,
    totalDebt: memberDues
      .filter(d => d.status !== 'paid')
      .reduce((sum, d) => {
        const dueAmount = d.dues?.amount || 0;
        const paidAmount = d.paid_amount || 0;
        return sum + (dueAmount - paidAmount);
      }, 0)
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Aidat Ödemeleri</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
          <div className="text-3xl font-bold text-blue-600 mb-2">{stats.total}</div>
          <p className="text-gray-600 font-medium">Toplam Kayıt</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg border border-green-100">
          <div className="text-3xl font-bold text-green-600 mb-2">{stats.paid}</div>
          <p className="text-gray-600 font-medium">Ödenen</p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-100">
          <div className="text-3xl font-bold text-yellow-600 mb-2">{stats.pending}</div>
          <p className="text-gray-600 font-medium">Bekleyen</p>
        </div>
        <div className="bg-red-50 p-6 rounded-lg border border-red-100">
          <div className="text-3xl font-bold text-red-600 mb-2">₺{stats.totalDebt.toFixed(2)}</div>
          <p className="text-gray-600 font-medium">Toplam Borç</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Üye ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="pending">Bekleyen</option>
            <option value="paid">Ödenen</option>
            <option value="overdue">Gecikmiş</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Üye</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aidat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miktar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödenen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kalan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDues.map((item) => {
                const dueAmount = item.dues?.amount || 0;
                const paidAmount = item.paid_amount || 0;
                const remaining = dueAmount - paidAmount;

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{item.members?.full_name}</div>
                        <div className="text-sm text-gray-500">{item.members?.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.dues?.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap">₺{dueAmount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600">₺{paidAmount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-red-600">₺{remaining.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkAsPaid(item)}
                          className="flex items-center gap-1 text-green-600 hover:text-green-800 transition-colors"
                        >
                          <Check size={18} />
                          Ödendi
                        </button>
                      )}
                      {item.status === 'paid' && item.paid_at && (
                        <div className="text-sm text-gray-500">
                          {new Date(item.paid_at).toLocaleDateString('tr-TR')}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredDues.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Kayıt bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPaymentModal && selectedDues && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Ödeme Kaydı</h3>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Üye: <span className="font-medium">{selectedDues.members?.full_name}</span></p>
              <p className="text-sm text-gray-600">Aidat: <span className="font-medium">{selectedDues.dues?.title}</span></p>
              <p className="text-sm text-gray-600">Tutar: <span className="font-medium">₺{selectedDues.dues?.amount}</span></p>
            </div>
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ödenen Miktar (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentData.paid_amount}
                  onChange={(e) => setPaymentData({ ...paymentData, paid_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ödeme Yöntemi
                </label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Nakit</option>
                  <option value="bank_transfer">Banka Transferi</option>
                  <option value="credit_card">Kredi Kartı</option>
                  <option value="other">Diğer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Not
                </label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <DollarSign size={20} />
                  Ödeme Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedDues(null);
                  }}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

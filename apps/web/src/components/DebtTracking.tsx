import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MemberDuesWithDetails } from '../types';
import { Search, Download, AlertCircle } from 'lucide-react';

export function DebtTracking() {
  const [memberDues, setMemberDues] = useState<MemberDuesWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadMemberDues();
  }, []);

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

  const filteredDues = memberDues.filter(item => {
    if (!search) return true;
    const memberName = item.members?.full_name?.toLowerCase() || '';
    const memberEmail = item.members?.email?.toLowerCase() || '';
    const duesTitle = item.dues?.title?.toLowerCase() || '';
    const searchLower = search.toLowerCase();

    return memberName.includes(searchLower) ||
           memberEmail.includes(searchLower) ||
           duesTitle.includes(searchLower);
  });

  const debtDues = filteredDues.filter(item => item.status !== 'paid');

  const getTotalDebt = () => {
    return debtDues.reduce((sum, item) => {
      const dueAmount = item.dues?.amount || 0;
      const paidAmount = item.paid_amount || 0;
      return sum + (dueAmount - paidAmount);
    }, 0);
  };

  const getOverdueCount = () => {
    return debtDues.filter(item => item.status === 'overdue').length;
  };

  const getMembersWithDebt = () => {
    const uniqueMembers = new Set(debtDues.map(item => item.member_id));
    return uniqueMembers.size;
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

  const handleExportToExcel = () => {
    let csvContent = 'Borç Takip Raporu\n\n';
    csvContent += 'Üye Adı,Email,Telefon,Aidat,Tutar,Ödenen,Kalan,Durum,Son Ödeme Tarihi\n';

    debtDues.forEach((item) => {
      const dueAmount = item.dues?.amount || 0;
      const paidAmount = item.paid_amount || 0;
      const remaining = dueAmount - paidAmount;
      const status = getStatusText(item.status);

      csvContent += `${item.members?.full_name || ''},${item.members?.email || ''},${item.members?.phone || ''},${item.dues?.title || ''},${dueAmount},${paidAmount},${remaining},${status},${item.dues?.due_date || ''}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `borc_takip_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Borç Takip</h2>
        <button
          onClick={handleExportToExcel}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download size={20} />
          Excel'e Aktar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 p-6 rounded-lg border border-red-100">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-red-600" size={32} />
            <div className="text-3xl font-bold text-red-600">
              ₺{getTotalDebt().toFixed(2)}
            </div>
          </div>
          <p className="text-gray-600 font-medium">Toplam Borç</p>
        </div>
        <div className="bg-orange-50 p-6 rounded-lg border border-orange-100">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-orange-600" size={32} />
            <div className="text-3xl font-bold text-orange-600">
              {getOverdueCount()}
            </div>
          </div>
          <p className="text-gray-600 font-medium">Gecikmiş Aidat</p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-100">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-yellow-600" size={32} />
            <div className="text-3xl font-bold text-yellow-600">
              {getMembersWithDebt()}
            </div>
          </div>
          <p className="text-gray-600 font-medium">Borçlu Üye</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Üye adı, email veya aidat başlığı ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Üye Adı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aidat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödenen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kalan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {debtDues.map((item) => {
                const dueAmount = item.dues?.amount || 0;
                const paidAmount = item.paid_amount || 0;
                const remaining = dueAmount - paidAmount;

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">
                      {item.members?.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.members?.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.members?.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {item.dues?.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      ₺{dueAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      ₺{paidAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                      ₺{remaining.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {debtDues.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    {search ? 'Arama sonucu bulunamadı' : 'Borçlu üye bulunmuyor'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 text-sm text-gray-600">
          Toplam {debtDues.length} borç kaydı gösteriliyor
        </div>
      </div>
    </div>
  );
}

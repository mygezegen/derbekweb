import { useState } from 'react';
import { X, Download, FileText, Calendar } from 'lucide-react';

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
  transaction_categories?: {
    name: string;
    type: string;
  };
  members?: {
    full_name: string;
  };
}

interface FinancialReportProps {
  onClose: () => void;
  transactions: Transaction[];
  summary: TreasurySummary | null;
}

export function FinancialReport({ onClose, transactions, summary }: FinancialReportProps) {
  const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const filteredTransactions = transactions.filter((t) => {
    if (!dateRange.start && !dateRange.end) return true;
    const date = new Date(t.transaction_date);
    const start = dateRange.start ? new Date(dateRange.start) : null;
    const end = dateRange.end ? new Date(dateRange.end) : null;

    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  });

  const incomeByCategory = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => {
      const category = t.transaction_categories?.name || 'Diğer';
      acc[category] = (acc[category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const expenseByCategory = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => {
      const category = t.transaction_categories?.name || 'Diğer';
      acc[category] = (acc[category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const totalIncome = Object.values(incomeByCategory).reduce((sum, val) => sum + val, 0);
  const totalExpense = Object.values(expenseByCategory).reduce((sum, val) => sum + val, 0);
  const balance = totalIncome - totalExpense;

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

  const generateExcelData = () => {
    let csv = '\uFEFF';

    if (reportType === 'summary') {
      csv += 'Dernek Finansal Raporu (Özet)\n\n';

      if (dateRange.start || dateRange.end) {
        csv += 'Tarih Aralığı:,';
        csv += (dateRange.start ? formatDate(dateRange.start) : 'Başlangıç') + ' - ';
        csv += (dateRange.end ? formatDate(dateRange.end) : 'Bitiş') + '\n\n';
      }

      csv += 'Genel Durum\n';
      csv += 'Toplam Gelir,' + formatCurrency(totalIncome) + '\n';
      csv += 'Toplam Gider,' + formatCurrency(totalExpense) + '\n';
      csv += 'Net Bakiye,' + formatCurrency(balance) + '\n\n';

      csv += 'Gelir Dağılımı (Kategoriye Göre)\n';
      csv += 'Kategori,Tutar\n';
      Object.entries(incomeByCategory).forEach(([category, amount]) => {
        csv += category + ',' + formatCurrency(amount) + '\n';
      });

      csv += '\nGider Dağılımı (Kategoriye Göre)\n';
      csv += 'Kategori,Tutar\n';
      Object.entries(expenseByCategory).forEach(([category, amount]) => {
        csv += category + ',' + formatCurrency(amount) + '\n';
      });
    } else {
      csv += 'Dernek Finansal Raporu (Detaylı)\n\n';

      if (dateRange.start || dateRange.end) {
        csv += 'Tarih Aralığı:,';
        csv += (dateRange.start ? formatDate(dateRange.start) : 'Başlangıç') + ' - ';
        csv += (dateRange.end ? formatDate(dateRange.end) : 'Bitiş') + '\n\n';
      }

      csv += 'Tarih,Tip,Kategori,Açıklama,Üye,Ödeme Yöntemi,Referans,Tutar\n';
      filteredTransactions.forEach((t) => {
        csv += formatDate(t.transaction_date) + ',';
        csv += (t.type === 'income' ? 'Gelir' : 'Gider') + ',';
        csv += (t.transaction_categories?.name || '-') + ',';
        csv += '"' + t.description.replace(/"/g, '""') + '",';
        csv += (t.members?.full_name || '-') + ',';
        csv += t.payment_method + ',';
        csv += (t.reference_number || '-') + ',';
        csv += formatCurrency(t.amount) + '\n';
      });

      csv += '\n';
      csv += 'Toplam Gelir,' + formatCurrency(totalIncome) + '\n';
      csv += 'Toplam Gider,' + formatCurrency(totalExpense) + '\n';
      csv += 'Net Bakiye,' + formatCurrency(balance) + '\n';
    }

    return csv;
  };

  const downloadExcel = () => {
    const csv = generateExcelData();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `finansal-rapor-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Finansal Rapor
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rapor Tipi
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as 'summary' | 'detailed')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="summary">Özet Rapor</option>
                <option value="detailed">Detaylı Rapor</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={downloadExcel}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download size={20} />
                Excel İndir
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Finansal Özet</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Toplam Gelir</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Toplam Gider</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Net Bakiye</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>
          </div>

          {reportType === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Gelir Dağılımı</h4>
                <div className="space-y-2">
                  {Object.entries(incomeByCategory).map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{category}</span>
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Gider Dağılımı</h4>
                <div className="space-y-2">
                  {Object.entries(expenseByCategory).map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{category}</span>
                      <span className="text-sm font-semibold text-red-600">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {reportType === 'detailed' && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tarih</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Kategori</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Açıklama</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatDate(t.transaction_date)}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              t.type === 'income'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {t.transaction_categories?.name}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{t.description}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-right">
                          <span className={t.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                            {t.type === 'income' ? '+' : '-'}
                            {formatCurrency(t.amount)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

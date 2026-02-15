import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Member, Dues, MemberDuesWithDetails } from '../types';
import { Search, DollarSign, Check, X, Save } from 'lucide-react';

export function PaymentCollection() {
  const [members, setMembers] = useState<Member[]>([]);
  const [dues, setDues] = useState<Dues[]>([]);
  const [memberDues, setMemberDues] = useState<MemberDuesWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedDues, setSelectedDues] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'credit_card' | 'other'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [membersData, duesData, memberDuesData] = await Promise.all([
        supabase.from('members').select('*').eq('is_active', true).order('full_name'),
        supabase.from('dues').select('*').order('period_year', { ascending: false }),
        supabase.from('member_dues').select('*, dues(*), members(*)').order('created_at', { ascending: false })
      ]);

      setMembers(membersData.data || []);
      setDues(duesData.data || []);
      setMemberDues(memberDuesData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    (m.phone && m.phone.includes(search))
  );

  const getCurrentMemberDues = () => {
    if (!selectedMember) return null;
    return memberDues.find(md =>
      md.member_id === selectedMember &&
      md.dues_id === selectedDues &&
      md.status !== 'paid'
    );
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedMember || !selectedDues || !paymentAmount) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Geçerli bir ödeme miktarı girin');
      return;
    }

    try {
      const currentDues = getCurrentMemberDues();

      if (currentDues) {
        const dueAmount = currentDues.dues?.amount || 0;
        const alreadyPaid = currentDues.paid_amount || 0;
        const totalPaid = alreadyPaid + amount;
        const newStatus = totalPaid >= dueAmount ? 'paid' : 'pending';

        const { error: updateError } = await supabase
          .from('member_dues')
          .update({
            paid_amount: totalPaid,
            status: newStatus,
            paid_at: newStatus === 'paid' ? new Date().toISOString() : currentDues.paid_at,
            payment_method: paymentMethod,
            notes: paymentNotes || currentDues.notes
          })
          .eq('id', currentDues.id);

        if (updateError) throw updateError;
      } else {
        const selectedDuesItem = dues.find(d => d.id === selectedDues);
        if (!selectedDuesItem) {
          setError('Seçili aidat bulunamadı');
          return;
        }

        const isPaid = amount >= selectedDuesItem.amount;

        const { error: insertError } = await supabase
          .from('member_dues')
          .insert({
            member_id: selectedMember,
            dues_id: selectedDues,
            paid_amount: amount,
            status: isPaid ? 'paid' : 'pending',
            paid_at: isPaid ? new Date().toISOString() : null,
            payment_method: paymentMethod,
            notes: paymentNotes
          });

        if (insertError) throw insertError;
      }

      const memberName = members.find(m => m.id === selectedMember)?.full_name;
      setSuccess(`${memberName} için ₺${amount.toFixed(2)} ödeme kaydedildi`);

      setSelectedMember('');
      setSelectedDues('');
      setPaymentAmount('');
      setPaymentMethod('cash');
      setPaymentNotes('');

      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ödeme kaydedilirken hata oluştu');
    }
  };

  const getRecentPayments = () => {
    return memberDues
      .filter(md => md.paid_at && md.paid_amount > 0)
      .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())
      .slice(0, 10);
  };

  const getTotalCollectedToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return memberDues
      .filter(md => md.paid_at && md.paid_at.startsWith(today))
      .reduce((sum, md) => sum + (md.paid_amount || 0), 0);
  };

  const getTotalCollectedThisMonth = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return memberDues
      .filter(md => md.paid_at && md.paid_at >= monthStart)
      .reduce((sum, md) => sum + (md.paid_amount || 0), 0);
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'Nakit';
      case 'bank_transfer': return 'Havale/EFT';
      case 'credit_card': return 'Kredi Kartı';
      case 'other': return 'Diğer';
      default: return method;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Aidat Tahsilat</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 p-6 rounded-lg border border-green-100">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="text-green-600" size={32} />
            <div className="text-3xl font-bold text-green-600">
              ₺{getTotalCollectedToday().toFixed(2)}
            </div>
          </div>
          <p className="text-gray-600 font-medium">Bugün Tahsil Edilen</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="text-blue-600" size={32} />
            <div className="text-3xl font-bold text-blue-600">
              ₺{getTotalCollectedThisMonth().toFixed(2)}
            </div>
          </div>
          <p className="text-gray-600 font-medium">Bu Ay Tahsil Edilen</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-6">Yeni Ödeme Kaydı</h3>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Üye Ara ve Seç
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Üye adı, email veya telefon..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Üye seçin</option>
                {filteredMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aidat Seçin
              </label>
              <select
                value={selectedDues}
                onChange={(e) => setSelectedDues(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Aidat seçin</option>
                {dues.map(duesItem => (
                  <option key={duesItem.id} value={duesItem.id}>
                    {duesItem.title} - ₺{duesItem.amount.toFixed(2)} ({duesItem.period_year} Yılı)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ödeme Miktarı (₺)
              </label>
              <input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ödeme Yöntemi
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">Nakit</option>
                <option value="bank_transfer">Havale/EFT</option>
                <option value="credit_card">Kredi Kartı</option>
                <option value="other">Diğer</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notlar (Opsiyonel)
              </label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Ödeme ile ilgili notlar..."
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save size={20} />
              Ödemeyi Kaydet
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedMember('');
                setSelectedDues('');
                setPaymentAmount('');
                setPaymentMethod('cash');
                setPaymentNotes('');
                setSearch('');
              }}
              className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <X size={20} />
              Temizle
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-6">Son Ödemeler</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Üye</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aidat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödeme Yöntemi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getRecentPayments().map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">
                    {payment.members?.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {payment.dues?.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    ₺{payment.paid_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {getPaymentMethodText(payment.payment_method || 'cash')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      {payment.status === 'paid' ? 'Ödendi' : 'Kısmi'}
                    </span>
                  </td>
                </tr>
              ))}
              {getRecentPayments().length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Henüz ödeme kaydı bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

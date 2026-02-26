import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Member, Dues, MemberDuesWithDetails } from '../types';
import { Search, DollarSign, Check, X, Save, Edit2, Trash2 } from 'lucide-react';

function numberToTurkishWords(n: number): string {
  if (n === 0) return 'Sıfır';
  const ones = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
  const tens = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
  function convert(num: number): string {
    if (num === 0) return '';
    if (num < 10) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ones[num % 10] : '');
    if (num < 1000) {
      const h = Math.floor(num / 100);
      return (h === 1 ? '' : ones[h]) + 'Yüz' + convert(num % 100);
    }
    if (num < 1000000) {
      const k = Math.floor(num / 1000);
      return (k === 1 ? '' : convert(k)) + 'Bin' + convert(num % 1000);
    }
    return num.toString();
  }
  return convert(Math.floor(n));
}

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'cash': return 'Nakit';
    case 'bank_transfer': return 'Havale/EFT';
    case 'credit_card': return 'Kredi Kartı';
    default: return 'Diğer';
  }
}

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
  const [receiptNo, setReceiptNo] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [isRoot, setIsRoot] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: memberData } = await supabase
          .from('members')
          .select('is_root')
          .eq('auth_id', user.id)
          .maybeSingle();
        setIsRoot(memberData?.is_root || false);
      }

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

  const sendReceiptEmail = async (
    member: Member,
    duesItem: Dues,
    amount: number,
    method: string,
    receipt: string,
    notes: string,
    adminName: string,
    assocAddress: string
  ) => {
    if (!member.email) return;

    const payDate = new Date().toLocaleDateString('tr-TR');
    const amountWords = numberToTurkishWords(Math.round(amount));
    const kurusAmount = Math.round((amount - Math.floor(amount)) * 100);
    const amountDisplay = `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`;

    const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tahsilat Makbuzu</title>
</head>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:2px solid #333;padding:0;">

    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:12px 16px;border-bottom:2px solid #333;width:60%;">
          <div style="font-size:11px;font-weight:bold;text-align:center;line-height:1.4;">
            DERNEK GELİRLERİ<br>ALINDI BELGESİ
          </div>
        </td>
        <td style="padding:12px 16px;border-bottom:2px solid #333;border-left:1px solid #333;">
          <div style="font-size:11px;margin-bottom:4px;"><b>Seri :</b> A</div>
          <div style="font-size:11px;"><b>Sıra No :</b> <span style="color:#cc0000;font-size:14px;font-weight:bold;">${receipt || '-'}</span></div>
        </td>
      </tr>
    </table>

    <div style="padding:10px 16px;border-bottom:1px solid #ccc;font-size:11px;">
      <b>Cilt No:</b> &nbsp;
    </div>

    <div style="padding:12px 16px;border-bottom:1px solid #ccc;font-size:11px;line-height:1.8;">
      <b>Derneğin</b><br>
      &nbsp;&nbsp;Adı &nbsp;: Diyarbakır Çüngüş Çaybaşı Köyü Yardımlaşma ve Dayanışma Derneği<br>
      &nbsp;&nbsp;Merkezi &nbsp;: ${assocAddress || 'Çaybaşı Köyü, Çüngüş, Diyarbakır'}<br>
      &nbsp;&nbsp;Kütük No : 34-114-082
    </div>

    <table style="width:100%;border-collapse:collapse;border-bottom:1px solid #ccc;">
      <tr>
        <td style="padding:12px 16px;font-size:11px;vertical-align:top;width:40%;border-right:1px solid #333;writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);text-align:center;font-weight:bold;font-size:10px;border-right:2px solid #333;">
          PARAYI<br>YATIRAN
        </td>
        <td style="padding:12px 16px;font-size:11px;line-height:2;">
          <b>Adı ve Soyadı :</b> ${member.full_name}<br>
          <b>T.C. Kimlik No:</b> ${member.tc_identity_no || '-'}<br>
          <b>Cep Tel / e-posta:</b> ${member.phone || ''} ${member.email ? `/ ${member.email}` : ''}
        </td>
      </tr>
    </table>

    <div style="padding:10px 16px;font-size:11px;font-weight:bold;border-bottom:1px solid #ccc;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="font-weight:bold;">GELİRİN ÇEŞİDİ</td>
          <td style="text-align:right;font-weight:bold;">TL-Krş</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;">${duesItem.title} (${getPaymentMethodLabel(method)})</td>
          <td style="text-align:right;font-size:16px;font-weight:bold;color:#cc0000;">${amountDisplay}</td>
        </tr>
        ${notes ? `<tr><td colspan="2" style="font-size:11px;color:#555;padding-top:4px;">Not: ${notes}</td></tr>` : ''}
      </table>
    </div>

    <div style="padding:12px 16px;border-bottom:1px solid #ccc;font-size:11px;line-height:1.8;">
      Yalnız <b>${amountWords}</b> TL ${kurusAmount > 0 ? `<b>${kurusAmount}</b> Krş` : ''} tahsil edilmiştir.
    </div>

    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:12px 16px;font-size:11px;vertical-align:top;width:40%;border-right:2px solid #333;writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);text-align:center;font-weight:bold;font-size:10px;">
          PARAYI<br>TAHSİL EDEN
        </td>
        <td style="padding:12px 16px;font-size:11px;line-height:2;">
          <b>Adı ve Soyadı :</b> ${adminName}<br>
          <b>Tarih :</b> ${payDate}<br>
          <b>İmza :</b>
        </td>
      </tr>
    </table>

    <div style="background:#f9f9f9;padding:8px 16px;border-top:1px solid #ccc;font-size:9px;color:#666;">
      (1) Tüzel kişiler için, T.C. Kimlik No yerine Vergi Numarası yazılır.<br>
      (2) Elektronik ortamda düzenlenmesi durumunda boş bırakılabilir.
    </div>

  </div>
</body>
</html>`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          to: member.email,
          subject: `Tahsilat Makbuzu - ${receipt ? `No: ${receipt} - ` : ''}${duesItem.title}`,
          html,
          recipient_name: member.full_name,
        }),
      });
    } catch {
      // Email failure should not block the payment success flow
    }
  };

  const getCurrentMemberDues = () => {
    if (!selectedMember) return null;
    return memberDues.find(md =>
      md.member_id === selectedMember &&
      md.dues_id === selectedDues &&
      md.status !== 'paid'
    );
  };

  const handleEditPayment = (payment: MemberDuesWithDetails) => {
    setEditingPaymentId(payment.id);
    setSelectedMember(payment.member_id);
    setSelectedDues(payment.dues_id);
    setPaymentAmount(payment.paid_amount.toString());
    setPaymentMethod(payment.payment_method as any || 'cash');
    setPaymentNotes(payment.notes || '');
    setReceiptNo(payment.receipt_no || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePayment = async (id: string) => {
    if (!isRoot) {
      alert('Sadece root kullanıcısı ödeme silebilir');
      return;
    }

    if (!confirm('Bu ödeme kaydını silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('member_dues')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccess('Ödeme kaydı başarıyla silindi');
      await loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ödeme silinirken hata oluştu');
      setTimeout(() => setError(''), 8000);
    }
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
      if (editingPaymentId) {
        const editingPayment = memberDues.find(md => md.id === editingPaymentId);
        if (!editingPayment) {
          setError('Düzenlenecek ödeme bulunamadı');
          return;
        }

        const selectedDuesItem = dues.find(d => d.id === selectedDues);
        const dueAmount = selectedDuesItem?.amount || 0;
        const newStatus = amount >= dueAmount ? 'paid' : 'pending';

        const { error: updateError } = await supabase
          .from('member_dues')
          .update({
            paid_amount: amount,
            status: newStatus,
            paid_at: newStatus === 'paid' ? new Date().toISOString() : editingPayment.paid_at,
            payment_method: paymentMethod,
            notes: paymentNotes,
            receipt_no: receiptNo
          })
          .eq('id', editingPaymentId);

        if (updateError) throw updateError;
        setSuccess('Ödeme kaydı başarıyla güncellendi');
        setEditingPaymentId(null);
      } else {
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
              notes: paymentNotes || currentDues.notes,
              receipt_no: receiptNo || currentDues.receipt_no
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
            notes: paymentNotes,
            receipt_no: receiptNo || null
          });

        if (insertError) throw insertError;
        }
      }

      const memberObj = members.find(m => m.id === selectedMember);
      const duesObj = dues.find(d => d.id === selectedDues);
      setSuccess(`${memberObj?.full_name} için ₺${amount.toFixed(2)} ödeme kaydedildi`);

      if (memberObj && duesObj) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const [{ data: contactData }, { data: adminMember }] = await Promise.all([
          supabase.from('contact_info').select('address').maybeSingle(),
          supabase.from('members').select('full_name').eq('auth_id', currentUser?.id ?? '').maybeSingle(),
        ]);
        const adminName = adminMember?.full_name || '';
        const assocAddress = contactData?.address || '';
        sendReceiptEmail(memberObj, duesObj, amount, paymentMethod, receiptNo, paymentNotes, adminName, assocAddress);
      }

      setSelectedMember('');
      setSelectedDues('');
      setPaymentAmount('');
      setPaymentMethod('cash');
      setPaymentNotes('');
      setReceiptNo('');
      setEditingPaymentId(null);

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
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
          {editingPaymentId ? <Edit2 size={24} className="text-blue-600" /> : <DollarSign size={24} className="text-green-600" />}
          {editingPaymentId ? 'Ödeme Kaydını Düzenle' : 'Yeni Ödeme Kaydı'}
        </h3>

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
                onChange={(e) => { setSelectedMember(e.target.value); setSelectedDues(''); }}
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
                {selectedMember
                  ? memberDues
                      .filter(md => md.member_id === selectedMember && md.status !== 'paid')
                      .map(md => {
                        const duesItem = dues.find(d => d.id === md.dues_id);
                        if (!duesItem) return null;
                        const remaining = duesItem.amount - (md.paid_amount || 0);
                        return (
                          <option key={duesItem.id} value={duesItem.id}>
                            {duesItem.title} ({duesItem.period_year} Yılı) - Kalan: ₺{remaining.toFixed(2)}
                          </option>
                        );
                      })
                  : dues.map(duesItem => (
                      <option key={duesItem.id} value={duesItem.id}>
                        {duesItem.title} ({duesItem.period_year} Yılı) - ₺{duesItem.amount.toFixed(2)}
                      </option>
                    ))
                }
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Makbuz No <span className="text-gray-400 font-normal">(Opsiyonel)</span>
              </label>
              <input
                type="text"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Makbuz numarası..."
              />
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
                setReceiptNo('');
                setSearch('');
                setEditingPaymentId(null);
              }}
              className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <X size={20} />
              {editingPaymentId ? 'İptal' : 'Temizle'}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Makbuz No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödeme Yöntemi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
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
                    {(payment as any).receipt_no ? (
                      <span className="font-mono text-gray-800">{(payment as any).receipt_no}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditPayment(payment)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 size={18} />
                      </button>
                      {isRoot && (
                        <button
                          onClick={() => handleDeletePayment(payment.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Sadece root kullanıcısı silebilir"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {getRecentPayments().length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
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

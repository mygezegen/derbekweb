import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Dues, MemberDuesWithDetails, Member } from '../types';
import { Plus, Edit2, Trash2, DollarSign, Check, X, Download, AlertCircle, Receipt, FileText, Gift, Users, Search, Save } from 'lucide-react';
import { DebtTracking } from './DebtTracking';
import { PaymentCollection } from './PaymentCollection';
import { DebtEntry } from './DebtEntry';
import { Donations } from './Donations';

interface DuesManagementProps {
  currentMember: Member;
  isAdmin: boolean;
  isRoot?: boolean;
}

export function DuesManagement({ currentMember, isAdmin, isRoot = false }: DuesManagementProps) {
  const [activeTab, setActiveTab] = useState<'dues' | 'debt' | 'payment' | 'debtentry' | 'donations'>('dues');
  const [dues, setDues] = useState<Dues[]>([]);
  const [myDues, setMyDues] = useState<MemberDuesWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDues, setEditingDues] = useState<Dues | null>(null);
  const [duesMembers, setDuesMembers] = useState<{ [key: string]: MemberDuesWithDetails[] }>({});
  const [allMemberDuesList, setAllMemberDuesList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDues, setExpandedDues] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<{ memberDuesId: string; amount: string } | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    period_year: new Date().getFullYear(),
    due_date: '',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (isAdmin) {
        // Tüm aidatları yükle
        const { data: duesData, error: duesError } = await supabase
          .from('dues')
          .select('*')
          .order('period_year', { ascending: false });

        if (duesError) {
          console.error('Error loading dues:', duesError);
          setLoading(false);
          return;
        }

        setDues(duesData || []);

        // Tüm member_dues kayıtlarını tek sorguda çek
        const { data: allMemberDues, error: memberDuesError } = await supabase
          .from('member_dues')
          .select('*, members(full_name, email, phone, tc_identity_no), dues(title, amount)')
          .order('status', { ascending: false });

        if (memberDuesError) {
          console.error('Error loading member dues:', memberDuesError);
          setLoading(false);
          return;
        }

        // Tüm listeyi sakla (arama için)
        setAllMemberDuesList(allMemberDues || []);

        // Üyeleri dues_id'ye göre grupla
        if (allMemberDues) {
          const membersMap: { [key: string]: MemberDuesWithDetails[] } = {};
          allMemberDues.forEach((memberDue) => {
            if (!membersMap[memberDue.dues_id]) {
              membersMap[memberDue.dues_id] = [];
            }
            membersMap[memberDue.dues_id].push(memberDue);
          });
          setDuesMembers(membersMap);
        }
      } else {
        const { data: myDuesData } = await supabase
          .from('member_dues')
          .select('*, dues(*), members(*)')
          .eq('member_id', currentMember.id)
          .order('created_at', { ascending: false });
        setMyDues(myDuesData || []);
      }
    } catch (error) {
      console.error('Error loading dues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const duesPayload = {
        title: formData.title,
        amount: parseFloat(formData.amount),
        period_month: 1,
        period_year: formData.period_year,
        due_date: formData.due_date,
        description: formData.description || null,
        created_by: currentMember.id
      };

      if (editingDues) {
        await supabase
          .from('dues')
          .update(duesPayload)
          .eq('id', editingDues.id);
      } else {
        await supabase
          .from('dues')
          .insert(duesPayload);
      }

      setShowForm(false);
      setEditingDues(null);
      setFormData({
        title: '',
        amount: '',
        period_year: new Date().getFullYear(),
        due_date: '',
        description: ''
      });
      loadData();
    } catch (error) {
      console.error('Error saving dues:', error);
      alert('Aidat kaydedilirken hata oluştu');
    }
  };

  const handleEdit = (duesItem: Dues) => {
    setEditingDues(duesItem);
    setFormData({
      title: duesItem.title,
      amount: duesItem.amount.toString(),
      period_year: duesItem.period_year,
      due_date: duesItem.due_date,
      description: duesItem.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!isRoot) {
      alert('Sadece root kullanıcısı aidat silebilir');
      return;
    }

    if (!confirm('Bu aidatı silmek istediğinizden emin misiniz?')) return;

    try {
      await supabase.from('dues').delete().eq('id', id);
      loadData();
    } catch (error) {
      console.error('Error deleting dues:', error);
      alert('Aidat silinirken hata oluştu');
    }
  };

  const handleUpdateAmount = async (memberDuesId: string, newAmount: string) => {
    try {
      const amount = parseFloat(newAmount);
      if (isNaN(amount) || amount < 0) {
        alert('Geçerli bir tutar giriniz');
        return;
      }

      const memberDue = allMemberDuesList.find(m => m.id === memberDuesId);
      if (!memberDue) throw new Error('Kayıt bulunamadı');

      const { error } = await supabase
        .from('dues')
        .update({ amount: amount })
        .eq('id', memberDue.dues_id);

      if (error) throw error;

      setEditingAmount(null);
      loadData();
      alert('Tutar başarıyla güncellendi');
    } catch (error) {
      console.error('Error updating amount:', error);
      alert('Tutar güncellenirken hata oluştu');
    }
  };

  const handleExportToExcel = async (duesId: string) => {
    try {
      const { data } = await supabase
        .from('member_dues')
        .select('*, members(full_name, email, phone), dues(title, amount)')
        .eq('dues_id', duesId);

      if (!data) return;

      const duesTitle = data[0]?.dues?.title || 'Aidat';
      let csvContent = `${duesTitle} Raporu\n\n`;
      csvContent += 'Ad Soyad,Email,Telefon,Durum,Ödenen Miktar,Ödeme Tarihi,Ödeme Yöntemi\n';

      data.forEach((item: any) => {
        const status = item.status === 'paid' ? 'Ödendi' : item.status === 'pending' ? 'Bekliyor' : 'Gecikmiş';
        csvContent += `${item.members?.full_name || ''},${item.members?.email || ''},${item.members?.phone || ''},${status},${item.paid_amount || 0},${item.paid_at || ''},${item.payment_method || ''}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${duesTitle.replace(/\s+/g, '_')}_raporu.csv`;
      link.click();
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const getTotalDebt = () => {
    return myDues.reduce((sum, item) => {
      if (item.status !== 'paid') {
        const dueAmount = item.dues?.amount || 0;
        const paidAmount = item.paid_amount || 0;
        return sum + (dueAmount - paidAmount);
      }
      return sum;
    }, 0);
  };

  const getPaidCount = () => {
    return myDues.filter(item => item.status === 'paid').length;
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

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex gap-2 px-6">
              <button
                onClick={() => setActiveTab('dues')}
                className={`flex items-center gap-2 px-4 py-4 font-medium transition-colors ${
                  activeTab === 'dues'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <DollarSign size={20} />
                Aidat Yönetimi
              </button>
              <button
                onClick={() => setActiveTab('debt')}
                className={`flex items-center gap-2 px-4 py-4 font-medium transition-colors ${
                  activeTab === 'debt'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <AlertCircle size={20} />
                Borç Takip
              </button>
              <button
                onClick={() => setActiveTab('payment')}
                className={`flex items-center gap-2 px-4 py-4 font-medium transition-colors ${
                  activeTab === 'payment'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Receipt size={20} />
                Aidat Tahsilat
              </button>
              <button
                onClick={() => setActiveTab('debtentry')}
                className={`flex items-center gap-2 px-4 py-4 font-medium transition-colors ${
                  activeTab === 'debtentry'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <FileText size={20} />
                Borç Girişi
              </button>
              <button
                onClick={() => setActiveTab('donations')}
                className={`flex items-center gap-2 px-4 py-4 font-medium transition-colors ${
                  activeTab === 'donations'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Gift size={20} />
                Bağışlar
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'dues' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Aidat Yönetimi</h2>
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  setEditingDues(null);
                  setFormData({
                    title: '',
                    amount: '',
                    period_month: new Date().getMonth() + 1,
                    period_year: new Date().getFullYear(),
                    due_date: '',
                    description: ''
                  });
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                Yeni Aidat
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4">
                  {editingDues ? 'Aidat Düzenle' : 'Yeni Aidat Oluştur'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Başlık
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Miktar (₺)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Yıl (Aidat Dönemi)
                      </label>
                      <input
                        type="number"
                        value={formData.period_year}
                        onChange={(e) => setFormData({ ...formData, period_year: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Son Ödeme Tarihi
                      </label>
                      <input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Açıklama
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Check size={20} />
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingDues(null);
                      }}
                      className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <X size={20} />
                      İptal
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Üye adı veya TC Kimlik No ile ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {searchQuery ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Aidat</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Ad Soyad</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">TC Kimlik No</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Email</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Telefon</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Aidat Tutarı</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Ödenen</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Kalan Borç</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Durum</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(() => {
                        const query = searchQuery.toLowerCase().trim();
                        const filtered = allMemberDuesList.filter(m => {
                          const memberName = (m.members?.full_name || '').toLowerCase();
                          const tcNo = (m.members?.tc_identity_no || '').toString();
                          const email = (m.members?.email || '').toLowerCase();
                          const phone = (m.members?.phone || '').toString();
                          return memberName.includes(query) || tcNo.includes(query) || email.includes(query) || phone.includes(query);
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                Arama sonucu bulunamadı
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((memberDue) => {
                          const member = memberDue.members;
                          const duesInfo = memberDue.dues;
                          const dueAmount = memberDue.amount || duesInfo?.amount || 0;
                          const paidAmount = memberDue.paid_amount || 0;
                          const remaining = dueAmount - paidAmount;
                          const isEditing = editingAmount?.memberDuesId === memberDue.id;

                          return (
                            <tr key={memberDue.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-medium text-gray-900">{duesInfo?.title || '-'}</td>
                              <td className="px-4 py-2 font-medium text-gray-900">{member?.full_name || '-'}</td>
                              <td className="px-4 py-2 text-gray-600">{member?.tc_identity_no || '-'}</td>
                              <td className="px-4 py-2 text-gray-600">{member?.email || '-'}</td>
                              <td className="px-4 py-2 text-gray-600">{member?.phone || '-'}</td>
                              <td className="px-4 py-2">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editingAmount.amount}
                                      onChange={(e) => setEditingAmount({ ...editingAmount, amount: e.target.value })}
                                      className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                      onClick={() => handleUpdateAmount(memberDue.id, editingAmount.amount)}
                                      className="text-green-600 hover:text-green-800"
                                      title="Kaydet"
                                    >
                                      <Save size={16} />
                                    </button>
                                    <button
                                      onClick={() => setEditingAmount(null)}
                                      className="text-gray-600 hover:text-gray-800"
                                      title="İptal"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="font-medium">₺{dueAmount.toFixed(2)}</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-green-600 font-medium">₺{paidAmount.toFixed(2)}</td>
                              <td className="px-4 py-2 text-red-600 font-medium">₺{remaining.toFixed(2)}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                  memberDue.status === 'paid'
                                    ? 'bg-green-100 text-green-800'
                                    : memberDue.status === 'overdue'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {memberDue.status === 'paid' ? 'Ödendi' : memberDue.status === 'overdue' ? 'Gecikmiş' : 'Bekliyor'}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                {!isEditing && (
                                  <button
                                    onClick={() => setEditingAmount({ memberDuesId: memberDue.id, amount: dueAmount.toString() })}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Tutarı Düzenle"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Başlık</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miktar</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dönem</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Son Ödeme</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dues.map((duesItem) => {
                      const members = duesMembers[duesItem.id] || [];
                      const isExpanded = expandedDues === duesItem.id;

                      return (
                        <>
                          <tr key={duesItem.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">
                              <button
                                onClick={() => setExpandedDues(isExpanded ? null : duesItem.id)}
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                              >
                                {duesItem.title}
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                  <Users size={12} />
                                  {members.length}
                                </span>
                              </button>
                            </td>
                            <td className="px-6 py-4">₺{duesItem.amount.toFixed(2)}</td>
                            <td className="px-6 py-4">
                              {duesItem.period_year} Yılı
                            </td>
                            <td className="px-6 py-4">
                              {new Date(duesItem.due_date).toLocaleDateString('tr-TR')}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleExportToExcel(duesItem.id)}
                                  className="text-green-600 hover:text-green-800 transition-colors"
                                  title="Excel'e Aktar"
                                >
                                  <Download size={18} />
                                </button>
                                <button
                                  onClick={() => handleEdit(duesItem)}
                                  className="text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  <Edit2 size={18} />
                                </button>
                                {isRoot && (
                                  <button
                                    onClick={() => handleDelete(duesItem.id)}
                                    className="text-red-600 hover:text-red-800 transition-colors"
                                    title="Sadece root kullanıcısı silebilir"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={5} className="px-6 py-4 bg-gray-50">
                                {members.length > 0 ? (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-gray-700 mb-3">Üyeler ve Borç Durumu</h4>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead className="bg-gray-100">
                                          <tr>
                                            <th className="px-4 py-2 text-left font-medium text-gray-600">Ad Soyad</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-600">TC Kimlik No</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-600">Email</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-600">Telefon</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-600">Aidat Tutarı</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-600">Ödenen</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-600">Kalan Borç</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-600">Durum</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-600">İşlem</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                          {members.map((memberDue) => {
                                            const member = memberDue.members as any;
                                            const dueAmount = memberDue.amount || duesItem.amount;
                                            const paidAmount = memberDue.paid_amount || 0;
                                            const remaining = dueAmount - paidAmount;
                                            const isEditing = editingAmount?.memberDuesId === memberDue.id;

                                            return (
                                              <tr key={memberDue.id} className="hover:bg-white">
                                                <td className="px-4 py-2 font-medium text-gray-900">{member?.full_name || '-'}</td>
                                                <td className="px-4 py-2 text-gray-600">{member?.tc_identity_no || '-'}</td>
                                                <td className="px-4 py-2 text-gray-600">{member?.email || '-'}</td>
                                                <td className="px-4 py-2 text-gray-600">{member?.phone || '-'}</td>
                                                <td className="px-4 py-2">
                                                  {isEditing ? (
                                                    <div className="flex items-center gap-2">
                                                      <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editingAmount.amount}
                                                        onChange={(e) => setEditingAmount({ ...editingAmount, amount: e.target.value })}
                                                        className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                      />
                                                      <button
                                                        onClick={() => handleUpdateAmount(memberDue.id, editingAmount.amount)}
                                                        className="text-green-600 hover:text-green-800"
                                                        title="Kaydet"
                                                      >
                                                        <Save size={16} />
                                                      </button>
                                                      <button
                                                        onClick={() => setEditingAmount(null)}
                                                        className="text-gray-600 hover:text-gray-800"
                                                        title="İptal"
                                                      >
                                                        <X size={16} />
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <span className="font-medium">₺{dueAmount.toFixed(2)}</span>
                                                  )}
                                                </td>
                                                <td className="px-4 py-2 text-green-600 font-medium">₺{paidAmount.toFixed(2)}</td>
                                                <td className="px-4 py-2 text-red-600 font-medium">₺{remaining.toFixed(2)}</td>
                                                <td className="px-4 py-2">
                                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    memberDue.status === 'paid'
                                                      ? 'bg-green-100 text-green-800'
                                                      : memberDue.status === 'overdue'
                                                      ? 'bg-red-100 text-red-800'
                                                      : 'bg-yellow-100 text-yellow-800'
                                                  }`}>
                                                    {memberDue.status === 'paid' ? 'Ödendi' : memberDue.status === 'overdue' ? 'Gecikmiş' : 'Bekliyor'}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-2">
                                                  {!isEditing && (
                                                    <button
                                                      onClick={() => setEditingAmount({ memberDuesId: memberDue.id, amount: dueAmount.toString() })}
                                                      className="text-blue-600 hover:text-blue-800"
                                                      title="Tutarı Düzenle"
                                                    >
                                                      <Edit2 size={16} />
                                                    </button>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-gray-500 text-center py-4">Henüz üye yok</p>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                    {dues.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          Henüz aidat bulunmuyor
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'debt' && <DebtTracking />}

        {activeTab === 'payment' && <PaymentCollection />}

        {activeTab === 'debtentry' && <DebtEntry />}

        {activeTab === 'donations' && <Donations currentMember={currentMember} isAdmin={isAdmin} isRoot={isRoot} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Aidat Durumum</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 p-6 rounded-lg border border-red-100">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="text-red-600" size={32} />
            <div className="text-3xl font-bold text-red-600">
              ₺{getTotalDebt().toFixed(2)}
            </div>
          </div>
          <p className="text-gray-600 font-medium">Toplam Borç</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg border border-green-100">
          <div className="flex items-center gap-3 mb-2">
            <Check className="text-green-600" size={32} />
            <div className="text-3xl font-bold text-green-600">
              {getPaidCount()}
            </div>
          </div>
          <p className="text-gray-600 font-medium">Ödenen Aidat</p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-100">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="text-yellow-600" size={32} />
            <div className="text-3xl font-bold text-yellow-600">
              {myDues.length - getPaidCount()}
            </div>
          </div>
          <p className="text-gray-600 font-medium">Bekleyen Aidat</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aidat</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miktar</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödenen</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kalan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödeme Tarihi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {myDues.map((item) => {
              const dueAmount = item.dues?.amount || 0;
              const paidAmount = item.paid_amount || 0;
              const remaining = dueAmount - paidAmount;

              return (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{item.dues?.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap">₺{dueAmount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600">₺{paidAmount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-red-600">₺{remaining.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {getStatusText(item.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.paid_at ? new Date(item.paid_at).toLocaleDateString('tr-TR') : '-'}
                  </td>
                </tr>
              );
            })}
            {myDues.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Aidat kaydı bulunmuyor
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

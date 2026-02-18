import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Member } from '../types';
import { Gift, Plus, Calendar, DollarSign, FileText, Search } from 'lucide-react';

interface Donation {
  id: string;
  member_id: string | null;
  donor_name: string | null;
  donor_email: string | null;
  donor_phone: string | null;
  amount: number;
  donation_date: string;
  description: string | null;
  purpose: string | null;
  payment_method: string | null;
  created_at: string;
  members?: {
    full_name: string;
    email: string;
  };
}

interface DonationsProps {
  currentMember: Member;
  isAdmin: boolean;
}

export function Donations({ currentMember, isAdmin }: DonationsProps) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    member_id: '',
    donor_name: '',
    donor_email: '',
    donor_phone: '',
    amount: '',
    donation_date: new Date().toISOString().split('T')[0],
    description: '',
    purpose: '',
    payment_method: 'cash',
    is_member: 'true'
  });

  useEffect(() => {
    loadDonations();
    if (isAdmin) {
      loadMembers();
    } else {
      setFormData(prev => ({ ...prev, member_id: currentMember.id }));
    }

    const channel = supabase
      .channel('donations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, () => {
        loadDonations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, currentMember.id]);

  const loadDonations = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('donations')
        .select('*, members!donations_member_id_fkey(full_name, email)')
        .order('donation_date', { ascending: false });

      if (!isAdmin) {
        query = query.eq('member_id', currentMember.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading donations:', error);
        setError('Bağışlar yüklenirken hata oluştu');
      } else {
        setDonations(data || []);
      }
    } catch (error) {
      console.error('Error loading donations:', error);
      setError('Bağışlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const { data } = await supabase
        .from('members')
        .select('*')
        .order('full_name', { ascending: true });
      setMembers(data || []);
      if (data && data.length > 0 && !formData.member_id) {
        setFormData(prev => ({ ...prev, member_id: data[0].id }));
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const isMember = formData.is_member === 'true';

      const donationPayload: any = {
        amount: parseFloat(formData.amount),
        donation_date: formData.donation_date,
        description: formData.description || null,
        purpose: formData.purpose || null,
        payment_method: formData.payment_method,
        created_by: isAdmin ? currentMember.id : null
      };

      if (isMember) {
        donationPayload.member_id = formData.member_id;
        donationPayload.donor_name = null;
        donationPayload.donor_email = null;
        donationPayload.donor_phone = null;
      } else {
        donationPayload.member_id = null;
        donationPayload.donor_name = formData.donor_name;
        donationPayload.donor_email = formData.donor_email || null;
        donationPayload.donor_phone = formData.donor_phone || null;
      }

      const { error: insertError } = await supabase
        .from('donations')
        .insert(donationPayload);

      if (insertError) throw insertError;

      setSuccess('Bağış kaydı başarıyla eklendi ve kasaya otomatik olarak eklendi');

      const defaultMemberId = isAdmin && members.length > 0 ? members[0].id : currentMember.id;
      setFormData({
        member_id: defaultMemberId,
        donor_name: '',
        donor_email: '',
        donor_phone: '',
        amount: '',
        donation_date: new Date().toISOString().split('T')[0],
        description: '',
        purpose: '',
        payment_method: 'cash',
        is_member: 'true'
      });
      setShowForm(false);
      await loadDonations();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bağış eklenirken hata oluştu');
      setTimeout(() => setError(''), 8000);
    } finally {
      setSaving(false);
    }
  };

  const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);
  const thisYearDonations = donations.filter(d =>
    new Date(d.donation_date).getFullYear() === new Date().getFullYear()
  );
  const thisYearTotal = thisYearDonations.reduce((sum, d) => sum + d.amount, 0);

  const filteredDonations = donations.filter(donation => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const memberName = (donation.members as any)?.full_name?.toLowerCase() || '';
    const donorName = donation.donor_name?.toLowerCase() || '';
    const description = donation.description?.toLowerCase() || '';
    const purpose = donation.purpose?.toLowerCase() || '';
    return memberName.includes(searchLower) || donorName.includes(searchLower) ||
           description.includes(searchLower) || purpose.includes(searchLower);
  });

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gift className="text-red-600" size={32} />
          <h2 className="text-2xl font-bold text-gray-800">Bağışlar</h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md border-b-2 border-green-600 font-medium"
          >
            <Plus size={20} />
            {showForm ? 'İptal' : 'Bağış Ekle'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <Gift className="mb-2 opacity-80" size={32} />
          <p className="text-blue-100 text-sm">Toplam Bağış</p>
          <p className="text-3xl font-bold">{donations.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <DollarSign className="mb-2 opacity-80" size={32} />
          <p className="text-green-100 text-sm">Toplam Tutar</p>
          <p className="text-3xl font-bold">{totalDonations.toFixed(2)} ₺</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
          <Calendar className="mb-2 opacity-80" size={32} />
          <p className="text-purple-100 text-sm">Bu Yıl</p>
          <p className="text-3xl font-bold">{thisYearTotal.toFixed(2)} ₺</p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showForm && isAdmin && (
        <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-red-600">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Plus size={24} className="text-red-600" />
            Yeni Bağış Ekle
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bağışçı Türü *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="true"
                    checked={formData.is_member === 'true'}
                    onChange={(e) => setFormData({ ...formData, is_member: e.target.value })}
                    className="mr-2"
                  />
                  <span>Üye</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="false"
                    checked={formData.is_member === 'false'}
                    onChange={(e) => setFormData({ ...formData, is_member: e.target.value })}
                    className="mr-2"
                  />
                  <span>Üye Olmayan</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.is_member === 'true' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Üye Seçin *
                  </label>
                  <select
                    value={formData.member_id}
                    onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} ({member.email})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bağışçı Adı Soyadı *
                    </label>
                    <input
                      type="text"
                      value={formData.donor_name}
                      onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
                      required
                      placeholder="Ad Soyad"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-posta
                    </label>
                    <input
                      type="email"
                      value={formData.donor_email}
                      onChange={(e) => setFormData({ ...formData, donor_email: e.target.value })}
                      placeholder="ornek@email.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={formData.donor_phone}
                      onChange={(e) => setFormData({ ...formData, donor_phone: e.target.value })}
                      placeholder="0555 123 4567"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tutar (₺) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bağış Tarihi *
                </label>
                <input
                  type="date"
                  value={formData.donation_date}
                  onChange={(e) => setFormData({ ...formData, donation_date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ödeme Yöntemi *
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="cash">Nakit</option>
                  <option value="bank_transfer">Banka Havalesi</option>
                  <option value="credit_card">Kredi Kartı</option>
                  <option value="other">Diğer</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bağış Amacı
              </label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="Örn: Cami Onarımı, Genel Bağış, vb."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Bağış hakkında notlar..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 disabled:bg-gray-400 transition-all shadow-md border-b-2 border-green-600 font-medium"
              >
                <Gift size={20} />
                {saving ? 'Kaydediliyor...' : 'Bağış Kaydet'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors shadow-md font-medium"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Bağış Geçmişi</h3>
          {isAdmin && donations.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Bağışçı veya açıklama ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              />
            </div>
          )}
        </div>

        {filteredDonations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Gift className="mx-auto mb-4 text-gray-300" size={48} />
            <p>Henüz bağış kaydı bulunmamaktadır</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bağışçı
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tutar
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ödeme Yöntemi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Açıklama
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDonations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-gray-50">
                    {isAdmin && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {donation.member_id
                            ? (donation.members as any)?.full_name || '-'
                            : donation.donor_name || 'Anonim'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {donation.member_id
                            ? (donation.members as any)?.email || ''
                            : donation.donor_email || ''}
                        </div>
                        {!donation.member_id && (
                          <div className="text-xs text-blue-600 font-semibold mt-1">
                            Üye Olmayan
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-green-600">
                        {donation.amount.toFixed(2)} ₺
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(donation.donation_date).toLocaleDateString('tr-TR')}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {donation.payment_method === 'cash' && 'Nakit'}
                        {donation.payment_method === 'bank_transfer' && 'Banka Havalesi'}
                        {donation.payment_method === 'credit_card' && 'Kredi Kartı'}
                        {donation.payment_method === 'other' && 'Diğer'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {donation.purpose && (
                          <div className="font-medium text-blue-600 mb-1">
                            {donation.purpose}
                          </div>
                        )}
                        <div className="text-gray-500 truncate">
                          {donation.description || '-'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <FileText size={20} />
          Bilgi
        </h4>
        <p className="text-sm text-blue-700">
          Bu sayfada derneğe yapılan bağışları görüntüleyebilirsiniz. Bağışlar, düzenli aidatlardan farklı olarak tek seferlik katkılardır.
          {isAdmin && ' Yönetici olarak yeni bağış kayıtları ekleyebilir ve tüm bağışları görüntüleyebilirsiniz.'}
        </p>
      </div>
    </div>
  );
}

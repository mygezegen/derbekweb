import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Member } from '../types';
import { Plus, Search, Save, X } from 'lucide-react';

export function DebtEntry() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    member_id: '',
    title: '',
    amount: '',
    description: '',
    due_date: ''
  });

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const { data } = await supabase
        .from('members')
        .select('*')
        .order('full_name', { ascending: true });
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      const { data: currentMember } = await supabase
        .from('members')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (!currentMember) throw new Error('Üye bilgisi bulunamadı');

      const duesPayload = {
        title: formData.title,
        amount: parseFloat(formData.amount),
        period_month: 1,
        period_year: new Date().getFullYear(),
        due_date: formData.due_date,
        description: formData.description || null,
        created_by: currentMember.id
      };

      const { data: newDues, error: duesError } = await supabase
        .from('dues')
        .insert(duesPayload)
        .select()
        .single();

      if (duesError) throw duesError;

      const memberDuesPayload = {
        member_id: formData.member_id,
        dues_id: newDues.id,
        status: 'pending',
        paid_amount: 0
      };

      const { error: memberDuesError } = await supabase
        .from('member_dues')
        .insert(memberDuesPayload);

      if (memberDuesError) throw memberDuesError;

      setFormData({
        member_id: '',
        title: '',
        amount: '',
        description: '',
        due_date: ''
      });

      setSuccess('Borç kaydı başarıyla eklendi');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Borç eklenirken hata oluştu';
      setError(errorMessage);
      console.error('DebtEntry Error:', err);
      setTimeout(() => setError(''), 8000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      member_id: '',
      title: '',
      amount: '',
      description: '',
      due_date: ''
    });
    setError('');
    setSuccess('');
  };

  const filteredMembers = members.filter(member => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      member.full_name.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Plus className="text-red-600" size={28} />
        <h2 className="text-2xl font-bold text-gray-800">Manuel Borç Girişi</h2>
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

      <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-red-600">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Üye Seçin *
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Üye adı veya email ile ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <select
                value={formData.member_id}
                onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Üye seçiniz...</option>
                {filteredMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Borç Başlığı *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Örn: Olağanüstü Aidat"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

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
                Son Ödeme Tarihi *
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Borç hakkında ek bilgi..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 disabled:bg-gray-400 transition-all shadow-md border-b-2 border-green-600 font-medium"
            >
              <Save size={20} />
              {saving ? 'Kaydediliyor...' : 'Borç Kaydet'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors shadow-md font-medium"
            >
              <X size={20} />
              Temizle
            </button>
          </div>
        </form>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="font-semibold text-blue-800 mb-2">Bilgi</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>Bu form ile seçili üyeye manuel olarak borç kaydı ekleyebilirsiniz.</li>
          <li>Borç kaydı eklendikten sonra üye, aidat durumu sayfasından borcunu görebilir.</li>
          <li>Ödeme takibi "Aidat Tahsilat" sekmesinden yapılabilir.</li>
        </ul>
      </div>
    </div>
  );
}

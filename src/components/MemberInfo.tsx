import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Member } from '../types';
import { User, Mail, Phone, MapPin, Calendar } from 'lucide-react';

export function MemberInfo() {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadMemberInfo();
  }, []);

  const loadMemberInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (data) {
        setMember(data);
        setPhone(data.phone || '');
        setAddress(data.address || '');
      }
    } catch (error) {
      console.error('Error loading member info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!member) return;

      const { error: updateError } = await supabase
        .from('members')
        .update({
          phone,
          address,
        })
        .eq('id', member.id);

      if (updateError) throw updateError;

      setSuccess('Bilgileriniz başarıyla güncellendi');
      setEditing(false);
      loadMemberInfo();
    } catch (err) {
      setError('Bilgiler güncellenirken hata oluştu');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <p className="text-gray-600">Üye bilgileri bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Üye Bilgilerim</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-md"
          >
            Düzenle
          </button>
        )}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {editing ? (
        <form onSubmit={handleUpdateInfo} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User size={18} />
                Ad Soyad
              </label>
              <input
                type="text"
                value={member.full_name}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">Bu alan değiştirilemez</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Mail size={18} />
                E-posta
              </label>
              <input
                type="email"
                value={member.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">Bu alan değiştirilemez</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Phone size={18} />
                Telefon
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="0555 555 5555"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar size={18} />
                Katılım Tarihi
              </label>
              <input
                type="text"
                value={new Date(member.joined_at).toLocaleDateString('tr-TR')}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin size={18} />
              Adres
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Adres bilgisi"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-md"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setPhone(member.phone || '');
                setAddress(member.address || '');
                setError('');
                setSuccess('');
              }}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              İptal
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <User size={18} />
                <span className="text-sm font-medium">Ad Soyad</span>
              </div>
              <p className="text-lg font-semibold text-gray-800">{member.full_name}</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Mail size={18} />
                <span className="text-sm font-medium">E-posta</span>
              </div>
              <p className="text-lg font-semibold text-gray-800">{member.email}</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Phone size={18} />
                <span className="text-sm font-medium">Telefon</span>
              </div>
              <p className="text-lg font-semibold text-gray-800">{member.phone || 'Belirtilmemiş'}</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Calendar size={18} />
                <span className="text-sm font-medium">Katılım Tarihi</span>
              </div>
              <p className="text-lg font-semibold text-gray-800">
                {new Date(member.joined_at).toLocaleDateString('tr-TR')}
              </p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <MapPin size={18} />
              <span className="text-sm font-medium">Adres</span>
            </div>
            <p className="text-lg font-semibold text-gray-800">{member.address || 'Belirtilmemiş'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

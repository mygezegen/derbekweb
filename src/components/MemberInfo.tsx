import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Member } from '../types';
import { User, Mail, Phone, MapPin, Calendar, Lock, Eye, EyeOff } from 'lucide-react';

export function MemberInfo() {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
        setBirthDate(data.birth_date || '');
      }
    } catch (error) {
      console.error('Error loading member info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword.length < 6) {
      setPasswordError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Şifreler eşleşmiyor.');
      return;
    }
    setPasswordSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ new_password: newPassword }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Şifre güncellenemedi.');
      setPasswordSuccess('Şifreniz güncellendi. Güvenliğiniz için çıkış yapılıyor...');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => supabase.auth.signOut(), 2000);
    } catch (err: any) {
      setPasswordError(err.message || 'Şifre güncellenirken hata oluştu.');
    } finally {
      setPasswordSaving(false);
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
          birth_date: birthDate || null,
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
                Doğum Tarihi
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                setBirthDate(member.birth_date || '');
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
                <span className="text-sm font-medium">Doğum Tarihi</span>
              </div>
              <p className="text-lg font-semibold text-gray-800">
                {member.birth_date
                  ? new Date(member.birth_date).toLocaleDateString('tr-TR')
                  : 'Belirtilmemiş'}
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
      {/* Password Change Section */}
      <div className="bg-white rounded-lg shadow p-8 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock size={20} className="text-gray-600" />
            <h3 className="text-lg font-bold text-gray-800">Şifre Değiştir</h3>
          </div>
          <button
            onClick={() => { setShowPasswordSection(v => !v); setPasswordError(''); setPasswordSuccess(''); setNewPassword(''); setConfirmPassword(''); }}
            className="text-sm text-red-600 font-semibold hover:text-red-700"
          >
            {showPasswordSection ? 'İptal' : 'Şifreyi Değiştir'}
          </button>
        </div>

        {showPasswordSection && (
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{passwordSuccess}</div>
            )}
            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{passwordError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="En az 6 karakter"
                  required
                />
                <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre Tekrar</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Şifreyi tekrar girin"
                  required
                />
                <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={passwordSaving}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-md disabled:opacity-60 font-semibold"
            >
              {passwordSaving ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

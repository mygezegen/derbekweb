import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserPlus, Mail, Lock, User, Phone, Briefcase, MapPin, Users } from 'lucide-react';

type SignupStep = 'email' | 'verify' | 'details';

interface SignupFormData {
  email: string;
  password: string;
  full_name: string;
  tc_identity_no: string;
  mother_name: string;
  father_name: string;
  address: string;
  profession: string;
  phone: string;
}

export function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<SignupStep>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    full_name: '',
    tc_identity_no: '',
    mother_name: '',
    father_name: '',
    address: '',
    profession: '',
    phone: ''
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: member } = await supabase
          .from('members')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (member && member.tc_identity_no && member.tc_identity_no !== '00000000000') {
          navigate('/app');
        } else if (member && session.user.email_confirmed_at) {
          setStep('details');
        } else if (member) {
          setStep('verify');
        }
      }
    };
    checkAuth();
  }, [navigate]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.email || !formData.password) {
        throw new Error('E-posta ve şifre gereklidir');
      }

      if (formData.password.length < 6) {
        throw new Error('Şifre en az 6 karakter olmalıdır');
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name || formData.email.split('@')[0]
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        setStep('verify');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!verificationCode) {
        throw new Error('Doğrulama kodu gereklidir');
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: verificationCode,
        type: 'signup'
      });

      if (verifyError) throw verifyError;

      setStep('details');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Doğrulama sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError('');
    setLoading(true);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
      });

      if (resendError) throw resendError;

      alert('Doğrulama kodu e-posta adresinize gönderildi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kod gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.full_name || !formData.tc_identity_no || !formData.mother_name ||
          !formData.father_name || !formData.address || !formData.profession || !formData.phone) {
        throw new Error('Tüm alanlar zorunludur');
      }

      if (formData.tc_identity_no.length !== 11 || !/^\d+$/.test(formData.tc_identity_no)) {
        throw new Error('Geçerli bir TC Kimlik Numarası giriniz (11 haneli)');
      }

      if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/[\s()-]/g, ''))) {
        throw new Error('Geçerli bir telefon numarası giriniz');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      }

      const { error: updateError } = await supabase
        .from('members')
        .update({
          full_name: formData.full_name,
          tc_identity_no: formData.tc_identity_no,
          mother_name: formData.mother_name,
          father_name: formData.father_name,
          address: formData.address,
          profession: formData.profession,
          phone: formData.phone
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilgiler kaydedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <Mail className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">E-posta Doğrulama</h2>
            <p className="text-gray-600">
              <span className="font-semibold">{formData.email}</span> adresinize gönderilen 6 haneli doğrulama kodunu giriniz
            </p>
          </div>

          <form onSubmit={handleVerifyEmail} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Doğrulama Kodu
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent tracking-widest"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
            >
              {loading ? 'Doğrulanıyor...' : 'Doğrula'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={loading}
                className="text-emerald-600 hover:text-emerald-700 font-medium text-sm hover:underline disabled:opacity-50"
              >
                Kodu tekrar gönder
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'details') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <User className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Üyelik Bilgilerinizi Tamamlayın</h2>
            <p className="text-gray-600">Kayıt işleminizi tamamlamak için lütfen bilgilerinizi giriniz</p>
          </div>

          <form onSubmit={handleDetailsSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Soyad <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Ad Soyad"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TC Kimlik No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={11}
                  value={formData.tc_identity_no}
                  onChange={(e) => setFormData({ ...formData, tc_identity_no: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="11 haneli TC No"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anne Adı <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    required
                    value={formData.mother_name}
                    onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Anne Adı"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Baba Adı <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    required
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Baba Adı"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="0555 123 45 67"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meslek <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    required
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Mesleğiniz"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adres <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
                <textarea
                  required
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Tam adresiniz"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydı Tamamla'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Üye Olun</h2>
          <p className="text-gray-600">Dernek sistemine kayıt olun</p>
        </div>

        <form onSubmit={handleEmailSignup} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-posta Adresi
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="ornek@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şifre
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="En az 6 karakter"
                minLength={6}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Şifreniz en az 6 karakter olmalıdır</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
          >
            {loading ? 'Kayıt yapılıyor...' : 'Devam Et'}
          </button>

          <div className="text-center text-sm text-gray-600">
            Zaten üye misiniz?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Giriş Yapın
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

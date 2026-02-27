import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Smartphone, ArrowLeft } from 'lucide-react';

interface SMSPasswordResetProps {
  phoneNumber: string;
  onBack: () => void;
}

export function SMSPasswordReset({ phoneNumber, onBack }: SMSPasswordResetProps) {
  const navigate = useNavigate();
  const [smsCode, setSmsCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'code' | 'password'>('code');

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (smsCode.length !== 6) {
        throw new Error('Lütfen 6 haneli kodu giriniz');
      }

      const { data, error: verifyError } = await supabase
        .rpc('validate_password_reset_code', {
          p_reset_code: smsCode,
          p_phone_number: phoneNumber
        });

      if (verifyError) throw verifyError;

      if (!data || data.length === 0 || !data[0].is_valid) {
        throw new Error(data?.[0]?.error_message || 'Geçersiz veya süresi dolmuş kod');
      }

      setStep('password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kod doğrulanamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (newPassword !== confirmPassword) {
        throw new Error('Şifreler eşleşmiyor');
      }

      if (newPassword.length < 6) {
        throw new Error('Şifre en az 6 karakter olmalıdır');
      }

      // Validate email format if provided
      if (newEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
          throw new Error('Geçerli bir e-posta adresi giriniz');
        }
        // Check for invalid domains
        if (newEmail.toLowerCase().endsWith('@uye.local')) {
          throw new Error('Lütfen gerçek bir e-posta adresi giriniz (@uye.local kullanılamaz)');
        }
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password-with-sms`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          smsCode,
          phoneNumber,
          newPassword,
          newEmail: newEmail || undefined,
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Şifre değiştirilemedi');
      }

      const message = result.emailUpdated
        ? 'Şifreniz ve e-posta adresiniz başarıyla güncellendi! Artık yeni e-posta adresinizle giriş yapabilirsiniz.'
        : 'Şifreniz başarıyla değiştirildi!';

      alert(message);
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Şifre değiştirilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-black opacity-5"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10 border-t-4 border-emerald-600">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-28 h-28 bg-gradient-to-br from-emerald-50 to-green-50 rounded-full p-3 shadow-lg mb-4 ring-4 ring-emerald-100">
            <img src="/sdas.jpeg" alt="Dernek Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <h1 className="text-lg font-bold text-center text-gray-800 leading-tight">
            Diyarbakır Çüngüş Çaybaşı Köyü<br />
            <span className="text-emerald-600">Yardımlaşma ve Dayanışma Derneği</span>
          </h1>
        </div>

        <div className="mb-6">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
            {step === 'code' ? 'SMS Kodu Girin' : 'Şifre ve E-posta Güncelleme'}
          </h2>
          <p className="text-center text-gray-600 text-sm">
            {step === 'code'
              ? `${phoneNumber} numaralı telefona gönderilen 6 haneli kodu girin`
              : 'Yeni şifrenizi oluşturun ve e-posta adresinizi güncelleyin'
            }
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {step === 'code' ? (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                SMS Kodu
              </label>
              <input
                type="text"
                value={smsCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setSmsCode(value.slice(0, 6));
                }}
                required
                maxLength={6}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-center text-2xl tracking-widest"
                placeholder="000000"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Kod 30 dakika geçerlidir
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || smsCode.length !== 6}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3.5 rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Smartphone size={20} />
              {loading ? 'Doğrulanıyor...' : 'Kodu Doğrula'}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} />
              Geri Dön
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-3 rounded-lg mb-4">
              <p className="text-blue-700 text-xs leading-relaxed">
                <strong>E-posta Güncelleme (Opsiyonel):</strong> Geçersiz e-posta adresinizi (@uye.local) gerçek bir e-posta adresi ile değiştirebilirsiniz. Bu sayede gelecekte e-posta ile şifre sıfırlama yapabilirsiniz.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Yeni E-posta Adresi (Opsiyonel)
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                placeholder="ornek@email.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Boş bırakırsanız e-posta adresiniz değişmez
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Yeni Şifre
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                placeholder="En az 6 karakter"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Yeni Şifre (Tekrar)
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                placeholder="Şifrenizi tekrar girin"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3.5 rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Mail size={20} />
              {loading ? 'İşleniyor...' : 'Güncelle ve Şifreyi Değiştir'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

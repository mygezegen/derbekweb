import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogIn, Mail } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      onLoginSuccess();
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Şifre sıfırlama e-postası gönderilemedi');
      }

      setResetEmailSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Şifre sıfırlama e-postası gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
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
              Şifremi Unuttum
            </h2>
            <p className="text-center text-gray-600 text-sm">
              Şifrenizi sıfırlayın
            </p>
          </div>

          {resetEmailSent ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 px-4 py-4 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-emerald-100 p-2 rounded-full">
                    <Mail size={20} className="text-emerald-600" />
                  </div>
                  <span className="font-semibold text-lg">E-posta Gönderildi!</span>
                </div>
                <p className="text-sm leading-relaxed">
                  Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen e-postanızı kontrol edin ve
                  bağlantıya tıklayarak yeni şifrenizi oluşturun.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmailSent(false);
                  setError('');
                }}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3.5 rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Giriş Sayfasına Dön
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-600 text-center mb-6 text-sm">
                E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
              </p>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm">
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                    placeholder="ornek@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3.5 rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Mail size={20} />
                  {loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Bağlantısı Gönder'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError('');
                  }}
                  className="w-full text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-all"
                >
                  Geri Dön
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

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
            Hoş Geldiniz
          </h2>
          <p className="text-center text-gray-600 text-sm">
            Hesabınıza giriş yapın
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
              placeholder="ornek@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3.5 rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <LogIn size={20} />
            {loading ? 'Lütfen bekleyin...' : 'Giriş Yap'}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setError('');
              }}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-all"
              >
                Şifremi Unuttum
              </button>
            </div>
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              Hesabınız yok mu?
            </p>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm hover:underline transition-all"
            >
              Kayıt Olun
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

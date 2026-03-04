import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function LoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState<'email' | 'tc'>('email');
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let emailToUse = identifier;

      if (loginType === 'tc') {
        const tcNumber = identifier.replace(/\s/g, '');

        if (tcNumber.length !== 11 || !/^\d+$/.test(tcNumber)) {
          setError('Geçerli bir TC kimlik numarası giriniz (11 haneli).');
          setLoading(false);
          return;
        }

        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('email')
          .eq('tc_identity_no', tcNumber)
          .maybeSingle();

        if (memberError || !member) {
          setError('Bu TC kimlik numarası ile kayıtlı kullanıcı bulunamadı.');
          setLoading(false);
          return;
        }

        emailToUse = member.email;
      }

      const { error } = await signIn(emailToUse, password);

      if (error) {
        if (loginType === 'tc') {
          setError('Giriş başarısız. TC kimlik numaranız ve şifrenizi kontrol edin.');
        } else {
          setError('Giriş başarısız. E-posta ve şifrenizi kontrol edin.');
        }
      }
    } catch (err: any) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-red-600 rounded-full p-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Çüngüş Çaybaşı Köyü
        </h2>
        <p className="text-center text-gray-600 mb-6 text-sm">
          Yardımlaşma ve Dayanışma Derneği
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Giriş Yöntemi
            </label>
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => {
                  setLoginType('email');
                  setIdentifier('');
                  setError('');
                }}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  loginType === 'email'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                E-posta
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginType('tc');
                  setIdentifier('');
                  setError('');
                }}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  loginType === 'tc'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                TC Kimlik No
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {loginType === 'email' ? 'E-posta' : 'TC Kimlik Numarası'}
            </label>
            <input
              type={loginType === 'email' ? 'email' : 'text'}
              value={identifier}
              onChange={(e) => {
                if (loginType === 'tc') {
                  const value = e.target.value.replace(/\D/g, '');
                  setIdentifier(value.slice(0, 11));
                } else {
                  setIdentifier(e.target.value);
                }
              }}
              placeholder={loginType === 'email' ? 'ornek@email.com' : '12345678901'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
            {loginType === 'tc' && (
              <p className="text-xs text-gray-500 mt-1">11 haneli TC kimlik numaranızı giriniz</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}

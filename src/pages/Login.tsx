import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        if (authData.user) {
          const { error: insertError } = await supabase
            .from('members')
            .insert({
              auth_id: authData.user.id,
              full_name: fullName,
              email,
            });
          if (insertError) throw insertError;
        }
      }
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-700 via-red-600 to-red-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md border-4 border-green-600">
        <div className="flex flex-col items-center justify-center mb-8">
          <img src="/sdas.jpeg" alt="Dernek Logo" className="h-24 w-24 object-contain mb-4" />
          <h1 className="text-xl font-bold text-center text-gray-800">
            Çüngüş Çaybaşı Köyü Yardımlaşma ve Dayanışma Derneği
          </h1>
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-700 mb-8">
          {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adı Soyadı
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Adınız ve soyadınız"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="ornek@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-medium hover:from-red-700 hover:to-red-800 disabled:bg-gray-400 transition-all shadow-md border-b-4 border-green-600"
          >
            {loading ? 'Lütfen bekleyin...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            {isLogin ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var? Giriş yapın'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        setIsLoggedIn(!!session);
      } catch (err) {
        console.error('Auth error:', err);
        setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
        setIsLoggedIn(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setError(null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Yapılandırma Hatası</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <p className="text-sm text-gray-600">
            Lütfen Netlify Dashboard'da environment variables ayarlandığından emin olun.
          </p>
        </div>
      </div>
    );
  }

  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  return isLoggedIn ? (
    <Dashboard onLogout={() => setIsLoggedIn(false)} />
  ) : (
    <Login onLoginSuccess={() => setIsLoggedIn(true)} />
  );
}

export default App;

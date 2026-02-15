import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (mounted) {
          setIsLoggedIn(!!session);
        }
      } catch (err) {
        console.error('Auth error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
          setIsLoggedIn(false);
        }
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setIsLoggedIn(!!session);
        setError(null);
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
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

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;

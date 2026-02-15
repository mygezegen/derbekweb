import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription?.unsubscribe();
  }, []);

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

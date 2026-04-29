import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import { ResetPassword } from './pages/ResetPassword';
import { Signup } from './pages/Signup';
import { SurveyPage } from './pages/SurveyPage';
import { MemberQueryPage } from './pages/MemberQueryPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';

// Debug: Environment variables
console.log('🔍 Supabase Config Check:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  keyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length
});

function MemberPortal() {
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
      <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login onLoginSuccess={() => {}} />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/app" element={<MemberPortal />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/survey/:id" element={<SurveyPage />} />
          <Route path="/sorgu" element={<MemberQueryPage />} />
          <Route path="/gizlilik-politikasi" element={<PrivacyPolicy />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface DeleteAccountModalProps {
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteAccountModal({ onClose, onDeleted }: DeleteAccountModalProps) {
  const [step, setStep] = useState<'confirm' | 'auth'>('confirm');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Re-authenticate first
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError('E-posta veya şifre hatalı. Lütfen tekrar deneyin.');
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      // Soft-delete: mark member as inactive and clear auth_id
      await supabase
        .from('members')
        .update({
          is_active: false,
          auth_id: null,
          status: 'cancelled',
          status_change_date: new Date().toISOString().split('T')[0],
          passive_status_reason: 'Kullanıcı tarafından hesap silindi',
          updated_at: new Date().toISOString(),
        })
        .eq('auth_id', user.id);

      // Delete auth account via admin edge function
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      if (token) {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      await supabase.auth.signOut();
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hesap silinemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Trash2 size={20} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">Hesabı Sil</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {step === 'confirm' ? (
            <div className="space-y-5">
              <div className="flex items-start gap-4 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertTriangle size={22} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-semibold text-red-800">Bu işlem geri alınamaz!</p>
                  <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                    <li>Hesabınız kalıcı olarak silinecektir</li>
                    <li>Giriş yapamayacaksınız</li>
                    <li>Üyelik kaydınız pasife alınacaktır</li>
                    <li>Aidat ve işlem geçmişiniz korunacaktır</li>
                  </ul>
                </div>
              </div>

              <p className="text-sm text-gray-600 text-center">
                Devam etmek istiyor musunuz? Kimliğinizi doğrulamanız gerekecek.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Vazgec
                </button>
                <button
                  onClick={() => setStep('auth')}
                  className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-md"
                >
                  Devam Et
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleDelete} className="space-y-5">
              <p className="text-sm text-gray-600">
                Hesabınızı silmek için e-posta ve şifrenizi girin.
              </p>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">E-posta</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  placeholder="ornek@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Şifre</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setStep('confirm'); setError(''); setEmail(''); setPassword(''); }}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Geri
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  {loading ? 'Siliniyor...' : 'Hesabı Sil'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

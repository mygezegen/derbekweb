import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogIn, Mail, CreditCard, Smartphone, ArrowLeft, ShieldCheck, Eye, EyeOff, Trash2 } from 'lucide-react';
import { SMSPasswordReset } from '../components/SMSPasswordReset';
import { DeleteAccountModal } from '../components/DeleteAccountModal';

interface LoginProps {
  onLoginSuccess: () => void;
}

type LoginMode = 'email' | 'tc' | 'tc_phone';

export function Login({ onLoginSuccess }: LoginProps) {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [loginType, setLoginType] = useState<LoginMode>('email');
  const [resetType, setResetType] = useState<'email' | 'tc'>('email');
  const [showSmsReset, setShowSmsReset] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsMaskedPhone, setSmsMaskedPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // TC + Phone login state
  const [tcPhoneStep, setTcPhoneStep] = useState<'form' | 'code'>('form');
  const [tcNumber, setTcNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let emailToUse = identifier;

      if (loginType === 'tc') {
        const tcNum = identifier.replace(/\s/g, '');
        if (tcNum.length !== 11 || !/^\d+$/.test(tcNum)) {
          setError('Geçerli bir TC kimlik numarası giriniz (11 haneli).');
          setLoading(false);
          return;
        }

        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('email')
          .eq('tc_identity_no', tcNum)
          .maybeSingle();

        if (memberError || !member) {
          setError('Bu TC kimlik numarası ile kayıtlı kullanıcı bulunamadı.');
          setLoading(false);
          return;
        }
        emailToUse = member.email;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (signInError) {
        throw new Error(
          loginType === 'tc'
            ? 'Giriş başarısız. TC kimlik numaranız ve şifrenizi kontrol edin.'
            : 'Giriş başarısız. E-posta ve şifrenizi kontrol edin.'
        );
      }

      if (signInData?.user) {
        const { data: memberData } = await supabase
          .from('members')
          .select('pending_approval, is_active')
          .eq('auth_id', signInData.user.id)
          .maybeSingle();

        if (memberData?.pending_approval === true) {
          await supabase.auth.signOut();
          throw new Error('Üyelik başvurunuz henüz yönetici tarafından onaylanmamıştır.');
        }
      }

      onLoginSuccess();
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleTcPhoneSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tc-phone-login`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'send_code',
          tcNumber: tcNumber.trim(),
          phoneNumber: phoneNumber.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Kod gönderilemedi');
      }

      setMaskedPhone(result.maskedPhone || phoneNumber);
      setTcPhoneStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleTcPhoneVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tc-phone-login`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'verify_code',
          tcNumber: tcNumber.trim(),
          phoneNumber: phoneNumber.trim(),
          smsCode: smsCode.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Kod doğrulanamadı');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password: result.tempPassword,
      });

      if (signInError) {
        throw new Error('Otomatik giriş başarısız. Lütfen e-posta ve şifre ile giriş yapmayı deneyin.');
      }

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
      let emailToUse = identifier;
      let tcNumberToSend = undefined;

      if (resetType === 'tc') {
        const tcNum = identifier.replace(/\s/g, '');
        if (tcNum.length !== 11 || !/^\d+$/.test(tcNum)) {
          setError('Geçerli bir TC kimlik numarası giriniz (11 haneli).');
          setLoading(false);
          return;
        }
        tcNumberToSend = tcNum;
        emailToUse = 'temp@placeholder.com';
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: emailToUse,
          tcNumber: tcNumberToSend,
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Şifre sıfırlama gönderilemedi');

      if (result.resetType === 'sms') {
        setSmsPhone(result.phoneNumber);
        setSmsMaskedPhone(result.maskedPhoneNumber || result.phoneNumber);
        setShowSmsReset(true);
      } else {
        setResetEmailSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Şifre sıfırlama e-postası gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  if (showSmsReset) {
    return (
      <SMSPasswordReset
        phoneNumber={smsPhone}
        maskedPhoneNumber={smsMaskedPhone}
        onBack={() => {
          setShowSmsReset(false);
          setShowForgotPassword(false);
          setSmsPhone('');
          setSmsMaskedPhone('');
          setIdentifier('');
          setError('');
        }}
      />
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10 border-t-4 border-emerald-600">
          <LogoHeader />

          <div className="mb-6">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Şifremi Unuttum</h2>
            <p className="text-center text-gray-600 text-sm">Şifrenizi sıfırlayın</p>
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
                  Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.
                </p>
                <p className="text-xs text-emerald-600 mt-2 font-semibold">Bağlantı 1 saat geçerlidir.</p>
              </div>
              <button
                onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); setError(''); }}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3.5 rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg"
              >
                Giriş Sayfasına Dön
              </button>
            </div>
          ) : (
            <>
              {error && <ErrorBox message={error} />}
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sıfırlama Yöntemi</label>
                  <div className="flex gap-3 mb-4">
                    <ModeButton active={resetType === 'email'} onClick={() => { setResetType('email'); setIdentifier(''); setError(''); }} icon={<Mail size={18} />} label="E-posta" />
                    <ModeButton active={resetType === 'tc'} onClick={() => { setResetType('tc'); setIdentifier(''); setError(''); }} icon={<CreditCard size={18} />} label="TC Kimlik" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {resetType === 'email' ? 'E-posta' : 'TC Kimlik Numarası'}
                  </label>
                  <input
                    type={resetType === 'email' ? 'email' : 'text'}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                    placeholder={resetType === 'email' ? 'ornek@email.com' : '12345678901'}
                    maxLength={resetType === 'tc' ? 11 : undefined}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3.5 rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Mail size={20} />
                  {loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Gönder'}
                </button>
                <button type="button" onClick={() => { setShowForgotPassword(false); setError(''); }} className="w-full text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-all">
                  Geri Dön
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // TC + Phone login view
  if (loginType === 'tc_phone') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10 border-t-4 border-emerald-600">
          <LogoHeader />

          {tcPhoneStep === 'form' ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">TC + Telefon ile Giriş</h2>
                <p className="text-center text-gray-600 text-sm">
                  Şifrenizi bilmiyorsanız TC kimlik ve cep telefonunuzla giriş yapabilirsiniz
                </p>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 rounded-lg mb-5">
                <p className="text-amber-800 text-xs leading-relaxed">
                  Kayıtlı cep telefon numaranıza <strong>6 haneli doğrulama kodu</strong> gönderilecektir.
                  Kod <strong>15 dakika</strong> geçerlidir.
                </p>
              </div>

              {error && <ErrorBox message={error} />}

              <form onSubmit={handleTcPhoneSendCode} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">TC Kimlik Numarası</label>
                  <div className="relative">
                    <CreditCard size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={tcNumber}
                      onChange={(e) => setTcNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      required
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none tracking-widest"
                      placeholder="12345678901"
                      maxLength={11}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">11 haneli TC kimlik numaranızı giriniz</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cep Telefonu</label>
                  <div className="relative">
                    <Smartphone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      required
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none tracking-widest"
                      placeholder="05321234567"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Sistemde kayıtlı cep telefon numaranızı giriniz</p>
                </div>

                <button
                  type="submit"
                  disabled={loading || tcNumber.length !== 11 || phoneNumber.length < 10}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3.5 rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Smartphone size={20} />
                  {loading ? 'Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
                </button>

                <button
                  type="button"
                  onClick={() => { setLoginType('email'); setError(''); setTcNumber(''); setPhoneNumber(''); }}
                  className="w-full text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Giriş Sayfasına Dön
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Doğrulama Kodu</h2>
                <p className="text-center text-gray-600 text-sm">
                  <span className="font-semibold text-gray-800">{maskedPhone}</span> numaralı telefona gönderilen 6 haneli kodu girin
                </p>
              </div>

              <div className="bg-emerald-50 border-l-4 border-emerald-500 px-4 py-3 rounded-lg mb-5">
                <p className="text-emerald-800 text-xs leading-relaxed">
                  SMS gelmediyse birkaç dakika bekleyin. Kod <strong>15 dakika</strong> geçerlidir.
                </p>
              </div>

              {error && <ErrorBox message={error} />}

              <form onSubmit={handleTcPhoneVerifyCode} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SMS Doğrulama Kodu</label>
                  <input
                    type="text"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    autoFocus
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-center text-3xl tracking-[0.5em] font-bold"
                    placeholder="000000"
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">Kod 15 dakika geçerlidir</p>
                </div>

                <button
                  type="submit"
                  disabled={loading || smsCode.length !== 6}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3.5 rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={20} />
                  {loading ? 'Doğrulanıyor...' : 'Giriş Yap'}
                </button>

                <button
                  type="button"
                  onClick={() => { setTcPhoneStep('form'); setSmsCode(''); setError(''); }}
                  className="w-full text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
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
        <LogoHeader />

        <div className="mb-6">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Hoş Geldiniz</h2>
          <p className="text-center text-gray-600 text-sm">Hesabınıza giriş yapın</p>
        </div>

        {error && <ErrorBox message={error} />}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Giriş Yöntemi</label>
            <div className="flex gap-2 mb-4">
              <ModeButton
                active={loginType === 'email'}
                onClick={() => { setLoginType('email'); setIdentifier(''); setError(''); }}
                icon={<Mail size={15} />}
                label="E-posta"
              />
              <ModeButton
                active={loginType === 'tc'}
                onClick={() => { setLoginType('tc'); setIdentifier(''); setError(''); }}
                icon={<CreditCard size={15} />}
                label="TC Kimlik"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {loginType === 'email' ? 'E-posta' : 'TC Kimlik Numarası'}
            </label>
            <input
              type={loginType === 'email' ? 'email' : 'text'}
              value={identifier}
              onChange={(e) => {
                if (loginType === 'tc') {
                  setIdentifier(e.target.value.replace(/\D/g, '').slice(0, 11));
                } else {
                  setIdentifier(e.target.value);
                }
              }}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
              placeholder={loginType === 'email' ? 'ornek@email.com' : '12345678901'}
            />
            {loginType === 'tc' && (
              <p className="text-xs text-gray-500 mt-1">11 haneli TC kimlik numaranızı giriniz</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Şifre</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">En az 8 karakter</p>
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

        {/* TC + Phone login separator */}
        <div className="mt-5">
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="mx-3 text-xs text-gray-400 font-medium">veya</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button
            type="button"
            onClick={() => { setLoginType('tc_phone'); setError(''); setTcPhoneStep('form'); }}
            className="mt-4 w-full border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 hover:border-emerald-400"
          >
            <Smartphone size={18} />
            TC Kimlik + Telefon ile Giriş
          </button>
          <p className="text-center text-xs text-gray-500 mt-2">
            Şifrenizi bilmiyorsanız TC ve telefon numaranızla giriş yapın
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <div className="text-center">
            <button
              type="button"
              onClick={() => { setShowForgotPassword(true); setError(''); }}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-all"
            >
              Şifremi Unuttum
            </button>
          </div>
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Hesabınız yok mu?</p>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm hover:underline transition-all"
            >
              Kayıt Olun
            </button>
          </div>

          <div className="text-center pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowDeleteAccount(true)}
              className="text-xs text-red-400 hover:text-red-600 font-medium hover:underline transition-all flex items-center justify-center gap-1.5 mx-auto"
            >
              <Trash2 size={13} />
              Hesabımı Sil
            </button>
          </div>

          <div className="text-center pt-2">
            <a
              href="/politika"
              className="text-xs text-gray-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1"
            >
              <ShieldCheck size={12} />
              Gizlilik Politikası
            </a>
          </div>
        </div>
      </div>

      {showDeleteAccount && (
        <DeleteAccountModal
          onClose={() => setShowDeleteAccount(false)}
          onDeleted={() => {
            setShowDeleteAccount(false);
            navigate('/');
          }}
        />
      )}
    </div>
  );
}

function LogoHeader() {
  return (
    <div className="flex flex-col items-center justify-center mb-8">
      <div className="w-28 h-28 bg-gradient-to-br from-emerald-50 to-green-50 rounded-full p-3 shadow-lg mb-4 ring-4 ring-emerald-100">
        <img src="/sdas.jpeg" alt="Dernek Logo" className="w-full h-full object-contain rounded-full" />
      </div>
      <h1 className="text-lg font-bold text-center text-gray-800 leading-tight">
        Diyarbakır Çüngüş Çaybaşı Köyü<br />
        <span className="text-emerald-600">Yardımlaşma ve Dayanışma Derneği</span>
      </h1>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-5 shadow-sm">
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 text-sm ${
        active
          ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

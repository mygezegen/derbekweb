import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const SUPABASE_URL = 'https://twktxzhsrobccqmheotf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3a3R4emhzcm9iY2NxbWhlb3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODI4MTgsImV4cCI6MjA4Njc1ODgxOH0.AIrHUSnZVumPIKAPJDS0Ou9_obUkMm2_a7-jX0EF99c';

type LoginMode = 'email' | 'tc' | 'tc_phone';
type TcPhoneStep = 'form' | 'code';

type Props = { navigation: any };

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();

  const [loginMode, setLoginMode] = useState<LoginMode>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [tcPhoneStep, setTcPhoneStep] = useState<TcPhoneStep>('form');
  const [tcNumber, setTcNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');

  const switchMode = (mode: LoginMode) => {
    setLoginMode(mode);
    setIdentifier('');
    setPassword('');
    setError('');
    setTcPhoneStep('form');
    setTcNumber('');
    setPhoneNumber('');
    setSmsCode('');
  };

  const handleLogin = async () => {
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('Tüm alanları doldurunuz.');
      return;
    }
    setLoading(true);

    try {
      let emailToUse = identifier.trim();

      if (loginMode === 'tc') {
        const tc = identifier.replace(/\s/g, '');
        if (tc.length !== 11 || !/^\d+$/.test(tc)) {
          setError('Geçerli bir TC kimlik numarası giriniz (11 haneli).');
          return;
        }
        const { data: memberRow } = await supabase
          .from('members')
          .select('email')
          .eq('tc_identity_no', tc)
          .maybeSingle();
        if (!memberRow) {
          setError('Bu TC kimlik numarası ile kayıtlı kullanıcı bulunamadı.');
          return;
        }
        emailToUse = memberRow.email;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (signInError) {
        setError(
          loginMode === 'tc'
            ? 'Giriş başarısız. TC kimlik numaranız ve şifrenizi kontrol edin.'
            : 'Giriş başarısız. E-posta ve şifrenizi kontrol edin.'
        );
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: memberData } = await supabase
          .from('members')
          .select('pending_approval')
          .eq('auth_id', user.id)
          .maybeSingle();
        if (memberData?.pending_approval === true) {
          await supabase.auth.signOut({ scope: 'local' });
          setError('Üyelik başvurunuz henüz yönetici tarafından onaylanmamıştır.');
          return;
        }
      }
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleTcPhoneSendCode = async () => {
    setError('');
    const tc = tcNumber.replace(/\D/g, '');
    const phone = phoneNumber.replace(/\D/g, '');
    if (tc.length !== 11) { setError('11 haneli TC kimlik numarası giriniz.'); return; }
    if (phone.length < 10) { setError('Geçerli bir telefon numarası giriniz.'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/tc-phone-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: 'send_code', tcNumber: tc, phoneNumber: phone }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Kod gönderilemedi');
      setMaskedPhone(result.maskedPhone || phone);
      setTcPhoneStep('code');
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleTcPhoneVerifyCode = async () => {
    setError('');
    if (smsCode.length !== 6) { setError('6 haneli doğrulama kodunu giriniz.'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/tc-phone-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'verify_code',
          tcNumber: tcNumber.replace(/\D/g, ''),
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          smsCode: smsCode.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Kod doğrulanamadı');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password: result.tempPassword,
      });
      if (signInError) throw new Error('Otomatik giriş başarısız. Lütfen e-posta ile giriş yapın.');
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loginMode === 'tc_phone') {
    return (
      <LinearGradient colors={['#059669', '#065f46']} style={s.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <View style={s.topRow}>
              <TouchableOpacity onPress={() => switchMode('email')} style={s.backBtn}>
                <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
                <Text style={s.backText}>Geri</Text>
              </TouchableOpacity>
            </View>

            <LogoBlock />

            <View style={s.card}>
              {tcPhoneStep === 'form' ? (
                <>
                  <Text style={s.cardTitle}>TC + Telefon ile Giriş</Text>
                  <Text style={s.cardSubtitle}>Kayıtlı cep telefonunuza 6 haneli kod gönderilecektir</Text>

                  <View style={s.infoBanner}>
                    <Ionicons name="information-circle-outline" size={16} color="#92400e" />
                    <Text style={s.infoText}>Kod 15 dakika geçerlidir.</Text>
                  </View>

                  {!!error && <ErrorBox message={error} />}

                  <Field label="TC Kimlik Numarası" icon="card-outline">
                    <TextInput
                      style={s.input}
                      value={tcNumber}
                      onChangeText={t => setTcNumber(t.replace(/\D/g, '').slice(0, 11))}
                      placeholder="12345678901"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      maxLength={11}
                    />
                  </Field>

                  <Field label="Cep Telefonu" icon="phone-portrait-outline">
                    <TextInput
                      style={s.input}
                      value={phoneNumber}
                      onChangeText={t => setPhoneNumber(t.replace(/\D/g, '').slice(0, 11))}
                      placeholder="05321234567"
                      placeholderTextColor="#9ca3af"
                      keyboardType="phone-pad"
                    />
                  </Field>

                  <PrimaryButton
                    label="Doğrulama Kodu Gönder"
                    icon="phone-portrait-outline"
                    loading={loading}
                    disabled={loading || tcNumber.length !== 11 || phoneNumber.length < 10}
                    onPress={handleTcPhoneSendCode}
                  />
                </>
              ) : (
                <>
                  <Text style={s.cardTitle}>Doğrulama Kodu</Text>
                  <Text style={s.cardSubtitle}>
                    <Text style={{ fontWeight: '700', color: '#111827' }}>{maskedPhone}</Text>
                    {' '}numarasına gönderilen kodu girin
                  </Text>

                  <View style={[s.infoBanner, { backgroundColor: '#ecfdf5', borderColor: '#6ee7b7' }]}>
                    <Ionicons name="time-outline" size={16} color="#065f46" />
                    <Text style={[s.infoText, { color: '#065f46' }]}>Kod 15 dakika geçerlidir.</Text>
                  </View>

                  {!!error && <ErrorBox message={error} />}

                  <View style={s.inputGroup}>
                    <Text style={s.label}>SMS Doğrulama Kodu</Text>
                    <TextInput
                      style={[s.input, s.otpInput]}
                      value={smsCode}
                      onChangeText={t => setSmsCode(t.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      maxLength={6}
                      autoFocus
                    />
                  </View>

                  <PrimaryButton
                    label="Giriş Yap"
                    icon="shield-checkmark-outline"
                    loading={loading}
                    disabled={loading || smsCode.length !== 6}
                    onPress={handleTcPhoneVerifyCode}
                  />

                  <TouchableOpacity onPress={() => { setTcPhoneStep('form'); setSmsCode(''); setError(''); }} style={s.textBtn}>
                    <Ionicons name="arrow-back" size={16} color="#059669" />
                    <Text style={s.textBtnLabel}>Geri Dön</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#059669', '#065f46']} style={s.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <LogoBlock />

          <View style={s.card}>
            <Text style={s.cardTitle}>Hoş Geldiniz</Text>
            <Text style={s.cardSubtitle}>Hesabınıza giriş yapın</Text>

            <View style={s.modeRow}>
              <ModeTab active={loginMode === 'email'} icon="mail-outline" label="E-posta" onPress={() => switchMode('email')} />
              <ModeTab active={loginMode === 'tc'} icon="card-outline" label="TC Kimlik" onPress={() => switchMode('tc')} />
            </View>

            {!!error && <ErrorBox message={error} />}

            <View style={s.inputGroup}>
              <Text style={s.label}>{loginMode === 'email' ? 'E-posta' : 'TC Kimlik Numarası'}</Text>
              <TextInput
                style={s.input}
                value={identifier}
                onChangeText={t => loginMode === 'tc' ? setIdentifier(t.replace(/\D/g, '').slice(0, 11)) : setIdentifier(t)}
                placeholder={loginMode === 'email' ? 'ornek@email.com' : '12345678901'}
                placeholderTextColor="#9ca3af"
                keyboardType={loginMode === 'email' ? 'email-address' : 'numeric'}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={loginMode === 'tc' ? 11 : undefined}
              />
              {loginMode === 'tc' && (
                <Text style={s.hint}>11 haneli TC kimlik numaranızı giriniz</Text>
              )}
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Şifre</Text>
              <View style={s.passwordBox}>
                <TextInput
                  style={s.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={s.forgotBtn}>
              <Text style={s.forgotText}>Şifremi Unuttum</Text>
            </TouchableOpacity>

            <PrimaryButton label="Giriş Yap" icon="log-in-outline" loading={loading} disabled={loading} onPress={handleLogin} />

            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>veya</Text>
              <View style={s.dividerLine} />
            </View>

            <TouchableOpacity onPress={() => switchMode('tc_phone')} style={s.altLoginBtn}>
              <Ionicons name="phone-portrait-outline" size={18} color="#059669" />
              <Text style={s.altLoginText}>TC Kimlik + Telefon ile Giriş</Text>
            </TouchableOpacity>
            <Text style={s.altLoginHint}>Şifrenizi bilmiyorsanız TC ve telefon numaranızla giriş yapın</Text>

            <View style={s.signupRow}>
              <Text style={s.signupText}>Hesabınız yok mu? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={s.signupLink}>Kayıt Ol</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('DeleteAccount')} style={s.deleteAccountRow}>
              <Ionicons name="trash-outline" size={13} color="#9ca3af" />
              <Text style={s.deleteAccountText}>Hesabımı silmek istiyorum</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => Linking.openURL('https://www.caybasi.org/politika')} style={s.privacyRow}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#9ca3af" />
              <Text style={s.privacyText}>Gizlilik Politikası</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function LogoBlock() {
  return (
    <View style={s.logoContainer}>
      <View style={s.logoCircle}>
        <Text style={s.logoText}>D</Text>
      </View>
      <Text style={s.appName}>Dernek</Text>
      <Text style={s.appSubtitle}>Üye Portalı</Text>
    </View>
  );
}

function ModeTab({ active, icon, label, onPress }: { active: boolean; icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.modeTab, active && s.modeTabActive]}>
      <Ionicons name={icon} size={15} color={active ? '#fff' : '#6b7280'} />
      <Text style={[s.modeTabLabel, active && s.modeTabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

function PrimaryButton({ label, icon, loading, disabled, onPress }: {
  label: string; icon: any; loading: boolean; disabled: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[s.primaryBtn, disabled && s.btnDisabled]} onPress={onPress} disabled={disabled}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Ionicons name={icon} size={18} color="#fff" />
          <Text style={s.primaryBtnText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <View style={s.errorBox}>
      <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
      <Text style={s.errorText}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '500' },
  logoContainer: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  logoText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  appName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  appSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 8,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 20 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  modeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  modeTabActive: { backgroundColor: '#059669' },
  modeTabLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  modeTabLabelActive: { color: '#fff' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15,
    color: '#111827', backgroundColor: '#f9fafb',
  },
  otpInput: {
    textAlign: 'center', fontSize: 28, fontWeight: '700',
    letterSpacing: 12, paddingVertical: 16,
  },
  passwordBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#f9fafb',
  },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#111827' },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 13, color: '#059669', fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#059669', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  altLoginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#a7f3d0', backgroundColor: '#ecfdf5',
    borderRadius: 12, paddingVertical: 12,
  },
  altLoginText: { fontSize: 14, fontWeight: '600', color: '#059669' },
  altLoginHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 6, marginBottom: 16 },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  signupText: { fontSize: 14, color: '#6b7280' },
  signupLink: { fontSize: 14, color: '#059669', fontWeight: '600' },
  deleteAccountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 12 },
  deleteAccountText: { fontSize: 12, color: '#9ca3af' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8, marginBottom: 4 },
  privacyText: { fontSize: 12, color: '#9ca3af' },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16,
  },
  infoText: { fontSize: 12, color: '#92400e', flex: 1, lineHeight: 16 },
  textBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  textBtnLabel: { fontSize: 14, color: '#059669', fontWeight: '600' },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fef2f2', borderLeftWidth: 3, borderLeftColor: '#dc2626',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: '#dc2626', lineHeight: 18 },
});

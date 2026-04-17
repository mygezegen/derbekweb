import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const SUPABASE_URL = 'https://twktxzhsrobccqmheotf.supabase.co';

type Step = 'email' | 'verify' | 'details' | 'pending';

type Props = { navigation: any };

interface FormData {
  email: string;
  password: string;
  full_name: string;
  tc_identity_no: string;
  mother_name: string;
  father_name: string;
  address: string;
  profession: string;
  phone: string;
}

export default function SignupScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState<FormData>({
    email: '', password: '', full_name: '', tc_identity_no: '',
    mother_name: '', father_name: '', address: '', profession: '', phone: '',
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from('members').select('tc_identity_no').eq('auth_id', session.user.id).maybeSingle().then(({ data }) => {
        if (data?.tc_identity_no && data.tc_identity_no !== '00000000000') {
          navigation.replace('Login');
        } else {
          setStep('details');
        }
      });
    });
  }, []);

  const handleEmailSignup = async () => {
    setError('');
    if (!form.email || !form.password) { setError('E-posta ve şifre gereklidir.'); return; }
    if (form.password.length < 8) { setError('Şifre en az 8 karakter olmalıdır.'); return; }
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name || form.email.split('@')[0] } },
      });
      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('user_already_exists')) {
          throw new Error('Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın.');
        }
        throw signUpError;
      }
      if (data.session) {
        setStep('details');
      } else if (data.user) {
        setStep('verify');
      }
    } catch (err: any) {
      setError(err.message || 'Kayıt sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    setError('');
    if (verificationCode.length !== 6) { setError('6 haneli doğrulama kodunu giriniz.'); return; }
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: form.email,
        token: verificationCode,
        type: 'signup',
      });
      if (verifyError) throw verifyError;
      setStep('details');
    } catch (err: any) {
      setError(err.message || 'Doğrulama sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: form.email });
      if (resendError) throw resendError;
      setError('');
    } catch (err: any) {
      setError(err.message || 'Kod gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDetailsSubmit = async () => {
    setError('');
    const { full_name, tc_identity_no, mother_name, father_name, address, profession, phone } = form;
    if (!full_name || !tc_identity_no || !mother_name || !father_name || !address || !profession || !phone) {
      setError('Tüm alanlar zorunludur.');
      return;
    }
    if (tc_identity_no.length !== 11 || !/^\d+$/.test(tc_identity_no)) {
      setError('Geçerli bir TC Kimlik Numarası giriniz (11 haneli).');
      return;
    }
    if (!/^[0-9]{10,11}$/.test(phone.replace(/[\s()-]/g, ''))) {
      setError('Geçerli bir telefon numarası giriniz.');
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');

      const { error: updateError } = await supabase.from('members').update({
        full_name, tc_identity_no, mother_name, father_name,
        address, profession, phone,
        pending_approval: true, is_active: false,
      }).eq('auth_id', session.user.id);

      if (updateError) throw updateError;

      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-welcome-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch {}

      setStep('pending');
    } catch (err: any) {
      setError(err.message || 'Bilgiler kaydedilirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'pending') {
    return (
      <LinearGradient colors={['#059669', '#065f46']} style={s.gradient}>
        <ScrollView contentContainerStyle={[s.scroll, { justifyContent: 'center' }]}>
          <View style={s.card}>
            <View style={s.iconCircle}>
              <Ionicons name="time-outline" size={40} color="#d97706" />
            </View>
            <Text style={s.cardTitle}>Başvurunuz Alındı</Text>
            <Text style={[s.cardSubtitle, { textAlign: 'center' }]}>
              Üyelik başvurunuz başarıyla tamamlandı. Hesabınız yönetici onayından sonra aktif hale gelecektir.
            </Text>

            <View style={s.checkList}>
              <CheckItem label="Bilgileriniz kaydedildi" done />
              <CheckItem label="E-posta adresiniz doğrulandı" done />
              <CheckItem label="Yönetici onayı bekleniyor..." done={false} />
            </View>

            <Text style={s.pendingNote}>Onay tamamlandığında sisteme giriş yapabilirsiniz.</Text>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.primaryBtn}>
              <Text style={s.primaryBtnText}>Giriş Sayfasına Git</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  if (step === 'verify') {
    return (
      <LinearGradient colors={['#059669', '#065f46']} style={s.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
          <ScrollView contentContainerStyle={[s.scroll, { justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
            <View style={s.topRow}>
              <TouchableOpacity onPress={() => setStep('email')} style={s.backBtn}>
                <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
                <Text style={s.backText}>Geri</Text>
              </TouchableOpacity>
            </View>

            <View style={s.card}>
              <View style={s.iconCircle}>
                <Ionicons name="mail-outline" size={36} color="#059669" />
              </View>
              <Text style={s.cardTitle}>E-posta Doğrulama</Text>
              <Text style={[s.cardSubtitle, { textAlign: 'center' }]}>
                <Text style={{ fontWeight: '700', color: '#111827' }}>{form.email}</Text>
                {' '}adresinize gönderilen 6 haneli kodu giriniz
              </Text>

              {!!error && <ErrorBox message={error} />}

              <View style={s.inputGroup}>
                <Text style={s.label}>Doğrulama Kodu</Text>
                <TextInput
                  style={[s.input, s.otpInput]}
                  value={verificationCode}
                  onChangeText={t => setVerificationCode(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[s.primaryBtn, (loading || verificationCode.length !== 6) && s.btnDisabled]}
                onPress={handleVerifyEmail}
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Doğrula</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleResendCode} disabled={loading} style={s.textBtn}>
                <Ionicons name="refresh-outline" size={15} color="#059669" />
                <Text style={s.textBtnLabel}>Kodu tekrar gönder</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  if (step === 'details') {
    return (
      <LinearGradient colors={['#059669', '#065f46']} style={s.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <View style={s.card}>
              <View style={s.iconCircle}>
                <Ionicons name="person-outline" size={36} color="#059669" />
              </View>
              <Text style={s.cardTitle}>Üyelik Bilgilerinizi Tamamlayın</Text>
              <Text style={s.cardSubtitle}>Kayıt işleminizi tamamlamak için lütfen bilgilerinizi giriniz</Text>

              {!!error && <ErrorBox message={error} />}

              <InputField label="Ad Soyad" icon="person-outline" required>
                <TextInput
                  style={s.input}
                  value={form.full_name}
                  onChangeText={t => setForm(f => ({ ...f, full_name: t }))}
                  placeholder="Ad Soyad"
                  placeholderTextColor="#9ca3af"
                />
              </InputField>

              <InputField label="TC Kimlik No" icon="card-outline" required>
                <TextInput
                  style={s.input}
                  value={form.tc_identity_no}
                  onChangeText={t => setForm(f => ({ ...f, tc_identity_no: t.replace(/\D/g, '').slice(0, 11) }))}
                  placeholder="11 haneli TC No"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={11}
                />
              </InputField>

              <InputField label="Anne Adı" icon="people-outline" required>
                <TextInput
                  style={s.input}
                  value={form.mother_name}
                  onChangeText={t => setForm(f => ({ ...f, mother_name: t }))}
                  placeholder="Anne Adı"
                  placeholderTextColor="#9ca3af"
                />
              </InputField>

              <InputField label="Baba Adı" icon="people-outline" required>
                <TextInput
                  style={s.input}
                  value={form.father_name}
                  onChangeText={t => setForm(f => ({ ...f, father_name: t }))}
                  placeholder="Baba Adı"
                  placeholderTextColor="#9ca3af"
                />
              </InputField>

              <InputField label="Telefon" icon="call-outline" required>
                <TextInput
                  style={s.input}
                  value={form.phone}
                  onChangeText={t => setForm(f => ({ ...f, phone: t }))}
                  placeholder="0555 123 45 67"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                />
              </InputField>

              <InputField label="Meslek" icon="briefcase-outline" required>
                <TextInput
                  style={s.input}
                  value={form.profession}
                  onChangeText={t => setForm(f => ({ ...f, profession: t }))}
                  placeholder="Mesleğiniz"
                  placeholderTextColor="#9ca3af"
                />
              </InputField>

              <InputField label="Adres" icon="location-outline" required>
                <TextInput
                  style={[s.input, s.textArea]}
                  value={form.address}
                  onChangeText={t => setForm(f => ({ ...f, address: t }))}
                  placeholder="Tam adresiniz"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </InputField>

              <TouchableOpacity
                style={[s.primaryBtn, loading && s.btnDisabled]}
                onPress={handleDetailsSubmit}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Kaydı Tamamla</Text>}
              </TouchableOpacity>
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
          <View style={s.topRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
              <Text style={s.backText}>Geri</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Üye Olun</Text>
            <Text style={s.cardSubtitle}>Dernek sistemine kayıt olun</Text>

            {!!error && <ErrorBox message={error} />}

            <InputField label="E-posta Adresi" icon="mail-outline" required>
              <TextInput
                style={s.input}
                value={form.email}
                onChangeText={t => setForm(f => ({ ...f, email: t }))}
                placeholder="ornek@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </InputField>

            <InputField label="Şifre" icon="lock-closed-outline" required>
              <View style={s.passwordBox}>
                <TextInput
                  style={s.passwordInput}
                  value={form.password}
                  onChangeText={t => setForm(f => ({ ...f, password: t }))}
                  placeholder="En az 8 karakter"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              {form.password.length > 0 && (
                <Text style={[s.hint, { color: form.password.length >= 8 ? '#059669' : '#dc2626' }]}>
                  {form.password.length >= 8 ? `Şifre geçerli (${form.password.length}/8)` : `En az 8 karakter gerekli (${form.password.length}/8)`}
                </Text>
              )}
            </InputField>

            <TouchableOpacity
              style={[s.primaryBtn, loading && s.btnDisabled]}
              onPress={handleEmailSignup}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Devam Et</Text>}
            </TouchableOpacity>

            <View style={s.loginRow}>
              <Text style={s.loginText}>Zaten üye misiniz? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={s.loginLink}>Giriş Yapın</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function InputField({ label, icon, required, children }: {
  label: string; icon: any; required?: boolean; children: React.ReactNode;
}) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.label}>
        {label}
        {required && <Text style={{ color: '#dc2626' }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

function CheckItem({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={s.checkItem}>
      <Ionicons
        name={done ? 'checkmark-circle' : 'time-outline'}
        size={16}
        color={done ? '#059669' : '#d97706'}
      />
      <Text style={[s.checkLabel, { color: done ? '#065f46' : '#92400e' }]}>{label}</Text>
    </View>
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
  scroll: { flexGrow: 1, padding: 24, paddingTop: 48 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '500' },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 8,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 16,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4, textAlign: 'center' },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15,
    color: '#111827', backgroundColor: '#f9fafb',
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  otpInput: { textAlign: 'center', fontSize: 28, fontWeight: '700', letterSpacing: 12, paddingVertical: 16 },
  passwordBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#f9fafb',
  },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#111827' },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  hint: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  primaryBtn: {
    backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#059669', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { fontSize: 14, color: '#6b7280' },
  loginLink: { fontSize: 14, color: '#059669', fontWeight: '600' },
  checkList: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, marginVertical: 16, gap: 10 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkLabel: { fontSize: 13, fontWeight: '500' },
  pendingNote: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 20 },
  textBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  textBtnLabel: { fontSize: 14, color: '#059669', fontWeight: '600' },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fef2f2', borderLeftWidth: 3, borderLeftColor: '#dc2626',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: '#dc2626', lineHeight: 18 },
});

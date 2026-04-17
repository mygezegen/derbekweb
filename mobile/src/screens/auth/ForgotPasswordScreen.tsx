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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const SUPABASE_URL = 'https://twktxzhsrobccqmheotf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3a3R4emhzcm9iY2NxbWhlb3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODI4MTgsImV4cCI6MjA4Njc1ODgxOH0.AIrHUSnZVumPIKAPJDS0Ou9_obUkMm2_a7-jX0EF99c';

type ResetMode = 'email' | 'tc';
type SmsStep = 'phone' | 'code' | 'newpassword';

type Props = { navigation: any };

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [resetMode, setResetMode] = useState<ResetMode>('email');
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const [smsStep, setSmsStep] = useState<SmsStep>('phone');
  const [smsPhone, setSmsPhone] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const switchMode = (mode: ResetMode) => {
    setResetMode(mode);
    setIdentifier('');
    setError('');
    setEmailSent(false);
    setSmsStep('phone');
    setSmsPhone('');
    setSmsCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleEmailReset = async () => {
    setError('');
    if (resetMode === 'email') {
      if (!identifier.trim()) { setError('E-posta adresinizi giriniz.'); return; }
    } else {
      const tc = identifier.replace(/\s/g, '');
      if (tc.length !== 11 || !/^\d+$/.test(tc)) { setError('11 haneli TC kimlik numarası giriniz.'); return; }
    }
    setLoading(true);
    try {
      const isEmail = resetMode === 'email';
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: isEmail ? identifier.trim() : 'temp@placeholder.com',
          tcNumber: isEmail ? undefined : identifier.replace(/\s/g, ''),
          redirectTo: `${SUPABASE_URL}/reset-password`,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Şifre sıfırlama gönderilemedi');

      if (result.resetType === 'sms') {
        setSmsPhone(result.phoneNumber);
        setMaskedPhone(result.maskedPhoneNumber || result.phoneNumber);
        setSmsStep('code');
      } else {
        setEmailSent(true);
      }
    } catch (err: any) {
      setError(err.message || 'Şifre sıfırlama gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSmsVerify = async () => {
    setError('');
    if (smsCode.length !== 6) { setError('6 haneli doğrulama kodunu giriniz.'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/reset-password-with-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: 'verify_code', phoneNumber: smsPhone, smsCode }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Kod doğrulanamadı');
      setSmsStep('newpassword');
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async () => {
    setError('');
    if (newPassword.length < 8) { setError('Şifre en az 8 karakter olmalıdır.'); return; }
    if (newPassword !== confirmPassword) { setError('Şifreler eşleşmiyor.'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/reset-password-with-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: 'reset_password', phoneNumber: smsPhone, smsCode, newPassword }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Şifre sıfırlanamadı');
      setResetDone(true);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (resetDone) {
    return (
      <LinearGradient colors={['#059669', '#065f46']} style={s.gradient}>
        <ScrollView contentContainerStyle={[s.scroll, { justifyContent: 'center' }]}>
          <View style={s.card}>
            <View style={[s.iconCircle, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="checkmark-circle-outline" size={40} color="#059669" />
            </View>
            <Text style={s.cardTitle}>Şifreniz Değiştirildi!</Text>
            <Text style={[s.cardSubtitle, { textAlign: 'center' }]}>
              Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.primaryBtn}>
              <Text style={s.primaryBtnText}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  if (emailSent) {
    return (
      <LinearGradient colors={['#059669', '#065f46']} style={s.gradient}>
        <ScrollView contentContainerStyle={[s.scroll, { justifyContent: 'center' }]}>
          <View style={s.card}>
            <View style={s.iconCircle}>
              <Ionicons name="mail-outline" size={40} color="#059669" />
            </View>
            <Text style={s.cardTitle}>E-posta Gönderildi!</Text>
            <Text style={[s.cardSubtitle, { textAlign: 'center' }]}>
              Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.
            </Text>
            <View style={s.infoBanner}>
              <Ionicons name="time-outline" size={16} color="#065f46" />
              <Text style={[s.infoText, { color: '#065f46' }]}>Bağlantı 1 saat geçerlidir.</Text>
            </View>
            <TouchableOpacity
              onPress={() => { setEmailSent(false); setIdentifier(''); setError(''); }}
              style={s.primaryBtn}
            >
              <Text style={s.primaryBtnText}>Giriş Sayfasına Dön</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  if (smsStep === 'code') {
    return (
      <LinearGradient colors={['#059669', '#065f46']} style={s.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
          <ScrollView contentContainerStyle={[s.scroll, { justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
            <View style={s.topRow}>
              <TouchableOpacity onPress={() => { setSmsStep('phone'); setSmsCode(''); setError(''); }} style={s.backBtn}>
                <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
                <Text style={s.backText}>Geri</Text>
              </TouchableOpacity>
            </View>
            <View style={s.card}>
              <View style={s.iconCircle}>
                <Ionicons name="phone-portrait-outline" size={36} color="#059669" />
              </View>
              <Text style={s.cardTitle}>SMS Doğrulama</Text>
              <Text style={[s.cardSubtitle, { textAlign: 'center' }]}>
                <Text style={{ fontWeight: '700', color: '#111827' }}>{maskedPhone}</Text>
                {' '}numarasına gönderilen kodu girin
              </Text>
              {!!error && <ErrorBox message={error} />}
              <View style={s.inputGroup}>
                <Text style={s.label}>Doğrulama Kodu</Text>
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
              <TouchableOpacity
                style={[s.primaryBtn, (loading || smsCode.length !== 6) && s.btnDisabled]}
                onPress={handleSmsVerify}
                disabled={loading || smsCode.length !== 6}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Doğrula</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  if (smsStep === 'newpassword') {
    return (
      <LinearGradient colors={['#059669', '#065f46']} style={s.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
          <ScrollView contentContainerStyle={[s.scroll, { justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
            <View style={s.card}>
              <View style={s.iconCircle}>
                <Ionicons name="lock-open-outline" size={36} color="#059669" />
              </View>
              <Text style={s.cardTitle}>Yeni Şifre Belirleyin</Text>
              <Text style={s.cardSubtitle}>Lütfen yeni şifrenizi giriniz</Text>
              {!!error && <ErrorBox message={error} />}
              <View style={s.inputGroup}>
                <Text style={s.label}>Yeni Şifre</Text>
                <View style={s.passwordBox}>
                  <TextInput
                    style={s.passwordInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="En az 8 karakter"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(v => !v)} style={s.eyeBtn}>
                    <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.inputGroup}>
                <Text style={s.label}>Yeni Şifre (Tekrar)</Text>
                <View style={s.passwordBox}>
                  <TextInput
                    style={s.passwordInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Şifrenizi tekrar girin"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showConfirm}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={s.eyeBtn}>
                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <Text style={[s.hint, { color: '#dc2626' }]}>Şifreler eşleşmiyor</Text>
                )}
              </View>
              <TouchableOpacity
                style={[s.primaryBtn, loading && s.btnDisabled]}
                onPress={handleSetNewPassword}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Şifreyi Değiştir</Text>}
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
        <ScrollView contentContainerStyle={[s.scroll, { justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
          <View style={s.topRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
              <Text style={s.backText}>Geri</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Şifremi Unuttum</Text>
            <Text style={s.cardSubtitle}>Şifrenizi sıfırlamak için yöntemi seçin</Text>

            <View style={s.modeRow}>
              <ModeTab active={resetMode === 'email'} icon="mail-outline" label="E-posta" onPress={() => switchMode('email')} />
              <ModeTab active={resetMode === 'tc'} icon="card-outline" label="TC Kimlik" onPress={() => switchMode('tc')} />
            </View>

            {!!error && <ErrorBox message={error} />}

            <View style={s.inputGroup}>
              <Text style={s.label}>{resetMode === 'email' ? 'E-posta Adresi' : 'TC Kimlik Numarası'}</Text>
              <TextInput
                style={s.input}
                value={identifier}
                onChangeText={t => resetMode === 'tc' ? setIdentifier(t.replace(/\D/g, '').slice(0, 11)) : setIdentifier(t)}
                placeholder={resetMode === 'email' ? 'ornek@email.com' : '12345678901'}
                placeholderTextColor="#9ca3af"
                keyboardType={resetMode === 'email' ? 'email-address' : 'numeric'}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={resetMode === 'tc' ? 11 : undefined}
              />
              {resetMode === 'tc' && (
                <Text style={s.hint}>Sistemde kayıtlı TC kimlik numaranızı giriniz. Kayıtlı telefonunuza SMS gönderilecektir.</Text>
              )}
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, loading && s.btnDisabled]}
              onPress={handleEmailReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="mail-outline" size={18} color="#fff" />
                  <Text style={s.primaryBtnText}>Şifre Sıfırlama Gönder</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.textBtn}>
              <Ionicons name="arrow-back" size={15} color="#059669" />
              <Text style={s.textBtnLabel}>Giriş sayfasına dön</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
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
  scroll: { flexGrow: 1, padding: 24 },
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
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 20 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  modeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6',
  },
  modeTabActive: { backgroundColor: '#059669' },
  modeTabLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  modeTabLabelActive: { color: '#fff' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15,
    color: '#111827', backgroundColor: '#f9fafb',
  },
  otpInput: { textAlign: 'center', fontSize: 28, fontWeight: '700', letterSpacing: 12, paddingVertical: 16 },
  passwordBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#f9fafb',
  },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#111827' },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 4, lineHeight: 16 },
  primaryBtn: {
    backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#059669', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  textBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
  textBtnLabel: { fontSize: 14, color: '#059669', fontWeight: '600' },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#6ee7b7',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 20,
  },
  infoText: { fontSize: 12, flex: 1, lineHeight: 16 },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fef2f2', borderLeftWidth: 3, borderLeftColor: '#dc2626',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: '#dc2626', lineHeight: 18 },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type Step = 'warning' | 'auth' | 'done';

export default function DeleteAccountScreen({ navigation }: { navigation: any }) {
  const { member, signOut } = useAuth();
  const [step, setStep] = useState<Step>('warning');
  const [email, setEmail] = useState(member?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!email.trim()) {
      setError('Lütfen e-posta adresinizi girin.');
      return;
    }
    if (!password.trim()) {
      setError('Lütfen şifrenizi girin.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Şifre ile yeniden kimlik doğrulama
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError('Şifre hatalı. Lütfen tekrar deneyin.');
        setLoading(false);
        return;
      }

      // Üye kaydını pasife al
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı.');

      await supabase
        .from('members')
        .update({
          is_active: false,
          auth_id: null,
          status: 'cancelled',
          status_change_date: new Date().toISOString().split('T')[0],
          passive_status_reason: 'Kullanıcı tarafından hesap silindi',
        })
        .eq('auth_id', user.id);

      // Auth hesabını sil (edge function)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (token) {
        await fetch(
          'https://twktxzhsrobccqmheotf.supabase.co/functions/v1/delete-account',
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
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hesap silinemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Emin misiniz?',
      'Hesabınız kalıcı olarak silinecektir. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: handleDelete,
        },
      ]
    );
  };

  if (step === 'done') {
    return (
      <View style={styles.doneContainer}>
        <View style={styles.doneIconBg}>
          <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
        </View>
        <Text style={styles.doneTitle}>Hesabınız Silindi</Text>
        <Text style={styles.doneDesc}>
          Hesabınız başarıyla kapatıldı. Üyelik kaydınız pasife alındı.
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={signOut}>
          <Text style={styles.doneBtnText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Uyarı Kutusu */}
      <View style={styles.warningBox}>
        <Ionicons name="warning" size={28} color="#dc2626" />
        <Text style={styles.warningTitle}>Bu işlem geri alınamaz!</Text>
        <View style={styles.warningList}>
          {[
            'Hesabınız kalıcı olarak kapatılacaktır',
            'Sisteme giriş yapamayacaksınız',
            'Üyelik kaydınız pasife alınacaktır',
            'Aidat ve işlem geçmişiniz korunacaktır',
          ].map((item, i) => (
            <View key={i} style={styles.warningItem}>
              <Ionicons name="close-circle" size={14} color="#dc2626" style={{ marginTop: 2 }} />
              <Text style={styles.warningItemText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {step === 'warning' && (
        <View style={styles.section}>
          <Text style={styles.sectionDesc}>
            Devam etmek için şifrenizle kimliğinizi doğrulamanız gerekecektir.
          </Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelBtnText}>Vazgeç</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.continueBtn} onPress={() => setStep('auth')}>
              <Text style={styles.continueBtnText}>Devam Et</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 'auth' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kimlik Doğrulama</Text>

          {member?.email ? (
            <View style={styles.emailRow}>
              <Ionicons name="mail-outline" size={16} color="#6b7280" />
              <Text style={styles.emailText}>{member.email}</Text>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>E-posta</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Şifre</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Şifrenizi girin"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(v => !v)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setStep('warning'); setError(''); setPassword(''); }}>
              <Text style={styles.cancelBtnText}>Geri</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteBtn, loading && styles.btnDisabled]}
              onPress={confirmDelete}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.deleteBtnText}>Hesabı Sil</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  warningBox: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  warningTitle: { fontSize: 16, fontWeight: '800', color: '#dc2626', textAlign: 'center' },
  warningList: { alignSelf: 'stretch', gap: 6, marginTop: 4 },
  warningItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  warningItemText: { fontSize: 13, color: '#7f1d1d', flex: 1 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionDesc: { fontSize: 14, color: '#6b7280', lineHeight: 20, textAlign: 'center' },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 10,
  },
  emailText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 10,
  },
  errorText: { fontSize: 13, color: '#dc2626', flex: 1 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
    paddingRight: 44,
  },
  eyeBtn: { position: 'absolute', right: 12 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  continueBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  continueBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  deleteBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  btnDisabled: { opacity: 0.6 },
  deleteBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#f9fafb',
    gap: 16,
  },
  doneIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  doneDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  doneBtn: {
    backgroundColor: '#b91c1c',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

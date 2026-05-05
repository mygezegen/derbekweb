import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type QuestionType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'rating' | 'date' | 'single_choice' | 'multiple_choice';

type Question = {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options?: string[];
  is_required: boolean;
  display_order: number;
};

type Survey = {
  id: string;
  title: string;
  description?: string;
  is_anonymous: boolean;
  allow_multiple_responses: boolean;
  ends_at?: string;
};

type Answers = Record<string, string | string[] | number>;

type Props = { navigation: any; route: any };

type Step = 'loading' | 'contact' | 'form' | 'submitting' | 'done' | 'error' | 'closed';

export default function SurveyDetailScreen({ navigation, route }: Props) {
  const { id } = route.params as { id: string };
  const { user, member } = useAuth();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState<Step>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // Guest contact fields
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  const load = useCallback(async () => {
    const now = new Date().toISOString();
    const { data: surveyData, error } = await supabase
      .from('surveys')
      .select('id, title, description, is_anonymous, allow_multiple_responses, ends_at')
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle();

    if (error || !surveyData) {
      setStep('error');
      setErrorMsg('Anket bulunamadı veya yayında değil.');
      return;
    }

    if (surveyData.ends_at && new Date(surveyData.ends_at) < new Date()) {
      setStep('closed');
      setSurvey(surveyData);
      return;
    }

    setSurvey(surveyData);

    const { data: qData } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('survey_id', id)
      .order('display_order', { ascending: true });

    setQuestions(qData || []);

    // If logged in or anonymous, skip contact step
    if (user || surveyData.is_anonymous) {
      setStep('form');
    } else {
      setStep('contact');
    }
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  const setAnswer = (questionId: string, value: string | string[] | number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleCheckbox = (questionId: string, option: string) => {
    setAnswers(prev => {
      const current = (prev[questionId] as string[]) || [];
      return {
        ...prev,
        [questionId]: current.includes(option)
          ? current.filter(o => o !== option)
          : [...current, option],
      };
    });
  };

  const validateContact = () => {
    if (!guestPhone.trim()) {
      Alert.alert('Eksik Bilgi', 'Telefon numarası zorunludur.');
      return false;
    }
    return true;
  };

  const validateAnswers = () => {
    for (const q of questions) {
      if (!q.is_required) continue;
      const ans = answers[q.id];
      if (ans === undefined || ans === '' || (Array.isArray(ans) && ans.length === 0)) {
        Alert.alert('Eksik Cevap', `"${q.question_text}" sorusu zorunludur.`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateAnswers()) return;
    if (!survey) return;
    setStep('submitting');

    try {
      let memberId: string | null = null;
      let respondentName: string | null = null;
      let respondentPhone: string | null = null;
      let respondentEmail: string | null = null;

      if (user && member) {
        memberId = member.id;
        respondentName = member.full_name || null;
        respondentPhone = member.phone || null;
        respondentEmail = member.email || null;
      } else {
        respondentName = guestName.trim() || null;
        respondentPhone = guestPhone.trim() || null;
        respondentEmail = guestEmail.trim() || null;
      }

      const { data: responseData, error: responseError } = await supabase
        .from('survey_responses')
        .insert({
          survey_id: survey.id,
          member_id: memberId,
          respondent_name: respondentName,
          respondent_phone: respondentPhone,
          respondent_email: respondentEmail,
        })
        .select('id')
        .single();

      if (responseError || !responseData) throw new Error(responseError?.message || 'Yanıt kaydedilemedi.');

      const answerRows = questions
        .filter(q => answers[q.id] !== undefined && answers[q.id] !== '')
        .map(q => {
          const val = answers[q.id];
          const type = q.question_type;
          const isMulti = type === 'checkbox' || type === 'multiple_choice';
          const isRating = type === 'rating';
          return {
            response_id: responseData.id,
            question_id: q.id,
            answer_text: (!isMulti && !isRating) ? String(val) : null,
            answer_options: isMulti ? val : null,
            answer_rating: isRating ? Number(val) : null,
          };
        })
        .filter(r => r.answer_text !== null || r.answer_options !== null || r.answer_rating !== null);

      if (answerRows.length > 0) {
        const { error: answersError } = await supabase.from('survey_answers').insert(answerRows);
        if (answersError) throw new Error(answersError.message);
      }

      setStep('done');
    } catch (err: any) {
      setStep('form');
      Alert.alert('Hata', err.message || 'Yanıt gönderilirken bir hata oluştu.');
    }
  };

  // ─── Loading ───────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#b91c1c" />
      </View>
    );
  }

  // ─── Error ─────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={52} color="#d1d5db" />
        <Text style={styles.stateTitle}>Anket bulunamadı</Text>
        <Text style={styles.stateSub}>{errorMsg}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Closed ────────────────────────────────────────────────
  if (step === 'closed') {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={52} color="#d1d5db" />
        <Text style={styles.stateTitle}>Anket sona erdi</Text>
        <Text style={styles.stateSub}>Bu anketin katılım süresi dolmuştur.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Done ──────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <View style={styles.center}>
        <View style={styles.doneIcon}>
          <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
        </View>
        <Text style={styles.stateTitle}>Teşekkürler!</Text>
        <Text style={styles.stateSub}>Yanıtlarınız başarıyla kaydedildi.</Text>
        <TouchableOpacity style={[styles.backBtn, styles.backBtnGreen]} onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtnText, { color: '#fff' }]}>Ankete Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Contact Step ──────────────────────────────────────────
  if (step === 'contact') {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={styles.surveyHeader}>
            <Text style={styles.surveyTitle}>{survey?.title}</Text>
            {survey?.description ? <Text style={styles.surveyDesc}>{survey.description}</Text> : null}
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
            <Text style={styles.sectionSub}>Ankete katılmak için bilgilerinizi girin.</Text>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Ad Soyad</Text>
              <TextInput
                style={styles.input}
                value={guestName}
                onChangeText={setGuestName}
                placeholder="Adınız Soyadınız"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Telefon <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={guestPhone}
                onChangeText={setGuestPhone}
                placeholder="05XX XXX XX XX"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>E-posta</Text>
              <TextInput
                style={styles.input}
                value={guestEmail}
                onChangeText={setGuestEmail}
                placeholder="ornek@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => { if (validateContact()) setStep('form'); }}
          >
            <Text style={styles.submitBtnText}>Devam Et</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Form Step ─────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.surveyHeader}>
          <Text style={styles.surveyTitle}>{survey?.title}</Text>
          {survey?.description ? <Text style={styles.surveyDesc}>{survey.description}</Text> : null}
          <View style={styles.metaBadgeRow}>
            {survey?.is_anonymous && (
              <View style={styles.metaBadge}>
                <Ionicons name="eye-off-outline" size={12} color="#6b7280" />
                <Text style={styles.metaBadgeText}>Anonim</Text>
              </View>
            )}
            <View style={styles.metaBadge}>
              <Ionicons name="help-circle-outline" size={12} color="#6b7280" />
              <Text style={styles.metaBadgeText}>{questions.length} soru</Text>
            </View>
          </View>
        </View>

        {questions.map((q, index) => (
          <View key={q.id} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <View style={styles.questionNumber}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.questionText}>
                {q.question_text}
                {q.is_required && <Text style={styles.required}> *</Text>}
              </Text>
            </View>

            {/* Text */}
            {(q.question_type === 'text') && (
              <TextInput
                style={styles.input}
                value={(answers[q.id] as string) || ''}
                onChangeText={v => setAnswer(q.id, v)}
                placeholder="Yanıtınızı yazın..."
                placeholderTextColor="#9ca3af"
              />
            )}

            {/* Textarea */}
            {q.question_type === 'textarea' && (
              <TextInput
                style={[styles.input, styles.textarea]}
                value={(answers[q.id] as string) || ''}
                onChangeText={v => setAnswer(q.id, v)}
                placeholder="Yanıtınızı yazın..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}

            {/* Date */}
            {q.question_type === 'date' && (
              <TextInput
                style={styles.input}
                value={(answers[q.id] as string) || ''}
                onChangeText={v => setAnswer(q.id, v)}
                placeholder="GG.AA.YYYY"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            )}

            {/* Radio / Single choice */}
            {(q.question_type === 'radio' || q.question_type === 'single_choice') && (q.options || []).map(opt => (
              <TouchableOpacity
                key={opt}
                style={styles.optionRow}
                onPress={() => setAnswer(q.id, opt)}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, answers[q.id] === opt && styles.radioSelected]}>
                  {answers[q.id] === opt && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            ))}

            {/* Select / Dropdown (rendered as radio on mobile) */}
            {q.question_type === 'select' && (q.options || []).map(opt => (
              <TouchableOpacity
                key={opt}
                style={styles.optionRow}
                onPress={() => setAnswer(q.id, opt)}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, answers[q.id] === opt && styles.radioSelected]}>
                  {answers[q.id] === opt && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            ))}

            {/* Checkbox / Multiple choice */}
            {(q.question_type === 'checkbox' || q.question_type === 'multiple_choice') && (q.options || []).map(opt => {
              const checked = ((answers[q.id] as string[]) || []).includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={styles.optionRow}
                  onPress={() => toggleCheckbox(q.id, opt)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, checked && styles.checkboxSelected]}>
                    {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              );
            })}

            {/* Rating */}
            {q.question_type === 'rating' && (
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.ratingBtn, answers[q.id] === n && styles.ratingBtnSelected]}
                    onPress={() => setAnswer(q.id, n)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={answers[q.id] !== undefined && (answers[q.id] as number) >= n ? 'star' : 'star-outline'}
                      size={28}
                      color={answers[q.id] !== undefined && (answers[q.id] as number) >= n ? '#f59e0b' : '#d1d5db'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.submitBtn, step === 'submitting' && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={step === 'submitting'}
        >
          {step === 'submitting' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Anketi Gönder</Text>
              <Ionicons name="send-outline" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  stateTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  stateSub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  doneIcon: { marginBottom: 8 },
  backBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  backBtnGreen: { backgroundColor: '#16a34a' },
  backBtnText: { fontSize: 15, fontWeight: '700', color: '#374151' },

  surveyHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  surveyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', lineHeight: 26, marginBottom: 6 },
  surveyDesc: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  metaBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaBadgeText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },

  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#6b7280', marginBottom: 16 },

  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  questionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  questionNumberText: { fontSize: 13, fontWeight: '800', color: '#b91c1c' },
  questionText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827', lineHeight: 22 },
  required: { color: '#b91c1c' },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },

  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
  },
  textarea: { minHeight: 100 },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  optionText: { flex: 1, fontSize: 14, color: '#374151' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#b91c1c' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#b91c1c' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: '#b91c1c', borderColor: '#b91c1c' },

  ratingRow: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  ratingBtn: { padding: 4 },
  ratingBtnSelected: {},

  submitBtn: {
    backgroundColor: '#b91c1c',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#b91c1c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});

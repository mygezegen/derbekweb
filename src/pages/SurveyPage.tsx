import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Send, User, Phone, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Survey, SurveyQuestion } from '../types';

type AnswerValue = string | string[] | number;

export function SurveyPage() {
  const { id } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [respondentName, setRespondentName] = useState('');
  const [respondentPhone, setRespondentPhone] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [step, setStep] = useState<'loading' | 'not-found' | 'expired' | 'form' | 'submitting' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const questionsPerPage = 5;

  useEffect(() => {
    if (!id) { setStep('not-found'); return; }
    checkAuthAndLoad();
  }, [id]);

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);
    loadSurvey();
  };

  const loadSurvey = async () => {
    try {
      const { data: surveyData, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle();

      if (error || !surveyData) { setStep('not-found'); return; }
      if (surveyData.ends_at && new Date(surveyData.ends_at) < new Date()) {
        setStep('expired');
        return;
      }

      setSurvey(surveyData);

      const { data: qData } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', id)
        .order('display_order', { ascending: true });

      setQuestions(qData || []);
      setStep('form');
    } catch {
      setStep('not-found');
    }
  };

  const setAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleCheckbox = (questionId: string, option: string) => {
    const current = (answers[questionId] as string[]) || [];
    const next = current.includes(option)
      ? current.filter(v => v !== option)
      : [...current, option];
    setAnswer(questionId, next);
  };

  const validate = (): boolean => {
    if (!isLoggedIn && !survey?.is_anonymous) {
      if (!respondentPhone.trim() || !respondentEmail.trim()) {
        setErrorMsg('Lütfen cep telefonu ve e-posta adresinizi girin.');
        return false;
      }
    }
    for (const q of questions) {
      if (!q.is_required) continue;
      const val = answers[q.id];
      if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
        setErrorMsg('Lütfen zorunlu soruları yanıtlayın.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!survey) return;
    if (!validate()) return;
    setErrorMsg('');
    setStep('submitting');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let memberId: string | null = null;
      if (user) {
        const { data: memberData } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();
        memberId = memberData?.id || null;
      }

      const insertPayload: Record<string, unknown> = {
        survey_id: survey.id,
        member_id: memberId,
        respondent_name: survey.is_anonymous ? null : (respondentName || null),
      };

      if (!isLoggedIn && !survey.is_anonymous) {
        insertPayload.respondent_phone = respondentPhone.trim() || null;
        insertPayload.respondent_email = respondentEmail.trim() || null;
      }

      const { data: responseData, error: rError } = await supabase
        .from('survey_responses')
        .insert(insertPayload)
        .select()
        .single();

      if (rError) throw rError;

      const answerRows = questions.map(q => {
        const val = answers[q.id];
        const row: Record<string, unknown> = {
          response_id: responseData.id,
          question_id: q.id,
        };
        if (q.question_type === 'checkbox') {
          row.answer_options = Array.isArray(val) ? val : [];
        } else if (q.question_type === 'rating') {
          row.answer_rating = typeof val === 'number' ? val : parseInt(String(val)) || null;
        } else {
          row.answer_text = val ? String(val) : null;
        }
        return row;
      }).filter(r => {
        const val = answers[r.question_id as string];
        return val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0);
      });

      if (answerRows.length > 0) {
        const { error: aError } = await supabase.from('survey_answers').insert(answerRows);
        if (aError) throw aError;
      }

      setStep('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Bir hata oluştu. Lütfen tekrar deneyin.');
      setStep('form');
    }
  };

  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const pageQuestions = questions.slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage);

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Yükleniyor...</div>
      </div>
    );
  }

  if (step === 'not-found') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Anket Bulunamadı</h2>
          <p className="text-gray-500">Bu anket mevcut değil ya da yayında değil.</p>
        </div>
      </div>
    );
  }

  if (step === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Anket Süresi Doldu</h2>
          <p className="text-gray-500">Bu anketin yanıt alma süresi dolmuştur.</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Teşekkürler!</h2>
          <p className="text-gray-500 mb-2">Yanıtınız başarıyla kaydedildi.</p>
          {survey && (
            <p className="text-sm text-gray-400">{survey.title}</p>
          )}
        </div>
      </div>
    );
  }

  if (!survey) return null;

  const showGuestContactForm = !isLoggedIn && !survey.is_anonymous && currentPage === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Çüngüş Çaybaşı Köyü Derneği</p>
            <p className="text-xs text-gray-400">Anket</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-4">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5">
            <h1 className="text-xl font-bold text-white">{survey.title}</h1>
            {survey.description && (
              <p className="text-red-100 text-sm mt-1">{survey.description}</p>
            )}
          </div>

          {totalPages > 1 && (
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Bölüm {currentPage + 1} / {totalPages}</span>
                <span>{questions.length} soru</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-300"
                  style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="p-6 space-y-6">
            {showGuestContactForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <User size={16} />
                  <span className="text-sm font-medium">Katılımcı Bilgileri</span>
                </div>
                <p className="text-xs text-blue-600">Üye değilseniz lütfen aşağıdaki bilgileri doldurun. Üyeyseniz <a href="/login" className="underline font-medium">giriş yapabilirsiniz</a>.</p>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <User size={12} />
                      Adınız Soyadınız <span className="text-gray-400">(opsiyonel)</span>
                    </label>
                    <input
                      type="text"
                      value={respondentName}
                      onChange={e => setRespondentName(e.target.value)}
                      placeholder="Adınızı girin..."
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <Phone size={12} />
                      Cep Telefonu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={respondentPhone}
                      onChange={e => setRespondentPhone(e.target.value)}
                      placeholder="05xx xxx xx xx"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <Mail size={12} />
                      E-posta Adresi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={respondentEmail}
                      onChange={e => setRespondentEmail(e.target.value)}
                      placeholder="ornek@email.com"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {!showGuestContactForm && !survey.is_anonymous && currentPage === 0 && isLoggedIn && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Adınız Soyadınız <span className="text-gray-400 text-xs">(opsiyonel)</span>
                </label>
                <input
                  type="text"
                  value={respondentName}
                  onChange={e => setRespondentName(e.target.value)}
                  placeholder="Adınızı girin..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            )}

            {pageQuestions.map((q, qi) => {
              const globalIdx = currentPage * questionsPerPage + qi;
              return (
                <div key={q.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-800">
                    <span className="text-gray-400 mr-1.5">{globalIdx + 1}.</span>
                    {q.question_text}
                    {q.is_required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {q.question_type === 'text' && (
                    <input
                      type="text"
                      value={(answers[q.id] as string) || ''}
                      onChange={e => setAnswer(q.id, e.target.value)}
                      placeholder="Yanıtınızı girin..."
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  )}

                  {q.question_type === 'textarea' && (
                    <textarea
                      value={(answers[q.id] as string) || ''}
                      onChange={e => setAnswer(q.id, e.target.value)}
                      rows={4}
                      placeholder="Yanıtınızı girin..."
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    />
                  )}

                  {q.question_type === 'date' && (
                    <input
                      type="date"
                      value={(answers[q.id] as string) || ''}
                      onChange={e => setAnswer(q.id, e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  )}

                  {q.question_type === 'radio' && q.options && (
                    <div className="space-y-2">
                      {q.options.map(opt => (
                        <label key={opt} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={(answers[q.id] as string) === opt}
                            onChange={() => setAnswer(q.id, opt)}
                            className="w-4 h-4 text-red-600 border-gray-300"
                          />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.question_type === 'checkbox' && q.options && (
                    <div className="space-y-2">
                      {q.options.map(opt => (
                        <label key={opt} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={((answers[q.id] as string[]) || []).includes(opt)}
                            onChange={() => toggleCheckbox(q.id, opt)}
                            className="w-4 h-4 text-red-600 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.question_type === 'select' && q.options && (
                    <select
                      value={(answers[q.id] as string) || ''}
                      onChange={e => setAnswer(q.id, e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                    >
                      <option value="">Seçiniz...</option>
                      {q.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {q.question_type === 'rating' && (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(star => {
                        const val = answers[q.id] as number;
                        const isSelected = val >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setAnswer(q.id, star)}
                            className={`w-12 h-12 rounded-xl text-lg font-bold transition-all ${
                              isSelected
                                ? 'bg-amber-400 text-white shadow-md scale-105'
                                : 'bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-600'
                            }`}
                          >
                            {star}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={currentPage === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={18} />
            Önceki
          </button>

          {currentPage < totalPages - 1 ? (
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
            >
              Sonraki
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={step === 'submitting'}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <Send size={16} />
              {step === 'submitting' ? 'Gönderiliyor...' : 'Anketi Gönder'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

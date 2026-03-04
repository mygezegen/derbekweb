import { useEffect, useState } from 'react';
import { ChevronRight, Star, CheckSquare, Circle, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Survey, SurveyQuestion, Member } from '../types';

interface SurveyTakeProps {
  survey: Survey;
  currentMember: Member | null;
  onClose?: () => void;
  onSubmitted?: () => void;
}

type Answers = Record<string, { text?: string; options?: number[]; rating?: number }>;

export function SurveyTake({ survey, currentMember, onClose, onSubmitted }: SurveyTakeProps) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, [survey.id]);

  const loadQuestions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('survey_id', survey.id)
      .order('display_order');

    const qs: SurveyQuestion[] = (data || []).map((q: any) => ({
      ...q,
      options: q.options ? (Array.isArray(q.options) ? q.options : JSON.parse(q.options)) : [],
    }));
    setQuestions(qs);

    if (currentMember && !survey.is_anonymous) {
      const { data: existing } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('survey_id', survey.id)
        .eq('member_id', currentMember.id)
        .maybeSingle();
      if (existing) setAlreadyAnswered(true);
    }

    setLoading(false);
  };

  const setOptionAnswer = (questionId: string, optionIdx: number, multi: boolean) => {
    setAnswers(prev => {
      const current = prev[questionId]?.options || [];
      let next: number[];
      if (multi) {
        next = current.includes(optionIdx) ? current.filter(i => i !== optionIdx) : [...current, optionIdx];
      } else {
        next = [optionIdx];
      }
      return { ...prev, [questionId]: { options: next } };
    });
  };

  const setTextAnswer = (questionId: string, text: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: { text } }));
  };

  const setRatingAnswer = (questionId: string, rating: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: { rating } }));
  };

  const validate = () => {
    for (const q of questions) {
      if (!q.is_required) continue;
      const a = answers[q.id];
      if (!a) return `"${q.question_text}" sorusu zorunludur.`;
      if (q.question_type === 'text' && !a.text?.trim()) return `"${q.question_text}" sorusu zorunludur.`;
      if ((q.question_type === 'single_choice' || q.question_type === 'multiple_choice') && (!a.options || a.options.length === 0))
        return `"${q.question_text}" sorusu zorunludur.`;
      if (q.question_type === 'rating' && a.rating == null) return `"${q.question_text}" sorusu zorunludur.`;
    }
    return null;
  };

  const handleSubmit = async () => {
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    const { data: responseData, error: responseError } = await supabase
      .from('survey_responses')
      .insert({
        survey_id: survey.id,
        member_id: survey.is_anonymous ? null : currentMember?.id || null,
      })
      .select('id')
      .single();

    if (responseError || !responseData) {
      setError('Yanıt kaydedilemedi. Lütfen tekrar deneyin.');
      setSubmitting(false);
      return;
    }

    const answerRows = questions
      .map(q => {
        const a = answers[q.id];
        if (!a) return null;
        return {
          response_id: responseData.id,
          question_id: q.id,
          answer_text: q.question_type === 'text' ? (a.text || null) : null,
          answer_options: (q.question_type === 'single_choice' || q.question_type === 'multiple_choice') ? (a.options || null) : null,
          answer_rating: q.question_type === 'rating' ? (a.rating || null) : null,
        };
      })
      .filter(Boolean);

    const { error: answersError } = await supabase.from('survey_answers').insert(answerRows);

    if (answersError) {
      setError('Yanıtlar kaydedilemedi. Lütfen tekrar deneyin.');
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
    onSubmitted?.();
  };

  const isActive = survey.is_active
    && (survey.starts_at == null || new Date(survey.starts_at) <= new Date())
    && (survey.ends_at == null || new Date(survey.ends_at) >= new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (submitted || alreadyAnswered) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {alreadyAnswered && !submitted ? 'Bu anketi zaten yanıtladınız' : 'Yanıtınız Alındı!'}
        </h3>
        <p className="text-gray-500 mb-6">Katılımınız için teşekkürler.</p>
        {onClose && (
          <button onClick={onClose} className="px-5 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors">
            Kapat
          </button>
        )}
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={32} className="text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Bu anket aktif değil</h3>
        <p className="text-gray-500 mb-6">Bu anket şu anda yanıt kabul etmiyor.</p>
        {onClose && (
          <button onClick={onClose} className="px-5 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors">
            Geri Dön
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{survey.title}</h2>
        {survey.description && (
          <p className="text-gray-600 text-sm leading-relaxed">{survey.description}</p>
        )}
        {survey.is_anonymous && (
          <div className="mt-3 flex items-center gap-2 text-xs text-teal-700 bg-teal-50 px-3 py-2 rounded-lg">
            <CheckCircle size={12} />
            Bu anket anonimdir — yanıtlarınız kimliğinizle ilişkilendirilmez.
          </div>
        )}
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={idx + 1}
            answer={answers[q.id]}
            onTextChange={text => setTextAnswer(q.id, text)}
            onOptionChange={(i, multi) => setOptionAnswer(q.id, i, multi)}
            onRatingChange={r => setRatingAnswer(q.id, r)}
          />
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pb-4">
        {onClose && (
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <ChevronRight size={18} />
          )}
          Gönder
        </button>
      </div>
    </div>
  );
}

interface QuestionCardProps {
  question: SurveyQuestion;
  index: number;
  answer?: { text?: string; options?: number[]; rating?: number };
  onTextChange: (text: string) => void;
  onOptionChange: (idx: number, multi: boolean) => void;
  onRatingChange: (rating: number) => void;
}

function QuestionCard({ question, index, answer, onTextChange, onOptionChange, onRatingChange }: QuestionCardProps) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="flex-shrink-0 w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center text-xs font-bold text-teal-700">
          {index}
        </span>
        <div>
          <p className="font-semibold text-gray-900">{question.question_text}</p>
          {question.is_required && <span className="text-xs text-red-500">* Zorunlu</span>}
        </div>
      </div>

      {question.question_type === 'single_choice' && (
        <div className="space-y-2 pl-10">
          {(question.options || []).map((opt, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                answer?.options?.includes(i) ? 'border-teal-500 bg-teal-500' : 'border-gray-300 group-hover:border-teal-400'
              }`}>
                {answer?.options?.includes(i) && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <span className="text-sm text-gray-700">{opt}</span>
              <input type="radio" className="sr-only" onChange={() => onOptionChange(i, false)} checked={answer?.options?.includes(i) || false} />
            </label>
          ))}
        </div>
      )}

      {question.question_type === 'multiple_choice' && (
        <div className="space-y-2 pl-10">
          <p className="text-xs text-gray-400 mb-2 flex items-center gap-1"><CheckSquare size={12} />Birden fazla seçebilirsiniz</p>
          {(question.options || []).map((opt, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                answer?.options?.includes(i) ? 'border-teal-500 bg-teal-500' : 'border-gray-300 group-hover:border-teal-400'
              }`}>
                {answer?.options?.includes(i) && (
                  <svg viewBox="0 0 12 12" className="w-3 h-3 text-white fill-current">
                    <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-700">{opt}</span>
              <input type="checkbox" className="sr-only" onChange={() => onOptionChange(i, true)} checked={answer?.options?.includes(i) || false} />
            </label>
          ))}
        </div>
      )}

      {question.question_type === 'text' && (
        <div className="pl-10">
          <textarea
            value={answer?.text || ''}
            onChange={e => onTextChange(e.target.value)}
            placeholder="Yanıtınızı yazın..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          />
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
            <MessageSquare size={11} />
            <span>Açık uçlu yanıt</span>
          </div>
        </div>
      )}

      {question.question_type === 'rating' && (
        <div className="pl-10">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => onRatingChange(star)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  size={28}
                  className={`transition-colors ${
                    star <= (hoverRating || answer?.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          {answer?.rating && (
            <p className="text-xs text-amber-600 mt-1">{answer.rating} / 5 puan</p>
          )}
        </div>
      )}
    </div>
  );
}

export function SurveyQRScanner({ currentMember }: { currentMember: Member | null }) {
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [manualId, setManualId] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('survey');
    if (sid) loadSurvey(sid);
  }, []);

  const loadSurvey = async (id: string) => {
    const { data } = await supabase.from('surveys').select('*').eq('id', id).eq('qr_enabled', true).maybeSingle();
    if (data) {
      setSurvey(data);
      setSurveyId(id);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
  };

  const handleManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualId.trim()) loadSurvey(manualId.trim());
  };

  if (survey && surveyId) {
    return <SurveyTake survey={survey} currentMember={currentMember} onClose={() => { setSurvey(null); setSurveyId(null); }} />;
  }

  return (
    <div className="max-w-md mx-auto space-y-4 py-8">
      <h2 className="text-xl font-bold text-gray-900 text-center">QR Anket Erişimi</h2>
      <p className="text-sm text-gray-500 text-center">QR kodu tarayın ya da anket ID'sini girin</p>
      <form onSubmit={handleManual} className="flex gap-2">
        <input
          type="text"
          value={manualId}
          onChange={e => setManualId(e.target.value)}
          placeholder="Anket ID..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
          Aç
        </button>
      </form>
      {notFound && <p className="text-sm text-red-500 text-center">Anket bulunamadı veya QR erişimi kapalı.</p>}
    </div>
  );
}

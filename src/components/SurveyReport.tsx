import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Calendar, BarChart2, Download, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Survey, SurveyQuestion, SurveyResponse } from '../types';

interface SurveyReportProps {
  survey: Survey;
  onBack: () => void;
}

interface QuestionStats {
  question: SurveyQuestion;
  total: number;
  textAnswers: string[];
  optionCounts: Record<string, number>;
  ratingSum: number;
  ratingCount: number;
}

export function SurveyReport({ survey, onBack }: SurveyReportProps) {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [survey.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: qData } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', survey.id)
        .order('display_order', { ascending: true });
      setQuestions(qData || []);

      const { data: rData } = await supabase
        .from('survey_responses')
        .select('*, members(full_name, email), survey_answers(*)')
        .eq('survey_id', survey.id)
        .order('submitted_at', { ascending: false });
      setResponses(rData || []);
    } finally {
      setLoading(false);
    }
  };

  const deleteResponse = async (id: string) => {
    if (!confirm('Bu yanıtı silmek istediğinizden emin misiniz?')) return;
    setDeletingId(id);
    try {
      await supabase.from('survey_answers').delete().eq('response_id', id);
      await supabase.from('survey_responses').delete().eq('id', id);
      setResponses(prev => prev.filter(r => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const buildStats = (): QuestionStats[] => {
    return questions.map(q => {
      const stat: QuestionStats = {
        question: q,
        total: 0,
        textAnswers: [],
        optionCounts: {},
        ratingSum: 0,
        ratingCount: 0,
      };

      if (q.options) {
        q.options.forEach(opt => { stat.optionCounts[opt] = 0; });
      }

      responses.forEach(r => {
        const ans = r.survey_answers?.find(a => a.question_id === q.id);
        if (!ans) return;
        stat.total++;
        if (q.question_type === 'text' || q.question_type === 'textarea' || q.question_type === 'date') {
          if (ans.answer_text) stat.textAnswers.push(ans.answer_text);
        } else if (q.question_type === 'radio' || q.question_type === 'select') {
          if (ans.answer_text) {
            stat.optionCounts[ans.answer_text] = (stat.optionCounts[ans.answer_text] || 0) + 1;
          }
        } else if (q.question_type === 'checkbox') {
          (ans.answer_options || []).forEach(opt => {
            stat.optionCounts[opt] = (stat.optionCounts[opt] || 0) + 1;
          });
        } else if (q.question_type === 'rating') {
          if (ans.answer_rating) {
            stat.ratingSum += ans.answer_rating;
            stat.ratingCount++;
          }
        }
      });

      return stat;
    });
  };

  const exportCSV = () => {
    const headers = ['Yanıtlayan', 'Tarih', ...questions.map(q => q.question_text)];
    const rows = responses.map(r => {
      const name = survey.is_anonymous
        ? 'Anonim'
        : (r.members?.full_name || r.respondent_name || 'Bilinmeyen');
      const date = new Date(r.submitted_at).toLocaleString('tr-TR');
      const answers = questions.map(q => {
        const ans = r.survey_answers?.find(a => a.question_id === q.id);
        if (!ans) return '';
        if (q.question_type === 'checkbox') return (ans.answer_options || []).join('; ');
        if (q.question_type === 'rating') return String(ans.answer_rating || '');
        return ans.answer_text || '';
      });
      return [name, date, ...answers];
    });

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${survey.title.replace(/[^a-zA-Z0-9]/g, '_')}_sonuclari.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  const stats = buildStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Geri</span>
        </button>
        <button
          onClick={exportCSV}
          disabled={responses.length === 0}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40"
        >
          <Download size={16} />
          CSV İndir
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-1">{survey.title}</h2>
        {survey.description && <p className="text-gray-500 text-sm mb-4">{survey.description}</p>}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <span className="flex items-center gap-1.5">
            <Users size={16} />
            <strong className="text-gray-800">{responses.length}</strong> yanıt
          </span>
          <span className="flex items-center gap-1.5">
            <BarChart2 size={16} />
            <strong className="text-gray-800">{questions.length}</strong> soru
          </span>
          {survey.ends_at && (
            <span className="flex items-center gap-1.5">
              <Calendar size={16} />
              {new Date(survey.ends_at).toLocaleDateString('tr-TR')} bitiş
            </span>
          )}
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Henüz yanıt bulunmuyor.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-5">
            {stats.map(stat => (
              <div key={stat.question.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">{stat.question.question_text}</h3>
                    <span className="text-xs text-gray-400 mt-0.5 block">
                      {stat.total} yanıt
                    </span>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {stat.question.question_type === 'text' ? 'Kısa Metin'
                      : stat.question.question_type === 'textarea' ? 'Uzun Metin'
                      : stat.question.question_type === 'radio' ? 'Tek Seçim'
                      : stat.question.question_type === 'checkbox' ? 'Çoklu Seçim'
                      : stat.question.question_type === 'select' ? 'Açılır Liste'
                      : stat.question.question_type === 'rating' ? 'Puan'
                      : 'Tarih'}
                  </span>
                </div>

                {(stat.question.question_type === 'radio' ||
                  stat.question.question_type === 'checkbox' ||
                  stat.question.question_type === 'select') && (
                  <div className="space-y-2">
                    {Object.entries(stat.optionCounts).map(([opt, count]) => {
                      const pct = stat.total > 0 ? Math.round((count / responses.length) * 100) : 0;
                      return (
                        <div key={opt}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-700">{opt}</span>
                            <span className="text-gray-500 font-medium">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {stat.question.question_type === 'rating' && (
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-red-600">
                      {stat.ratingCount > 0 ? (stat.ratingSum / stat.ratingCount).toFixed(1) : '-'}
                    </div>
                    <div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <div
                            key={star}
                            className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold ${
                              stat.ratingCount > 0 && star <= Math.round(stat.ratingSum / stat.ratingCount)
                                ? 'bg-amber-400 text-white'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {star}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">ortalama puan</p>
                    </div>
                  </div>
                )}

                {(stat.question.question_type === 'text' ||
                  stat.question.question_type === 'textarea' ||
                  stat.question.question_type === 'date') && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {stat.textAnswers.length === 0 ? (
                      <p className="text-gray-400 text-sm italic">Yanıt yok</p>
                    ) : (
                      stat.textAnswers.map((ans, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 border border-gray-100">
                          {ans}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Tüm Yanıtlar</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {responses.map(r => (
                <div key={r.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {survey.is_anonymous
                          ? 'Anonim'
                          : (r.members?.full_name || r.respondent_name || 'Bilinmeyen')}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(r.submitted_at).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteResponse(r.id)}
                      disabled={deletingId === r.id}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {questions.map(q => {
                      const ans = r.survey_answers?.find(a => a.question_id === q.id);
                      if (!ans) return null;
                      let displayValue = '';
                      if (q.question_type === 'checkbox') {
                        displayValue = (ans.answer_options || []).join(', ');
                      } else if (q.question_type === 'rating') {
                        displayValue = ans.answer_rating ? `${ans.answer_rating}/5` : '';
                      } else {
                        displayValue = ans.answer_text || '';
                      }
                      if (!displayValue) return null;
                      return (
                        <div key={q.id} className="text-xs">
                          <span className="text-gray-500">{q.question_text}: </span>
                          <span className="text-gray-800 font-medium">{displayValue}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

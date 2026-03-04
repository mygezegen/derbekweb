import { useEffect, useState } from 'react';
import { X, Download, BarChart2, Users, MessageSquare, Star, CheckSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Survey, SurveyQuestion, SurveyAnswer } from '../types';

interface SurveyResultsProps {
  survey: Survey;
  onClose: () => void;
}

interface QuestionResult {
  question: SurveyQuestion;
  totalAnswers: number;
  textAnswers: string[];
  optionCounts: Record<number, number>;
  ratingCounts: Record<number, number>;
  avgRating?: number;
}

export function SurveyResults({ survey, onClose }: SurveyResultsProps) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [totalResponses, setTotalResponses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedText, setExpandedText] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadResults();
  }, [survey.id]);

  const loadResults = async () => {
    setLoading(true);

    const [questionsRes, responsesRes] = await Promise.all([
      supabase.from('survey_questions').select('*').eq('survey_id', survey.id).order('display_order'),
      supabase.from('survey_responses').select('id').eq('survey_id', survey.id),
    ]);

    const qs: SurveyQuestion[] = (questionsRes.data || []).map((q: any) => ({
      ...q,
      options: q.options ? (Array.isArray(q.options) ? q.options : JSON.parse(q.options)) : [],
    }));
    const responseIds = (responsesRes.data || []).map((r: any) => r.id);

    setQuestions(qs);
    setTotalResponses(responseIds.length);

    if (responseIds.length === 0) {
      setResults(qs.map(q => ({ question: q, totalAnswers: 0, textAnswers: [], optionCounts: {}, ratingCounts: {} })));
      setLoading(false);
      return;
    }

    const { data: answersData } = await supabase
      .from('survey_answers')
      .select('*')
      .in('response_id', responseIds);

    const answers: SurveyAnswer[] = (answersData || []).map((a: any) => ({
      ...a,
      answer_options: a.answer_options ? (Array.isArray(a.answer_options) ? a.answer_options : JSON.parse(a.answer_options)) : undefined,
    }));

    const questionResults: QuestionResult[] = qs.map(q => {
      const qAnswers = answers.filter(a => a.question_id === q.id);
      const textAnswers: string[] = [];
      const optionCounts: Record<number, number> = {};
      const ratingCounts: Record<number, number> = {};

      for (const a of qAnswers) {
        if (q.question_type === 'text' && a.answer_text) {
          textAnswers.push(a.answer_text);
        } else if ((q.question_type === 'single_choice' || q.question_type === 'multiple_choice') && a.answer_options) {
          for (const idx of a.answer_options) {
            optionCounts[idx] = (optionCounts[idx] || 0) + 1;
          }
        } else if (q.question_type === 'rating' && a.answer_rating != null) {
          ratingCounts[a.answer_rating] = (ratingCounts[a.answer_rating] || 0) + 1;
        }
      }

      let avgRating: number | undefined;
      if (q.question_type === 'rating') {
        const total = Object.entries(ratingCounts).reduce((sum, [r, c]) => sum + Number(r) * c, 0);
        const count = Object.values(ratingCounts).reduce((s, c) => s + c, 0);
        if (count > 0) avgRating = total / count;
      }

      return { question: q, totalAnswers: qAnswers.length, textAnswers, optionCounts, ratingCounts, avgRating };
    });

    setResults(questionResults);
    setLoading(false);
  };

  const handleExportCSV = () => {
    const rows: string[][] = [['Soru', 'Soru Tipi', 'Seçenek / Değer', 'Sayı', 'Yüzde']];
    for (const r of results) {
      if (r.question.question_type === 'text') {
        for (const txt of r.textAnswers) {
          rows.push([r.question.question_text, 'Metin', txt, '', '']);
        }
      } else if (r.question.question_type === 'rating') {
        for (let i = 1; i <= 5; i++) {
          const cnt = r.ratingCounts[i] || 0;
          const pct = r.totalAnswers > 0 ? ((cnt / r.totalAnswers) * 100).toFixed(1) : '0';
          rows.push([r.question.question_text, 'Puan', String(i), String(cnt), `${pct}%`]);
        }
      } else {
        const opts = r.question.options || [];
        opts.forEach((opt, idx) => {
          const cnt = r.optionCounts[idx] || 0;
          const pct = r.totalAnswers > 0 ? ((cnt / r.totalAnswers) * 100).toFixed(1) : '0';
          rows.push([r.question.question_text, r.question.question_type === 'single_choice' ? 'Tek Seçim' : 'Çoklu Seçim', opt, String(cnt), `${pct}%`]);
        });
      }
    }
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `anket-sonuclari-${survey.title.replace(/\s+/g, '-')}.csv`;
    a.click();
  };

  const toggleText = (id: string) => {
    setExpandedText(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
              <BarChart2 size={18} className="text-teal-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Anket Sonuçları</h3>
              <p className="text-xs text-gray-500">{survey.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />
              CSV
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0 flex items-center gap-3 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users size={14} className="text-teal-500" />
            <span>Toplam Katılım: <strong className="text-gray-900">{totalResponses}</strong></span>
          </div>
          <div className="text-gray-300">|</div>
          <div className="text-sm text-gray-500">{questions.length} soru</div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : totalResponses === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BarChart2 size={48} className="mx-auto mb-3 opacity-30" />
              <p>Henüz yanıt yok</p>
            </div>
          ) : (
            results.map((r, idx) => (
              <div key={r.question.id} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-start gap-3 mb-4">
                  <span className="flex-shrink-0 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-500">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{r.question.question_text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <QuestionTypeIcon type={r.question.question_type} />
                      <span className="text-xs text-gray-400">{r.totalAnswers} yanıt</span>
                    </div>
                  </div>
                </div>

                {(r.question.question_type === 'single_choice' || r.question.question_type === 'multiple_choice') && (
                  <div className="space-y-2.5">
                    {(r.question.options || []).map((opt, i) => {
                      const count = r.optionCounts[i] || 0;
                      const pct = r.totalAnswers > 0 ? (count / r.totalAnswers) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-700">{opt}</span>
                            <span className="text-gray-500 font-medium">{count} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {r.question.question_type === 'rating' && (
                  <div className="space-y-2">
                    {r.avgRating != null && (
                      <div className="flex items-center gap-2 mb-3">
                        <Star size={16} className="text-amber-400 fill-amber-400" />
                        <span className="font-semibold text-gray-900">{r.avgRating.toFixed(1)}</span>
                        <span className="text-sm text-gray-500">ortalama</span>
                      </div>
                    )}
                    {[1, 2, 3, 4, 5].map(star => {
                      const count = r.ratingCounts[star] || 0;
                      const pct = r.totalAnswers > 0 ? (count / r.totalAnswers) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <div className="flex gap-0.5 w-24 flex-shrink-0">
                            {Array.from({ length: 5 }).map((_, si) => (
                              <Star
                                key={si}
                                size={12}
                                className={si < star ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
                              />
                            ))}
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-12 text-right">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {r.question.question_type === 'text' && (
                  <div>
                    {r.textAnswers.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Yanıt yok</p>
                    ) : (
                      <>
                        <div className="space-y-2">
                          {(expandedText.has(r.question.id) ? r.textAnswers : r.textAnswers.slice(0, 3)).map((txt, i) => (
                            <div key={i} className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                              {txt}
                            </div>
                          ))}
                        </div>
                        {r.textAnswers.length > 3 && (
                          <button
                            onClick={() => toggleText(r.question.id)}
                            className="mt-2 flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                          >
                            {expandedText.has(r.question.id) ? (
                              <><ChevronUp size={14} />Daha az göster</>
                            ) : (
                              <><ChevronDown size={14} />{r.textAnswers.length - 3} yanıt daha</>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'single_choice': return <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Tek Seçim</span>;
    case 'multiple_choice': return <span className="text-xs text-teal-500 bg-teal-50 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckSquare size={10} />Çoklu</span>;
    case 'text': return <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1"><MessageSquare size={10} />Metin</span>;
    case 'rating': return <span className="text-xs text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Star size={10} />Puan</span>;
    default: return null;
  }
}

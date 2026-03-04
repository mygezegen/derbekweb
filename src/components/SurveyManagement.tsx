import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, CreditCard as Edit2, BarChart2, QrCode, ChevronDown, ChevronUp, Star, CheckSquare, MessageSquare, GripVertical, X, Check, ToggleRight, ToggleLeft, Eye, Copy, ClipboardCheck, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Member, Survey, SurveyQuestion, SurveyQuestionType } from '../types';
import { SurveyResults } from './SurveyResults';
import { SurveyTake } from './SurveyTake';
import { drawQRCode } from '../lib/qrCode';

interface SurveyManagementProps {
  currentMember: Member;
}

interface SurveyWithCount extends Survey {
  response_count: number;
}

const QUESTION_TYPES: { value: SurveyQuestionType; label: string; icon: typeof Star }[] = [
  { value: 'single_choice', label: 'Tek Seçim', icon: Circle },
  { value: 'multiple_choice', label: 'Çoklu Seçim', icon: CheckSquare },
  { value: 'text', label: 'Metin Yanıtı', icon: MessageSquare },
  { value: 'rating', label: 'Puan (1-5)', icon: Star },
];

export function SurveyManagement({ currentMember }: SurveyManagementProps) {
  const [surveys, setSurveys] = useState<SurveyWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [viewResults, setViewResults] = useState<Survey | null>(null);
  const [previewSurvey, setPreviewSurvey] = useState<Survey | null>(null);
  const [showQRFor, setShowQRFor] = useState<Survey | null>(null);
  const [expandedSurvey, setExpandedSurvey] = useState<string | null>(null);
  const [surveyQuestions, setSurveyQuestions] = useState<Record<string, SurveyQuestion[]>>({});
  const [copied, setCopied] = useState('');

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });

    if (!data) { setLoading(false); return; }

    const ids = data.map((s: any) => s.id);
    const { data: responseCounts } = await supabase
      .from('survey_responses')
      .select('survey_id')
      .in('survey_id', ids);

    const countMap: Record<string, number> = {};
    for (const r of responseCounts || []) {
      countMap[r.survey_id] = (countMap[r.survey_id] || 0) + 1;
    }

    setSurveys(data.map((s: any) => ({ ...s, response_count: countMap[s.id] || 0 })));
    setLoading(false);
  };

  const toggleExpand = async (surveyId: string) => {
    if (expandedSurvey === surveyId) {
      setExpandedSurvey(null);
      return;
    }
    setExpandedSurvey(surveyId);
    if (!surveyQuestions[surveyId]) {
      const { data } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('display_order');
      setSurveyQuestions(prev => ({
        ...prev,
        [surveyId]: (data || []).map((q: any) => ({
          ...q,
          options: q.options ? (Array.isArray(q.options) ? q.options : JSON.parse(q.options)) : [],
        })),
      }));
    }
  };

  const toggleActive = async (survey: SurveyWithCount) => {
    await supabase.from('surveys').update({ is_active: !survey.is_active }).eq('id', survey.id);
    loadSurveys();
  };

  const deleteSurvey = async (id: string) => {
    if (!confirm('Bu anketi ve tüm yanıtları silmek istediğinizden emin misiniz?')) return;
    await supabase.from('surveys').delete().eq('id', id);
    loadSurveys();
  };

  const copyLink = (surveyId: string) => {
    const url = `${window.location.origin}/app?survey=${surveyId}`;
    navigator.clipboard.writeText(url);
    setCopied(surveyId);
    setTimeout(() => setCopied(''), 2000);
  };

  if (viewResults) return <SurveyResults survey={viewResults} onClose={() => { setViewResults(null); loadSurveys(); }} />;
  if (previewSurvey) return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white rounded-t-2xl">
          <h3 className="font-bold text-gray-900">Önizleme</h3>
          <button onClick={() => setPreviewSurvey(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6">
          <SurveyTake survey={previewSurvey} currentMember={null} onClose={() => setPreviewSurvey(null)} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Anketler</h2>
          <p className="text-sm text-gray-500 mt-0.5">Üyelere anket oluşturun ve yanıtları görüntüleyin</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Yeni Anket
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : surveys.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-4">
            <BarChart2 size={32} className="text-teal-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz anket yok</h3>
          <p className="text-sm text-gray-500 mb-6">İlk anketinizi oluşturun</p>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700">
            <Plus size={16} />Yeni Anket
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {surveys.map(survey => (
            <div key={survey.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-4 p-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 truncate">{survey.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${survey.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {survey.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                    {survey.is_anonymous && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">Anonim</span>}
                    {survey.qr_enabled && <span className="px-2 py-0.5 rounded-full text-xs bg-teal-50 text-teal-600 flex items-center gap-1"><QrCode size={10} />QR</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{survey.response_count} yanıt</span>
                    <span>·</span>
                    <span>{new Date(survey.created_at).toLocaleDateString('tr-TR')}</span>
                    {survey.ends_at && <span>· Bitiş: {new Date(survey.ends_at).toLocaleDateString('tr-TR')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(survey)} title={survey.is_active ? 'Pasif yap' : 'Aktif yap'} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    {survey.is_active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                  </button>
                  {survey.qr_enabled && (
                    <button onClick={() => setShowQRFor(survey)} title="QR Kod" className="p-2 text-gray-400 hover:text-teal-600 transition-colors">
                      <QrCode size={18} />
                    </button>
                  )}
                  <button onClick={() => copyLink(survey.id)} title="Bağlantıyı kopyala" className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                    {copied === survey.id ? <ClipboardCheck size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                  <button onClick={() => setPreviewSurvey(survey)} title="Önizle" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Eye size={18} />
                  </button>
                  <button onClick={() => setViewResults(survey)} title="Sonuçlar" className="p-2 text-gray-400 hover:text-teal-600 transition-colors">
                    <BarChart2 size={18} />
                  </button>
                  <button onClick={() => { setEditingSurvey(survey); setShowCreate(true); }} title="Düzenle" className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => deleteSurvey(survey.id)} title="Sil" className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                  <button onClick={() => toggleExpand(survey.id)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    {expandedSurvey === survey.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {expandedSurvey === survey.id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">Sorular</h4>
                  </div>
                  {!surveyQuestions[survey.id] ? (
                    <div className="text-sm text-gray-400">Yükleniyor...</div>
                  ) : surveyQuestions[survey.id].length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Soru eklenmemiş</p>
                  ) : (
                    <div className="space-y-2">
                      {surveyQuestions[survey.id].map((q, i) => (
                        <div key={q.id} className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
                          <span className="text-xs font-semibold text-gray-400 mt-0.5 flex-shrink-0">{i + 1}.</span>
                          <div className="flex-1">
                            <p className="text-sm text-gray-800">{q.question_text}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <QuestionTypeBadge type={q.question_type} />
                              {q.is_required && <span className="text-xs text-red-400">Zorunlu</span>}
                              {q.options && q.options.length > 0 && (
                                <span className="text-xs text-gray-400">{q.options.length} seçenek</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <SurveyForm
          currentMember={currentMember}
          editingSurvey={editingSurvey}
          onClose={() => { setShowCreate(false); setEditingSurvey(null); }}
          onSaved={() => { setShowCreate(false); setEditingSurvey(null); loadSurveys(); }}
        />
      )}

      {showQRFor && (
        <SurveyQRModal survey={showQRFor} onClose={() => setShowQRFor(null)} />
      )}
    </div>
  );
}

function QuestionTypeBadge({ type }: { type: SurveyQuestionType }) {
  const map: Record<SurveyQuestionType, { label: string; color: string }> = {
    single_choice: { label: 'Tek Seçim', color: 'bg-blue-50 text-blue-600' },
    multiple_choice: { label: 'Çoklu Seçim', color: 'bg-teal-50 text-teal-600' },
    text: { label: 'Metin', color: 'bg-gray-100 text-gray-600' },
    rating: { label: 'Puan', color: 'bg-amber-50 text-amber-600' },
  };
  const m = map[type];
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.color}`}>{m.label}</span>;
}

interface SurveyFormProps {
  currentMember: Member;
  editingSurvey: Survey | null;
  onClose: () => void;
  onSaved: () => void;
}

interface DraftQuestion {
  id?: string;
  question_text: string;
  question_type: SurveyQuestionType;
  options: string[];
  is_required: boolean;
  display_order: number;
  _key: string;
}

function SurveyForm({ currentMember, editingSurvey, onClose, onSaved }: SurveyFormProps) {
  const [title, setTitle] = useState(editingSurvey?.title || '');
  const [description, setDescription] = useState(editingSurvey?.description || '');
  const [isAnonymous, setIsAnonymous] = useState(editingSurvey?.is_anonymous ?? false);
  const [qrEnabled, setQrEnabled] = useState(editingSurvey?.qr_enabled ?? false);
  const [showResults, setShowResults] = useState(editingSurvey?.show_results_to_members ?? false);
  const [startsAt, setStartsAt] = useState(editingSurvey?.starts_at ? editingSurvey.starts_at.slice(0, 16) : '');
  const [endsAt, setEndsAt] = useState(editingSurvey?.ends_at ? editingSurvey.ends_at.slice(0, 16) : '');
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingQuestions, setLoadingQuestions] = useState(!!editingSurvey);

  useEffect(() => {
    if (editingSurvey) {
      supabase.from('survey_questions').select('*').eq('survey_id', editingSurvey.id).order('display_order').then(({ data }) => {
        setQuestions((data || []).map((q: any, i: number) => ({
          ...q,
          options: q.options ? (Array.isArray(q.options) ? q.options : JSON.parse(q.options)) : [],
          _key: q.id || String(i),
        })));
        setLoadingQuestions(false);
      });
    }
  }, []);

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      { question_text: '', question_type: 'single_choice', options: ['', ''], is_required: true, display_order: prev.length, _key: Date.now().toString() },
    ]);
  };

  const updateQuestion = (key: string, field: keyof DraftQuestion, value: unknown) => {
    setQuestions(prev => prev.map(q => q._key === key ? { ...q, [field]: value } : q));
  };

  const addOption = (key: string) => {
    setQuestions(prev => prev.map(q => q._key === key ? { ...q, options: [...q.options, ''] } : q));
  };

  const updateOption = (key: string, idx: number, val: string) => {
    setQuestions(prev => prev.map(q => {
      if (q._key !== key) return q;
      const opts = [...q.options];
      opts[idx] = val;
      return { ...q, options: opts };
    }));
  };

  const removeOption = (key: string, idx: number) => {
    setQuestions(prev => prev.map(q => q._key === key ? { ...q, options: q.options.filter((_, i) => i !== idx) } : q));
  };

  const removeQuestion = (key: string) => {
    setQuestions(prev => prev.filter(q => q._key !== key));
  };

  const handleSave = async () => {
    setError('');
    if (!title.trim()) { setError('Anket başlığı zorunludur.'); return; }
    for (const q of questions) {
      if (!q.question_text.trim()) { setError('Tüm sorular doldurulmalıdır.'); return; }
      if ((q.question_type === 'single_choice' || q.question_type === 'multiple_choice') && q.options.some(o => !o.trim())) {
        setError('Seçenekler boş bırakılamaz.'); return;
      }
    }

    setSaving(true);

    let surveyId = editingSurvey?.id;

    if (editingSurvey) {
      await supabase.from('surveys').update({
        title, description: description || null,
        is_anonymous: isAnonymous, qr_enabled: qrEnabled,
        show_results_to_members: showResults,
        starts_at: startsAt || null, ends_at: endsAt || null,
      }).eq('id', surveyId!);

      await supabase.from('survey_questions').delete().eq('survey_id', surveyId!);
    } else {
      const { data, error: createError } = await supabase.from('surveys').insert({
        title, description: description || null,
        created_by: currentMember.id,
        is_active: true,
        is_anonymous: isAnonymous, qr_enabled: qrEnabled,
        show_results_to_members: showResults,
        starts_at: startsAt || null, ends_at: endsAt || null,
      }).select('id').single();

      if (createError || !data) { setError('Anket oluşturulamadı.'); setSaving(false); return; }
      surveyId = data.id;
    }

    if (questions.length > 0) {
      const qRows = questions.map((q, i) => ({
        survey_id: surveyId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: (q.question_type === 'single_choice' || q.question_type === 'multiple_choice') ? q.options.filter(Boolean) : null,
        is_required: q.is_required,
        display_order: i,
      }));
      await supabase.from('survey_questions').insert(qRows);
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900">{editingSurvey ? 'Anketi Düzenle' : 'Yeni Anket'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Başlık *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Anket başlığı..."
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Açıklama</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Opsiyonel açıklama..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Başlangıç Tarihi</label>
                <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bitiş Tarihi</label>
                <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <ToggleOption label="Anonim Anket" value={isAnonymous} onChange={setIsAnonymous} description="Yanıtlar kimliğe bağlanmaz" />
              <ToggleOption label="QR Erişimi" value={qrEnabled} onChange={setQrEnabled} description="QR kod ile ankete erişim" />
              <ToggleOption label="Sonuçları Göster" value={showResults} onChange={setShowResults} description="Üyeler sonuçları görebilir" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800">Sorular</h4>
              <button
                onClick={addQuestion}
                className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                <Plus size={16} />Soru Ekle
              </button>
            </div>

            {loadingQuestions ? (
              <div className="text-sm text-gray-400 text-center py-4">Yükleniyor...</div>
            ) : questions.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-sm text-gray-400">Henüz soru eklenmedi</p>
                <button onClick={addQuestion} className="mt-2 text-sm text-teal-600 font-medium hover:text-teal-700">+ Soru Ekle</button>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <QuestionEditor
                    key={q._key}
                    question={q}
                    index={idx + 1}
                    onChange={(field, value) => updateQuestion(q._key, field, value)}
                    onAddOption={() => addOption(q._key)}
                    onUpdateOption={(i, v) => updateOption(q._key, i, v)}
                    onRemoveOption={i => removeOption(q._key, i)}
                    onRemove={() => removeQuestion(q._key)}
                  />
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium">
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
            {editingSurvey ? 'Güncelle' : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleOption({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative mt-0.5 w-10 h-5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-teal-500' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </label>
  );
}

interface QuestionEditorProps {
  question: DraftQuestion;
  index: number;
  onChange: (field: keyof DraftQuestion, value: unknown) => void;
  onAddOption: () => void;
  onUpdateOption: (idx: number, val: string) => void;
  onRemoveOption: (idx: number) => void;
  onRemove: () => void;
}

function QuestionEditor({ question, index, onChange, onAddOption, onUpdateOption, onRemoveOption, onRemove }: QuestionEditorProps) {
  const needsOptions = question.question_type === 'single_choice' || question.question_type === 'multiple_choice';

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1 text-gray-300 cursor-grab">
          <GripVertical size={16} />
        </div>
        <span className="flex-shrink-0 text-xs font-semibold text-gray-400 mt-2">{index}.</span>
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={question.question_text}
            onChange={e => onChange('question_text', e.target.value)}
            placeholder="Soru metni..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={question.question_type}
              onChange={e => onChange('question_type', e.target.value as SurveyQuestionType)}
              className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500"
            >
              {QUESTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={question.is_required}
                onChange={e => onChange('is_required', e.target.checked)}
                className="rounded"
              />
              Zorunlu
            </label>
          </div>
        </div>
        <button onClick={onRemove} className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors mt-1">
          <X size={16} />
        </button>
      </div>

      {needsOptions && (
        <div className="pl-8 space-y-2">
          {question.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex-shrink-0 w-4 h-4 border-2 border-gray-300 ${question.question_type === 'single_choice' ? 'rounded-full' : 'rounded'}`} />
              <input
                type="text"
                value={opt}
                onChange={e => onUpdateOption(i, e.target.value)}
                placeholder={`Seçenek ${i + 1}`}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:border-transparent"
              />
              {question.options.length > 2 && (
                <button onClick={() => onRemoveOption(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={onAddOption}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
          >
            <Plus size={12} />Seçenek Ekle
          </button>
        </div>
      )}

      {question.question_type === 'rating' && (
        <div className="pl-8 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(s => <Star key={s} size={20} className="text-amber-300 fill-amber-300" />)}
          <span className="text-xs text-gray-400 ml-2">1–5 puan</span>
        </div>
      )}

      {question.question_type === 'text' && (
        <div className="pl-8">
          <div className="px-3 py-2 bg-white border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 italic">Açık metin yanıtı...</div>
        </div>
      )}
    </div>
  );
}

function SurveyQRModal({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const qrData = `${window.location.origin}/app?survey=${survey.id}`;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrLoading, setQrLoading] = useState(true);

  useEffect(() => {
    if (canvasRef.current) {
      drawQRCode(canvasRef.current, qrData).then(() => setQrLoading(false));
    }
  }, [qrData]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/png');
    a.download = `anket-qr-${survey.title.replace(/\s+/g, '-')}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Anket QR Kodu</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          <p className="text-sm font-medium text-gray-700 text-center">{survey.title}</p>
          <div className="relative">
            {qrLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white rounded-xl z-10">
                <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="p-3 border-2 border-gray-100 rounded-xl bg-white shadow-sm">
              <canvas ref={canvasRef} className="rounded-lg" />
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center break-all">{qrData}</p>
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors text-sm"
          >
            <Download size={16} />
            QR Kodu İndir
          </button>
        </div>
      </div>
    </div>
  );
}

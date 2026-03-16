import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Survey, SurveyQuestion, SurveyQuestionType } from '../types';

interface SurveyFormQuestion {
  id: string;
  question_text: string;
  question_type: SurveyQuestionType;
  options: string[];
  is_required: boolean;
  display_order: number;
}

interface SurveyFormProps {
  initialSurvey?: Survey & { survey_questions?: SurveyQuestion[] };
  onSubmit: (data: {
    title: string;
    description: string;
    is_anonymous: boolean;
    allow_multiple_responses: boolean;
    show_results_to_members: boolean;
    qr_enabled: boolean;
    ends_at: string;
    questions: SurveyFormQuestion[];
  }) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  text: 'Kısa Metin',
  textarea: 'Uzun Metin',
  radio: 'Tek Seçim',
  checkbox: 'Çoklu Seçim',
  select: 'Açılır Liste',
  rating: 'Puan (1-5)',
  date: 'Tarih',
};

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function SurveyForm({ initialSurvey, onSubmit, onCancel, loading }: SurveyFormProps) {
  const [title, setTitle] = useState(initialSurvey?.title || '');
  const [description, setDescription] = useState(initialSurvey?.description || '');
  const [isAnonymous, setIsAnonymous] = useState(initialSurvey?.is_anonymous ?? false);
  const [allowMultiple, setAllowMultiple] = useState(initialSurvey?.allow_multiple_responses ?? false);
  const [showResults, setShowResults] = useState(initialSurvey?.show_results_to_members ?? false);
  const [qrEnabled, setQrEnabled] = useState(initialSurvey?.qr_enabled ?? true);
  const [endsAt, setEndsAt] = useState(
    initialSurvey?.ends_at ? initialSurvey.ends_at.slice(0, 16) : ''
  );
  const [questions, setQuestions] = useState<SurveyFormQuestion[]>(
    (initialSurvey?.survey_questions || [])
      .sort((a, b) => a.display_order - b.display_order)
      .map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options || [],
        is_required: q.is_required,
        display_order: q.display_order,
      }))
  );

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        id: generateId(),
        question_text: '',
        question_type: 'text',
        options: [],
        is_required: false,
        display_order: prev.length,
      },
    ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id).map((q, i) => ({ ...q, display_order: i })));
  };

  const updateQuestion = (id: string, updates: Partial<SurveyFormQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const moveQuestion = (id: string, direction: 'up' | 'down') => {
    setQuestions(prev => {
      const idx = prev.findIndex(q => q.id === id);
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next.map((q, i) => ({ ...q, display_order: i }));
    });
  };

  const addOption = (questionId: string) => {
    updateQuestion(questionId, {
      options: [...(questions.find(q => q.id === questionId)?.options || []), ''],
    });
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const q = questions.find(q => q.id === questionId);
    if (!q) return;
    const newOptions = [...q.options];
    newOptions[optionIndex] = value;
    updateQuestion(questionId, { options: newOptions });
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    const q = questions.find(q => q.id === questionId);
    if (!q) return;
    updateQuestion(questionId, { options: q.options.filter((_, i) => i !== optionIndex) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title,
      description,
      is_anonymous: isAnonymous,
      allow_multiple_responses: allowMultiple,
      show_results_to_members: showResults,
      qr_enabled: qrEnabled,
      ends_at: endsAt,
      questions,
    });
  };

  const needsOptions = (type: SurveyQuestionType) =>
    type === 'radio' || type === 'checkbox' || type === 'select';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Anket Bilgileri</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anket Başlığı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="Anket başlığını girin..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Anket hakkında kısa bir açıklama..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi (Opsiyonel)</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={e => setEndsAt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Anonim Yanıtlar</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={e => setAllowMultiple(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Birden Fazla Yanıt</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showResults}
                onChange={e => setShowResults(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Üyelere Sonuç Göster</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={qrEnabled}
                onChange={e => setQrEnabled(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">QR Kod Etkin</span>
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Sorular</h3>
          <button
            type="button"
            onClick={addQuestion}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Plus size={16} />
            Soru Ekle
          </button>
        </div>

        {questions.length === 0 && (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
            <p className="text-gray-500 text-sm">Henüz soru eklenmedi. "Soru Ekle" butonuna tıklayın.</p>
          </div>
        )}

        {questions.map((question, index) => (
          <div key={question.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-1 text-gray-400">
                <GripVertical size={16} />
                <span className="text-xs font-medium text-gray-500">{index + 1}</span>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="text"
                    value={question.question_text}
                    onChange={e => updateQuestion(question.id, { question_text: e.target.value })}
                    placeholder="Soru metnini girin..."
                    required
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <select
                    value={question.question_type}
                    onChange={e => updateQuestion(question.id, {
                      question_type: e.target.value as SurveyQuestionType,
                      options: needsOptions(e.target.value as SurveyQuestionType) ? question.options : [],
                    })}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                  >
                    {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {needsOptions(question.question_type) && (
                  <div className="space-y-2 pl-2 border-l-2 border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Seçenekler</p>
                    {question.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={e => updateOption(question.id, oi, e.target.value)}
                          placeholder={`Seçenek ${oi + 1}`}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(question.id, oi)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(question.id)}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      <Plus size={14} />
                      Seçenek Ekle
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={question.is_required}
                      onChange={e => updateQuestion(question.id, { is_required: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded"
                    />
                    <span className="text-xs text-gray-600">Zorunlu</span>
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => moveQuestion(question.id, 'up')}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveQuestion(question.id, 'down')}
                  disabled={index === questions.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => removeQuestion(question.id)}
                  className="p-1 text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Vazgeç
        </button>
        <button
          type="submit"
          disabled={loading || questions.length === 0}
          className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Kaydediliyor...' : initialSurvey ? 'Güncelle' : 'Anketi Kaydet'}
        </button>
      </div>
    </form>
  );
}

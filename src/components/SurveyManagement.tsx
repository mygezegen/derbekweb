import { useState, useEffect, useCallback } from 'react';
import { Plus, CreditCard as Edit2, Trash2, BarChart2, QrCode, Eye, EyeOff, CheckCircle, Clock, Archive, Download, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Survey, Member } from '../types';
import { SurveyForm } from './SurveyForm';
import { SurveyReport } from './SurveyReport';
import { drawQRCode, getQRCodeDataURL } from '../lib/qrCode';

interface SurveyManagementProps {
  currentMember: Member;
  isAdmin: boolean;
}

type View = 'list' | 'create' | 'edit' | 'report' | 'qr';

const STATUS_CONFIG = {
  draft: { label: 'Taslak', color: 'bg-gray-100 text-gray-600', icon: Clock },
  published: { label: 'Yayında', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  closed: { label: 'Kapatıldı', color: 'bg-amber-100 text-amber-700', icon: Archive },
};

export function SurveyManagement({ currentMember, isAdmin }: SurveyManagementProps) {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [view, setView] = useState<View>('list');
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [error, setError] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const qrCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas && qrUrl) {
      drawQRCode(canvas, qrUrl);
    }
  }, [qrUrl]);

  const loadSurveys = useCallback(async () => {
    setLoading(true);
    try {
      const query = supabase
        .from('surveys')
        .select('*, survey_questions(*), members(full_name)')
        .order('created_at', { ascending: false });

      const { data } = await query;
      setSurveys(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  const handleCreate = async (formData: {
    title: string;
    description: string;
    is_anonymous: boolean;
    allow_multiple_responses: boolean;
    show_results_to_members: boolean;
    qr_enabled: boolean;
    ends_at: string;
    questions: Array<{
      id: string;
      question_text: string;
      question_type: string;
      options: string[];
      is_required: boolean;
      display_order: number;
    }>;
  }) => {
    setFormLoading(true);
    setError('');
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .insert({
          title: formData.title,
          description: formData.description || null,
          is_anonymous: formData.is_anonymous,
          allow_multiple_responses: formData.allow_multiple_responses,
          show_results_to_members: formData.show_results_to_members,
          qr_enabled: formData.qr_enabled,
          ends_at: formData.ends_at || null,
          created_by: currentMember.id,
          status: 'draft',
        })
        .select()
        .single();

      if (surveyError) throw surveyError;

      if (formData.questions.length > 0) {
        const { error: qError } = await supabase.from('survey_questions').insert(
          formData.questions.map(q => ({
            survey_id: surveyData.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options.length > 0 ? q.options : null,
            is_required: q.is_required,
            display_order: q.display_order,
          }))
        );
        if (qError) throw qError;
      }

      await loadSurveys();
      setView('list');
    } catch (err: unknown) {
      const errObj = err as { message?: string; code?: string; details?: string; hint?: string };
      const detail = [errObj.message, errObj.details, errObj.hint].filter(Boolean).join(' | ');
      setError(detail || 'Anket kaydedilirken hata oluştu');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (formData: {
    title: string;
    description: string;
    is_anonymous: boolean;
    allow_multiple_responses: boolean;
    show_results_to_members: boolean;
    qr_enabled: boolean;
    ends_at: string;
    questions: Array<{
      id: string;
      question_text: string;
      question_type: string;
      options: string[];
      is_required: boolean;
      display_order: number;
    }>;
  }) => {
    if (!selectedSurvey) return;
    setFormLoading(true);
    setError('');
    try {
      const { error: surveyError } = await supabase
        .from('surveys')
        .update({
          title: formData.title,
          description: formData.description || null,
          is_anonymous: formData.is_anonymous,
          allow_multiple_responses: formData.allow_multiple_responses,
          show_results_to_members: formData.show_results_to_members,
          qr_enabled: formData.qr_enabled,
          ends_at: formData.ends_at || null,
        })
        .eq('id', selectedSurvey.id);

      if (surveyError) throw surveyError;

      await supabase.from('survey_questions').delete().eq('survey_id', selectedSurvey.id);

      if (formData.questions.length > 0) {
        const { error: qError } = await supabase.from('survey_questions').insert(
          formData.questions.map(q => ({
            survey_id: selectedSurvey.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options.length > 0 ? q.options : null,
            is_required: q.is_required,
            display_order: q.display_order,
          }))
        );
        if (qError) throw qError;
      }

      await loadSurveys();
      setView('list');
      setSelectedSurvey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata oluştu');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu anketi silmek istediğinizden emin misiniz? Tüm yanıtlar da silinecektir.')) return;
    try {
      await supabase.from('surveys').delete().eq('id', id);
      setSurveys(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi');
    }
  };

  const handleStatusChange = async (survey: Survey, newStatus: 'draft' | 'published' | 'closed') => {
    try {
      await supabase.from('surveys').update({ status: newStatus }).eq('id', survey.id);
      setSurveys(prev => prev.map(s => s.id === survey.id ? { ...s, status: newStatus } : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Durum güncellenemedi');
    }
  };

  const openQR = (survey: Survey) => {
    const url = `${window.location.origin}/survey/${survey.id}`;
    setQrUrl(url);
    setSelectedSurvey(survey);
    setView('qr');
  };

  if (view === 'create') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Yeni Anket Oluştur</h2>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}
        <SurveyForm
          onSubmit={handleCreate}
          onCancel={() => { setView('list'); setError(''); }}
          loading={formLoading}
        />
      </div>
    );
  }

  if (view === 'edit' && selectedSurvey) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Anketi Düzenle</h2>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}
        <SurveyForm
          initialSurvey={selectedSurvey}
          onSubmit={handleEdit}
          onCancel={() => { setView('list'); setSelectedSurvey(null); setError(''); }}
          loading={formLoading}
        />
      </div>
    );
  }

  if (view === 'report' && selectedSurvey) {
    return (
      <SurveyReport
        survey={selectedSurvey}
        onBack={() => { setView('list'); setSelectedSurvey(null); }}
      />
    );
  }

  if (view === 'qr' && selectedSurvey) {
    const handleDownloadQR = async () => {
      const dataUrl = await getQRCodeDataURL(qrUrl);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `anket-qr-${selectedSurvey.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      a.click();
    };

    return (
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{selectedSurvey.title}</h2>
              <p className="text-sm text-gray-500 mt-1">QR Kod ile Paylaş</p>
            </div>
            <button
              onClick={() => { setView('list'); setSelectedSurvey(null); }}
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              Geri
            </button>
          </div>

          <div className="flex flex-col items-center gap-5">
            <div className="p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
              <canvas ref={qrCanvasRef} className="rounded-lg" />
            </div>

            <div className="w-full space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Anket Bağlantısı:</p>
                <a href={qrUrl} target="_blank" rel="noreferrer" className="text-sm text-red-600 hover:underline break-all flex items-start gap-1">
                  <ExternalLink size={14} className="mt-0.5 flex-shrink-0" />
                  {qrUrl}
                </a>
              </div>

              <button
                onClick={handleDownloadQR}
                className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
              >
                <Download size={16} />
                QR Kodu İndir
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Anketler</h2>
          <p className="text-sm text-gray-500 mt-1">Üyelere yönelik anketler oluşturun ve raporlayın</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setView('create')}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Yeni Anket
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="text-gray-400">Yükleniyor...</div>
        </div>
      ) : surveys.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
          <BarChart2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Henüz anket oluşturulmadı</p>
          {isAdmin && (
            <button
              onClick={() => setView('create')}
              className="mt-4 inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <Plus size={16} />
              İlk Anketi Oluştur
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {surveys
            .filter(s => isAdmin || s.status === 'published')
            .map(survey => {
              const statusConf = STATUS_CONFIG[survey.status] || STATUS_CONFIG.draft;
              const StatusIcon = statusConf.icon;
              const questionCount = survey.survey_questions?.length || 0;
              const isExpired = survey.ends_at && new Date(survey.ends_at) < new Date();

              return (
                <div key={survey.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-800 truncate">{survey.title}</h3>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusConf.color}`}>
                          <StatusIcon size={11} />
                          {statusConf.label}
                        </span>
                        {isExpired && (
                          <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">Süresi Doldu</span>
                        )}
                      </div>
                      {survey.description && (
                        <p className="text-sm text-gray-500 mb-2 line-clamp-1">{survey.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{questionCount} soru</span>
                        {survey.is_anonymous && <span>Anonim</span>}
                        {survey.ends_at && (
                          <span>Bitiş: {new Date(survey.ends_at).toLocaleDateString('tr-TR')}</span>
                        )}
                        <span>{new Date(survey.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isAdmin && (
                        <>
                          {survey.status === 'draft' && (
                            <button
                              onClick={() => handleStatusChange(survey, 'published')}
                              title="Yayınla"
                              className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors font-medium"
                            >
                              <Eye size={14} />
                              Yayınla
                            </button>
                          )}
                          {survey.status === 'published' && (
                            <button
                              onClick={() => handleStatusChange(survey, 'closed')}
                              title="Kapat"
                              className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors font-medium"
                            >
                              <EyeOff size={14} />
                              Kapat
                            </button>
                          )}
                          {survey.status === 'closed' && (
                            <button
                              onClick={() => handleStatusChange(survey, 'published')}
                              title="Tekrar Yayınla"
                              className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors font-medium"
                            >
                              <Eye size={14} />
                              Yayınla
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedSurvey(survey);
                              setView('report');
                            }}
                            title="Raporlar"
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <BarChart2 size={18} />
                          </button>

                          {survey.qr_enabled && (
                            <button
                              onClick={() => openQR(survey)}
                              title="QR Kod"
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <QrCode size={18} />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedSurvey(survey);
                              setView('edit');
                            }}
                            title="Düzenle"
                            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>

                          <button
                            onClick={() => handleDelete(survey.id)}
                            title="Sil"
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}

                      {!isAdmin && survey.status === 'published' && (
                        <a
                          href={`/survey/${survey.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-sm bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                        >
                          Ankete Katıl
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

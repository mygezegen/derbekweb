import { useEffect, useState } from 'react';
import { BarChart2, CheckCircle, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Member, Survey } from '../types';
import { SurveyManagement } from './SurveyManagement';
import { SurveyTake } from './SurveyTake';
import { SurveyResults } from './SurveyResults';

interface SurveysProps {
  currentMember: Member;
  isAdmin: boolean;
}

interface SurveyCard extends Survey {
  response_count: number;
  user_responded: boolean;
}

export function Surveys({ currentMember, isAdmin }: SurveysProps) {
  const [surveys, setSurveys] = useState<SurveyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingSurvey, setTakingSurvey] = useState<Survey | null>(null);
  const [viewingResults, setViewingResults] = useState<Survey | null>(null);
  const [qrSurveyId, setQrSurveyId] = useState<string | null>(null);
  const [qrSurvey, setQrSurvey] = useState<Survey | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('survey');
    if (sid) handleQRSurvey(sid);
    else loadSurveys();
  }, []);

  const handleQRSurvey = async (id: string) => {
    const { data } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', id)
      .eq('qr_enabled', true)
      .maybeSingle();
    if (data) {
      setQrSurveyId(id);
      setQrSurvey(data);
    }
    loadSurveys();
  };

  const loadSurveys = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });

    if (!data) { setLoading(false); return; }

    const now = new Date();
    const activeSurveys = data.filter((s: any) => {
      if (!isAdmin && !s.is_active) return false;
      if (!isAdmin && s.starts_at && new Date(s.starts_at) > now) return false;
      if (!isAdmin && s.ends_at && new Date(s.ends_at) < now) return false;
      return true;
    });

    const ids = activeSurveys.map((s: any) => s.id);
    const [responseCounts, myResponses] = await Promise.all([
      ids.length > 0 ? supabase.from('survey_responses').select('survey_id').in('survey_id', ids) : { data: [] },
      ids.length > 0 ? supabase.from('survey_responses').select('survey_id').eq('member_id', currentMember.id).in('survey_id', ids) : { data: [] },
    ]);

    const countMap: Record<string, number> = {};
    for (const r of responseCounts.data || []) countMap[r.survey_id] = (countMap[r.survey_id] || 0) + 1;

    const respondedSet = new Set((myResponses.data || []).map((r: any) => r.survey_id));

    setSurveys(activeSurveys.map((s: any) => ({
      ...s,
      response_count: countMap[s.id] || 0,
      user_responded: respondedSet.has(s.id),
    })));
    setLoading(false);
  };

  if (isAdmin) {
    return <SurveyManagement currentMember={currentMember} />;
  }

  if (qrSurveyId && qrSurvey) {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="mb-4">
          <button onClick={() => { setQrSurveyId(null); setQrSurvey(null); }} className="text-sm text-gray-500 hover:text-gray-700">
            ← Ankete dön
          </button>
        </div>
        <SurveyTake
          survey={qrSurvey}
          currentMember={currentMember}
          onClose={() => { setQrSurveyId(null); setQrSurvey(null); }}
          onSubmitted={() => { setQrSurveyId(null); setQrSurvey(null); loadSurveys(); }}
        />
      </div>
    );
  }

  if (takingSurvey) {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="mb-4">
          <button onClick={() => setTakingSurvey(null)} className="text-sm text-gray-500 hover:text-gray-700">
            ← Geri
          </button>
        </div>
        <SurveyTake
          survey={takingSurvey}
          currentMember={currentMember}
          onClose={() => setTakingSurvey(null)}
          onSubmitted={() => { setTakingSurvey(null); loadSurveys(); }}
        />
      </div>
    );
  }

  if (viewingResults) {
    return <SurveyResults survey={viewingResults} onClose={() => setViewingResults(null)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Anketler</h2>
        <p className="text-sm text-gray-500 mt-0.5">Dernek anketlerine katılın</p>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aktif anket yok</h3>
          <p className="text-sm text-gray-500">Şu anda yanıtlanabilecek bir anket bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {surveys.map(survey => {
            const isExpired = survey.ends_at && new Date(survey.ends_at) < new Date();
            const isNotStarted = survey.starts_at && new Date(survey.starts_at) > new Date();
            const canRespond = !survey.user_responded && !isExpired && !isNotStarted && survey.is_active;

            return (
              <div key={survey.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900">{survey.title}</h3>
                      {survey.user_responded && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle size={10} />Yanıtlandı
                        </span>
                      )}
                      {isExpired && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                          <AlertCircle size={10} />Sona Erdi
                        </span>
                      )}
                      {isNotStarted && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-xs">
                          <Clock size={10} />Başlamadı
                        </span>
                      )}
                    </div>
                    {survey.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-2">{survey.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{survey.response_count} katılım</span>
                      {survey.ends_at && !isExpired && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock size={10} />
                          {new Date(survey.ends_at).toLocaleDateString('tr-TR')} bitiş
                        </span>
                      )}
                      {survey.is_anonymous && <span className="text-teal-600">Anonim</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {canRespond && (
                      <button
                        onClick={() => setTakingSurvey(survey)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
                      >
                        Yanıtla
                        <ChevronRight size={14} />
                      </button>
                    )}
                    {survey.show_results_to_members && survey.response_count > 0 && (
                      <button
                        onClick={() => setViewingResults(survey)}
                        className="flex items-center gap-1.5 px-4 py-2 border border-teal-200 text-teal-700 rounded-xl text-sm font-medium hover:bg-teal-50 transition-colors"
                      >
                        <BarChart2 size={14} />
                        Sonuçlar
                      </button>
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

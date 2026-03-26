import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, CheckCircle, XCircle, AlertCircle, Loader2, User, Shield, CreditCard, Tag, TrendingDown } from 'lucide-react';

type QueryStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

interface MemberData {
  [key: string]: string | boolean | null;
}

interface DebtInfo {
  total_debt: number;
  discount_eligible: boolean;
  discount_threshold: number;
  discount_rate: number;
}

export function MemberQueryPage() {
  const navigate = useNavigate();
  const [tc, setTc] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<QueryStatus>('idle');
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [debtInfo, setDebtInfo] = useState<DebtInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();

    const tcClean = tc.trim().replace(/\s/g, '');
    if (!/^\d{11}$/.test(tcClean)) {
      setErrorMsg('TC kimlik numarasi 11 haneli rakamdan olusmalidir.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setMemberData(null);
    setDebtInfo(null);
    setErrorMsg('');

    try {
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/member-query`;

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ tc: tcClean }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Sorgu sirasinda bir hata olustu.');
        setStatus('error');
        return;
      }

      if (!data.success) {
        setErrorMsg(data.error || 'Sorgu basarisiz oldu.');
        setStatus('error');
        return;
      }

      if (data.found) {
        const fullName = (data.data?.['Ad Soyad'] as string) || '';
        if (name.trim()) {
          const inputName = name.trim().toLowerCase().replace(/\s+/g, ' ');
          const dbName = fullName.toLowerCase().replace(/\s+/g, ' ');
          if (!dbName.includes(inputName) && !inputName.includes(dbName.split(' ')[0])) {
            setStatus('not_found');
            return;
          }
        }
        setMemberData(data.data);
        setDebtInfo(data.debt_info || null);
        setStatus('found');
      } else {
        setStatus('not_found');
      }
    } catch {
      setErrorMsg('Sunucuya baglanirken bir hata olustu. Lutfen tekrar deneyin.');
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setMemberData(null);
    setDebtInfo(null);
    setErrorMsg('');
    setTc('');
    setName('');
  };

  const renderValue = (key: string, val: string | boolean | null) => {
    if (typeof val === 'boolean') {
      return val ? (
        <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
          <CheckCircle size={14} /> Evet
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
          <XCircle size={14} /> Hayir
        </span>
      );
    }
    if (val === null || val === undefined || val === '') return <span className="text-gray-400">—</span>;

    if (key === 'Uyelik Durumu' || key === 'membership_status') {
      const isActive = val === 'Aktif Uye';
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
          {val}
        </span>
      );
    }

    return <span className="text-gray-800">{String(val)}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={15} />
            Ana Sayfa
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Search size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Uyelik Sorgulama</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-200">
              <Shield size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Uyelik Durumu Sorgula</h1>
            <p className="text-sm text-slate-500">TC kimlik numaranizi girerek uyelik durumunuzu ogrenebilirsiniz.</p>
          </div>

          {status === 'idle' || status === 'loading' || status === 'error' ? (
            <form onSubmit={handleQuery} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">
                  TC Kimlik Numarasi *
                </label>
                <div className="relative">
                  <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={tc}
                    onChange={e => setTc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="11 haneli TC kimlik no"
                    maxLength={11}
                    required
                    className="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">
                  Ad Soyad
                  <span className="text-slate-400 font-normal ml-1 normal-case">(dogrulama icin opsiyonel)</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Adinizi ve soyadinizi girin"
                    className="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {status === 'error' && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{errorMsg}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || tc.length !== 11}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sorgulanıyor...
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    Sorgula
                  </>
                )}
              </button>
            </form>
          ) : status === 'found' && memberData ? (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <CheckCircle size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-base">Uye Bulundu</p>
                      <p className="text-green-100 text-xs">Kayitli uye bilgileri asagidadir</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  {Object.entries(memberData).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{key}</span>
                      <div className="text-sm text-right">{renderValue(key, val as string | boolean | null)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {debtInfo && (
                <div className={`rounded-2xl border overflow-hidden shadow-sm ${
                  debtInfo.discount_eligible
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className={`px-5 py-4 flex items-start gap-3 ${
                    debtInfo.discount_eligible ? 'bg-emerald-100/60' : 'bg-red-100/60'
                  }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      debtInfo.discount_eligible ? 'bg-emerald-500' : 'bg-red-500'
                    }`}>
                      {debtInfo.discount_eligible
                        ? <Tag size={16} className="text-white" />
                        : <TrendingDown size={16} className="text-white" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${debtInfo.discount_eligible ? 'text-emerald-800' : 'text-red-800'}`}>
                        {debtInfo.discount_eligible
                          ? `%${debtInfo.discount_rate} Indirim Hakkiniz Var`
                          : 'Indirim Hakki Yok'
                        }
                      </p>
                      <p className={`text-xs mt-0.5 ${debtInfo.discount_eligible ? 'text-emerald-700' : 'text-red-700'}`}>
                        {debtInfo.total_debt === 0
                          ? `Borcunuz bulunmamaktadir. Tam indirim orani: %${debtInfo.discount_rate}`
                          : debtInfo.discount_eligible
                            ? `Toplam borcunuz ${debtInfo.total_debt.toLocaleString('tr-TR')} TL olup ${debtInfo.discount_threshold} TL limitinin altinda. Indirim oraniniz: %${debtInfo.discount_rate}`
                            : `Toplam borcunuz ${debtInfo.total_debt.toLocaleString('tr-TR')} TL olup ${debtInfo.discount_threshold} TL limitini astigi icin indirimden yararlanamaz.`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-3 flex items-center justify-between">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${debtInfo.discount_eligible ? 'text-emerald-600' : 'text-red-600'}`}>
                      Toplam Borc
                    </span>
                    <span className={`text-lg font-bold ${debtInfo.discount_eligible ? 'text-emerald-700' : 'text-red-700'}`}>
                      {debtInfo.total_debt === 0
                        ? 'Borcsuz'
                        : `${debtInfo.total_debt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`
                      }
                    </span>
                  </div>
                  <div className="px-5 pb-4 flex items-center justify-between border-t border-dashed border-current/10 pt-3">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${debtInfo.discount_eligible ? 'text-emerald-600' : 'text-red-600'}`}>
                      Indirim Orani
                    </span>
                    <span className={`text-2xl font-black ${debtInfo.discount_eligible ? 'text-emerald-700' : 'text-red-400'}`}>
                      %{debtInfo.discount_rate}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 border border-slate-300 bg-white text-slate-600 font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm"
              >
                <Search size={14} />
                Yeni Sorgulama
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <XCircle size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-base">Uye Bulunamadi</p>
                    <p className="text-amber-100 text-xs">Bu bilgilere ait kayitli uye yok</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Girdiginiz TC kimlik numarasina ait kayitli bir uye bulunamamistir.
                  Bilgilerinizi kontrol edip tekrar deneyebilirsiniz.
                </p>
                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 border border-slate-300 text-slate-600 font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm"
                >
                  <Search size={14} />
                  Tekrar Dene
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-slate-400">
            Bu sorgu sistemi yalnizca uyelik durumunu dogrulamak amaclidir.
          </p>
        </div>
      </main>
    </div>
  );
}

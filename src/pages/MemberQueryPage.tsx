import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Search, ArrowLeft, CheckCircle, XCircle, AlertCircle, Loader2,
  User, Shield, CreditCard, Tag, TrendingDown, LogIn, Star, Phone,
} from 'lucide-react';

type QueryStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

interface MemberData {
  [key: string]: string | boolean | number | null;
}

interface DebtInfo {
  total_debt: number;
  discount_eligible: boolean;
  discount_threshold: number;
  discount_rate: number;
}

interface PageConfig {
  title: string;
  description: string;
  orgName: string;
  orgSubtitle: string;
  currentYear: number;
  supportName: string;
  supportPhone: string;
}

export function MemberQueryPage() {
  const navigate = useNavigate();
  const [tc, setTc] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<QueryStatus>('idle');
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [debtInfo, setDebtInfo] = useState<DebtInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [config, setConfig] = useState<PageConfig>({
    title: 'Üyelik Sorgulama',
    description: 'TC kimlik numaranızı girerek üyelik durumunuzu ve indirim hakkınızı öğrenebilirsiniz.',
    orgName: 'Dernek',
    orgSubtitle: '',
    currentYear: new Date().getFullYear(),
    supportName: '',
    supportPhone: '',
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
      const [queryPageRes, orgNameRes, contactRes, supportRes] = await Promise.all([
        supabase.from('page_settings').select('page_name, description').eq('page_key', 'member_query').maybeSingle(),
        supabase.from('page_settings').select('page_name, description').eq('page_key', 'org_name').maybeSingle(),
        supabase.from('contact_info').select('address').limit(1).maybeSingle(),
        supabase.from('page_settings').select('page_name, description').eq('page_key', 'member_query_support').maybeSingle(),
      ]);

      const supportRaw = supportRes.data?.description || '';
      const [supportName, supportPhone] = supportRaw.includes('|')
        ? supportRaw.split('|')
        : [supportRaw, ''];

      setConfig({
        title: queryPageRes.data?.page_name || 'Üyelik Sorgulama',
        description: queryPageRes.data?.description || 'TC kimlik numaranızı girerek üyelik durumunuzu ve indirim hakkınızı öğrenebilirsiniz.',
        orgName: orgNameRes.data?.page_name || 'Dernek',
        orgSubtitle: orgNameRes.data?.description || (contactRes.data?.address ? String(contactRes.data.address) : ''),
        currentYear: new Date().getFullYear(),
        supportName: supportName.trim(),
        supportPhone: supportPhone.trim(),
      });
    };
    loadConfig();
  }, []);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    const tcClean = tc.trim().replace(/\s/g, '');
    if (!/^\d{11}$/.test(tcClean)) {
      setErrorMsg('TC kimlik numarası 11 haneli rakamdan oluşmalıdır.');
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
        setErrorMsg(data.error || 'Sorgu sırasında bir hata oluştu.');
        setStatus('error');
        return;
      }

      if (!data.success) {
        setErrorMsg(data.error || 'Sorgu başarısız oldu.');
        setStatus('error');
        return;
      }

      if (data.found) {
        const fullNameKey = Object.keys(data.data || {}).find(k =>
          k.toLowerCase().includes('ad') || k.toLowerCase().includes('soyad') || k === 'Ad Soyad'
        );
        const fullName = fullNameKey ? String(data.data[fullNameKey] || '') : '';

        if (name.trim() && fullName) {
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
      setErrorMsg('Sunucuya bağlanırken bir hata oluştu. Lütfen tekrar deneyin.');
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

  const formatDebtAmount = (amount: number) =>
    amount === 0
      ? 'Borçsuz'
      : `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`;

  const buildDiscountDescription = (info: DebtInfo) => {
    if (info.total_debt === 0)
      return 'Borcunuz bulunmamaktadır. İndirimden yararlanabilirsiniz.';
    if (info.discount_eligible)
      return `Borcunuz indirim limitinin altında olduğundan indirimden yararlanabilirsiniz.`;
    return `Borcunuz ${info.discount_threshold.toLocaleString('tr-TR')} TL limitini aştığı için indirimden yararlanamaz.`;
  };

  const renderValue = (key: string, val: MemberData[string]) => {
    if (val === null || val === undefined || val === '') return <span className="text-gray-400">—</span>;

    switch (key) {
      case 'is_active':
      case 'aktif_mi': {
        const active = val === true || val === 'true' || val === 'Evet' || val === 1;
        return (
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${active ? 'text-emerald-700' : 'text-red-600'}`}>
            {active ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {active ? 'Evet' : 'Hayır'}
          </span>
        );
      }

      case 'membership_status':
      case 'uyelik_durumu': {
        const valStr = String(val);
        const isActive = valStr.toLowerCase().includes('aktif');
        const isCancelled = valStr.toLowerCase().includes('iptal') || valStr.toLowerCase().includes('pasif');
        const color = isActive
          ? 'bg-emerald-100 text-emerald-700'
          : isCancelled
            ? 'bg-red-100 text-red-600'
            : 'bg-gray-100 text-gray-600';
        const dot = isActive ? 'bg-emerald-500' : isCancelled ? 'bg-red-500' : 'bg-gray-400';
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {valStr}
          </span>
        );
      }

      case 'due_status':
      case 'aidat_durumu': {
        const valStr = String(val);
        const isPaid = valStr.toLowerCase().includes('ödendi') || valStr.toLowerCase().includes('tamam') || valStr.toLowerCase().includes('guncel') || valStr.toLowerCase().includes('güncel');
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {valStr}
          </span>
        );
      }

      case 'due_amount':
      case 'toplam_borc': {
        const amount = Number(val);
        const isZero = amount === 0;
        return (
          <span className={`text-sm font-bold ${isZero ? 'text-emerald-700' : 'text-red-600'}`}>
            {isZero ? 'Borçsuz' : `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`}
          </span>
        );
      }

      case 'discount_eligible':
      case 'indirim_hakki': {
        const eligible = val === true || val === 'true' || val === 'Evet' || val === 1;
        return (
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${eligible ? 'text-emerald-700' : 'text-red-600'}`}>
            {eligible ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {eligible ? 'Var' : 'Yok'}
          </span>
        );
      }

      default: {
        if (typeof val === 'boolean') {
          return val ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-sm">
              <CheckCircle size={14} /> Evet
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-red-600 font-semibold text-sm">
              <XCircle size={14} /> Hayır
            </span>
          );
        }
        return <span className="text-gray-800 text-sm">{String(val)}</span>;
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-md' : 'bg-transparent'
      }`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                scrolled ? 'text-gray-600 hover:text-emerald-600' : 'text-white/80 hover:text-white'
              }`}
            >
              <ArrowLeft size={16} />
              Ana Sayfa
            </button>

            <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full overflow-hidden ring-2 transition-all ${scrolled ? 'ring-emerald-500' : 'ring-white/60'}`}>
                <img src="/sdas.jpeg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <span className={`font-bold text-sm hidden sm:block transition-colors ${scrolled ? 'text-gray-800' : 'text-white'}`}>
                {config.orgName}
              </span>
            </button>

            <button
              onClick={() => navigate('/login')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                scrolled
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <LogIn size={14} />
              Üye Girişi
            </button>
          </div>
        </div>
      </nav>

      <div className="relative bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 pt-28 pb-20 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
        <div className="relative z-10 max-w-xl mx-auto">
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-2 bg-white/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-20 h-20 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center ring-2 ring-white/30 shadow-2xl mx-auto">
              <Shield size={36} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-lg mb-3">
            {config.title}
          </h1>
          <p className="text-emerald-100 text-base sm:text-lg font-light max-w-md mx-auto">
            {config.description}
          </p>

          <div className="flex items-center justify-center gap-6 mt-8">
            {[
              { icon: Shield, label: 'Güvenli Sorgu' },
              { icon: CheckCircle, label: 'Anlık Sonuç' },
              { icon: Star, label: 'Ücretsiz' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 text-white/80">
                <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                  <item.icon size={17} className="text-white" />
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L1440 60L1440 20C1200 60 960 60 720 40C480 20 240 0 0 20L0 60Z" fill="white" />
          </svg>
        </div>
      </div>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-16 -mt-4 relative z-10">

        {status === 'idle' || status === 'loading' || status === 'error' ? (
          <form onSubmit={handleQuery} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-5">
            <div className="text-center mb-2">
              <p className="text-sm font-semibold text-gray-500">Sorgulamak için bilgilerinizi girin</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                TC Kimlik Numarası *
              </label>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                <input
                  type="text"
                  value={tc}
                  onChange={e => setTc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="Örn: 12345678901"
                  maxLength={11}
                  required
                  className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm font-mono tracking-widest focus:outline-none focus:border-emerald-500 transition-colors"
                />
                {tc.length === 11 && (
                  <CheckCircle size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                )}
              </div>
              <p className="text-xs text-gray-400 pl-1">11 haneli TC kimlik numaranızı giriniz</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                Ad Soyad
                <span className="text-gray-400 font-normal ml-1 normal-case">(isteğe bağlı)</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Adınızı ve soyadınızı girin"
                  className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <p className="text-xs text-gray-400 pl-1">Girilirse kimlik doğrulaması yapılır</p>
            </div>

            {status === 'error' && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5">
                <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || tc.length !== 11}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sorgulanıyor...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Üyelik Durumunu Sorgula
                </>
              )}
            </button>

            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">Veya</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-emerald-200 text-emerald-700 font-semibold py-3 rounded-xl hover:bg-emerald-50 hover:border-emerald-400 transition-all text-sm"
            >
              <Star size={15} />
              Henüz üye değil misiniz? Üye Olun
            </button>
          </form>

        ) : status === 'found' && memberData ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-base">Üye Bulundu</p>
                    <p className="text-emerald-100 text-xs mt-0.5">{config.orgName} kayıtlı üye bilgileri</p>
                  </div>
                </div>
              </div>

              <div className="p-6 divide-y divide-gray-50">
                {Object.entries(memberData).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex-shrink-0">{key}</span>
                    <div className="text-right">{renderValue(key, val)}</div>
                  </div>
                ))}
              </div>
            </div>

            {debtInfo && (
              <div className={`rounded-2xl overflow-hidden shadow-lg border ${
                debtInfo.discount_eligible ? 'border-emerald-200' : 'border-red-200'
              }`}>
                <div className={`px-6 py-5 flex items-start gap-4 ${
                  debtInfo.discount_eligible
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                    : 'bg-gradient-to-r from-red-500 to-rose-600'
                }`}>
                  <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    {debtInfo.discount_eligible
                      ? <Tag size={20} className="text-white" />
                      : <TrendingDown size={20} className="text-white" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-base">
                      {debtInfo.discount_eligible
                        ? 'İndirim Hakkınız Var'
                        : 'İndirim Hakkı Yok'
                      }
                    </p>
                    <p className="text-white/80 text-xs mt-1 leading-relaxed">
                      {buildDiscountDescription(debtInfo)}
                    </p>
                  </div>
                </div>

                {debtInfo.discount_eligible && (
                  <div className="px-6 py-4 bg-emerald-50">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                      Toplam Borç
                    </p>
                    <p className="text-xl font-black mt-0.5 text-emerald-800">
                      {formatDebtAmount(debtInfo.total_debt)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 border-2 border-gray-200 bg-white text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm"
            >
              <Search size={15} />
              Yeni Sorgulama Yap
            </button>
          </div>

        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                  <XCircle size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-base">Üye Bulunamadı</p>
                  <p className="text-amber-100 text-xs mt-0.5">{config.orgName} üye kaydı yok</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-gray-600 leading-relaxed">
                Girdiğiniz TC kimlik numarasına ait kayıtlı bir üye bulunamamıştır.
                Bilgilerinizi kontrol edip tekrar deneyebilirsiniz.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-all text-sm"
                >
                  <Search size={14} />
                  Tekrar Dene
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold py-2.5 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all text-sm shadow-md"
                >
                  <Star size={14} />
                  Üye Ol
                </button>
              </div>
            </div>
          </div>
        )}

        {(config.supportName || config.supportPhone) && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Phone size={17} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-800">Teknik Sorunlar İçin İrtibat</p>
                <p className="text-xs text-blue-600 mt-0.5">Sorgu ile ilgili bir sorun yaşıyorsanız aşağıdaki kişiyle iletişime geçebilirsiniz.</p>
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  {config.supportName && (
                    <span className="text-sm font-bold text-blue-900">{config.supportName}</span>
                  )}
                  {config.supportName && config.supportPhone && (
                    <span className="hidden sm:block text-blue-300">—</span>
                  )}
                  {config.supportPhone && (
                    <a
                      href={`tel:${config.supportPhone.replace(/\s/g, '')}`}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-900 transition-colors"
                    >
                      <Phone size={13} />
                      {config.supportPhone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Bu sorgu sistemi yalnızca {config.orgName} üyelik durumunu doğrulamak amacıyla kullanılmaktadır.
        </p>
      </main>

      <footer className="bg-gray-900 text-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-emerald-500/40">
                <img src="/sdas.jpeg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">{config.orgName}</p>
                {config.orgSubtitle && (
                  <p className="text-xs text-gray-400">{config.orgSubtitle}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <button onClick={() => navigate('/')} className="hover:text-emerald-400 transition-colors">Ana Sayfa</button>
              <button onClick={() => navigate('/login')} className="hover:text-emerald-400 transition-colors">Üye Girişi</button>
              <button onClick={() => navigate('/signup')} className="hover:text-emerald-400 transition-colors">Üye Ol</button>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-800 text-center text-xs text-gray-600">
            <p>© {config.currentYear} {config.orgSubtitle || config.orgName}. Tüm Hakları Saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

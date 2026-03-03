import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Phone, MapPin, Clock, RefreshCw, AlertCircle, ChevronDown, Map } from 'lucide-react';

interface Pharmacy {
  pharmacyID: number;
  pharmacyName: string;
  address: string;
  city: string;
  district: string;
  town: string | null;
  directions: string;
  phone: string;
  phone2: string | null;
  pharmacyDutyStart: string;
  pharmacyDutyEnd: string;
  latitude: number | null;
  longitude: number | null;
}

const ISTANBUL_DISTRICTS = [
  'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
  'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
  'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
  'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
  'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
  'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
  'Ümraniye', 'Üsküdar', 'Zeytinburnu'
];

export function DutyPharmacy() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [searchText, setSearchText] = useState('');
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchPharmacies = useCallback(async (district?: string) => {
    setLoading(true);
    setError('');
    setApiKeyMissing(false);
    setQuotaExceeded(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const params = new URLSearchParams({ city: 'istanbul' });
      if (district) params.set('district', district.toLowerCase().replace(/\s+/g, '-').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/İ/g, 'i').replace(/Ğ/g, 'g').replace(/Ü/g, 'u').replace(/Ş/g, 's').replace(/Ö/g, 'o').replace(/Ç/g, 'c'));

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pharmacy-duty?${params}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.code === 'API_KEY_MISSING') {
          setApiKeyMissing(true);
          return;
        }
        if (result.code === 'QUOTA_EXCEEDED') {
          setQuotaExceeded(true);
          return;
        }
        throw new Error(result.error || 'Veri alınamadı');
      }

      setPharmacies(result.data || []);
      if (result.lastUpdated) setLastUpdated(result.lastUpdated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPharmacies(selectedDistrict || undefined);
  }, [fetchPharmacies, selectedDistrict]);

  const filtered = pharmacies.filter((p) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      p.pharmacyName.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.district.toLowerCase().includes(q)
    );
  });

  const openMap = (lat: number | null, lng: number | null, name: string) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' istanbul')}`, '_blank');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
              <span className="bg-red-100 text-red-600 p-2 rounded-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </span>
              Nöbetçi Eczaneler
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              İstanbul geneli güncel nöbetçi eczane bilgileri
              {lastUpdated && (
                <span className="ml-2 text-gray-400">· Son güncelleme: {lastUpdated}</span>
              )}
            </p>
          </div>
          <button
            onClick={() => fetchPharmacies(selectedDistrict || undefined)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Yenile
          </button>
        </div>

        {quotaExceeded && (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-5">
            <div className="flex gap-3">
              <AlertCircle className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-orange-800 mb-1">NosyAPI Kredisi Tükendi</h3>
                <p className="text-orange-700 text-sm">
                  Nöbetçi eczane servisi için kullanılan NosyAPI hesabının kredisi tükenmiş veya abonelik aktif değil.
                  Lütfen <strong>nosyapi.com</strong> üzerinden hesabınıza kredi ekleyin ya da planınızı yenileyin.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <a
                    href="https://www.nosyapi.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    nosyapi.com - Kredi Ekle
                  </a>
                  <a
                    href="https://www.eczaneler.gen.tr/nobetci-istanbul"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-white border border-orange-300 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-50 transition-colors"
                  >
                    Nöbetçi Eczane Listesini Görüntüle
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {apiKeyMissing && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex gap-3">
              <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">API Anahtarı Gerekli</h3>
                <p className="text-amber-700 text-sm">
                  Nöbetçi eczane verilerini görmek için <strong>nosyapi.com</strong> üzerinden ücretsiz bir API anahtarı almanız gerekmektedir.
                  Ücretsiz kayıt ile 500 kredi kazanabilirsiniz.
                </p>
                <p className="text-amber-600 text-sm mt-2">
                  API anahtarınızı aldıktan sonra, yönetici panelindeki <strong>Yönetim &rsaquo; Sistem Ayarları</strong> bölümüne
                  <strong> NOSYAPI_KEY</strong> olarak ekleyin.
                </p>
                <a
                  href="https://www.nosyapi.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
                >
                  nosyapi.com - Ücretsiz Kayıt
                </a>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Eczane adı veya adres ara..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="relative min-w-[220px]">
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">Tüm İlçeler</option>
                {ISTANBUL_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className="text-gray-500 text-sm">Nöbetçi eczaneler yükleniyor...</p>
          </div>
        ) : filtered.length === 0 && !apiKeyMissing ? (
          <div className="text-center py-20 text-gray-500">
            <svg className="mx-auto mb-4 w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-lg font-medium mb-1">Nöbetçi eczane bulunamadı</p>
            <p className="text-sm">Seçili ilçe veya arama kriterine uygun eczane yok</p>
          </div>
        ) : (
          <>
            {!apiKeyMissing && (
              <div className="mb-4 text-sm text-gray-500">
                <span className="font-medium text-gray-700">{filtered.length}</span> nöbetçi eczane listeleniyor
                {selectedDistrict && <span> — <span className="text-green-600 font-medium">{selectedDistrict}</span></span>}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((pharmacy) => (
                <div
                  key={pharmacy.pharmacyID}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-green-200 transition-all duration-200 overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white text-sm leading-tight">{pharmacy.pharmacyName}</h3>
                      <span className="flex-shrink-0 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                        {pharmacy.district}
                      </span>
                    </div>
                    {pharmacy.town && (
                      <p className="text-green-100 text-xs mt-0.5">{pharmacy.town}</p>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-600 text-sm leading-relaxed">{pharmacy.address}</p>
                    </div>

                    {pharmacy.directions && (
                      <div className="flex items-start gap-2">
                        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500 text-xs italic">{pharmacy.directions}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Phone size={15} className="text-gray-400 flex-shrink-0" />
                      <a
                        href={`tel:${pharmacy.phone.replace(/\s/g, '')}`}
                        className="text-green-700 font-medium text-sm hover:text-green-600 hover:underline"
                      >
                        {pharmacy.phone}
                      </a>
                      {pharmacy.phone2 && (
                        <a
                          href={`tel:${pharmacy.phone2.replace(/\s/g, '')}`}
                          className="text-green-600 text-sm hover:underline ml-1"
                        >
                          / {pharmacy.phone2}
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock size={15} className="text-amber-500 flex-shrink-0" />
                      <span className="text-gray-500 text-xs">
                        {formatDate(pharmacy.pharmacyDutyStart)} – {formatDate(pharmacy.pharmacyDutyEnd)}
                      </span>
                    </div>

                    <button
                      onClick={() => openMap(pharmacy.latitude, pharmacy.longitude, pharmacy.pharmacyName)}
                      className="w-full flex items-center justify-center gap-2 mt-1 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-600 text-sm transition-colors"
                    >
                      <Map size={15} />
                      Haritada Göster
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

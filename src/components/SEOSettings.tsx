import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Globe, Search, Share2, Twitter, Smartphone, BarChart2, Code, Save, RefreshCw, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface SEOData {
  id: string;
  site_title: string;
  site_description: string;
  site_keywords: string;
  og_title: string;
  og_description: string;
  og_image: string;
  og_url: string;
  og_type: string;
  twitter_card: string;
  twitter_site: string;
  twitter_title: string;
  twitter_description: string;
  twitter_image: string;
  robots: string;
  canonical_url: string;
  theme_color: string;
  pwa_name: string;
  pwa_short_name: string;
  pwa_description: string;
  google_analytics_id: string;
  google_site_verification: string;
  structured_data: string;
  custom_head_tags: string;
  favicon_url: string;
  apple_touch_icon_url: string;
}

const defaultData: Omit<SEOData, 'id'> = {
  site_title: '',
  site_description: '',
  site_keywords: '',
  og_title: '',
  og_description: '',
  og_image: '',
  og_url: '',
  og_type: 'website',
  twitter_card: 'summary_large_image',
  twitter_site: '',
  twitter_title: '',
  twitter_description: '',
  twitter_image: '',
  robots: 'index, follow',
  canonical_url: '',
  theme_color: '#dc2626',
  pwa_name: '',
  pwa_short_name: '',
  pwa_description: '',
  google_analytics_id: '',
  google_site_verification: '',
  structured_data: '',
  custom_head_tags: '',
  favicon_url: '',
  apple_touch_icon_url: '',
};

type SectionKey = 'general' | 'opengraph' | 'twitter' | 'pwa' | 'analytics' | 'advanced';

export function SEOSettings() {
  const [data, setData] = useState<SEOData | null>(null);
  const [edited, setEdited] = useState<Omit<SEOData, 'id'>>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    general: true,
    opengraph: true,
    twitter: false,
    pwa: false,
    analytics: false,
    advanced: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase
        .from('seo_settings')
        .select('*')
        .maybeSingle();
      if (err) throw err;
      if (result) {
        setData(result);
        const { id: _id, singleton_key: _sk, created_at: _ca, updated_at: _ua, ...rest } = result as any;
        setEdited(rest);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Omit<SEOData, 'id'>, value: string) => {
    setEdited(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (data?.id) {
        const { error: err } = await supabase
          .from('seo_settings')
          .update({ ...edited, updated_at: new Date().toISOString() })
          .eq('id', data.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('seo_settings')
          .insert({ ...edited, singleton_key: 'main' });
        if (err) throw err;
      }
      setSaved(true);
      await loadSettings();
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (key: SectionKey) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
  const textareaClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const hintClass = "text-xs text-gray-400 mt-1";

  const Section = ({
    id,
    icon: Icon,
    title,
    subtitle,
    children,
  }: {
    id: SectionKey;
    icon: React.ElementType;
    title: string;
    subtitle: string;
    children: React.ReactNode;
  }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-blue-600" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-800 text-sm">{title}</div>
            <div className="text-xs text-gray-500">{subtitle}</div>
          </div>
        </div>
        {openSections[id] ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {openSections[id] && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="pt-4 space-y-4">{children}</div>
        </div>
      )}
    </div>
  );

  const charCount = (val: string, max: number) => (
    <span className={`text-xs ${val.length > max ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
      {val.length}/{max}
    </span>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">SEO Ayarları</h2>
          <p className="text-sm text-gray-500 mt-0.5">Arama motoru optimizasyonu ve sosyal medya paylaşım ayarlarını yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSettings}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
          >
            <RefreshCw size={15} />
            Yenile
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle size={16} />
          SEO ayarları başarıyla kaydedildi.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 text-sm">
        <strong>Not:</strong> Bu ayarlar statik HTML sayfasında (<code className="bg-amber-100 px-1 rounded text-xs">index.html</code>) meta etiketlerini kontrol eder. Ayarlar kaydedildikten sonra sayfanın yeniden oluşturulması (build) gerekebilir. Dinamik yükleme için JavaScript injection kullanılmaktadır.
      </div>

      <Section id="general" icon={Search} title="Genel SEO" subtitle="Sayfa başlığı, açıklama ve anahtar kelimeler">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>Site Başlığı (title)</label>
            {charCount(edited.site_title, 60)}
          </div>
          <input
            type="text"
            className={inputClass}
            value={edited.site_title}
            onChange={e => handleChange('site_title', e.target.value)}
            placeholder="Dernek adı ve kısa açıklama"
          />
          <p className={hintClass}>Tarayıcı sekmesi ve Google arama sonuçlarında görünür. Önerilen: 50-60 karakter.</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>Meta Açıklama (description)</label>
            {charCount(edited.site_description, 160)}
          </div>
          <textarea
            className={textareaClass}
            rows={3}
            value={edited.site_description}
            onChange={e => handleChange('site_description', e.target.value)}
            placeholder="Sitenizin kısa açıklaması"
          />
          <p className={hintClass}>Arama sonuçlarında başlığın altında görünür. Önerilen: 120-160 karakter.</p>
        </div>

        <div>
          <label className={labelClass}>Anahtar Kelimeler (keywords)</label>
          <input
            type="text"
            className={inputClass}
            value={edited.site_keywords}
            onChange={e => handleChange('site_keywords', e.target.value)}
            placeholder="dernek, köy derneği, üyelik, etkinlik"
          />
          <p className={hintClass}>Virgülle ayrılmış anahtar kelimeler. Modern arama motorları için çok kritik değil ama yine de eklenebilir.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Robots</label>
            <select
              className={inputClass}
              value={edited.robots}
              onChange={e => handleChange('robots', e.target.value)}
            >
              <option value="index, follow">index, follow (Varsayılan)</option>
              <option value="noindex, follow">noindex, follow</option>
              <option value="index, nofollow">index, nofollow</option>
              <option value="noindex, nofollow">noindex, nofollow (Tümünü engelle)</option>
            </select>
            <p className={hintClass}>Arama motorlarının sitenizi indeksleyip indekslemeyeceği.</p>
          </div>
          <div>
            <label className={labelClass}>Canonical URL</label>
            <input
              type="url"
              className={inputClass}
              value={edited.canonical_url}
              onChange={e => handleChange('canonical_url', e.target.value)}
              placeholder="https://www.derneginiz.com"
            />
            <p className={hintClass}>Sitenizin resmi URL'si. Boş bırakılabilir.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Tema Rengi (theme-color)</label>
            <div className="flex gap-2">
              <input
                type="color"
                className="h-[38px] w-12 border border-gray-300 rounded-lg cursor-pointer p-0.5"
                value={edited.theme_color}
                onChange={e => handleChange('theme_color', e.target.value)}
              />
              <input
                type="text"
                className={inputClass}
                value={edited.theme_color}
                onChange={e => handleChange('theme_color', e.target.value)}
                placeholder="#dc2626"
              />
            </div>
            <p className={hintClass}>Mobil tarayıcılarda adres çubuğu rengi.</p>
          </div>
          <div>
            <label className={labelClass}>Google Site Doğrulama</label>
            <input
              type="text"
              className={inputClass}
              value={edited.google_site_verification}
              onChange={e => handleChange('google_site_verification', e.target.value)}
              placeholder="google-site-verification kodu"
            />
            <p className={hintClass}>Google Search Console doğrulama meta etiketi değeri.</p>
          </div>
        </div>
      </Section>

      <Section id="opengraph" icon={Share2} title="Open Graph (Facebook / LinkedIn)" subtitle="Sosyal medyada paylaşım önizlemesi">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>OG Başlık</label>
            {charCount(edited.og_title, 60)}
          </div>
          <input
            type="text"
            className={inputClass}
            value={edited.og_title}
            onChange={e => handleChange('og_title', e.target.value)}
            placeholder="Boş bırakırsanız Site Başlığı kullanılır"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>OG Açıklama</label>
            {charCount(edited.og_description, 200)}
          </div>
          <textarea
            className={textareaClass}
            rows={2}
            value={edited.og_description}
            onChange={e => handleChange('og_description', e.target.value)}
            placeholder="Boş bırakırsanız Meta Açıklama kullanılır"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>OG Görsel URL</label>
            <input
              type="url"
              className={inputClass}
              value={edited.og_image}
              onChange={e => handleChange('og_image', e.target.value)}
              placeholder="https://... (1200x630 px önerilir)"
            />
            <p className={hintClass}>Paylaşımlarda görünecek görsel. 1200x630 piksel önerilir.</p>
          </div>
          <div>
            <label className={labelClass}>OG Site URL</label>
            <input
              type="url"
              className={inputClass}
              value={edited.og_url}
              onChange={e => handleChange('og_url', e.target.value)}
              placeholder="https://www.derneginiz.com"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>OG Tür</label>
          <select
            className={`${inputClass} max-w-xs`}
            value={edited.og_type}
            onChange={e => handleChange('og_type', e.target.value)}
          >
            <option value="website">website</option>
            <option value="article">article</option>
            <option value="organization">organization</option>
          </select>
        </div>
      </Section>

      <Section id="twitter" icon={Twitter} title="Twitter / X Kartı" subtitle="Twitter'da paylaşım görünümü">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Twitter Kart Türü</label>
            <select
              className={inputClass}
              value={edited.twitter_card}
              onChange={e => handleChange('twitter_card', e.target.value)}
            >
              <option value="summary">summary</option>
              <option value="summary_large_image">summary_large_image (Büyük Görsel)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Twitter Kullanıcı Adı</label>
            <input
              type="text"
              className={inputClass}
              value={edited.twitter_site}
              onChange={e => handleChange('twitter_site', e.target.value)}
              placeholder="@kullaniciadı"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Twitter Başlık</label>
          <input
            type="text"
            className={inputClass}
            value={edited.twitter_title}
            onChange={e => handleChange('twitter_title', e.target.value)}
            placeholder="Boş bırakırsanız OG Başlık kullanılır"
          />
        </div>

        <div>
          <label className={labelClass}>Twitter Açıklama</label>
          <textarea
            className={textareaClass}
            rows={2}
            value={edited.twitter_description}
            onChange={e => handleChange('twitter_description', e.target.value)}
            placeholder="Boş bırakırsanız OG Açıklama kullanılır"
          />
        </div>

        <div>
          <label className={labelClass}>Twitter Görsel URL</label>
          <input
            type="url"
            className={inputClass}
            value={edited.twitter_image}
            onChange={e => handleChange('twitter_image', e.target.value)}
            placeholder="Boş bırakırsanız OG Görsel kullanılır"
          />
        </div>
      </Section>

      <Section id="pwa" icon={Smartphone} title="PWA (Progressive Web App)" subtitle="Mobil uygulama kurulum bilgileri">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Uygulama Adı</label>
            <input
              type="text"
              className={inputClass}
              value={edited.pwa_name}
              onChange={e => handleChange('pwa_name', e.target.value)}
              placeholder="Tam uygulama adı"
            />
            <p className={hintClass}>Telefona eklendiğinde görünecek tam ad.</p>
          </div>
          <div>
            <label className={labelClass}>Kısa Ad</label>
            <input
              type="text"
              className={inputClass}
              value={edited.pwa_short_name}
              onChange={e => handleChange('pwa_short_name', e.target.value)}
              placeholder="Kısa ad (maks 12 karakter)"
            />
            <p className={hintClass}>Uygulama ikonunun altında görünür.</p>
          </div>
        </div>

        <div>
          <label className={labelClass}>Uygulama Açıklaması</label>
          <textarea
            className={textareaClass}
            rows={2}
            value={edited.pwa_description}
            onChange={e => handleChange('pwa_description', e.target.value)}
            placeholder="PWA uygulama açıklaması"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Apple Touch Icon URL</label>
            <input
              type="text"
              className={inputClass}
              value={edited.apple_touch_icon_url}
              onChange={e => handleChange('apple_touch_icon_url', e.target.value)}
              placeholder="/icon-192.png"
            />
          </div>
          <div>
            <label className={labelClass}>Favicon URL</label>
            <input
              type="text"
              className={inputClass}
              value={edited.favicon_url}
              onChange={e => handleChange('favicon_url', e.target.value)}
              placeholder="/favicon.ico veya /icon.svg"
            />
          </div>
        </div>
      </Section>

      <Section id="analytics" icon={BarChart2} title="Analytics ve Doğrulama" subtitle="Google Analytics ve arama motoru doğrulama">
        <div>
          <label className={labelClass}>Google Analytics ID</label>
          <input
            type="text"
            className={inputClass}
            value={edited.google_analytics_id}
            onChange={e => handleChange('google_analytics_id', e.target.value)}
            placeholder="G-XXXXXXXXXX veya UA-XXXXXXXX-X"
          />
          <p className={hintClass}>Google Analytics 4 ölçüm ID'si. Otomatik olarak sayfaya yüklenir.</p>
        </div>
      </Section>

      <Section id="advanced" icon={Code} title="Gelişmiş Ayarlar" subtitle="JSON-LD yapısal veri ve özel meta etiketler">
        <div>
          <label className={labelClass}>JSON-LD Yapısal Veri</label>
          <textarea
            className={`${textareaClass} font-mono text-xs`}
            rows={6}
            value={edited.structured_data}
            onChange={e => handleChange('structured_data', e.target.value)}
            placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Dernek Adı"\n}`}
          />
          <p className={hintClass}>Geçerli JSON-LD formatında yapısal veri. Google'ın zengin sonuçlar için kullandığı format.</p>
        </div>

        <div>
          <label className={labelClass}>Özel Head Etiketleri</label>
          <textarea
            className={`${textareaClass} font-mono text-xs`}
            rows={4}
            value={edited.custom_head_tags}
            onChange={e => handleChange('custom_head_tags', e.target.value)}
            placeholder={`<meta name="author" content="Dernek Adı" />\n<link rel="preconnect" href="https://fonts.googleapis.com" />`}
          />
          <p className={hintClass}>HTML formatında ek meta etiketleri. Dikkatli kullanın.</p>
        </div>
      </Section>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 shadow-sm"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Kaydediliyor...' : 'Tüm Ayarları Kaydet'}
        </button>
      </div>
    </div>
  );
}

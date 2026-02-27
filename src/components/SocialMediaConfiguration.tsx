import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Facebook, Instagram, Save, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

interface SocialMediaConfig {
  id: string;
  platform: string;
  access_token: string;
  page_id: string;
  is_active: boolean;
  auto_post_events: boolean;
}

export function SocialMediaConfiguration() {
  const [configs, setConfigs] = useState<SocialMediaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showTokens, setShowTokens] = useState<{ [key: string]: boolean }>({});

  const [facebookToken, setFacebookToken] = useState('');
  const [facebookPageId, setFacebookPageId] = useState('');
  const [facebookActive, setFacebookActive] = useState(true);
  const [facebookAutoPost, setFacebookAutoPost] = useState(true);

  const [instagramToken, setInstagramToken] = useState('');
  const [instagramPageId, setInstagramPageId] = useState('');
  const [instagramActive, setInstagramActive] = useState(true);
  const [instagramAutoPost, setInstagramAutoPost] = useState(true);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('social_media_config')
        .select('*');

      if (error) throw error;

      setConfigs(data || []);

      const fbConfig = data?.find(c => c.platform === 'facebook');
      if (fbConfig) {
        setFacebookToken(fbConfig.access_token);
        setFacebookPageId(fbConfig.page_id);
        setFacebookActive(fbConfig.is_active);
        setFacebookAutoPost(fbConfig.auto_post_events);
      }

      const igConfig = data?.find(c => c.platform === 'instagram');
      if (igConfig) {
        setInstagramToken(igConfig.access_token);
        setInstagramPageId(igConfig.page_id);
        setInstagramActive(igConfig.is_active);
        setInstagramAutoPost(igConfig.auto_post_events);
      }
    } catch (err) {
      console.error('Error fetching configs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (platform: string) => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = platform === 'facebook' ? facebookToken : instagramToken;
      const pageId = platform === 'facebook' ? facebookPageId : instagramPageId;
      const isActive = platform === 'facebook' ? facebookActive : instagramActive;
      const autoPost = platform === 'facebook' ? facebookAutoPost : instagramAutoPost;

      if (!token || !pageId) {
        throw new Error('Token ve Sayfa ID gereklidir');
      }

      const existingConfig = configs.find(c => c.platform === platform);

      if (existingConfig) {
        const { error: updateError } = await supabase
          .from('social_media_config')
          .update({
            access_token: token,
            page_id: pageId,
            is_active: isActive,
            auto_post_events: autoPost,
          })
          .eq('platform', platform);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('social_media_config')
          .insert({
            platform,
            access_token: token,
            page_id: pageId,
            is_active: isActive,
            auto_post_events: autoPost,
          });

        if (insertError) throw insertError;
      }

      setSuccess(`${platform === 'facebook' ? 'Facebook' : 'Instagram'} yapılandırması kaydedildi`);
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydetme hatası');
    } finally {
      setSaving(false);
    }
  };

  const toggleTokenVisibility = (platform: string) => {
    setShowTokens(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Sosyal Medya Entegrasyonu</h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} />
          {success}
        </div>
      )}

      <div className="space-y-8">
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Facebook className="text-blue-600" size={32} />
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Facebook</h3>
              <p className="text-sm text-gray-600">Etkinlikleri otomatik olarak Facebook sayfanızda paylaşın</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Token
              </label>
              <div className="relative">
                <input
                  type={showTokens['facebook'] ? 'text' : 'password'}
                  value={facebookToken}
                  onChange={(e) => setFacebookToken(e.target.value)}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Facebook Access Token"
                />
                <button
                  type="button"
                  onClick={() => toggleTokenVisibility('facebook')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showTokens['facebook'] ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Facebook Graph API token'ınızı buraya girin
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Page ID
              </label>
              <input
                type="text"
                value={facebookPageId}
                onChange={(e) => setFacebookPageId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Facebook Page ID"
              />
              <p className="text-xs text-gray-500 mt-1">
                Facebook sayfa ID'nizi buraya girin
              </p>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={facebookActive}
                  onChange={(e) => setFacebookActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Aktif</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={facebookAutoPost}
                  onChange={(e) => setFacebookAutoPost(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Etkinlikleri otomatik paylaş</span>
              </label>
            </div>

            <button
              onClick={() => handleSaveConfig('facebook')}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <Save size={20} />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Instagram className="text-pink-600" size={32} />
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Instagram</h3>
              <p className="text-sm text-gray-600">Etkinlikleri otomatik olarak Instagram hesabınızda paylaşın</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Token
              </label>
              <div className="relative">
                <input
                  type={showTokens['instagram'] ? 'text' : 'password'}
                  value={instagramToken}
                  onChange={(e) => setInstagramToken(e.target.value)}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Instagram Access Token"
                />
                <button
                  type="button"
                  onClick={() => toggleTokenVisibility('instagram')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showTokens['instagram'] ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Instagram Business Account token'ınızı buraya girin
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Account ID
              </label>
              <input
                type="text"
                value={instagramPageId}
                onChange={(e) => setInstagramPageId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Instagram Business Account ID"
              />
              <p className="text-xs text-gray-500 mt-1">
                Instagram Business Account ID'nizi buraya girin
              </p>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={instagramActive}
                  onChange={(e) => setInstagramActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Aktif</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={instagramAutoPost}
                  onChange={(e) => setInstagramAutoPost(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Etkinlikleri otomatik paylaş</span>
              </label>
            </div>

            <button
              onClick={() => handleSaveConfig('instagram')}
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 transition-colors"
            >
              <Save size={20} />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Kurulum Talimatları</h4>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>Facebook için:</strong></p>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>Facebook Developers'a gidin ve bir uygulama oluşturun</li>
            <li>Uygulamanıza Page Public Content Access izni ekleyin</li>
            <li>Access Token'ı ve Sayfa ID'sini alın</li>
            <li>Token ve ID'yi yukarıdaki alanlara girin</li>
          </ol>

          <p className="mt-3"><strong>Instagram için:</strong></p>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>Instagram hesabınızı Business Account'a dönüştürün</li>
            <li>Facebook Page'e bağlayın</li>
            <li>Facebook Graph API üzerinden token alın</li>
            <li>Business Account ID'sini alın</li>
            <li>Token ve ID'yi yukarıdaki alanlara girin</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

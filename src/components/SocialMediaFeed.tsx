import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Instagram, Facebook, Youtube, RefreshCw, Plus, Check } from 'lucide-react';
import { Member } from '../types';

interface SocialPost {
  id: string;
  platform: 'instagram' | 'facebook' | 'youtube';
  url: string;
  thumbnail?: string;
  caption?: string;
  posted_at?: string;
}

interface SocialMediaFeedProps {
  currentMember: Member;
  isAdmin: boolean;
  onAddToGallery: (posts: SocialPost[]) => void;
}

export function SocialMediaFeed({ isAdmin, onAddToGallery }: SocialMediaFeedProps) {
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [socialConfig, setSocialConfig] = useState<{
    instagram_url?: string;
    facebook_url?: string;
    youtube_url?: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [showUrlForm, setShowUrlForm] = useState(false);
  const [manualPosts, setManualPosts] = useState<SocialPost[]>([]);
  const [newPostUrl, setNewPostUrl] = useState('');
  const [newPostPlatform, setNewPostPlatform] = useState<'instagram' | 'facebook' | 'youtube'>('instagram');

  useEffect(() => {
    loadSocialConfig();
  }, []);

  const loadSocialConfig = async () => {
    try {
      const { data } = await supabase
        .from('social_media_config')
        .select('*')
        .maybeSingle();

      if (data) {
        setSocialConfig({
          instagram_url: data.instagram_url,
          facebook_url: data.facebook_url,
          youtube_url: data.youtube_url
        });
      }
    } catch (error) {
      console.error('Error loading social config:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectPlatform = (url: string): 'instagram' | 'facebook' | 'youtube' | null => {
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    return null;
  };

  const handleAddPost = () => {
    if (!newPostUrl.trim()) return;

    const platform = detectPlatform(newPostUrl) || newPostPlatform;
    const post: SocialPost = {
      id: Date.now().toString(),
      platform,
      url: newPostUrl,
      posted_at: new Date().toISOString()
    };

    setManualPosts([...manualPosts, post]);
    setNewPostUrl('');
    setShowUrlForm(false);
  };

  const togglePostSelection = (postId: string) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedPosts(newSelected);
  };

  const handleAddSelectedToGallery = () => {
    const selectedPostsList = manualPosts.filter(post => selectedPosts.has(post.id));
    if (selectedPostsList.length === 0) {
      alert('Lütfen en az bir gönderi seçin');
      return;
    }
    onAddToGallery(selectedPostsList);
    setSelectedPosts(new Set());
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-5 h-5 text-pink-600" />;
      case 'facebook': return <Facebook className="w-5 h-5 text-blue-600" />;
      case 'youtube': return <Youtube className="w-5 h-5 text-red-600" />;
      default: return null;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-pink-50 to-blue-50 rounded-lg p-6 border-2 border-pink-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Sosyal Medya Gönderileri</h3>
          {isAdmin && (
            <button
              onClick={() => setShowUrlForm(!showUrlForm)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Gönderi Ekle
            </button>
          )}
        </div>

        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Nasıl Kullanılır:</strong>
          </p>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Instagram, Facebook veya YouTube'dan paylaşmak istediğiniz gönderi/video URL'sini kopyalayın</li>
            <li>"Gönderi Ekle" butonuna tıklayın ve URL'yi yapıştırın</li>
            <li>Eklemek istediğiniz gönderileri seçin</li>
            <li>"Seçilenleri Galeriye Ekle" butonuna tıklayın</li>
          </ol>
        </div>

        {showUrlForm && (
          <div className="mb-6 p-4 bg-white rounded-lg border-2 border-blue-300 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="instagram"
                    checked={newPostPlatform === 'instagram'}
                    onChange={(e) => setNewPostPlatform(e.target.value as 'instagram')}
                    className="w-4 h-4 text-pink-600"
                  />
                  <Instagram size={18} />
                  <span>Instagram</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="facebook"
                    checked={newPostPlatform === 'facebook'}
                    onChange={(e) => setNewPostPlatform(e.target.value as 'facebook')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Facebook size={18} />
                  <span>Facebook</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="youtube"
                    checked={newPostPlatform === 'youtube'}
                    onChange={(e) => setNewPostPlatform(e.target.value as 'youtube')}
                    className="w-4 h-4 text-red-600"
                  />
                  <Youtube size={18} />
                  <span>YouTube</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gönderi URL
              </label>
              <input
                type="url"
                value={newPostUrl}
                onChange={(e) => setNewPostUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/... veya https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddPost}
                disabled={!newPostUrl.trim()}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                <Check size={20} />
                Ekle
              </button>
              <button
                onClick={() => {
                  setShowUrlForm(false);
                  setNewPostUrl('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {manualPosts.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {manualPosts.map((post) => (
                <div
                  key={post.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPosts.has(post.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => togglePostSelection(post.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    {getPlatformIcon(post.platform)}
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      selectedPosts.has(post.id)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedPosts.has(post.id) && (
                        <Check size={16} className="text-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 break-all line-clamp-2">
                    {post.url}
                  </p>
                  {post.caption && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {post.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {selectedPosts.size > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleAddSelectedToGallery}
                  className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-pink-700 hover:to-blue-700 transition-all font-semibold"
                >
                  <Plus size={20} />
                  {selectedPosts.size} Gönderiyi Galeriye Ekle
                </button>
              </div>
            )}
          </>
        )}

        {manualPosts.length === 0 && !showUrlForm && (
          <div className="text-center py-12 text-gray-500">
            <RefreshCw size={48} className="mx-auto mb-3 opacity-30" />
            <p>Henüz gönderi eklenmedi</p>
            <p className="text-sm mt-1">Sosyal medya gönderilerinizi eklemek için "Gönderi Ekle" butonuna tıklayın</p>
          </div>
        )}

        {socialConfig.instagram_url && (
          <div className="mt-4 p-3 bg-pink-50 rounded-lg border border-pink-200">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Instagram size={16} className="text-pink-600" />
              <span>Instagram:</span>
              <a
                href={socialConfig.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 hover:underline truncate"
              >
                {socialConfig.instagram_url}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

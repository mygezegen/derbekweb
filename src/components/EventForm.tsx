import { useState, useEffect } from 'react';
import { Event, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type EventFormProps = {
  event: Event | null;
  onSave: () => void;
  onCancel: () => void;
};

export function EventForm({ event, onSave, onCancel }: EventFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [postToSocial, setPostToSocial] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [hasSocialConfig, setHasSocialConfig] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setLocation(event.location || '');

      if (event.event_date) {
        const eventDateTime = new Date(event.event_date);
        const dateStr = eventDateTime.toISOString().split('T')[0];
        const timeStr = eventDateTime.toTimeString().slice(0, 5);
        setDate(dateStr);
        setTime(timeStr);
      }

      setDescription(event.description || '');
    }

    checkSocialConfig();
  }, [event]);

  const checkSocialConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('social_media_config')
        .select('platform, is_active, auto_post_events')
        .eq('is_active', true);

      if (error) throw error;

      setHasSocialConfig((data || []).length > 0);

      if (!event && data && data.length > 0) {
        const autoPostPlatforms = data
          .filter(c => c.auto_post_events)
          .map(c => c.platform);

        if (autoPostPlatforms.length > 0) {
          setPostToSocial(true);
          setSelectedPlatforms(autoPostPlatforms);
        }
      }
    } catch (err) {
      console.error('Error checking social config:', err);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const fullDateTime = new Date(`${date}T${time}`).toISOString();

      if (event) {
        const { error } = await supabase
          .from('events')
          .update({
            title,
            location,
            event_date: fullDateTime,
            description,
          })
          .eq('id', event.id);

        if (error) throw error;
      } else {
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('id, is_admin, is_root, auth_id')
          .eq('auth_id', user?.id)
          .maybeSingle();

        if (memberError) {
          throw new Error(`Üye kaydı sorgulanırken hata: ${memberError.message}`);
        }

        if (!memberData) {
          throw new Error('Üye kaydınız bulunamadı. Lütfen yönetici ile iletişime geçin.');
        }

        if (!memberData.is_admin && !memberData.is_root) {
          throw new Error('Bu işlem için yönetici yetkisine sahip olmanız gerekiyor.');
        }

        console.log('Attempting to create event with:', {
          user_id: user?.id,
          member_id: memberData.id,
          is_admin: memberData.is_admin,
          is_root: memberData.is_root,
          auth_id_matches: memberData.auth_id === user?.id
        });

        const { data: insertData, error } = await supabase
          .from('events')
          .insert({
            title,
            location,
            event_date: fullDateTime,
            description,
            created_by: memberData.id,
          })
          .select();

        if (error) {
          console.error('Insert error details:', error);
          throw new Error(`Etkinlik kaydedilemedi: ${error.message} (Code: ${error.code})`);
        }

        console.log('Event created successfully:', insertData);

        if (!event && postToSocial && selectedPlatforms.length > 0 && insertData && insertData[0]) {
          const eventId = insertData[0].id;

          try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const response = await fetch(
              `${supabaseUrl}/functions/v1/post-to-social-media`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  event_id: eventId,
                  platforms: selectedPlatforms,
                }),
              }
            );

            if (!response.ok) {
              console.error('Social media post failed:', await response.text());
            } else {
              const result = await response.json();
              console.log('Social media post result:', result);
            }
          } catch (socialErr) {
            console.error('Error posting to social media:', socialErr);
          }
        }
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
      console.error('Error saving event:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Başlık
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Konum
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tarih
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Saat
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Açıklama
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Etkinlik açıklamasını buraya yazın..."
          />
        </div>

        {!event && hasSocialConfig && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="postToSocial"
                checked={postToSocial}
                onChange={(e) => setPostToSocial(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded focus:ring-2 focus:ring-red-500"
              />
              <label htmlFor="postToSocial" className="text-sm font-medium text-gray-700 cursor-pointer">
                Sosyal medyada paylaş
              </label>
            </div>

            {postToSocial && (
              <div className="ml-6 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes('facebook')}
                    onChange={() => togglePlatform('facebook')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Facebook</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes('instagram')}
                    onChange={() => togglePlatform('instagram')}
                    className="w-4 h-4 text-pink-600 rounded focus:ring-2 focus:ring-pink-500"
                  />
                  <span className="text-sm text-gray-700">Instagram</span>
                </label>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Announcement } from '../types';
import { Trash2, Plus, Clock } from 'lucide-react';
import { logAction, getCurrentMemberId } from '../lib/auditLog';
import { HTMLEditor } from './HTMLEditor';

interface AnnouncementsListProps {
  announcements: Announcement[];
  isAdmin: boolean;
  onRefresh: () => void;
}

export function AnnouncementsList({ announcements, isAdmin, onRefresh }: AnnouncementsListProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (!memberData) throw new Error('Member not found');

      const { error: insertError } = await supabase
        .from('announcements')
        .insert({
          title,
          content,
          created_by: memberData.id,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          is_active: true,
        });

      if (insertError) throw insertError;

      const logMemberId = await getCurrentMemberId();
      if (logMemberId) {
        await logAction(logMemberId, 'create', 'announcements', undefined, undefined, {
          title,
          content,
          expires_at: expiresAt
        });
      }

      setTitle('');
      setContent('');
      setExpiresAt('');
      setShowForm(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Duyuruyu silmek istediğinize emin misiniz?')) return;

    try {
      const announcement = announcements.find(a => a.id === id);

      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const logMemberId = await getCurrentMemberId();
      if (logMemberId && announcement) {
        await logAction(logMemberId, 'delete', 'announcements', id, {
          title: announcement.title,
          content: announcement.content,
          expires_at: announcement.expires_at
        });
      }

      onRefresh();
    } catch (err) {
      console.error('Error deleting announcement:', err);
    }
  };

  const isExpired = (announcement: Announcement) => {
    if (!announcement.expires_at) return false;
    return new Date(announcement.expires_at) < new Date();
  };

  const activeAnnouncements = announcements.filter(a => a.is_active && !isExpired(a));
  const expiredAnnouncements = announcements.filter(a => !a.is_active || isExpired(a));

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Duyurular</h2>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Yeni Duyuru
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreateAnnouncement} className="mb-8 p-4 bg-gray-50 rounded-lg">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlık
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Duyuru başlığı"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İçerik
            </label>
            <HTMLEditor
              value={content}
              onChange={setContent}
              placeholder="Duyuru içeriği yazın..."
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bitiş Tarihi (Opsiyonel)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Duyuru bu tarihten sonra otomatik olarak sona erecek
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Yükleniyor...' : 'Yayınla'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setTitle('');
                setContent('');
                setExpiresAt('');
                setError('');
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              İptal
            </button>
          </div>
        </form>
      )}

      {activeAnnouncements.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Aktif Duyurular</h3>
          <div className="space-y-4">
            {activeAnnouncements.map((announcement) => (
              <div key={announcement.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {announcement.title}
                    </h3>
                    <div
                      className="text-gray-600 mb-3 announcement-content"
                      dangerouslySetInnerHTML={{ __html: announcement.content }}
                    />
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        Yayınlandı: {new Date(announcement.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {announcement.expires_at && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock size={14} />
                          Bitiş: {new Date(announcement.expires_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      className="ml-4 text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && expiredAnnouncements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sona Eren Duyurular</h3>
          <div className="space-y-4">
            {expiredAnnouncements.map((announcement) => (
              <div key={announcement.id} className="border border-gray-200 rounded-lg p-4 opacity-60 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {announcement.title}
                    </h3>
                    <div
                      className="text-gray-600 mb-3 announcement-content"
                      dangerouslySetInnerHTML={{ __html: announcement.content }}
                    />
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        Yayınlandı: {new Date(announcement.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                      {announcement.expires_at && (
                        <span className="flex items-center gap-1 text-red-600">
                          <Clock size={14} />
                          Sona erdi: {new Date(announcement.expires_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAnnouncement(announcement.id)}
                    className="ml-4 text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {announcements.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">Henüz duyuru yok</p>
        </div>
      )}
    </div>
  );
}

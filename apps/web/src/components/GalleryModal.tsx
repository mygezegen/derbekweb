import { useState, useEffect } from 'react';
import { X, Send, Trash2, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GalleryImage, Member } from '../types';
import { MediaRenderer } from './MediaRenderer';

interface Comment {
  id: string;
  gallery_image_id: string;
  member_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  members?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface GalleryModalProps {
  item: GalleryImage;
  onClose: () => void;
  currentMember?: Member | null;
  isAuthenticated: boolean;
  allImages?: GalleryImage[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

export function GalleryModal({
  item,
  onClose,
  currentMember,
  isAuthenticated,
  allImages = [],
  currentIndex = 0,
  onNavigate
}: GalleryModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [item.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (allImages.length <= 1 || !onNavigate) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : allImages.length - 1;
        onNavigate(prevIndex);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = currentIndex < allImages.length - 1 ? currentIndex + 1 : 0;
        onNavigate(nextIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allImages.length, currentIndex, onNavigate]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_comments')
        .select(`
          *,
          members:member_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('gallery_image_id', item.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentMember || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('gallery_comments')
        .insert({
          gallery_image_id: item.id,
          member_id: currentMember.id,
          comment: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Yorum gönderilirken hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Bu yorumu silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('gallery_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      await loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Yorum silinirken hata oluştu');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;

    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75" onClick={onClose}>
      <div
        className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`md:w-2/3 flex items-center justify-center relative ${
          item.media_type === 'image' ? 'bg-black' : 'bg-white'
        }`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
          >
            <X size={24} />
          </button>

          {allImages.length > 1 && onNavigate && (
            <>
              <button
                onClick={() => {
                  const prevIndex = currentIndex > 0 ? currentIndex - 1 : allImages.length - 1;
                  onNavigate(prevIndex);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 transition-colors"
                aria-label="Önceki"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() => {
                  const nextIndex = currentIndex < allImages.length - 1 ? currentIndex + 1 : 0;
                  onNavigate(nextIndex);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 transition-colors"
                aria-label="Sonraki"
              >
                <ChevronRight size={24} />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} / {allImages.length}
              </div>
            </>
          )}

          <div className="w-full h-[50vh] md:h-[90vh]">
            <MediaRenderer item={item} className={
              item.media_type === 'image'
                ? "w-full h-full object-contain"
                : "w-full h-full"
            } />
          </div>
        </div>

        <div className="md:w-1/3 flex flex-col max-h-[40vh] md:max-h-[90vh]">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-lg text-gray-800">
              {item.caption || 'Galeri'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {formatDate(item.created_at)}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="text-center text-gray-500 py-8">Yorumlar yükleniyor...</div>
            ) : comments.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Henüz yorum yapılmamış
                {isAuthenticated && <p className="text-sm mt-2">İlk yorumu siz yapın!</p>}
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="flex-shrink-0">
                    {comment.members?.avatar_url ? (
                      <img
                        src={comment.members.avatar_url}
                        alt={comment.members.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <User size={20} className="text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-800">
                          {comment.members?.full_name || 'Bilinmeyen'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </p>
                      </div>
                      {currentMember?.id === comment.member_id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-600 hover:text-red-800 transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1 break-words">
                      {comment.comment}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {isAuthenticated && currentMember ? (
            <form onSubmit={handleSubmitComment} className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Yorum yazın..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={submitting}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-600">
              Yorum yapmak için giriş yapmalısınız
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

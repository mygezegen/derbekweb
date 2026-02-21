import { useState } from 'react';
import { GalleryImage } from '../types';

interface MediaRendererProps {
  item: GalleryImage;
  className?: string;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  if (url.length === 11 && !url.includes('/') && !url.includes('?')) {
    return url;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\/\s]{11})/,
    /youtube\.com\/shorts\/([^&?\/\s]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function extractInstagramCode(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /instagram\.com\/(?:p|reel)\/([^/?]+)/,
    /instagram\.com\/tv\/([^/?]+)/,
    /instagr\.am\/p\/([^/?]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function extractFacebookVideoId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /facebook\.com\/watch\/?\?v=(\d+)/,
    /facebook\.com\/.*\/videos\/(\d+)/,
    /fb\.watch\/([^/?]+)/,
    /facebook\.com\/.*\/posts\/(\d+)/,
    /facebook\.com\/photo\.php\?fbid=(\d+)/,
    /facebook\.com\/permalink\.php\?story_fbid=(\d+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function MediaRenderer({ item, className = '' }: MediaRendererProps) {
  const [embedError, setEmbedError] = useState(false);

  if (item.media_type === 'youtube') {
    const videoId = extractYouTubeId(item.video_url || '');

    if (!videoId) {
      return (
        <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
          <p className="text-red-600 text-sm p-4 text-center">Geçersiz YouTube URL</p>
        </div>
      );
    }

    return (
      <div className={`relative ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title={item.caption || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  if (item.media_type === 'instagram') {
    const postCode = extractInstagramCode(item.video_url || '');

    if (!postCode) {
      return (
        <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
          <p className="text-red-600 text-sm p-4 text-center">Geçersiz Instagram URL</p>
        </div>
      );
    }

    if (embedError) {
      return (
        <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
          <a
            href={`https://www.instagram.com/p/${postCode}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-600 hover:text-pink-700 text-sm p-4 text-center underline"
          >
            Instagram'da Görüntüle
          </a>
        </div>
      );
    }

    return (
      <div className={`relative bg-white ${className}`}>
        <iframe
          src={`https://www.instagram.com/p/${postCode}/embed`}
          title={item.caption || 'Instagram post'}
          allowFullScreen
          scrolling="no"
          className="w-full h-full border-0"
          onError={() => setEmbedError(true)}
        />
      </div>
    );
  }

  if (item.media_type === 'facebook') {
    const videoUrl = item.video_url || '';

    if (!videoUrl) {
      return (
        <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
          <p className="text-red-600 text-sm p-4 text-center">Geçersiz Facebook URL</p>
        </div>
      );
    }

    if (embedError) {
      return (
        <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 text-sm p-4 text-center underline"
          >
            Facebook'ta Görüntüle
          </a>
        </div>
      );
    }

    const isVideo = videoUrl.includes('/videos/') || videoUrl.includes('watch');
    const embedUrl = isVideo
      ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}&show_text=false&width=734`
      : `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(videoUrl)}&show_text=false&width=500`;

    return (
      <div className={`relative bg-white ${className}`}>
        <iframe
          src={embedUrl}
          title={item.caption || 'Facebook içeriği'}
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          className="w-full h-full border-0"
          onError={() => setEmbedError(true)}
        />
      </div>
    );
  }

  return (
    <img
      src={item.image_url}
      alt={item.caption || 'Galeri fotoğrafı'}
      className={className}
    />
  );
}

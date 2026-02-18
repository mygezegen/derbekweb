import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, Bell, Image, Mail, Phone, MapPin, ArrowRight, Clock, Users, MessageCircle, Youtube, Instagram, Facebook, LogIn } from 'lucide-react';
import { PublicCalendarView } from '../components/PublicCalendarView';
import { GalleryModal } from '../components/GalleryModal';
import { GalleryImage } from '../types';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
}

interface GalleryItem {
  id: string;
  title: string;
  media_type: 'image' | 'youtube' | 'instagram' | 'facebook';
  image_url: string;
  video_url?: string;
  created_at: string;
}

interface BoardMember {
  id: string;
  full_name: string;
  position: string;
  email: string;
  phone: string;
  photo_url: string;
  display_order: number;
}

interface ContactInfo {
  address: string;
  phone: string;
  email: string;
  social_media?: {
    facebook?: string;
    youtube?: string;
    instagram?: string;
  };
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<GalleryImage | null>(null);
  const [selectedGalleryImages, setSelectedGalleryImages] = useState<GalleryImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: announcementsData } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });

    const { data: galleryData } = await supabase
      .from('galleries')
      .select('id, title, cover_image_url, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(6);

    const { data: boardData } = await supabase
      .from('board_members')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    const { data: contactData } = await supabase
      .from('contact_info')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (announcementsData) setAnnouncements(announcementsData);
    if (eventsData) setEvents(eventsData);
    if (galleryData) {
      setGallery(galleryData.map(item => ({
        ...item,
        media_type: 'image' as 'image' | 'youtube' | 'instagram',
        image_url: item.cover_image_url || ''
      })));
    }
    if (boardData) setBoardMembers(boardData);
    if (contactData) setContactInfo(contactData);
  };

  const handleGalleryClick = async (item: GalleryItem) => {
    const { data: galleryImages } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('gallery_id', item.id)
      .order('display_order', { ascending: true });

    if (galleryImages && galleryImages.length > 0) {
      const images = galleryImages.map(img => ({
        ...img,
        media_type: img.media_type || 'image'
      }));
      setSelectedGalleryImages(images);
      setCurrentImageIndex(0);
      setSelectedGalleryImage(images[0]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-amber-50 to-rose-50">
      <div className="relative bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white">
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 bg-white text-emerald-600 px-6 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition-colors shadow-lg"
          >
            <LogIn size={20} />
            Üye Girişi
          </button>
        </div>
        <button
          onClick={() => navigate('/')}
          className="relative z-10 container mx-auto px-4 py-12 text-center w-full hover:opacity-90 transition-opacity cursor-pointer"
        >
          <div className="mb-6 flex justify-center">
            <div className="w-32 h-32 bg-white rounded-full p-2 shadow-2xl">
              <img
                src="/sdas.jpeg"
                alt="Dernek Logosu"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg">
            Diyarbakır Çüngüş Çaybaşı Köyü
          </h1>
          <h2 className="text-xl md:text-2xl font-light opacity-95 drop-shadow">
            Yardımlaşma ve Dayanışma Derneği
          </h2>
          <p className="mt-4 text-lg opacity-90 max-w-2xl mx-auto">
            Birlikte daha güçlüyüz. Yardımlaşma ve dayanışma ruhuyla geleceğe yürüyoruz.
          </p>
        </button>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <section className="mb-16">
          <div className="flex items-center justify-center mb-8">
            <Mail className="w-8 h-8 text-emerald-600 mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">İletişim</h2>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-semibold text-gray-800 mb-6">
                  Bize Ulaşın
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="bg-emerald-100 p-3 rounded-lg">
                      <MapPin className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">Adres</h4>
                      <p className="text-gray-600">
                        {contactInfo?.address || 'Çaybaşı Köyü, Çüngüş, Diyarbakır'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="bg-rose-100 p-3 rounded-lg">
                      <Phone className="w-6 h-6 text-rose-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">Telefon</h4>
                      <p className="text-gray-600">{contactInfo?.phone || '+90 XXX XXX XX XX'}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="bg-amber-100 p-3 rounded-lg">
                      <Mail className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">E-posta</h4>
                      <p className="text-gray-600">{contactInfo?.email || 'info@caybasi.org'}</p>
                    </div>
                  </div>

                  {contactInfo?.social_media && (contactInfo.social_media.youtube || contactInfo.social_media.instagram || contactInfo.social_media.facebook) && (
                    <div className="pt-6 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-4">Sosyal Medya</h4>
                      <div className="flex items-center gap-4">
                        {contactInfo.social_media.youtube && (
                          <a
                            href={contactInfo.social_media.youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-red-100 p-3 rounded-lg hover:bg-red-200 transition-colors group"
                            title="YouTube"
                          >
                            <Youtube className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform" />
                          </a>
                        )}
                        {contactInfo.social_media.instagram && (
                          <a
                            href={contactInfo.social_media.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-pink-100 p-3 rounded-lg hover:bg-pink-200 transition-colors group"
                            title="Instagram"
                          >
                            <Instagram className="w-6 h-6 text-pink-600 group-hover:scale-110 transition-transform" />
                          </a>
                        )}
                        {contactInfo.social_media.facebook && (
                          <a
                            href={contactInfo.social_media.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-100 p-3 rounded-lg hover:bg-blue-200 transition-colors group"
                            title="Facebook"
                          >
                            <Facebook className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-amber-50 rounded-lg p-8 flex flex-col justify-center items-center text-center">
                <Users className="w-16 h-16 text-emerald-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Üye Olmak İster misiniz?
                </h3>
                <p className="text-gray-600 mb-6">
                  Derneğimize katılarak köyümüzün ve hemşehrilerimizin kalkınmasına katkıda bulunabilirsiniz.
                </p>
                <button
                  onClick={() => navigate('/app')}
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-green-700 transform hover:scale-105 transition-all duration-200"
                >
                  <span>Üye İşlemleri</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <div className="flex items-center justify-center mb-8">
            <Bell className="w-8 h-8 text-emerald-600 mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Duyurular</h2>
          </div>
          {announcements.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border-t-4 border-rose-400"
                >
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatDate(announcement.created_at)}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">
                    {announcement.title}
                  </h3>
                  <div
                    className="text-gray-600 line-clamp-3 announcement-content"
                    dangerouslySetInnerHTML={{ __html: announcement.content }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12 bg-white rounded-xl shadow-md">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Henüz duyuru bulunmamaktadır.</p>
            </div>
          )}
        </section>

        <section className="mb-16">
          <div className="flex items-center justify-center mb-8">
            <Calendar className="w-8 h-8 text-emerald-600 mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Etkinlikler</h2>
          </div>
          {events.length > 0 ? (
            <PublicCalendarView events={events} />
          ) : (
            <div className="text-center text-gray-500 py-12 bg-white rounded-xl shadow-md">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Henüz etkinlik bulunmamaktadır.</p>
            </div>
          )}
        </section>

        <section className="mb-16">
          <div className="flex items-center justify-center mb-8">
            <Users className="w-8 h-8 text-emerald-600 mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Dernek Yönetimimiz</h2>
          </div>
          {boardMembers.length > 0 ? (
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {boardMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 text-center"
                >
                  {member.photo_url ? (
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-emerald-100">
                      <img
                        src={member.photo_url}
                        alt={member.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-emerald-200">
                      <Users className="w-12 h-12 text-emerald-600" />
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    {member.full_name}
                  </h3>
                  <p className="text-emerald-600 font-medium mb-3">
                    {member.position}
                  </p>
                  {member.email && (
                    <p className="text-sm text-gray-600 mb-1 flex items-center justify-center">
                      <Mail className="w-3 h-3 mr-1" />
                      {member.email}
                    </p>
                  )}
                  {member.phone && (
                    <p className="text-sm text-gray-600 flex items-center justify-center">
                      <Phone className="w-3 h-3 mr-1" />
                      {member.phone}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12 bg-white rounded-xl shadow-md">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Dernek yönetimi bilgileri yakında eklenecektir.</p>
            </div>
          )}
        </section>

        <section className="mb-16">
          <div className="flex items-center justify-center mb-8">
            <Image className="w-8 h-8 text-emerald-600 mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Galeri</h2>
          </div>
          {gallery.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {gallery.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
                  onClick={() => handleGalleryClick(item)}
                >
                  <div className="relative h-64 overflow-hidden">
                    {item.cover_image_url ? (
                      <>
                        <img
                          src={item.cover_image_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="text-white font-semibold text-lg">{item.title}</h3>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                        <div className="text-center text-white p-4">
                          <Image className="w-12 h-12 mx-auto mb-3 opacity-90" />
                          <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                          <p className="text-sm opacity-75">Galeriyi Görüntüle</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12 bg-white rounded-xl shadow-md">
              <Image className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Henüz galeri içeriği bulunmamaktadır.</p>
            </div>
          )}
        </section>
      </div>

      {selectedGalleryImage && (
        <GalleryModal
          item={selectedGalleryImage}
          onClose={() => {
            setSelectedGalleryImage(null);
            setSelectedGalleryImages([]);
            setCurrentImageIndex(0);
          }}
          currentMember={null}
          isAuthenticated={false}
          allImages={selectedGalleryImages}
          currentIndex={currentImageIndex}
          onNavigate={(index) => {
            setCurrentImageIndex(index);
            setSelectedGalleryImage(selectedGalleryImages[index]);
          }}
        />
      )}

      <a
        href="https://wa.me/905322834038?text=Size%20www.caybasi.org%20%C3%BCzerinden%20ula%C5%9F%C4%B1yorum"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="WhatsApp ile iletişime geç"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-green-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300 animate-pulse"></div>
          <div className="relative bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-full shadow-2xl hover:shadow-green-500/50 hover:scale-110 transform transition-all duration-300">
            <MessageCircle className="w-7 h-7" />
          </div>
        </div>
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
          <div className="bg-gray-900 text-white text-sm py-2 px-4 rounded-lg shadow-xl whitespace-nowrap">
            WhatsApp ile iletişime geç
            <div className="absolute top-full right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </a>

      <footer className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-4">
            <p className="text-sm opacity-90">
              © 2026 Diyarbakır Çüngüş Çaybaşı Köyü Yardımlaşma ve Dayanışma Derneği
            </p>
            <p className="text-sm opacity-90 mt-1">Tüm Hakları Saklıdır</p>
          </div>
          <div className="pt-4 border-t border-gray-700">
            <p className="text-sm opacity-75">
              Powered By <span className="font-semibold text-emerald-400">Ahmet Taştelen</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

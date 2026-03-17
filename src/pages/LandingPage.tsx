import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Calendar, Bell, Image, Mail, Phone, MapPin, ArrowRight, Clock, Users,
  MessageCircle, Youtube, Instagram, Facebook, LogIn, Landmark, CreditCard,
  Copy, Check, ChevronDown, Menu, X, Star, Heart, Globe, ClipboardList,
  ChevronRight, Timer, Cross, RefreshCw, AlertCircle, Map, Search
} from 'lucide-react';
import { PublicCalendarView } from '../components/PublicCalendarView';
import { GalleryModal } from '../components/GalleryModal';
import { GalleryImage, BankAccount } from '../types';

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
  image_url?: string;
}

interface GalleryItem {
  id: string;
  title: string;
  media_type: 'image' | 'youtube' | 'instagram' | 'facebook';
  image_url: string;
  cover_image_url?: string;
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

interface Survey {
  id: string;
  title: string;
  description: string;
  status: string;
  ends_at: string | null;
  created_at: string;
  is_anonymous: boolean;
  question_count?: number;
}

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
  pharmacyDutyStart: string | null;
  pharmacyDutyEnd: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ContactInfo {
  address: string;
  phone: string;
  email: string;
  whatsapp_number?: string;
  social_media?: {
    facebook?: string;
    youtube?: string;
    instagram?: string;
  };
  bank_accounts?: BankAccount[];
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
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
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [copiedIban, setCopiedIban] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);
  const [pharmacyError, setPharmacyError] = useState('');
  const [pharmacyDistrict, setPharmacyDistrict] = useState('');
  const [pharmacySearch, setPharmacySearch] = useState('');
  const [pharmacyApiMissing, setPharmacyApiMissing] = useState(false);

  useEffect(() => {
    loadData();
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadData = async () => {
    const [announcementsRes, eventsRes, galleryRes, boardRes, contactRes, surveysRes] = await Promise.all([
      supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3),
      supabase.from('events').select('*').order('event_date', { ascending: true }),
      supabase.from('galleries').select('id, title, cover_image_url, created_at').eq('is_public', true).order('created_at', { ascending: false }).limit(6),
      supabase.from('board_members').select('*').eq('is_active', true).order('display_order', { ascending: true }),
      supabase.from('contact_info').select('*').limit(1).maybeSingle(),
      supabase.from('surveys').select('id, title, description, status, ends_at, created_at, is_anonymous, survey_questions(count)').eq('status', 'published').order('created_at', { ascending: false }),
    ]);

    if (announcementsRes.data) setAnnouncements(announcementsRes.data);
    if (eventsRes.data) setEvents(eventsRes.data);
    if (galleryRes.data) {
      setGallery(galleryRes.data.map(item => ({
        ...item,
        media_type: 'image' as 'image',
        image_url: item.cover_image_url || ''
      })));
    }
    if (boardRes.data) setBoardMembers(boardRes.data);
    if (contactRes.data) setContactInfo(contactRes.data);
    if (surveysRes.data) {
      setSurveys(surveysRes.data.map((s: Record<string, unknown>) => ({
        ...s,
        question_count: Array.isArray(s.survey_questions) ? (s.survey_questions as {count: number}[])[0]?.count ?? 0 : 0,
      })) as Survey[]);
    }
  };

  const ISTANBUL_DISTRICTS = [
    'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
    'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
    'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
    'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
    'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
    'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
    'Ümraniye', 'Üsküdar', 'Zeytinburnu',
  ];

  const fetchPharmacies = async (district?: string) => {
    setPharmacyLoading(true);
    setPharmacyError('');
    setPharmacyApiMissing(false);
    try {
      const params = new URLSearchParams({ city: 'istanbul' });
      if (district) {
        params.set('district', district.toLowerCase()
          .replace(/\s+/g, '-').replace(/ğ/g, 'g').replace(/ü/g, 'u')
          .replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o')
          .replace(/ç/g, 'c').replace(/İ/g, 'i').replace(/Ğ/g, 'g')
          .replace(/Ü/g, 'u').replace(/Ş/g, 's').replace(/Ö/g, 'o').replace(/Ç/g, 'c'));
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pharmacy-duty?${params}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      let result: Record<string, unknown>;
      try { result = await res.json(); } catch { throw new Error(`HTTP ${res.status}`); }
      if (!res.ok) {
        if (result.code === 'API_KEY_MISSING') { setPharmacyApiMissing(true); return; }
        throw new Error((result.error as string) || `HTTP ${res.status}`);
      }
      const data = result.data as Pharmacy[] | undefined;
      if (!data || !Array.isArray(data)) throw new Error('Geçersiz yanıt');
      setPharmacies(data);
    } catch (err: unknown) {
      setPharmacyError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setPharmacyLoading(false);
    }
  };

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban).then(() => {
      setCopiedIban(iban);
      setTimeout(() => setCopiedIban(null), 2000);
    });
  };

  const normalizeGalleryImage = (img: GalleryImage): GalleryImage => {
    if (img.media_type === 'image' && img.image_url && img.image_url.includes('facebook.com')) {
      return { ...img, media_type: 'facebook', video_url: img.image_url };
    }
    return img;
  };

  const handleGalleryClick = async (item: GalleryItem) => {
    const { data: galleryImages } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('gallery_id', item.id)
      .order('display_order', { ascending: true });

    if (galleryImages && galleryImages.length > 0) {
      const images = galleryImages.map(img => normalizeGalleryImage({ ...img, media_type: img.media_type || 'image' }));
      setSelectedGalleryImages(images);
      setCurrentImageIndex(0);
      setSelectedGalleryImage(images[0]);
    } else {
      const isFacebook = item.image_url?.includes('facebook.com');
      const placeholder: GalleryImage = {
        id: item.id,
        gallery_id: item.id,
        media_type: isFacebook ? 'facebook' : 'image',
        image_url: isFacebook ? '' : (item.image_url || ''),
        video_url: isFacebook ? item.image_url : undefined,
        caption: item.title,
        display_order: 0,
        created_by: '',
        created_at: item.created_at,
      };
      setSelectedGalleryImages([placeholder]);
      setCurrentImageIndex(0);
      setSelectedGalleryImage(placeholder);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
    setActiveSection(id);
  };

  const navLinks = [
    { id: 'duyurular', label: 'Duyurular' },
    { id: 'etkinlikler', label: 'Etkinlikler' },
    { id: 'anketler', label: 'Anketler' },
    { id: 'yonetim', label: 'Yönetim' },
    { id: 'galeri', label: 'Galeri' },
    { id: 'nobetci-eczane', label: 'Nöbetçi Eczane' },
    { id: 'iletisim', label: 'İletişim' },
  ];

  const isSurveyExpired = (ends_at: string | null) => {
    if (!ends_at) return false;
    return new Date(ends_at) < new Date();
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Sticky Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-md' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => scrollTo('hero')} className="flex items-center gap-3 group">
              <div className={`w-9 h-9 rounded-full overflow-hidden ring-2 transition-all ${scrolled ? 'ring-emerald-500' : 'ring-white/60'}`}>
                <img src="/sdas.jpeg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <span className={`font-bold text-sm hidden sm:block transition-colors ${scrolled ? 'text-gray-800' : 'text-white'}`}>
                Çaybaşı Derneği
              </span>
            </button>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    scrolled
                      ? 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  } ${activeSection === link.id ? (scrolled ? 'text-emerald-600 bg-emerald-50' : 'text-white bg-white/10') : ''}`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  scrolled
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-white text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <LogIn size={15} />
                Üye Girişi
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="w-full text-left px-4 py-2.5 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm font-medium transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 mt-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold"
              >
                <LogIn size={15} />
                Üye Girişi
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen flex flex-col justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute -inset-2 bg-white/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-36 h-36 bg-white rounded-full p-2 shadow-2xl ring-4 ring-white/30">
                <img src="/sdas.jpeg" alt="Dernek Logosu" className="w-full h-full object-contain rounded-full" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-4 drop-shadow-lg">
            Diyarbakır Çüngüş
            <br />
            <span className="text-emerald-200">Çaybaşı Köyü</span>
          </h1>
          <p className="text-xl sm:text-2xl text-emerald-100 font-light mb-6">
            Yardımlaşma ve Dayanışma Derneği
          </p>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Birlikte daha güçlüyüz. Yardımlaşma ve dayanışma ruhuyla geleceğe yürüyoruz.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="inline-flex items-center gap-2 bg-white text-emerald-700 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:bg-emerald-50 transform hover:scale-105 transition-all duration-200"
            >
              <Star size={20} />
              Üye Ol
            </button>
            <button
              onClick={() => scrollTo('duyurular')}
              className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/30 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-200 backdrop-blur-sm"
            >
              Daha Fazla Keşfet
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

        <button
          onClick={() => scrollTo('duyurular')}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition-colors animate-bounce z-10"
        >
          <ChevronDown size={36} />
        </button>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Users, label: 'Aktif Üye', value: '100+', color: 'text-emerald-600' },
              { icon: Calendar, label: 'Etkinlik', value: `${events.length}`, color: 'text-blue-600' },
              { icon: Bell, label: 'Duyuru', value: `${announcements.length}`, color: 'text-amber-600' },
              { icon: Heart, label: 'Yıldır Hizmet', value: '10+', color: 'text-rose-500' },
            ].map((stat, i) => (
              <AnimatedSection key={i} delay={i * 100} className="flex flex-col items-center text-center">
                <div className={`mb-2 ${stat.color}`}>
                  <stat.icon size={28} />
                </div>
                <div className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-gray-500 font-medium mt-0.5">{stat.label}</div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Membership CTA */}
      <section className="py-8 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 text-white">
              <div className="bg-white/20 rounded-2xl p-4 hidden sm:block">
                <Globe size={32} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold">Derneğimize Katılın</h3>
                <p className="text-emerald-100 text-sm sm:text-base">Köyümüzün kalkınmasına katkıda bulunun</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/signup')}
              className="flex items-center gap-2 bg-white text-emerald-700 px-7 py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-emerald-50 transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
            >
              Hemen Üye Ol
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Announcements */}
        <section id="duyurular" className="py-20">
          <AnimatedSection>
            <div className="flex flex-col items-center mb-12">
              <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                <Bell size={15} />
                Güncel Haberler
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Duyurular</h2>
              <div className="w-16 h-1 bg-gradient-to-r from-rose-400 to-rose-600 rounded-full" />
            </div>
          </AnimatedSection>

          {announcements.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {announcements.map((announcement, i) => (
                <AnimatedSection key={announcement.id} delay={i * 120}>
                  <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 h-full flex flex-col">
                    <div className="h-1.5 bg-gradient-to-r from-rose-400 to-rose-600" />
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                        <Clock size={13} />
                        {formatDate(announcement.created_at)}
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-3 group-hover:text-rose-600 transition-colors">
                        {announcement.title}
                      </h3>
                      <div
                        className="text-gray-500 text-sm leading-relaxed line-clamp-4 announcement-content flex-1"
                        dangerouslySetInnerHTML={{ __html: announcement.content }}
                      />
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          ) : (
            <AnimatedSection>
              <div className="text-center text-gray-400 py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Bell size={40} className="mx-auto mb-3 opacity-30" />
                <p>Henüz duyuru bulunmamaktadır.</p>
              </div>
            </AnimatedSection>
          )}
        </section>

        {/* Events */}
        <section id="etkinlikler" className="py-20 border-t border-gray-100">
          <AnimatedSection>
            <div className="flex flex-col items-center mb-12">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                <Calendar size={15} />
                Program
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Etkinlikler</h2>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" />
            </div>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            {events.length > 0 ? (
              <PublicCalendarView events={events} />
            ) : (
              <div className="text-center text-gray-400 py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                <p>Henüz etkinlik bulunmamaktadır.</p>
              </div>
            )}
          </AnimatedSection>
        </section>

        {/* Surveys */}
        <section id="anketler" className="py-20 border-t border-gray-100">
          <AnimatedSection>
            <div className="flex flex-col items-center mb-12">
              <div className="inline-flex items-center gap-2 bg-sky-50 text-sky-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                <ClipboardList size={15} />
                Katılın
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Anketler</h2>
              <div className="w-16 h-1 bg-gradient-to-r from-sky-400 to-sky-600 rounded-full" />
              <p className="text-gray-500 text-sm mt-4 text-center max-w-xl">
                Görüşleriniz bizim için değerli. Aşağıdaki anketlere katılarak derneğimize katkıda bulunabilirsiniz.
              </p>
            </div>
          </AnimatedSection>

          {surveys.filter(s => !isSurveyExpired(s.ends_at)).length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {surveys.map((survey, i) => {
                const expired = isSurveyExpired(survey.ends_at);
                if (expired) return null;
                return (
                  <AnimatedSection key={survey.id} delay={i * 100}>
                    <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col hover:-translate-y-0.5">
                      <div className="h-1.5 bg-gradient-to-r from-sky-400 to-sky-600" />
                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="bg-sky-50 p-2.5 rounded-xl flex-shrink-0">
                            <ClipboardList size={20} className="text-sky-600" />
                          </div>
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            {survey.is_anonymous && (
                              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium">
                                Anonim
                              </span>
                            )}
                            {survey.ends_at && (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-xs px-2 py-0.5 rounded-full font-medium">
                                <Timer size={11} />
                                {new Date(survey.ends_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-gray-800 mb-2 group-hover:text-sky-600 transition-colors leading-snug">
                          {survey.title}
                        </h3>

                        {survey.description && (
                          <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-4 flex-1">
                            {survey.description}
                          </p>
                        )}

                        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={11} />
                            {formatDate(survey.created_at)}
                          </span>
                          <button
                            onClick={() => navigate(`/survey/${survey.id}`)}
                            className="inline-flex items-center gap-1.5 bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors group-hover:shadow-md"
                          >
                            Katıl
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </AnimatedSection>
                );
              })}
            </div>
          ) : (
            <AnimatedSection>
              <div className="text-center text-gray-400 py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                <p>Şu anda aktif anket bulunmamaktadır.</p>
              </div>
            </AnimatedSection>
          )}
        </section>

        {/* Board Members */}
        <section id="yonetim" className="py-20 border-t border-gray-100">
          <AnimatedSection>
            <div className="flex flex-col items-center mb-12">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                <Users size={15} />
                Ekibimiz
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Dernek Yönetimimiz</h2>
              <div className="w-16 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" />
            </div>
          </AnimatedSection>

          {boardMembers.length > 0 ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {boardMembers.map((member, i) => (
                <AnimatedSection key={member.id} delay={i * 80}>
                  <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 text-center border border-gray-100 hover:-translate-y-1">
                    {member.photo_url ? (
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden ring-4 ring-emerald-100 group-hover:ring-emerald-300 transition-all">
                        <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center ring-4 ring-emerald-100 group-hover:ring-emerald-300 transition-all">
                        <Users size={36} className="text-emerald-500" />
                      </div>
                    )}
                    <h3 className="font-bold text-gray-800 mb-1 text-sm leading-tight">{member.full_name}</h3>
                    <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
                      {member.position}
                    </span>
                    {member.email && (
                      <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mb-1 truncate">
                        <Mail size={11} />{member.email}
                      </p>
                    )}
                    {member.phone && (
                      <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                        <Phone size={11} />{member.phone}
                      </p>
                    )}
                  </div>
                </AnimatedSection>
              ))}
            </div>
          ) : (
            <AnimatedSection>
              <div className="text-center text-gray-400 py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p>Dernek yönetimi bilgileri yakında eklenecektir.</p>
              </div>
            </AnimatedSection>
          )}
        </section>

        {/* Gallery */}
        <section id="galeri" className="py-20 border-t border-gray-100">
          <AnimatedSection>
            <div className="flex flex-col items-center mb-12">
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                <Image size={15} />
                Fotoğraflar
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Galeri</h2>
              <div className="w-16 h-1 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" />
            </div>
          </AnimatedSection>

          {gallery.length > 0 ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
              {gallery.map((item, i) => (
                <AnimatedSection key={item.id} delay={i * 80}>
                  <div
                    className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 aspect-[4/3] bg-gray-100"
                    onClick={() => handleGalleryClick(item)}
                  >
                    {item.cover_image_url && !item.cover_image_url.includes('facebook.com') && !item.cover_image_url.includes('instagram.com') ? (
                      <img
                        src={item.cover_image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Image size={40} className="mx-auto mb-2 opacity-80" />
                          <span className="text-sm font-medium opacity-75">Galeriyi Görüntüle</span>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                      <div className="p-4 w-full">
                        <p className="text-white font-semibold text-sm">{item.title}</p>
                        <p className="text-white/70 text-xs mt-0.5">{formatDate(item.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          ) : (
            <AnimatedSection>
              <div className="text-center text-gray-400 py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Image size={40} className="mx-auto mb-3 opacity-30" />
                <p>Henüz galeri içeriği bulunmamaktadır.</p>
              </div>
            </AnimatedSection>
          )}
        </section>

        {/* Duty Pharmacy */}
        <section id="nobetci-eczane" className="py-20 border-t border-gray-100">
          <AnimatedSection>
            <div className="flex flex-col items-center mb-12">
              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                <Cross size={15} />
                Sağlık Hizmetleri
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Nöbetçi Eczaneler</h2>
              <div className="w-16 h-1 bg-gradient-to-r from-green-500 to-green-700 rounded-full" />
              <p className="text-gray-500 text-sm mt-4 text-center max-w-xl">
                İstanbul geneli güncel nöbetçi eczane bilgilerine ulaşın.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Eczane adı veya adres ara..."
                    value={pharmacySearch}
                    onChange={e => setPharmacySearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={pharmacyDistrict}
                  onChange={e => { setPharmacyDistrict(e.target.value); fetchPharmacies(e.target.value || undefined); }}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white min-w-[180px]"
                >
                  <option value="">Tüm İlçeler</option>
                  {ISTANBUL_DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <button
                  onClick={() => fetchPharmacies(pharmacyDistrict || undefined)}
                  disabled={pharmacyLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                >
                  <RefreshCw size={15} className={pharmacyLoading ? 'animate-spin' : ''} />
                  Yenile
                </button>
              </div>
            </div>

            {pharmacyApiMissing ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
                <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-amber-800 mb-1">API Anahtarı Gerekli</h3>
                  <p className="text-amber-700 text-sm">Bu özelliği kullanmak için yönetici panelinden NosyAPI anahtarı tanımlanmalıdır.</p>
                </div>
              </div>
            ) : pharmacyError ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-red-700 text-sm">{pharmacyError}</p>
              </div>
            ) : pharmacyLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
                <p className="text-gray-500 text-sm">Nöbetçi eczaneler yükleniyor...</p>
              </div>
            ) : pharmacies.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Cross size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">Nöbetçi eczane bilgisi yüklemek için "Yenile" butonuna tıklayın.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  <span className="font-semibold text-gray-700">
                    {pharmacies.filter(p => {
                      if (!pharmacySearch) return true;
                      const q = pharmacySearch.toLowerCase();
                      return p.pharmacyName.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || p.district.toLowerCase().includes(q);
                    }).length}
                  </span> nöbetçi eczane listeleniyor
                  {pharmacyDistrict && <span> — <span className="text-green-600 font-medium">{pharmacyDistrict}</span></span>}
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pharmacies
                    .filter(p => {
                      if (!pharmacySearch) return true;
                      const q = pharmacySearch.toLowerCase();
                      return p.pharmacyName.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || p.district.toLowerCase().includes(q);
                    })
                    .map(pharmacy => (
                      <div key={pharmacy.pharmacyID} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-green-200 transition-all duration-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-white text-sm leading-tight">{pharmacy.pharmacyName}</h3>
                            <span className="flex-shrink-0 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                              {pharmacy.district}
                            </span>
                          </div>
                          {pharmacy.town && <p className="text-green-100 text-xs mt-0.5">{pharmacy.town}</p>}
                        </div>
                        <div className="p-4 space-y-2.5">
                          <div className="flex items-start gap-2">
                            <MapPin size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-600 text-sm leading-relaxed">{pharmacy.address}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-gray-400 flex-shrink-0" />
                            <a href={`tel:${pharmacy.phone.replace(/\s/g, '')}`} className="text-green-700 font-medium text-sm hover:underline">
                              {pharmacy.phone}
                            </a>
                            {pharmacy.phone2 && (
                              <a href={`tel:${pharmacy.phone2.replace(/\s/g, '')}`} className="text-green-600 text-sm hover:underline">
                                / {pharmacy.phone2}
                              </a>
                            )}
                          </div>
                          {(pharmacy.pharmacyDutyStart || pharmacy.pharmacyDutyEnd) && (
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-amber-500 flex-shrink-0" />
                              <span className="text-gray-500 text-xs">
                                {pharmacy.pharmacyDutyStart ? new Date(pharmacy.pharmacyDutyStart).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''} – {pharmacy.pharmacyDutyEnd ? new Date(pharmacy.pharmacyDutyEnd).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              if (pharmacy.latitude && pharmacy.longitude) {
                                window.open(`https://www.google.com/maps/search/?api=1&query=${pharmacy.latitude},${pharmacy.longitude}`, '_blank');
                              } else {
                                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pharmacy.pharmacyName + ' istanbul')}`, '_blank');
                              }
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-600 text-sm transition-colors"
                          >
                            <Map size={14} />
                            Haritada Göster
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </AnimatedSection>
        </section>

        {/* Contact */}
        <section id="iletisim" className="py-20 border-t border-gray-100">
          <AnimatedSection>
            <div className="flex flex-col items-center mb-12">
              <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                <Mail size={15} />
                Ulaşın
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">İletişim</h2>
              <div className="w-16 h-1 bg-gradient-to-r from-teal-400 to-teal-600 rounded-full" />
            </div>
          </AnimatedSection>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Contact Details */}
            <AnimatedSection className="lg:col-span-2" delay={50}>
              <div className="bg-gradient-to-br from-emerald-700 to-teal-700 rounded-2xl p-8 text-white h-full">
                <h3 className="text-xl font-bold mb-8">Bize Ulaşın</h3>
                <div className="space-y-6">
                  {[
                    { icon: MapPin, label: 'Adres', value: contactInfo?.address || 'Çaybaşı Köyü, Çüngüş, Diyarbakır' },
                    { icon: Phone, label: 'Telefon', value: contactInfo?.phone || '+90 XXX XXX XX XX' },
                    { icon: Mail, label: 'E-posta', value: contactInfo?.email || 'info@caybasi.org' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="bg-white/15 p-2.5 rounded-xl flex-shrink-0">
                        <item.icon size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">{item.label}</p>
                        <p className="text-white text-sm leading-relaxed break-all">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {contactInfo?.social_media && (contactInfo.social_media.youtube || contactInfo.social_media.instagram || contactInfo.social_media.facebook) && (
                  <div className="mt-8 pt-6 border-t border-white/20">
                    <p className="text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-4">Sosyal Medya</p>
                    <div className="flex gap-3">
                      {contactInfo.social_media.youtube && (
                        <a href={contactInfo.social_media.youtube} target="_blank" rel="noopener noreferrer"
                          className="bg-white/15 p-3 rounded-xl hover:bg-white/25 transition-colors">
                          <Youtube size={18} />
                        </a>
                      )}
                      {contactInfo.social_media.instagram && (
                        <a href={contactInfo.social_media.instagram} target="_blank" rel="noopener noreferrer"
                          className="bg-white/15 p-3 rounded-xl hover:bg-white/25 transition-colors">
                          <Instagram size={18} />
                        </a>
                      )}
                      {contactInfo.social_media.facebook && (
                        <a href={contactInfo.social_media.facebook} target="_blank" rel="noopener noreferrer"
                          className="bg-white/15 p-3 rounded-xl hover:bg-white/25 transition-colors">
                          <Facebook size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </AnimatedSection>

            {/* Bank Accounts */}
            <AnimatedSection className="lg:col-span-3" delay={150}>
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-emerald-50 p-3 rounded-xl">
                    <Landmark size={22} className="text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Banka Hesap Bilgileri</h3>
                    <p className="text-xs text-gray-400">Aidat ve bağış ödemeleriniz için</p>
                  </div>
                </div>

                {contactInfo?.bank_accounts && contactInfo.bank_accounts.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {contactInfo.bank_accounts.map((acc, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-xl p-4 hover:border-emerald-300 hover:shadow-md transition-all bg-gray-50/50">
                        <div className="flex items-center gap-2 mb-3">
                          <CreditCard size={16} className="text-emerald-600" />
                          <span className="font-bold text-gray-800 text-sm">{acc.bank_name}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-0.5">Hesap Sahibi</p>
                        <p className="text-sm font-semibold text-gray-700 mb-3">{acc.account_holder}</p>
                        <p className="text-xs text-gray-400 mb-1.5">IBAN</p>
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                          <span className="text-xs font-mono text-gray-700 flex-1 break-all leading-relaxed">{acc.iban}</span>
                          <button
                            onClick={() => handleCopyIban(acc.iban)}
                            className="flex-shrink-0 text-gray-400 hover:text-emerald-600 transition-colors p-0.5"
                            title="IBAN kopyala"
                          >
                            {copiedIban === acc.iban
                              ? <Check size={15} className="text-emerald-500" />
                              : <Copy size={15} />
                            }
                          </button>
                        </div>
                        {acc.account_no && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-400 mb-0.5">Hesap No</p>
                            <p className="text-sm text-gray-600">{acc.account_no}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Landmark size={40} className="mb-3 opacity-30" />
                    <p className="text-sm">Banka hesabı bilgisi henüz eklenmemiştir.</p>
                  </div>
                )}
              </div>
            </AnimatedSection>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-emerald-500/40">
                <img src="/sdas.jpeg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-bold text-white">Çaybaşı Derneği</p>
                <p className="text-xs text-gray-400">Diyarbakır Çüngüş Çaybaşı Köyü</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              {navLinks.map(link => (
                <button key={link.id} onClick={() => scrollTo(link.id)} className="hover:text-emerald-400 transition-colors">
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <p>© 2026 Diyarbakır Çüngüş Çaybaşı Köyü Yardımlaşma ve Dayanışma Derneği. Tüm Hakları Saklıdır.</p>
            <p>Powered by <span className="text-emerald-400 font-semibold">Ahmet Taştelen</span></p>
          </div>
        </div>
      </footer>

      {/* Gallery Modal */}
      {selectedGalleryImage && (
        <GalleryModal
          item={selectedGalleryImage}
          onClose={() => { setSelectedGalleryImage(null); setSelectedGalleryImages([]); setCurrentImageIndex(0); }}
          currentMember={null}
          isAuthenticated={false}
          allImages={selectedGalleryImages}
          currentIndex={currentImageIndex}
          onNavigate={(index) => { setCurrentImageIndex(index); setSelectedGalleryImage(selectedGalleryImages[index]); }}
        />
      )}

      {/* WhatsApp Floating Button */}
      {(contactInfo?.whatsapp_number || '905322834038') && (
        <a
          href={`https://wa.me/${contactInfo?.whatsapp_number || '905322834038'}?text=Size%20www.caybasi.org%20%C3%BCzerinden%20ula%C5%9F%C4%B1yorum`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="WhatsApp ile iletişime geç"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-green-500 rounded-full blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-300" />
            <div className="relative bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transform transition-all duration-300">
              <MessageCircle size={26} />
            </div>
          </div>
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-gray-900 text-white text-xs py-2 px-3 rounded-lg shadow-xl whitespace-nowrap">
              WhatsApp ile iletişime geç
              <div className="absolute top-full right-5 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </a>
      )}
    </div>
  );
}

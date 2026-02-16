import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Member, Announcement, Event, DashboardStats, PageSetting } from '../types';
import { LogOut, Home, Users, Bell, Calendar, Settings, DollarSign, Image, PackagePlus, Phone, Sliders, Mail, UserCog, FileText, Menu, X } from 'lucide-react';
import { MemberDirectory } from '../components/MemberDirectory';
import { MemberInfo } from '../components/MemberInfo';
import { AnnouncementsList } from '../components/AnnouncementsList';
import { EventsList } from '../components/EventsList';
import { AdminPanel } from '../components/AdminPanel';
import { DuesManagement } from '../components/DuesManagement';
import { GalleryManagement } from '../components/GalleryManagement';
import { BulkOperations } from '../components/BulkOperations';
import { ContactManagement } from '../components/ContactManagement';
import { PageSettings } from '../components/PageSettings';
import { SMTPConfiguration } from '../components/SMTPConfiguration';
import { BoardManagement } from '../components/BoardManagement';
import { EmailTemplates } from '../components/EmailTemplates';

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const navigate = useNavigate();
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'members' | 'announcements' | 'events' | 'dues' | 'gallery' | 'contact' | 'bulk' | 'admin' | 'settings' | 'smtp' | 'board' | 'email-templates'>('home');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pageSettings, setPageSettings] = useState<PageSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (memberData) {
        setCurrentMember(memberData);
      }

      const { data: settingsData } = await supabase
        .from('page_settings')
        .select('*')
        .eq('is_enabled', true)
        .order('display_order', { ascending: true });

      setPageSettings(settingsData || []);

      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const activeAnnouncements = (announcementsData || []).filter(a => {
        if (!a.expires_at) return true;
        return new Date(a.expires_at) > new Date();
      });
      setAnnouncements(activeAnnouncements);

      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });
      setEvents(eventsData || []);

      if (memberData?.is_admin) {
        await loadAdminStats();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminStats = async () => {
    try {
      const { count: totalMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });

      const { data: debtData } = await supabase
        .from('member_dues')
        .select('member_id, paid_amount, dues(amount)')
        .neq('status', 'paid');

      const membersInDebt = new Set(debtData?.map(d => d.member_id)).size;
      const totalDebtAmount = debtData?.reduce((sum, d: any) => {
        const dueAmount = d.dues?.amount || 0;
        const paidAmount = d.paid_amount || 0;
        return sum + (dueAmount - paidAmount);
      }, 0) || 0;

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const { count: paidThisMonth } = await supabase
        .from('member_dues')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid')
        .gte('paid_at', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`);

      const { count: upcomingEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('event_date', new Date().toISOString());

      setStats({
        totalMembers: totalMembers || 0,
        membersInDebt,
        totalDebtAmount,
        paidThisMonth: paidThisMonth || 0,
        upcomingEvents: upcomingEvents || 0,
        recentAnnouncements: announcements.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  const getPageSetting = (pageKey: string) => {
    return pageSettings.find(s => s.page_key === pageKey);
  };

  const isPageVisible = (pageKey: string) => {
    const setting = getPageSetting(pageKey);
    if (!setting || !setting.is_enabled) return false;

    if (currentMember?.is_admin) {
      return setting.visible_to_admin;
    } else {
      return setting.visible_to_members;
    }
  };

  const allTabs = [
    { id: 'home', label: 'Ana Sayfa', icon: Home, pageKey: 'home' },
    { id: 'members', label: currentMember?.is_admin ? 'Üyeler' : 'Üye Bilgileri', icon: Users, pageKey: 'members' },
    { id: 'announcements', label: 'Duyurular', icon: Bell, pageKey: 'announcements' },
    { id: 'events', label: 'Etkinlikler', icon: Calendar, pageKey: 'events' },
    { id: 'dues', label: 'Aidatlar', icon: DollarSign, pageKey: 'dues' },
    { id: 'gallery', label: 'Galeri', icon: Image, pageKey: 'gallery' },
    { id: 'contact', label: 'İletişim', icon: Phone, pageKey: 'contact' },
    ...(currentMember?.is_admin ? [
      { id: 'bulk', label: 'Toplu İşlemler', icon: PackagePlus, pageKey: 'bulk' },
      { id: 'admin', label: 'Yönetim', icon: Settings, pageKey: 'admin' },
      { id: 'board', label: 'Dernek Yönetimi', icon: UserCog, pageKey: 'board' },
      { id: 'smtp', label: 'E-posta Ayarları', icon: Mail, pageKey: 'smtp' },
      { id: 'email-templates', label: 'E-posta Şablonları', icon: FileText, pageKey: 'email-templates' },
      { id: 'settings', label: 'Sayfa Ayarları', icon: Sliders, pageKey: 'settings' }
    ] : []),
  ];

  const tabs = allTabs.filter(tab => {
    if (tab.pageKey === 'settings' || tab.pageKey === 'smtp' || tab.pageKey === 'board' || tab.pageKey === 'email-templates') return true;
    return isPageVisible(tab.pageKey);
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-gradient-to-r from-red-600 to-red-700 shadow-lg sticky top-0 z-50 border-b-4 border-green-600">
        <div className="px-4 py-3 md:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-white p-2 hover:bg-red-800 rounded-lg transition-colors flex-shrink-0"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <img src="/sdas.jpeg" alt="Dernek Logo" className="h-10 w-10 md:h-14 md:w-14 object-contain rounded-full bg-white p-1 shadow-md flex-shrink-0" />
            <h1 className="text-sm md:text-base lg:text-lg font-bold text-white drop-shadow-md truncate">Çüngüş Çaybaşı Köyü Yardımlaşma ve Dayanışma Derneği</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white text-red-600 px-3 md:px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium shadow-md text-sm md:text-base flex-shrink-0"
          >
            <LogOut size={18} className="md:hidden" />
            <LogOut size={20} className="hidden md:block" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 relative">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-gradient-to-b from-red-700 to-red-800 shadow-lg overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          mt-[73px] md:mt-[81px] lg:mt-0
        `}>
          <div className="p-4 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon as any;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-green-600 text-white shadow-md'
                      : 'text-red-100 hover:bg-red-600 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto w-full">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8">
        {activeTab === 'home' && (
          <div className="space-y-6 md:space-y-8">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 md:mb-4">
                Hoş geldiniz, {currentMember?.full_name}!
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 md:mb-6">
                Köy dernekte size katkı sunmak için buradayız. Duyuruları takip edin, etkinliklere katılın ve
                topluluk üyeleriyle bağlantı kurun.
              </p>

              {currentMember?.is_admin && stats ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 md:p-6 rounded-lg border border-amber-500/20">
                    <div className="text-2xl md:text-3xl font-bold text-amber-500 mb-2">
                      {stats.totalMembers}
                    </div>
                    <p className="text-sm md:text-base text-gray-200 font-medium">Toplam Üye</p>
                    <p className="text-xs md:text-sm text-gray-400 mt-1">{stats.membersInDebt} borçlu üye</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-900 to-red-800 p-4 md:p-6 rounded-lg border border-red-500/20">
                    <div className="text-2xl md:text-3xl font-bold text-red-300 mb-2">
                      ₺{stats.totalDebtAmount.toFixed(2)}
                    </div>
                    <p className="text-sm md:text-base text-gray-200 font-medium">Toplam Borç</p>
                    <p className="text-xs md:text-sm text-gray-300 mt-1">{stats.membersInDebt} kişiden</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-900 to-green-800 p-4 md:p-6 rounded-lg border border-green-500/20">
                    <div className="text-2xl md:text-3xl font-bold text-green-300 mb-2">
                      {stats.paidThisMonth}
                    </div>
                    <p className="text-sm md:text-base text-gray-200 font-medium">Bu Ay Ödenen</p>
                    <p className="text-xs md:text-sm text-gray-300 mt-1">aidat ödemesi</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-900 to-amber-800 p-4 md:p-6 rounded-lg border border-amber-500/20">
                    <div className="text-2xl md:text-3xl font-bold text-amber-300 mb-2">
                      {stats.upcomingEvents}
                    </div>
                    <p className="text-sm md:text-base text-gray-200 font-medium">Yaklaşan Etkinlik</p>
                  </div>
                  <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 md:p-6 rounded-lg border border-amber-500/20">
                    <div className="text-2xl md:text-3xl font-bold text-amber-400 mb-2">
                      {stats.recentAnnouncements}
                    </div>
                    <p className="text-sm md:text-base text-gray-200 font-medium">Aktif Duyuru</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 md:p-6 rounded-lg border border-amber-500/20">
                    <div className="text-2xl md:text-3xl font-bold text-amber-500 mb-2">
                      {announcements.length}
                    </div>
                    <p className="text-sm md:text-base text-gray-200 font-medium">Aktif Duyuru</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-900 to-amber-800 p-4 md:p-6 rounded-lg border border-amber-500/20">
                    <div className="text-2xl md:text-3xl font-bold text-amber-300 mb-2">
                      {events.filter(e => new Date(e.event_date) > new Date()).length}
                    </div>
                    <p className="text-sm md:text-base text-gray-200 font-medium">Yaklaşan Etkinlik</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Son Duyurular</h3>
              {announcements.length > 0 ? (
                <div className="space-y-3 md:space-y-4">
                  {announcements.slice(0, 3).map((announcement) => (
                    <div key={announcement.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">
                        {announcement.title}
                      </h4>
                      <div
                        className="text-sm sm:text-base text-gray-600 mb-3 announcement-content"
                        dangerouslySetInnerHTML={{ __html: announcement.content }}
                      />
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                        <span>
                          {new Date(announcement.created_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {announcement.expires_at && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Bell size={14} />
                            Bitiş: {new Date(announcement.expires_at).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setActiveTab('announcements')}
                    className="w-full text-center py-2 text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base"
                  >
                    Tüm Duyuruları Gör →
                  </button>
                </div>
              ) : (
                <p className="text-sm sm:text-base text-gray-500 text-center py-4">Henüz duyuru bulunmamaktadır.</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Yaklaşan Etkinlikler</h3>
              {events.filter(e => new Date(e.event_date) > new Date()).length > 0 ? (
                <div className="space-y-3 md:space-y-4">
                  {events.filter(e => new Date(e.event_date) > new Date()).slice(0, 3).map((event) => (
                    <div key={event.id} className="border-l-4 border-emerald-500 bg-emerald-50 p-3 sm:p-4 rounded-r-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">{event.title}</h4>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar size={16} />
                              {new Date(event.event_date).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                📍 {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm sm:text-base text-gray-500 text-center py-4">Henüz yaklaşan etkinlik bulunmamaktadır.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          currentMember?.is_admin ? (
            <MemberDirectory />
          ) : (
            <MemberInfo />
          )
        )}

        {activeTab === 'announcements' && (
          <AnnouncementsList
            announcements={announcements}
            isAdmin={currentMember?.is_admin || false}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'events' && (
          <EventsList
            events={events}
            isAdmin={currentMember?.is_admin || false}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'dues' && currentMember && (
          <DuesManagement
            currentMember={currentMember}
            isAdmin={currentMember.is_admin}
          />
        )}

        {activeTab === 'gallery' && currentMember && (
          <GalleryManagement
            currentMember={currentMember}
            isAdmin={currentMember.is_admin}
          />
        )}

        {activeTab === 'contact' && currentMember && (
          <ContactManagement
            isAdmin={currentMember.is_admin}
          />
        )}

        {activeTab === 'bulk' && currentMember?.is_admin && (
          <BulkOperations />
        )}

        {activeTab === 'admin' && currentMember?.is_admin && (
          <AdminPanel onRefresh={loadData} />
        )}

        {activeTab === 'settings' && currentMember?.is_admin && (
          <PageSettings />
        )}

        {activeTab === 'smtp' && currentMember?.is_admin && (
          <SMTPConfiguration />
        )}

        {activeTab === 'board' && currentMember?.is_admin && (
          <BoardManagement />
        )}

        {activeTab === 'email-templates' && currentMember?.is_admin && (
          <EmailTemplates />
        )}
          </div>
        </main>
      </div>
    </div>
  );
}

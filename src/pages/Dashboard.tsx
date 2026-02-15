import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Member, Announcement, Event, DashboardStats, PageSetting } from '../types';
import { LogOut, Home, Users, Bell, Calendar, Settings, DollarSign, Image, PackagePlus, Phone, Sliders } from 'lucide-react';
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

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'members' | 'announcements' | 'events' | 'dues' | 'gallery' | 'contact' | 'bulk' | 'admin' | 'settings'>('home');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pageSettings, setPageSettings] = useState<PageSetting[]>([]);
  const [loading, setLoading] = useState(true);

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
      { id: 'settings', label: 'Sayfa Ayarları', icon: Sliders, pageKey: 'settings' }
    ] : []),
  ];

  const tabs = allTabs.filter(tab => {
    if (tab.pageKey === 'settings') return true;
    return isPageVisible(tab.pageKey);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-red-600 to-red-700 shadow-lg sticky top-0 z-50 border-b-4 border-green-600">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/sdas.jpeg" alt="Dernek Logo" className="h-14 w-14 object-contain rounded-full bg-white p-1 shadow-md" />
            <h1 className="text-lg font-bold text-white drop-shadow-md">Çüngüş Çaybaşı Köyü Yardımlaşma ve Dayanışma Derneği</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white text-red-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium shadow-md"
          >
            <LogOut size={20} />
            Çıkış
          </button>
        </div>

        <div className="bg-red-700 overflow-x-auto border-t border-red-800">
          <div className="max-w-6xl mx-auto px-4 flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon as any;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-white border-b-3 border-green-500'
                      : 'text-red-100 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'home' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Hoş geldiniz, {currentMember?.full_name}!
              </h2>
              <p className="text-gray-600 mb-6">
                Köy dernekte size katkı sunmak için buradayız. Duyuruları takip edin, etkinliklere katılın ve
                topluluk üyeleriyle bağlantı kurun.
              </p>

              {currentMember?.is_admin && stats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg border border-amber-500/20">
                    <div className="text-3xl font-bold text-amber-500 mb-2">
                      {stats.totalMembers}
                    </div>
                    <p className="text-gray-200 font-medium">Toplam Üye</p>
                    <p className="text-sm text-gray-400 mt-1">{stats.membersInDebt} borçlu üye</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-900 to-red-800 p-6 rounded-lg border border-red-500/20">
                    <div className="text-3xl font-bold text-red-300 mb-2">
                      ₺{stats.totalDebtAmount.toFixed(2)}
                    </div>
                    <p className="text-gray-200 font-medium">Toplam Borç</p>
                    <p className="text-sm text-gray-300 mt-1">{stats.membersInDebt} kişiden</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-900 to-green-800 p-6 rounded-lg border border-green-500/20">
                    <div className="text-3xl font-bold text-green-300 mb-2">
                      {stats.paidThisMonth}
                    </div>
                    <p className="text-gray-200 font-medium">Bu Ay Ödenen</p>
                    <p className="text-sm text-gray-300 mt-1">aidat ödemesi</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-900 to-amber-800 p-6 rounded-lg border border-amber-500/20">
                    <div className="text-3xl font-bold text-amber-300 mb-2">
                      {stats.upcomingEvents}
                    </div>
                    <p className="text-gray-200 font-medium">Yaklaşan Etkinlik</p>
                  </div>
                  <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-lg border border-amber-500/20">
                    <div className="text-3xl font-bold text-amber-400 mb-2">
                      {stats.recentAnnouncements}
                    </div>
                    <p className="text-gray-200 font-medium">Aktif Duyuru</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg border border-amber-500/20">
                    <div className="text-3xl font-bold text-amber-500 mb-2">
                      {announcements.length}
                    </div>
                    <p className="text-gray-200 font-medium">Aktif Duyuru</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-900 to-amber-800 p-6 rounded-lg border border-amber-500/20">
                    <div className="text-3xl font-bold text-amber-300 mb-2">
                      {events.filter(e => new Date(e.event_date) > new Date()).length}
                    </div>
                    <p className="text-gray-200 font-medium">Yaklaşan Etkinlik</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Son Duyurular</h3>
              <AnnouncementsList
                announcements={announcements.slice(0, 3)}
                isAdmin={currentMember?.is_admin || false}
                onRefresh={loadData}
              />
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
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { EventsPage } from './EventsPage';
import { DutyPharmacy } from './DutyPharmacy';
import { InventoryManagement } from './inventory/InventoryManagement';
import { supabase } from '../lib/supabase';
import { Users, Calendar, DollarSign, TrendingUp, Activity } from 'lucide-react';

export function Dashboard() {
  const [currentPage, setCurrentPage] = useState('home');
  const [stats, setStats] = useState({
    totalMembers: 0,
    upcomingEvents: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentPage === 'home') {
      loadStats();
    }
  }, [currentPage]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [membersRes, eventsRes, treasuryRes, duesRes, auditRes] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('events').select('id', { count: 'exact', head: true }).gte('event_date', new Date().toISOString()),
        supabase.from('treasury_summary').select('total_balance').maybeSingle(),
        supabase.from('member_dues').select('id', { count: 'exact', head: true }).eq('payment_status', 'unpaid'),
        supabase.from('audit_logs').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      setStats({
        totalMembers: membersRes.count || 0,
        upcomingEvents: eventsRes.count || 0,
        totalRevenue: treasuryRes.data?.total_balance || 0,
        pendingPayments: duesRes.count || 0,
        recentActivity: auditRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'events':
        return <EventsPage />;
      case 'pharmacy':
        return <DutyPharmacy />;
      case 'inventory':
        return <InventoryManagement />;
      case 'home':
        return (
          <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Yönetim Paneli</h1>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Users className="text-blue-600" size={24} />
                    </div>
                  </div>
                  <h3 className="text-gray-500 text-sm font-medium mb-1">Toplam Üye</h3>
                  <p className="text-3xl font-bold text-gray-800">{stats.totalMembers}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <Calendar className="text-green-600" size={24} />
                    </div>
                  </div>
                  <h3 className="text-gray-500 text-sm font-medium mb-1">Yaklaşan Etkinlik</h3>
                  <p className="text-3xl font-bold text-gray-800">{stats.upcomingEvents}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <DollarSign className="text-emerald-600" size={24} />
                    </div>
                  </div>
                  <h3 className="text-gray-500 text-sm font-medium mb-1">Toplam Bakiye</h3>
                  <p className="text-3xl font-bold text-gray-800">
                    {new Intl.NumberFormat('tr-TR', {
                      style: 'currency',
                      currency: 'TRY',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(stats.totalRevenue)}
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <TrendingUp className="text-orange-600" size={24} />
                    </div>
                  </div>
                  <h3 className="text-gray-500 text-sm font-medium mb-1">Bekleyen Ödeme</h3>
                  <p className="text-3xl font-bold text-gray-800">{stats.pendingPayments}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Activity className="text-purple-600" size={24} />
                    </div>
                  </div>
                  <h3 className="text-gray-500 text-sm font-medium mb-1">Son 7 Gün Aktivite</h3>
                  <p className="text-3xl font-bold text-gray-800">{stats.recentActivity}</p>
                </div>
              </div>
            )}

            <div className="mt-8 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Hızlı Erişim</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <button
                  onClick={() => setCurrentPage('members')}
                  className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 font-medium transition-colors text-sm"
                >
                  Üyeler
                </button>
                <button
                  onClick={() => setCurrentPage('events')}
                  className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-green-700 font-medium transition-colors text-sm"
                >
                  Etkinlikler
                </button>
                <button
                  onClick={() => setCurrentPage('dues')}
                  className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-orange-700 font-medium transition-colors text-sm"
                >
                  Aidatlar
                </button>
                <button
                  onClick={() => setCurrentPage('treasury')}
                  className="p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-700 font-medium transition-colors text-sm"
                >
                  Hazine
                </button>
                <button
                  onClick={() => setCurrentPage('gallery')}
                  className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 font-medium transition-colors text-sm"
                >
                  Galeri
                </button>
                <button
                  onClick={() => setCurrentPage('admin')}
                  className="p-4 bg-red-50 hover:bg-red-100 rounded-lg text-red-700 font-medium transition-colors text-sm"
                >
                  Yönetim
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex-1 p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              {currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}
            </h1>
            <p className="text-gray-600">Bu sayfa şu anda geliştirme aşamasındadır.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      {renderPage()}
    </div>
  );
}

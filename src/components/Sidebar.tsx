import { Home, Users, Bell, Calendar, DollarSign, Wallet, Image as ImageIcon, Phone, FileText, Mail, MessageSquare, BarChart3, Settings, LogOut, Pill, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  id: string;
};

const menuItems: MenuItem[] = [
  { icon: Home, label: 'Ana Sayfa', id: 'home' },
  { icon: Users, label: 'Üyeler', id: 'members' },
  { icon: Bell, label: 'Duyurular', id: 'announcements' },
  { icon: Calendar, label: 'Etkinlikler', id: 'events' },
  { icon: DollarSign, label: 'Aidatlar', id: 'dues' },
  { icon: Wallet, label: 'Kasa Yönetimi', id: 'treasury' },
  { icon: ImageIcon, label: 'Galeri', id: 'gallery' },
  { icon: Package, label: 'Envanter', id: 'inventory' },
  { icon: Pill, label: 'Nöbetçi Eczane', id: 'pharmacy' },
  { icon: Phone, label: 'İletişim', id: 'contact' },
  { icon: FileText, label: 'Bildirimler', id: 'notifications' },
  { icon: Mail, label: 'E-posta Ayarları', id: 'email' },
  { icon: MessageSquare, label: 'SMS Ayarları', id: 'sms' },
  { icon: FileText, label: 'E-posta Şablonları', id: 'email-templates' },
  { icon: BarChart3, label: 'Sayfa Ayarları', id: 'page-settings' },
  { icon: Settings, label: 'Yönetim', id: 'management' },
];

type SidebarProps = {
  currentPage: string;
  onPageChange: (page: string) => void;
};

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const { signOut } = useAuth();

  return (
    <div className="w-64 bg-red-700 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-red-600">
        <div className="flex items-center space-x-3">
          <div className="bg-white rounded-full p-2">
            <svg className="w-6 h-6 text-red-700" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="text-sm">
            <div className="font-semibold">Çüngüş Çaybaşı Köyü</div>
            <div className="text-xs text-red-200">Yardımlaşma ve Dayanışma Derneği</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${
                isActive
                  ? 'bg-green-600 text-white'
                  : 'text-white hover:bg-red-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        onClick={signOut}
        className="flex items-center space-x-3 px-4 py-3 text-white hover:bg-red-600 transition-colors border-t border-red-600"
      >
        <LogOut className="w-5 h-5" />
        <span className="text-sm">Çıkış Yap</span>
      </button>
    </div>
  );
}

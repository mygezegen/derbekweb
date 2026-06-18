import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Member } from '../types';
import { Shield, Trash2, UserPlus, Download, Users, DollarSign, Share2, CheckCircle, Tag, Package, Clock, UserCheck, XCircle, Pencil } from 'lucide-react';
import { MemberDuesPayment } from './MemberDuesPayment';
import { AddMemberModal } from './AddMemberModal';
import { MemberEditModal } from './MemberEditModal';
import { SocialMediaConfiguration } from './SocialMediaConfiguration';
import VerificationManagement from './VerificationManagement';
import { CategoryManagement } from './CategoryManagement';
import { InventoryCategoryManagement } from './inventory/InventoryCategoryManagement';

interface AdminPanelProps {
  onRefresh: () => void;
}

export function AdminPanel({ onRefresh }: AdminPanelProps) {
  const { member: currentMember } = useAuth();
  const isRoot = currentMember?.is_root ?? false;

  const [activeTab, setActiveTab] = useState<'members' | 'payments' | 'social' | 'verification' | 'categories' | 'inventory_categories'>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [pendingDeletionCount, setPendingDeletionCount] = useState(0);

  useEffect(() => {
    loadMembers();
    if (isRoot) loadPendingDeletionCount();
  }, [isRoot]);

  const loadPendingDeletionCount = async () => {
    const { count } = await supabase
      .from('account_deletion_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_admin');
    setPendingDeletionCount(count ?? 0);
  };

  const loadMembers = async () => {
    try {
      const { data } = await supabase
        .from('members')
        .select('*')
        .order('full_name', { ascending: true });
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMakeAdmin = async (memberId: string) => {
    if (!confirm('Bu üyeyi yönetici yapmak istediğinize emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('members')
        .update({ is_admin: true })
        .eq('id', memberId);

      if (error) throw error;
      loadMembers();
    } catch (err) {
      console.error('Error making admin:', err);
    }
  };

  const handleRemoveAdmin = async (memberId: string) => {
    if (!confirm('Bu üyenin yönetici yetkisini kaldırmak istediğinize emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('members')
        .update({ is_admin: false })
        .eq('id', memberId);

      if (error) throw error;
      loadMembers();
    } catch (err) {
      console.error('Error removing admin:', err);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Bu üyeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;

    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      loadMembers();
    } catch (err) {
      console.error('Error deleting member:', err);
    }
  };

  const pendingMembers = members.filter(m => (m as any).pending_approval === true);
  const adminCount = members.filter(m => m.is_admin).length;

  const handleApproveMember = async (memberId: string) => {
    if (!confirm('Bu üyeyi onaylamak istediğinize emin misiniz? Üye sisteme giriş yapabilir hale gelecektir.')) return;
    try {
      const { error } = await supabase
        .from('members')
        .update({ pending_approval: false, is_active: true })
        .eq('id', memberId);
      if (error) throw error;
      loadMembers();
    } catch (err) {
      console.error('Error approving member:', err);
    }
  };

  const handleRejectMember = async (memberId: string) => {
    if (!confirm('Bu üyelik başvurusunu reddetmek istediğinize emin misiniz? Üye kaydı silinecektir.')) return;
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
      loadMembers();
    } catch (err) {
      console.error('Error rejecting member:', err);
    }
  };

  const handleExportMembers = () => {
    const escapeXml = (val: unknown) => {
      if (val === null || val === undefined) return '';
      return String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    const headers = [
      'Kayıt No', 'Ad Soyad', 'TC Kimlik No', 'Cinsiyet', 'E-Posta',
      'Telefon', 'Adres', 'İl', 'İlçe', 'Meslek',
      'Öğrenim Durumu', 'Üye Tipi', 'Durum', 'Yönetici',
      'Kayıt Tarihi', 'Baba Adı', 'Ana Adı'
    ];

    const headerRow = headers.map(h => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('');

    const dataRows = members.map((member) => {
      const fields = [
        member.registry_number || '',
        member.full_name || '',
        member.tc_identity_no || '',
        member.gender === 'male' ? 'Erkek' : member.gender === 'female' ? 'Kadın' : '',
        member.email || '',
        member.phone || '',
        (member.address || '').replace(/[\r\n]+/g, ' '),
        member.province || '',
        member.district || '',
        member.profession || '',
        member.education_level || '',
        member.member_type || '',
        member.is_active !== false ? 'Aktif' : 'Pasif',
        member.is_admin ? 'Evet' : 'Hayır',
        member.registration_date || new Date(member.joined_at).toLocaleDateString('tr-TR'),
        member.father_name || '',
        member.mother_name || ''
      ];
      const cells = fields.map(f => `<Cell><Data ss:Type="String">${escapeXml(f)}</Data></Cell>`).join('');
      return `<Row>${cells}</Row>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Üye Listesi">
    <Table>
      <Row>${headerRow}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `uyeler_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex gap-1 sm:gap-2 px-3 sm:px-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('members')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'members'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Üye Yönetimi</span>
              <span className="sm:hidden">Üyeler</span>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'payments'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <DollarSign size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Aidat Ödemeleri</span>
              <span className="sm:hidden">Ödeme</span>
            </button>
            <button
              onClick={() => setActiveTab('social')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'social'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Share2 size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Sosyal Medya</span>
              <span className="sm:hidden">Sosyal</span>
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'verification'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <CheckCircle size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Doğrulama & Silme</span>
              <span className="sm:hidden">Doğrulama</span>
              {isRoot && pendingDeletionCount > 0 && (
                <span className="bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {pendingDeletionCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'categories'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Tag size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Kasa Kategorileri</span>
              <span className="sm:hidden">Kategoriler</span>
            </button>
            <button
              onClick={() => setActiveTab('inventory_categories')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'inventory_categories'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Package size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Envanter Kategorileri</span>
              <span className="sm:hidden">Env. Kat.</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'members' && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Üye Yönetimi</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">{members.length}</div>
            <p className="text-sm sm:text-base text-gray-600">Toplam Üye</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <div className="text-2xl sm:text-3xl font-bold text-amber-600 mb-2">{pendingMembers.length}</div>
            <p className="text-sm sm:text-base text-gray-600">Onay Bekleyen</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-lg">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600 mb-2">{adminCount}</div>
            <p className="text-sm sm:text-base text-gray-600">Yönetici</p>
          </div>
        </div>

        {pendingMembers.length > 0 && (
          <div className="mb-6 border border-amber-200 rounded-xl overflow-hidden">
            <div className="bg-amber-50 px-4 py-3 flex items-center gap-2 border-b border-amber-200">
              <Clock size={16} className="text-amber-600" />
              <h3 className="font-semibold text-amber-800 text-sm">Onay Bekleyen Başvurular ({pendingMembers.length})</h3>
            </div>
            <div className="divide-y divide-amber-100">
              {pendingMembers.map((member) => (
                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-white hover:bg-amber-50/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-800 text-sm truncate">{member.full_name}</h4>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full whitespace-nowrap">
                        <Clock size={10} />
                        Onay Bekliyor
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{member.email}</p>
                    {member.phone && <p className="text-xs text-gray-400">{member.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveMember(member.id)}
                      className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap"
                    >
                      <UserCheck size={13} />
                      Onayla
                    </button>
                    <button
                      onClick={() => handleRejectMember(member.id)}
                      className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors whitespace-nowrap"
                    >
                      <XCircle size={13} />
                      Reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
          >
            <UserPlus size={18} className="sm:w-5 sm:h-5" />
            Üye Ekle
          </button>
          <button
            onClick={handleExportMembers}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            <Download size={18} className="sm:w-5 sm:h-5" />
            Excel'e Aktar
          </button>
        </div>

        {showAddMember && (
          <AddMemberModal
            onClose={() => setShowAddMember(false)}
            onSaved={() => {
              setShowAddMember(false);
              loadMembers();
              onRefresh();
            }}
          />
        )}

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8 mt-6 md:mt-8">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 md:mb-6">Üye Listesi</h3>

          <div className="space-y-2 md:space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-800 text-sm sm:text-base truncate">{member.full_name}</h4>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{member.email}</p>
                  {member.is_admin && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                      <Shield size={12} />
                      Yönetici
                    </span>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setEditingMember(member)}
                    className="bg-gray-100 text-gray-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-gray-200 transition-colors whitespace-nowrap flex items-center gap-1"
                    title="Düzenle"
                  >
                    <Pencil size={14} />
                    <span className="hidden sm:inline">Düzenle</span>
                  </button>
                  {member.is_admin ? (
                    <button
                      onClick={() => handleRemoveAdmin(member.id)}
                      className="bg-yellow-100 text-yellow-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-yellow-200 transition-colors whitespace-nowrap"
                    >
                      Yöneticiyi Kaldır
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMakeAdmin(member.id)}
                      className="bg-blue-100 text-blue-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-blue-200 transition-colors whitespace-nowrap"
                    >
                      Yönetici Yap
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteMember(member.id)}
                    className="bg-red-100 text-red-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded hover:bg-red-200 transition-colors"
                  >
                    <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {editingMember && (
        <MemberEditModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={() => {
            setEditingMember(null);
            loadMembers();
            onRefresh();
          }}
        />
      )}

      {activeTab === 'payments' && (
        <MemberDuesPayment />
      )}

      {activeTab === 'social' && <SocialMediaConfiguration />}

      {activeTab === 'verification' && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8">
          <VerificationManagement />
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Kasa Kategori Yönetimi</h2>
          <CategoryManagement />
        </div>
      )}

      {activeTab === 'inventory_categories' && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8">
          <InventoryCategoryManagement />
        </div>
      )}
    </div>
  );
}

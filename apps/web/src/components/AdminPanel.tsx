import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Member } from '../types';
import { Shield, Trash2, UserPlus, Download, Users, DollarSign } from 'lucide-react';
import { MemberDuesPayment } from './MemberDuesPayment';
import { AddMemberModal } from './AddMemberModal';

interface AdminPanelProps {
  onRefresh: () => void;
}

export function AdminPanel({ onRefresh }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'payments'>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

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

  const adminCount = members.filter(m => m.is_admin).length;

  const handleExportMembers = () => {
    let csvContent = 'Üye Listesi\n\n';
    csvContent += 'Ad Soyad,Email,Telefon,Adres,Yönetici,Katılım Tarihi\n';

    members.forEach((member) => {
      csvContent += `${member.full_name},${member.email},${member.phone || ''},${member.address || ''},${member.is_admin ? 'Evet' : 'Hayır'},${new Date(member.joined_at).toLocaleDateString('tr-TR')}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `uyeler_${new Date().toISOString().split('T')[0]}.csv`;
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
          </div>
        </div>
      </div>

      {activeTab === 'members' && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Üye Yönetimi</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">{members.length}</div>
            <p className="text-sm sm:text-base text-gray-600">Toplam Üye</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-2">{adminCount}</div>
            <p className="text-sm sm:text-base text-gray-600">Yönetici</p>
          </div>
        </div>

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

      {activeTab === 'payments' && (
        <MemberDuesPayment />
      )}

    </div>
  );
}

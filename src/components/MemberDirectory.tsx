import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Member } from '../types';
import { Search, Eye, X, Shield, User, Crown, Pencil, Trash2, Wallet, CheckCircle, Clock, AlertCircle, XCircle, Lock, EyeOff } from 'lucide-react';
import { MemberEditModal } from './MemberEditModal';

interface MemberDuesItem {
  id: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_amount: number;
  paid_at?: string;
  payment_method?: string;
  notes?: string;
  dues?: {
    title: string;
    amount: number;
    period_month: number;
    period_year: number;
    due_date: string;
  };
}

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const DUES_STATUS: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  paid: { label: 'Ödendi', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle size={14} className="text-emerald-600" /> },
  pending: { label: 'Bekliyor', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: <Clock size={14} className="text-amber-600" /> },
  overdue: { label: 'Gecikmiş', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: <AlertCircle size={14} className="text-red-600" /> },
  cancelled: { label: 'İptal', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', icon: <XCircle size={14} className="text-gray-500" /> },
};

export function MemberDirectory() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberDues, setMemberDues] = useState<MemberDuesItem[]>([]);
  const [duesLoading, setDuesLoading] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [currentUser, setCurrentUser] = useState<Member | null>(null);

  // Admin password assignment state
  const [adminPwMemberId, setAdminPwMemberId] = useState<string | null>(null);
  const [adminNewPw, setAdminNewPw] = useState('');
  const [adminShowPw, setAdminShowPw] = useState(false);
  const [adminPwSaving, setAdminPwSaving] = useState(false);
  const [adminPwError, setAdminPwError] = useState('');
  const [adminPwSuccess, setAdminPwSuccess] = useState('');

  useEffect(() => {
    loadMembers();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (memberData) {
        setCurrentUser(memberData);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
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

  const handleRoleChange = async (memberId: string, role: 'member' | 'admin' | 'root') => {
    try {
      const updates: any = {
        is_admin: false,
        is_root: false
      };

      if (role === 'admin') {
        updates.is_admin = true;
      } else if (role === 'root') {
        updates.is_root = true;
        updates.is_admin = true;
      }

      const { error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', memberId);

      if (error) throw error;

      alert(`Rol başarıyla güncellendi: ${role === 'root' ? 'Root Yönetici' : role === 'admin' ? 'Yönetici' : 'Üye'}`);
      loadMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Rol güncellenirken bir hata oluştu.');
    }
  };

  const loadMemberDues = async (memberId: string) => {
    setDuesLoading(true);
    try {
      const { data } = await supabase
        .from('member_dues')
        .select('id, status, paid_amount, paid_at, payment_method, notes, dues(title, amount, period_month, period_year, due_date)')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });
      setMemberDues((data as MemberDuesItem[]) || []);
    } catch {
      setMemberDues([]);
    } finally {
      setDuesLoading(false);
    }
  };

  const openMemberDetail = (member: Member) => {
    setSelectedMember(member);
    loadMemberDues(member.id);
  };

  const handleDeleteMember = async (member: Member) => {
    if (!confirm(`"${member.full_name}" adlı üyeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;

    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', member.id);

      if (error) throw error;

      setSelectedMember(null);
      loadMembers();
    } catch (err) {
      console.error('Error deleting member:', err);
      alert('Üye silinirken bir hata oluştu.');
    }
  };

  const handleAdminPasswordSet = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPwError('');
    setAdminPwSuccess('');
    if (!adminNewPw || adminNewPw.length < 6) {
      setAdminPwError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    setAdminPwSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ new_password: adminNewPw, target_member_id: adminPwMemberId }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Şifre güncellenemedi.');
      setAdminPwSuccess(result.message || 'Şifre başarıyla güncellendi.');
      setAdminNewPw('');
      setAdminPwMemberId(null);
    } catch (err: any) {
      setAdminPwError(err.message || 'Şifre güncellenirken hata oluştu.');
    } finally {
      setAdminPwSaving(false);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      (m.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (m.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (m.tc_identity_no && m.tc_identity_no.includes(search)) ||
      (m.registry_number && m.registry_number.includes(search)) ||
      (m.phone && m.phone.includes(search))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Üye Dizini</h2>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Ad, e-posta, TC No, kayıt no veya telefon ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-[7%] px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kayıt No</th>
                <th className="w-[15%] px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ad Soyad</th>
                <th className="w-[10%] px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">TC Kimlik No</th>
                <th className="w-[18%] px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">E-Posta</th>
                <th className="w-[10%] px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Telefon</th>
                <th className="w-[12%] px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">İl/İlçe</th>
                <th className="w-[8%] px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th>
                <th className="w-[12%] px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rol</th>
                <th className="w-[8%] px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-2 py-3 text-xs text-gray-800 truncate">{member.registry_number || '-'}</td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-medium text-gray-800 truncate">{member.full_name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-xs text-gray-600 truncate">{member.tc_identity_no || '-'}</td>
                  <td className="px-2 py-3 text-xs text-gray-600 truncate" title={member.email}>{member.email}</td>
                  <td className="px-2 py-3 text-xs text-gray-600 truncate">{member.phone || '-'}</td>
                  <td className="px-2 py-3 text-xs text-gray-600 truncate">
                    {member.province && member.district
                      ? `${member.province}/${member.district}`
                      : member.province || '-'}
                  </td>
                  <td className="px-2 py-3">
                    {member.is_active !== false ? (
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded whitespace-nowrap">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded whitespace-nowrap">
                        Pasif
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    {currentUser?.is_admin || currentUser?.is_root ? (
                      <select
                        value={member.is_root ? 'root' : member.is_admin ? 'admin' : 'member'}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as 'member' | 'admin' | 'root')}
                        disabled={member.id === currentUser?.id || (member.is_root && !currentUser?.is_root)}
                        className="text-xs px-1.5 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed w-full"
                      >
                        <option value="member">Üye</option>
                        <option value="admin">Yönetici</option>
                        {currentUser?.is_root && <option value="root">Root</option>}
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs">
                        {member.is_root ? (
                          <>
                            <Crown size={12} className="text-yellow-600 flex-shrink-0" />
                            <span className="text-yellow-700 font-semibold truncate">Root</span>
                          </>
                        ) : member.is_admin ? (
                          <>
                            <Shield size={12} className="text-blue-600 flex-shrink-0" />
                            <span className="text-blue-700 font-semibold truncate">Yönetici</span>
                          </>
                        ) : (
                          <>
                            <User size={12} className="text-gray-600 flex-shrink-0" />
                            <span className="text-gray-700 truncate">Üye</span>
                          </>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openMemberDetail(member)}
                        className="text-blue-600 hover:text-blue-700 transition-colors"
                        title="Detayları Görüntüle"
                      >
                        <Eye size={16} />
                      </button>
                      {(currentUser?.is_admin || currentUser?.is_root) && member.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteMember(member)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Üyeyi Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">Sonuç bulunamadı</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-600">
          Toplam {filteredMembers.length} üye
        </div>
      </div>

      {selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Üye Detayları</h3>
              <div className="flex items-center gap-2">
                {(currentUser?.is_admin || currentUser?.is_root) && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingMember(selectedMember);
                      }}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                    >
                      <Pencil size={15} />
                      Düzenle
                    </button>
                    {selectedMember.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeleteMember(selectedMember)}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                      >
                        <Trash2 size={15} />
                        Sil
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setSelectedMember(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoField label="Kayıt No" value={selectedMember.registry_number} />
                <InfoField label="Ad Soyad" value={selectedMember.full_name} />
                <InfoField label="TC Kimlik No" value={selectedMember.tc_identity_no} />
                <InfoField label="Cinsiyet" value={selectedMember.gender === 'male' ? 'Erkek' : selectedMember.gender === 'female' ? 'Kadın' : selectedMember.gender} />
                <InfoField label="E-Posta" value={selectedMember.email} />
                <InfoField label="Telefon" value={selectedMember.phone} />
                <InfoField label="Adres" value={selectedMember.address} className="md:col-span-2" />

                <div className="md:col-span-2 border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Tüzel Kişi Bilgileri</h4>
                </div>
                <InfoField label="Tüzel Kişi" value={selectedMember.is_legal_entity ? 'Evet' : 'Hayır'} />
                <InfoField label="Tüzel Kişi No" value={selectedMember.legal_entity_number} />
                <InfoField label="Temsilci Adı" value={selectedMember.representative_name} />
                <InfoField label="Temsilci TC No" value={selectedMember.representative_tc_no} />
                <InfoField label="Web Sitesi" value={selectedMember.website} className="md:col-span-2" />

                <div className="md:col-span-2 border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Mesleki Bilgiler</h4>
                </div>
                <InfoField label="Meslek" value={selectedMember.profession} />
                <InfoField label="Öğrenim Durumu" value={selectedMember.education_level} />
                <InfoField label="Ünvan" value={selectedMember.title} className="md:col-span-2" />

                <div className="md:col-span-2 border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Konum Bilgileri</h4>
                </div>
                <InfoField label="İl" value={selectedMember.province} />
                <InfoField label="İlçe" value={selectedMember.district} />

                <div className="md:col-span-2 border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Üyelik Bilgileri</h4>
                </div>
                <InfoField label="Üye Tipi" value={selectedMember.member_type} />
                <InfoField label="Üyelik Durumu" value={selectedMember.is_active !== false ? 'Aktif' : 'Pasif'} />
                <InfoField label="Kayıt Tarihi" value={selectedMember.registration_date} />
                <InfoField label="YK Karar Tarihi" value={selectedMember.board_decision_date} />
                <InfoField label="Durum Değişiklik Tarihi" value={selectedMember.status_change_date} />
                <InfoField label="Pasif Olma Tarihi" value={selectedMember.passive_status_date} />
                <InfoField label="Pasif Olma Nedeni" value={selectedMember.passive_status_reason} className="md:col-span-2" />
                <InfoField label="Pasif İtiraz Tarihi" value={selectedMember.passive_objection_date} />
                <InfoField label="Baba Adı" value={selectedMember.father_name} />
                <InfoField label="Ana Adı" value={selectedMember.mother_name} />
                <InfoField
                  label="Doğum Tarihi"
                  value={selectedMember.birth_date ? new Date(selectedMember.birth_date).toLocaleDateString('tr-TR') : undefined}
                />
                <InfoField label="Kayıt Tarihi (Sistem)" value={new Date(selectedMember.joined_at).toLocaleDateString('tr-TR')} />
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet size={18} className="text-gray-600" />
                  <h4 className="font-semibold text-gray-800 text-base">Aidat / Borç Durumu</h4>
                </div>

                {duesLoading ? (
                  <div className="text-sm text-gray-500 py-4 text-center">Yükleniyor...</div>
                ) : memberDues.length === 0 ? (
                  <div className="text-sm text-gray-400 py-6 text-center bg-gray-50 rounded-lg">Aidat kaydı bulunamadı</div>
                ) : (
                  <>
                    {(() => {
                      const totalDebt = memberDues
                        .filter(d => d.status === 'pending' || d.status === 'overdue')
                        .reduce((sum, d) => sum + ((d.dues?.amount || 0) - (d.paid_amount || 0)), 0);
                      const overdueCount = memberDues.filter(d => d.status === 'overdue').length;
                      const paidCount = memberDues.filter(d => d.status === 'paid').length;
                      const pendingCount = memberDues.filter(d => d.status === 'pending').length;
                      return (
                        <>
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                              <div className="text-2xl font-black text-red-700">{overdueCount}</div>
                              <div className="text-xs text-red-600 font-medium mt-0.5">Gecikmiş</div>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                              <div className="text-2xl font-black text-amber-700">{pendingCount}</div>
                              <div className="text-xs text-amber-600 font-medium mt-0.5">Bekleyen</div>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                              <div className="text-2xl font-black text-emerald-700">{paidCount}</div>
                              <div className="text-xs text-emerald-600 font-medium mt-0.5">Ödenen</div>
                            </div>
                          </div>
                          {totalDebt > 0 && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
                              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                              <span className="text-sm text-red-700 font-medium">
                                Toplam Borç: <span className="font-black text-red-800">{totalDebt.toLocaleString('tr-TR')} ₺</span>
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {memberDues.map(debt => {
                        const cfg = DUES_STATUS[debt.status] || DUES_STATUS.pending;
                        const month = debt.dues?.period_month ? MONTHS[(debt.dues.period_month - 1) % 12] : '';
                        const year = debt.dues?.period_year || '';
                        const remaining = (debt.dues?.amount || 0) - (debt.paid_amount || 0);
                        return (
                          <div key={debt.id} className={`flex items-start gap-3 rounded-lg border p-3 ${cfg.bg}`}>
                            <div className="mt-0.5 flex-shrink-0">{cfg.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-gray-800 truncate">{debt.dues?.title || 'Aidat'}</span>
                                <span className={`text-xs font-bold flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
                              </div>
                              {(month || year) && (
                                <div className="text-xs text-gray-500 mt-0.5">{month} {year}</div>
                              )}
                              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                                <span className="text-xs text-gray-600">Tutar: <span className="font-semibold text-gray-800">{(debt.dues?.amount || 0).toLocaleString('tr-TR')} ₺</span></span>
                                {debt.paid_amount > 0 && (
                                  <span className="text-xs text-gray-600">Ödenen: <span className="font-semibold text-emerald-700">{debt.paid_amount.toLocaleString('tr-TR')} ₺</span></span>
                                )}
                                {(debt.status === 'pending' || debt.status === 'overdue') && remaining > 0 && (
                                  <span className="text-xs text-gray-600">Kalan: <span className={`font-semibold ${cfg.color}`}>{remaining.toLocaleString('tr-TR')} ₺</span></span>
                                )}
                              </div>
                              {debt.dues?.due_date && (
                                <div className="text-xs text-gray-400 mt-1">Son ödeme: {new Date(debt.dues.due_date).toLocaleDateString('tr-TR')}</div>
                              )}
                              {debt.paid_at && (
                                <div className="text-xs text-emerald-600 mt-0.5">Ödeme tarihi: {new Date(debt.paid_at).toLocaleDateString('tr-TR')}</div>
                              )}
                              {debt.notes && (
                                <div className="text-xs text-gray-500 italic mt-0.5">{debt.notes}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Root-only: assign password to this member */}
              {currentUser?.is_root && selectedMember.id !== currentUser?.id && (
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Lock size={18} className="text-gray-600" />
                      <h4 className="font-semibold text-gray-800 text-base">Şifre Ata</h4>
                    </div>
                    {adminPwMemberId !== selectedMember.id && (
                      <button
                        onClick={() => { setAdminPwMemberId(selectedMember.id); setAdminPwError(''); setAdminPwSuccess(''); setAdminNewPw(''); }}
                        className="text-sm text-red-600 font-semibold hover:text-red-700"
                      >
                        Şifre Belirle
                      </button>
                    )}
                  </div>

                  {adminPwSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-3">{adminPwSuccess}</div>
                  )}

                  {adminPwMemberId === selectedMember.id && (
                    <form onSubmit={handleAdminPasswordSet} className="flex items-end gap-3 max-w-sm">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Yeni Şifre</label>
                        <div className="relative">
                          <input
                            type={adminShowPw ? 'text' : 'password'}
                            value={adminNewPw}
                            onChange={e => setAdminNewPw(e.target.value)}
                            className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="En az 6 karakter"
                            required
                          />
                          <button type="button" onClick={() => setAdminShowPw(v => !v)} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600">
                            {adminShowPw ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        {adminPwError && <p className="text-red-600 text-xs mt-1">{adminPwError}</p>}
                      </div>
                      <div className="flex gap-2 pb-0.5">
                        <button
                          type="button"
                          onClick={() => { setAdminPwMemberId(null); setAdminNewPw(''); setAdminPwError(''); }}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                        >
                          İptal
                        </button>
                        <button
                          type="submit"
                          disabled={adminPwSaving}
                          className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 font-semibold"
                        >
                          {adminPwSaving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editingMember && (
        <MemberEditModal
          member={editingMember}
          onClose={() => {
            // İptal edilince detay paneline geri dön
            const prev = editingMember;
            setEditingMember(null);
            if (prev) setSelectedMember(prev);
          }}
          onSaved={async () => {
            const memberId = editingMember.id;
            setEditingMember(null);
            await loadMembers();
            // Kaydedilen üyenin güncel kaydını DB'den çek ve detay panelini aç
            const { data: refreshed } = await supabase
              .from('members')
              .select('*')
              .eq('id', memberId)
              .maybeSingle();
            if (refreshed) {
              setSelectedMember(refreshed);
              loadMemberDues(memberId);
            }
          }}
        />
      )}
    </>
  );
}

function InfoField({ label, value, className = '' }: { label: string; value?: string | boolean | null; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="text-sm text-gray-800">
        {value || '-'}
      </div>
    </div>
  );
}

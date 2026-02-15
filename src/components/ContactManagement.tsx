import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ContactInfo, ManagementInfo, Member } from '../types';
import { Phone, Mail, MapPin, Edit2, Save, X, Users as UsersIcon, Plus, Trash2 } from 'lucide-react';
import { logAction, getCurrentMemberId } from '../lib/auditLog';

interface ContactManagementProps {
  isAdmin: boolean;
}

export function ContactManagement({ isAdmin }: ContactManagementProps) {
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [managementTeam, setManagementTeam] = useState<ManagementInfo[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedContact, setEditedContact] = useState<Partial<ContactInfo>>({});
  const [showManagementForm, setShowManagementForm] = useState(false);
  const [editingManagement, setEditingManagement] = useState<ManagementInfo | null>(null);
  const [managementFormData, setManagementFormData] = useState({
    member_id: '',
    position: '',
    bio: '',
    display_order: 0,
    start_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: contactData } = await supabase
        .from('contact_info')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contactData) {
        setContactInfo(contactData);
        setEditedContact(contactData);
      }

      const { data: managementData } = await supabase
        .from('management_info')
        .select('*, members(id, full_name, avatar_url)')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      setManagementTeam(managementData || []);

      const { data: membersData } = await supabase
        .from('members')
        .select('id, full_name')
        .order('full_name');

      setMembers(membersData || []);
    } catch (error) {
      console.error('Error loading contact data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!contactInfo?.id) return;

    try {
      const { error } = await supabase
        .from('contact_info')
        .update({
          phone: editedContact.phone,
          email: editedContact.email,
          address: editedContact.address,
          social_media: editedContact.social_media,
        })
        .eq('id', contactInfo.id);

      if (error) throw error;

      const logMemberId = await getCurrentMemberId();
      if (logMemberId) {
        await logAction(logMemberId, 'update', 'contact_info', contactInfo.id, contactInfo, editedContact);
      }

      setEditing(false);
      loadData();
      alert('İletişim bilgileri başarıyla güncellendi');
    } catch (error) {
      console.error('Error updating contact info:', error);
      alert('İletişim bilgileri güncellenirken hata oluştu');
    }
  };

  const handleManagementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        member_id: managementFormData.member_id,
        position: managementFormData.position,
        bio: managementFormData.bio || null,
        display_order: managementFormData.display_order,
        start_date: managementFormData.start_date,
        is_active: true
      };

      const logMemberId = await getCurrentMemberId();

      if (editingManagement) {
        const { error } = await supabase
          .from('management_info')
          .update(payload)
          .eq('id', editingManagement.id);

        if (error) throw error;

        if (logMemberId) {
          await logAction(logMemberId, 'update', 'management_info', editingManagement.id, editingManagement, payload);
        }
      } else {
        const { error } = await supabase
          .from('management_info')
          .insert(payload);

        if (error) throw error;

        if (logMemberId) {
          await logAction(logMemberId, 'create', 'management_info', undefined, undefined, payload);
        }
      }

      setShowManagementForm(false);
      setEditingManagement(null);
      setManagementFormData({
        member_id: '',
        position: '',
        bio: '',
        display_order: 0,
        start_date: new Date().toISOString().split('T')[0]
      });
      loadData();
      alert('Yönetim kurulu üyesi başarıyla kaydedildi');
    } catch (error) {
      console.error('Error saving management info:', error);
      alert('Yönetim kurulu üyesi kaydedilirken hata oluştu');
    }
  };

  const handleDeleteManagement = async (id: string) => {
    if (!confirm('Bu yönetim kurulu üyesini silmek istediğinizden emin misiniz?')) return;

    try {
      const memberToDelete = managementTeam.find(m => m.id === id);

      const { error } = await supabase
        .from('management_info')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const logMemberId = await getCurrentMemberId();
      if (logMemberId && memberToDelete) {
        await logAction(logMemberId, 'delete', 'management_info', id, memberToDelete, undefined);
      }

      loadData();
      alert('Yönetim kurulu üyesi başarıyla silindi');
    } catch (error) {
      console.error('Error deleting management info:', error);
      alert('Yönetim kurulu üyesi silinirken hata oluştu');
    }
  };

  const handleEditManagement = (management: ManagementInfo) => {
    setEditingManagement(management);
    setManagementFormData({
      member_id: management.member_id,
      position: management.position,
      bio: management.bio || '',
      display_order: management.display_order,
      start_date: management.start_date.split('T')[0]
    });
    setShowManagementForm(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">İletişim Bilgileri</h2>
          {isAdmin && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit2 size={18} />
              Düzenle
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon
              </label>
              <input
                type="text"
                value={editedContact.phone || ''}
                onChange={(e) => setEditedContact({ ...editedContact, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-posta
              </label>
              <input
                type="email"
                value={editedContact.email || ''}
                onChange={(e) => setEditedContact({ ...editedContact, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adres
              </label>
              <textarea
                value={editedContact.address || ''}
                onChange={(e) => setEditedContact({ ...editedContact, address: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save size={18} />
                Kaydet
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditedContact(contactInfo || {});
                }}
                className="flex items-center gap-2 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                <X size={18} />
                İptal
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {contactInfo?.phone && (
              <div className="flex items-center gap-3 text-gray-700">
                <Phone size={20} className="text-blue-600" />
                <span>{contactInfo.phone}</span>
              </div>
            )}
            {contactInfo?.email && (
              <div className="flex items-center gap-3 text-gray-700">
                <Mail size={20} className="text-blue-600" />
                <span>{contactInfo.email}</span>
              </div>
            )}
            {contactInfo?.address && (
              <div className="flex items-start gap-3 text-gray-700">
                <MapPin size={20} className="text-blue-600 mt-1" />
                <span>{contactInfo.address}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <UsersIcon size={24} className="text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Yönetim Kurulu</h2>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setShowManagementForm(!showManagementForm);
                setEditingManagement(null);
                setManagementFormData({
                  member_id: '',
                  position: '',
                  bio: '',
                  display_order: 0,
                  start_date: new Date().toISOString().split('T')[0]
                });
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Yeni Ekle
            </button>
          )}
        </div>

        {isAdmin && showManagementForm && (
          <form onSubmit={handleManagementSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Üye Seçin
              </label>
              <select
                value={managementFormData.member_id}
                onChange={(e) => setManagementFormData({ ...managementFormData, member_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Üye Seçin</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Görev/Pozisyon
              </label>
              <input
                type="text"
                value={managementFormData.position}
                onChange={(e) => setManagementFormData({ ...managementFormData, position: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: Başkan, Başkan Yardımcısı, Genel Sekreter"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Biyografi (Opsiyonel)
              </label>
              <textarea
                value={managementFormData.bio}
                onChange={(e) => setManagementFormData({ ...managementFormData, bio: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Kısa açıklama"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Görev Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={managementFormData.start_date}
                  onChange={(e) => setManagementFormData({ ...managementFormData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Görüntüleme Sırası
                </label>
                <input
                  type="number"
                  value={managementFormData.display_order}
                  onChange={(e) => setManagementFormData({ ...managementFormData, display_order: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save size={18} />
                {editingManagement ? 'Güncelle' : 'Kaydet'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowManagementForm(false);
                  setEditingManagement(null);
                  setManagementFormData({
                    member_id: '',
                    position: '',
                    bio: '',
                    display_order: 0,
                    start_date: new Date().toISOString().split('T')[0]
                  });
                }}
                className="flex items-center gap-2 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                <X size={18} />
                İptal
              </button>
            </div>
          </form>
        )}

        {managementTeam.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {managementTeam.map((member) => (
              <div
                key={member.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow relative"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg">
                    {member.members?.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    {member.members?.full_name}
                  </h3>
                  <p className="text-blue-600 font-medium mb-2">{member.position}</p>
                  {member.bio && (
                    <p className="text-sm text-gray-600">{member.bio}</p>
                  )}
                  {isAdmin && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleEditManagement(member)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteManagement(member.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">Yönetim kurulu bilgisi bulunmamaktadır</p>
          </div>
        )}
      </div>
    </div>
  );
}

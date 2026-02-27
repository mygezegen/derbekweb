import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Plus, Edit2, Trash2, Save, X, Mail, Phone, Image as ImageIcon, Search, UserPlus } from 'lucide-react';
import { Member } from '../types';

interface BoardMember {
  id: string;
  member_id?: string;
  full_name: string;
  position: string;
  email: string;
  phone: string;
  photo_url: string;
  display_order: number;
  is_active: boolean;
}

type SelectionMode = 'choose' | 'member' | 'manual';

export function BoardManagement() {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<BoardMember | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('choose');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadMembers();
    loadAllMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const { data } = await supabase
        .from('board_members')
        .select('*')
        .order('display_order', { ascending: true });

      if (data) setMembers(data);
    } catch (error) {
      console.error('Yönetim kurulu üyeleri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllMembers = async () => {
    try {
      const { data } = await supabase
        .from('members')
        .select('*')
        .order('full_name', { ascending: true });

      if (data) setAllMembers(data);
    } catch (error) {
      console.error('Üyeler yüklenirken hata:', error);
    }
  };

  const handleSave = async () => {
    if (!editingMember) return;

    try {
      if (editingMember.id && editingMember.id !== 'new') {
        const { error } = await supabase
          .from('board_members')
          .update({
            member_id: editingMember.member_id,
            full_name: editingMember.full_name,
            position: editingMember.position,
            email: editingMember.email,
            phone: editingMember.phone,
            photo_url: editingMember.photo_url,
            display_order: editingMember.display_order,
            is_active: editingMember.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingMember.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('board_members')
          .insert([{
            member_id: editingMember.member_id,
            full_name: editingMember.full_name,
            position: editingMember.position,
            email: editingMember.email,
            phone: editingMember.phone,
            photo_url: editingMember.photo_url,
            display_order: editingMember.display_order,
            is_active: editingMember.is_active
          }]);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Yönetim kurulu üyesi başarıyla kaydedildi!' });
      setEditingMember(null);
      setIsAdding(false);
      setSelectionMode('choose');
      setSearchQuery('');
      loadMembers();
    } catch (error) {
      console.error('Kayıt hatası:', error);
      setMessage({ type: 'error', text: 'Kayıt sırasında bir hata oluştu.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yönetim kurulu üyesini silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('board_members')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Yönetim kurulu üyesi başarıyla silindi!' });
      loadMembers();
    } catch (error) {
      console.error('Silme hatası:', error);
      setMessage({ type: 'error', text: 'Silme sırasında bir hata oluştu.' });
    }
  };

  const startAdd = () => {
    setSelectionMode('choose');
    setSearchQuery('');
    setEditingMember(null);
    setIsAdding(true);
  };

  const selectMemberType = (mode: 'member' | 'manual') => {
    setSelectionMode(mode);
    if (mode === 'manual') {
      setEditingMember({
        id: 'new',
        full_name: '',
        position: '',
        email: '',
        phone: '',
        photo_url: '',
        display_order: members.length + 1,
        is_active: true
      });
    }
  };

  const selectExistingMember = (member: Member) => {
    setEditingMember({
      id: 'new',
      member_id: member.id,
      full_name: member.full_name,
      position: '',
      email: member.email || '',
      phone: member.phone || '',
      photo_url: member.photo_url || '',
      display_order: members.length + 1,
      is_active: true
    });
    setSelectionMode('manual');
  };

  const filteredMembers = allMembers.filter(
    (member) =>
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Users className="w-6 h-6 text-emerald-600 mr-2" />
          <h2 className="text-2xl font-bold text-gray-800">Dernek Yönetimi</h2>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-emerald-700 hover:to-green-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Üye Ekle</span>
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {isAdding && selectionMode === 'choose' && (
        <div className="mb-6 bg-emerald-50 border-2 border-emerald-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Yönetim Kurulu Üyesi Ekle</h3>
          <p className="text-gray-600 mb-6">Üye listesinden seçim yapın veya manuel olarak girin:</p>
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => selectMemberType('member')}
              className="flex flex-col items-center justify-center p-6 bg-white border-2 border-emerald-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-500 transition-all group"
            >
              <Users className="w-12 h-12 text-emerald-600 mb-3 group-hover:scale-110 transition-transform" />
              <span className="text-lg font-semibold text-gray-800">Üye Listesinden Seç</span>
              <span className="text-sm text-gray-500 mt-1">Kayıtlı üyelerden birini seçin</span>
            </button>
            <button
              onClick={() => selectMemberType('manual')}
              className="flex flex-col items-center justify-center p-6 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-all group"
            >
              <UserPlus className="w-12 h-12 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
              <span className="text-lg font-semibold text-gray-800">Manuel Giriş</span>
              <span className="text-sm text-gray-500 mt-1">Bilgileri elle girin</span>
            </button>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => { setIsAdding(false); setSelectionMode('choose'); }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-5 h-5 inline mr-1" />
              İptal
            </button>
          </div>
        </div>
      )}

      {isAdding && selectionMode === 'member' && (
        <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Üye Seçin</h3>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Üye ara (isim, e-posta, telefon)..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Üye bulunamadı</p>
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => selectExistingMember(member)}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                >
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{member.full_name}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {member.email && (
                        <span className="text-xs text-gray-500">{member.email}</span>
                      )}
                      {member.phone && (
                        <span className="text-xs text-gray-500">{member.phone}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setSelectionMode('choose')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-5 h-5 inline mr-1" />
              Geri
            </button>
          </div>
        </div>
      )}

      {isAdding && selectionMode === 'manual' && editingMember && (
        <div className="mb-6 bg-emerald-50 border-2 border-emerald-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingMember.member_id ? 'Yönetim Kurulu Bilgileri' : 'Yeni Yönetim Kurulu Üyesi'}
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ad Soyad *
              </label>
              <input
                type="text"
                value={editingMember.full_name}
                onChange={(e) => setEditingMember({ ...editingMember, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Ahmet Yılmaz"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Görevi *
              </label>
              <input
                type="text"
                value={editingMember.position}
                onChange={(e) => setEditingMember({ ...editingMember, position: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Başkan, Başkan Yardımcısı, vb."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                E-posta
              </label>
              <input
                type="email"
                value={editingMember.email}
                onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="ahmet@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Telefon
              </label>
              <input
                type="tel"
                value={editingMember.phone}
                onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="+90 XXX XXX XX XX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ImageIcon className="w-4 h-4 inline mr-1" />
                Fotoğraf URL
              </label>
              <input
                type="url"
                value={editingMember.photo_url}
                onChange={(e) => setEditingMember({ ...editingMember, photo_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="https://example.com/foto.jpg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sıralama
              </label>
              <input
                type="number"
                value={editingMember.display_order}
                onChange={(e) => setEditingMember({ ...editingMember, display_order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={editingMember.is_active}
              onChange={(e) => setEditingMember({ ...editingMember, is_active: e.target.checked })}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Aktif (Ana sayfada göster)
            </label>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={() => setSelectionMode('choose')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-5 h-5 inline mr-1" />
              Geri
            </button>
            <button
              onClick={handleSave}
              disabled={!editingMember.full_name || !editingMember.position}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Save className="w-5 h-5" />
              <span>Kaydet</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <div
            key={member.id}
            className={`border rounded-lg p-4 ${
              member.is_active ? 'border-emerald-200 bg-white' : 'border-gray-200 bg-gray-50'
            }`}
          >
            {member.photo_url ? (
              <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-gray-200">
                <img
                  src={member.photo_url}
                  alt={member.full_name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
                <Users className="w-10 h-10 text-emerald-600" />
              </div>
            )}
            <h3 className="font-semibold text-gray-800 text-center mb-1">
              {member.full_name}
            </h3>
            <p className="text-sm text-emerald-600 text-center font-medium mb-3">
              {member.position}
            </p>
            {member.email && (
              <p className="text-xs text-gray-600 text-center mb-1">
                <Mail className="w-3 h-3 inline mr-1" />
                {member.email}
              </p>
            )}
            {member.phone && (
              <p className="text-xs text-gray-600 text-center mb-3">
                <Phone className="w-3 h-3 inline mr-1" />
                {member.phone}
              </p>
            )}
            <div className="flex justify-center space-x-2 pt-3 border-t">
              <button
                onClick={() => setEditingMember(member)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Düzenle"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(member.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Henüz yönetim kurulu üyesi eklenmemiş.</p>
        </div>
      )}

      {editingMember && !isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Yönetim Kurulu Üyesini Düzenle</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  value={editingMember.full_name}
                  onChange={(e) => setEditingMember({ ...editingMember, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Görevi *
                </label>
                <input
                  type="text"
                  value={editingMember.position}
                  onChange={(e) => setEditingMember({ ...editingMember, position: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta
                </label>
                <input
                  type="email"
                  value={editingMember.email}
                  onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={editingMember.phone}
                  onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fotoğraf URL
                </label>
                <input
                  type="url"
                  value={editingMember.photo_url}
                  onChange={(e) => setEditingMember({ ...editingMember, photo_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sıralama
                </label>
                <input
                  type="number"
                  value={editingMember.display_order}
                  onChange={(e) => setEditingMember({ ...editingMember, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <input
                type="checkbox"
                id="edit_is_active"
                checked={editingMember.is_active}
                onChange={(e) => setEditingMember({ ...editingMember, is_active: e.target.checked })}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor="edit_is_active" className="ml-2 text-sm text-gray-700">
                Aktif (Ana sayfada göster)
              </label>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={!editingMember.full_name || !editingMember.position}
                className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Save className="w-5 h-5" />
                <span>Güncelle</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

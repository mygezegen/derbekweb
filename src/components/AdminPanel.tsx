import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Member } from '../types';
import { Shield, Trash2, UserPlus, Download, Users, DollarSign, Mail, MessageSquare, Wallet } from 'lucide-react';
import { MemberDuesPayment } from './MemberDuesPayment';
import { TreasuryManagement } from './TreasuryManagement';

interface AdminPanelProps {
  onRefresh: () => void;
}

export function AdminPanel({ onRefresh }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'payments' | 'notifications' | 'treasury'>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [notificationType, setNotificationType] = useState<'email' | 'sms'>('email');
  const [recipientType, setRecipientType] = useState<'all' | 'debtors' | 'specific'>('all');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);

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

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAddingMember(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
        setAddingMember(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-member`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            full_name: fullName,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('Edge function error:', result);
        throw new Error(result.error || result.message || 'Üye eklenirken hata oluştu');
      }

      setSuccess(result.message || 'Üye başarıyla eklendi');
      setEmail('');
      setFullName('');
      setPassword('');
      setShowAddMember(false);
      await loadMembers();
      onRefresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Üye eklenirken hata oluştu';
      setError(errorMessage);
      console.error('Add member error:', err);
    } finally {
      setAddingMember(false);
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

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSendingNotification(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      const { data: currentMember } = await supabase
        .from('members')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (!currentMember) throw new Error('Üye bilgisi bulunamadı');

      let recipientIds: string[] = [];

      if (recipientType === 'all') {
        recipientIds = members.map(m => m.id);
      } else if (recipientType === 'debtors') {
        const { data: debtorsData } = await supabase
          .from('member_dues')
          .select('member_id')
          .neq('status', 'paid');

        recipientIds = Array.from(new Set(debtorsData?.map(d => d.member_id) || []));
      }

      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .insert({
          title: notificationTitle,
          message: notificationMessage,
          type: notificationType,
          status: 'pending',
          recipient_type: recipientType,
          sent_by: currentMember.id
        })
        .select()
        .single();

      if (notifError) throw notifError;

      const recipients = recipientIds.map(memberId => ({
        notification_id: notification.id,
        member_id: memberId,
        status: 'pending'
      }));

      const { error: recipientsError } = await supabase
        .from('notification_recipients')
        .insert(recipients);

      if (recipientsError) throw recipientsError;

      setSuccess(`${notificationType === 'email' ? 'E-posta' : 'SMS'} bildirimi oluşturuldu. ${recipientIds.length} alıcıya gönderilecek.`);
      setNotificationTitle('');
      setNotificationMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bildirim gönderilirken hata oluştu');
    } finally {
      setSendingNotification(false);
    }
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
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'notifications'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Mail size={18} className="sm:w-5 sm:h-5" />
              Bildirimler
            </button>
            <button
              onClick={() => setActiveTab('treasury')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'treasury'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Wallet size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Kasa Yönetimi</span>
              <span className="sm:hidden">Kasa</span>
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
          <form onSubmit={handleAddMember} className="mb-8 p-4 bg-gray-50 rounded-lg">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                {success}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adı Soyadı
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Üye adı soyadı"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="ornek@email.com"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="En az 6 karakter"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addingMember}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {addingMember ? 'Ekleniyor...' : 'Üye Ekle'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                İptal
              </button>
            </div>
          </form>
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

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 md:mb-6">Bildirim Gönder</h2>

          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-3 sm:px-4 py-3 rounded mb-4 md:mb-6 text-sm sm:text-base">
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-3 sm:px-4 py-3 rounded mb-4 md:mb-6 text-sm sm:text-base">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded mb-4 md:mb-6">
            <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">Bilgi</h4>
            <p className="text-xs sm:text-sm text-blue-700">
              Bu sayfadan üyelerinize toplu e-posta veya SMS bildirimi gönderebilirsiniz.
              Bildirimler veritabanına kaydedilir ancak gerçek gönderim için SMS ve e-posta servis entegrasyonları gereklidir.
            </p>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bildirim Tipi
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="email"
                      checked={notificationType === 'email'}
                      onChange={(e) => setNotificationType(e.target.value as 'email' | 'sms')}
                      className="w-4 h-4 text-red-600"
                    />
                    <Mail size={20} className="text-blue-600" />
                    <span>E-posta</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="sms"
                      checked={notificationType === 'sms'}
                      onChange={(e) => setNotificationType(e.target.value as 'email' | 'sms')}
                      className="w-4 h-4 text-red-600"
                    />
                    <MessageSquare size={20} className="text-green-600" />
                    <span>SMS</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alıcılar
                </label>
                <select
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value as 'all' | 'debtors' | 'specific')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">Tüm Üyeler</option>
                  <option value="debtors">Sadece Borçlu Üyeler</option>
                  <option value="specific">Belirli Üyeler (Yakında)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Başlık
              </label>
              <input
                type="text"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                required
                placeholder="Bildirim başlığı..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mesaj
              </label>
              <textarea
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                required
                rows={6}
                placeholder="Bildirim mesajınızı yazın..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                {notificationMessage.length} karakter
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={sendingNotification}
                className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 disabled:bg-gray-400 transition-all shadow-md border-b-2 border-green-600 font-medium"
              >
                {notificationType === 'email' ? <Mail size={20} /> : <MessageSquare size={20} />}
                {sendingNotification ? 'Gönderiliyor...' : 'Bildirim Gönder'}
              </button>
            </div>
          </form>

          <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 md:mb-4">Alıcı Özeti</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-blue-50 rounded-lg p-3 md:p-4">
                <p className="text-xs sm:text-sm text-blue-700 mb-1">Toplam Üye</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-800">{members.length}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 md:p-4">
                <p className="text-xs sm:text-sm text-red-700 mb-1">Borçlu Üye</p>
                <p className="text-xl sm:text-2xl font-bold text-red-800">
                  {members.filter(m => {
                    return true;
                  }).length}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 md:p-4">
                <p className="text-xs sm:text-sm text-green-700 mb-1">Seçili Alıcı</p>
                <p className="text-xl sm:text-2xl font-bold text-green-800">
                  {recipientType === 'all' ? members.length : recipientType === 'debtors' ? '...' : '0'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'treasury' && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8">
          <TreasuryManagement />
        </div>
      )}
    </div>
  );
}

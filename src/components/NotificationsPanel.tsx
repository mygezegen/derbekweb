import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Member } from '../types';
import { Mail, MessageSquare } from 'lucide-react';

export function NotificationsPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [notificationType, setNotificationType] = useState<'email' | 'sms'>('email');
  const [recipientType, setRecipientType] = useState<'all' | 'debtors' | 'specific'>('all');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('*')
      .order('full_name', { ascending: true });
    setMembers(data || []);
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

  return (
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
            <p className="text-xl sm:text-2xl font-bold text-red-800">{members.length}</p>
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
  );
}

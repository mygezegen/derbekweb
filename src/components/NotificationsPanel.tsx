import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Member } from '../types';
import { Mail, MessageSquare, Users, Tag } from 'lucide-react';
import { sendSMS } from '../lib/smsService';
import { MemberSelectionModal } from './MemberSelectionModal';

interface MemberDebtInfo {
  memberId: string;
  totalDebt: number;
}

const PARAMETERS = [
  { label: 'Ad Soyad', value: '{{ad_soyad}}', description: 'Üyenin tam adı' },
  { label: 'Ad', value: '{{ad}}', description: 'Üyenin adı' },
  { label: 'Borç Miktarı', value: '{{borc_miktari}}', description: 'Toplam borç miktarı (TL)' },
];

function resolveMessage(template: string, member: Member, debtAmount?: number): string {
  const nameParts = (member.full_name || '').trim().split(' ');
  const firstName = nameParts[0] || '';
  return template
    .replace(/\{\{ad_soyad\}\}/g, member.full_name || '')
    .replace(/\{\{ad\}\}/g, firstName)
    .replace(/\{\{borc_miktari\}\}/g, debtAmount !== undefined ? `${debtAmount.toFixed(2)} TL` : '0,00 TL');
}

export function NotificationsPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [debtorCount, setDebtorCount] = useState(0);
  const [notificationType, setNotificationType] = useState<'email' | 'sms'>('email');
  const [recipientType, setRecipientType] = useState<'all' | 'debtors' | 'specific'>('all');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [showMemberSelection, setShowMemberSelection] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showParamMenu, setShowParamMenu] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const paramMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (paramMenuRef.current && !paramMenuRef.current.contains(e.target as Node)) {
        setShowParamMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true });
    const activeMembers = data || [];
    setMembers(activeMembers);

    const { data: debtorsData } = await supabase
      .from('member_dues')
      .select('member_id')
      .neq('status', 'paid');
    const debtorMemberIds = new Set(debtorsData?.map(d => d.member_id) || []);
    const activeDebtors = activeMembers.filter(m => debtorMemberIds.has(m.id));
    setDebtorCount(activeDebtors.length);
  };

  const fetchMemberDebts = async (memberIds: string[]): Promise<MemberDebtInfo[]> => {
    if (memberIds.length === 0) return [];
    const { data } = await supabase
      .from('member_dues')
      .select('member_id, dues:dues_id(amount), paid_amount, status')
      .in('member_id', memberIds)
      .neq('status', 'paid');

    const debtMap: Record<string, number> = {};
    for (const row of data || []) {
      const duesAmount = (row.dues as { amount: number } | null)?.amount ?? 0;
      const paidAmount = Number(row.paid_amount ?? 0);
      const remaining = duesAmount - paidAmount;
      debtMap[row.member_id] = (debtMap[row.member_id] || 0) + remaining;
    }
    return memberIds.map(id => ({ memberId: id, totalDebt: debtMap[id] ?? 0 }));
  };

  const insertParam = (param: string) => {
    const textarea = messageRef.current;
    if (!textarea) {
      setNotificationMessage(prev => prev + param);
      setShowParamMenu(false);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = notificationMessage.substring(0, start) + param + notificationMessage.substring(end);
    setNotificationMessage(newValue);
    setShowParamMenu(false);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + param.length, start + param.length);
    }, 0);
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
        const debtorMemberIds = new Set(debtorsData?.map(d => d.member_id) || []);
        recipientIds = members.filter(m => debtorMemberIds.has(m.id)).map(m => m.id);
      } else if (recipientType === 'specific') {
        if (selectedMemberIds.length === 0) {
          throw new Error('Lütfen en az bir üye seçin');
        }
        recipientIds = selectedMemberIds;
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

      const hasParams = notificationMessage.includes('{{');
      let memberDebts: MemberDebtInfo[] = [];
      if (hasParams) {
        memberDebts = await fetchMemberDebts(recipientIds);
      }

      const recipientMembers = members.filter(m => recipientIds.includes(m.id));

      if (notificationType === 'sms') {
        const smsMembers = recipientMembers.filter(m => m.phone && m.phone.trim().length > 0);

        if (smsMembers.length === 0) {
          throw new Error('Telefon numarası bulunan alıcı yok');
        }

        if (hasParams) {
          let sentCount = 0;
          let failCount = 0;
          for (const member of smsMembers) {
            const debtInfo = memberDebts.find(d => d.memberId === member.id);
            const personalizedMsg = resolveMessage(notificationMessage, member, debtInfo?.totalDebt);
            const smsResult = await sendSMS({
              recipients: [member.phone!],
              message: personalizedMsg,
            });
            if (smsResult.success) {
              sentCount++;
            } else {
              failCount++;
            }
          }

          await supabase
            .from('notifications')
            .update({ status: failCount === smsMembers.length ? 'failed' : 'sent' })
            .eq('id', notification.id);

          await supabase
            .from('notification_recipients')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('notification_id', notification.id);

          setSuccess(`SMS başarıyla gönderildi. ${sentCount} alıcıya ulaştı.${failCount > 0 ? ` ${failCount} gönderilemedi.` : ''}`);
        } else {
          const phoneNumbers = smsMembers.map(m => m.phone!);
          const smsResult = await sendSMS({
            recipients: phoneNumbers,
            message: notificationMessage,
          });

          if (!smsResult.success) {
            throw new Error(`SMS gönderilemedi: ${smsResult.error}`);
          }

          await supabase
            .from('notifications')
            .update({ status: 'sent' })
            .eq('id', notification.id);

          await supabase
            .from('notification_recipients')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('notification_id', notification.id);

          setSuccess(`SMS başarıyla gönderildi. ${phoneNumbers.length} alıcıya ulaştı. Sipariş ID: ${smsResult.orderId}`);
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Oturum bulunamadı');

        const emailRecipients = recipientMembers.filter(m => m.email && m.email.trim().length > 0);

        if (emailRecipients.length === 0) {
          throw new Error('E-posta adresi bulunan alıcı yok');
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
        let sentCount = 0;
        let failCount = 0;

        for (const member of emailRecipients) {
          try {
            const debtInfo = memberDebts.find(d => d.memberId === member.id);
            const personalizedMsg = hasParams
              ? resolveMessage(notificationMessage, member, debtInfo?.totalDebt)
              : notificationMessage;
            const personalizedTitle = hasParams
              ? resolveMessage(notificationTitle, member, debtInfo?.totalDebt)
              : notificationTitle;

            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                to: member.email,
                subject: personalizedTitle,
                html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                  <h2 style="color: #1f2937;">${personalizedTitle}</h2>
                  <div style="color: #4b5563; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${personalizedMsg}</div>
                  <hr style="margin-top: 32px; border-color: #e5e7eb;" />
                  <p style="color: #9ca3af; font-size: 12px;">Çüngüş Çaybaşı Köyü Yardımlaşma ve Dayanışma Derneği</p>
                </div>`,
                recipient_name: member.full_name,
              }),
            });

            if (response.ok) {
              sentCount++;
            } else {
              failCount++;
            }
          } catch {
            failCount++;
          }
        }

        await supabase
          .from('notifications')
          .update({ status: failCount === emailRecipients.length ? 'failed' : 'sent' })
          .eq('id', notification.id);

        await supabase
          .from('notification_recipients')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('notification_id', notification.id);

        if (failCount > 0 && sentCount === 0) {
          throw new Error(`E-postalar gönderilemedi. Lütfen SMTP ayarlarınızı kontrol edin.`);
        }

        setSuccess(`E-posta başarıyla gönderildi. ${sentCount} alıcıya ulaştı.${failCount > 0 ? ` ${failCount} gönderilemedi.` : ''}`);
      }

      setNotificationTitle('');
      setNotificationMessage('');
      setSelectedMemberIds([]);
      setRecipientType('all');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bildirim gönderilirken hata oluştu');
    } finally {
      setSendingNotification(false);
    }
  };

  const handleRecipientTypeChange = (newType: 'all' | 'debtors' | 'specific') => {
    setRecipientType(newType);
    if (newType === 'specific') {
      setShowMemberSelection(true);
    }
  };

  const handleMemberSelectionConfirm = (memberIds: string[]) => {
    setSelectedMemberIds(memberIds);
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
          SMS gönderimi için SMS Yapılandırması sayfasından İletimerkezi.com API bilgilerinizi tanımlamanız gerekmektedir.
          Mesaj içinde <code className="bg-blue-100 px-1 rounded">{"{{ad_soyad}}"}</code>, <code className="bg-blue-100 px-1 rounded">{"{{ad}}"}</code> ve <code className="bg-blue-100 px-1 rounded">{"{{borc_miktari}}"}</code> parametrelerini kullanarak kişiselleştirilmiş mesaj gönderebilirsiniz.
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
              onChange={(e) => handleRecipientTypeChange(e.target.value as 'all' | 'debtors' | 'specific')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">Tüm Üyeler</option>
              <option value="debtors">Sadece Borçlu Üyeler</option>
              <option value="specific">Belirli Üyeler</option>
            </select>
            {recipientType === 'specific' && (
              <button
                type="button"
                onClick={() => setShowMemberSelection(true)}
                className="mt-2 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <Users size={16} />
                {selectedMemberIds.length > 0
                  ? `${selectedMemberIds.length} üye seçildi - Düzenle`
                  : 'Üye Seç'}
              </button>
            )}
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
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Mesaj
            </label>
            <div className="relative" ref={paramMenuRef}>
              <button
                type="button"
                onClick={() => setShowParamMenu(prev => !prev)}
                className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg border border-gray-300 transition-colors"
              >
                <Tag size={13} />
                Parametre Ekle
              </button>
              {showParamMenu && (
                <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[220px] py-1.5 overflow-hidden">
                  {PARAMETERS.map(param => (
                    <button
                      key={param.value}
                      type="button"
                      onClick={() => insertParam(param.value)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <span className="block text-sm font-medium text-gray-800">{param.label}</span>
                      <span className="block text-xs text-gray-400 font-mono mt-0.5">{param.value}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <textarea
            ref={messageRef}
            value={notificationMessage}
            onChange={(e) => setNotificationMessage(e.target.value)}
            required
            rows={6}
            placeholder="Bildirim mesajınızı yazın... Parametre eklemek için 'Parametre Ekle' butonunu kullanın."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-400">
              {notificationMessage.length} karakter
            </p>
            {notificationMessage.includes('{{') && (
              <p className="text-xs text-amber-600 font-medium">
                Parametreli mesaj - her alıcıya ayrı ayrı gönderilecek
              </p>
            )}
          </div>
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
            <p className="text-xs sm:text-sm text-blue-700 mb-1">Toplam Aktif Üye</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-800">{members.length}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 md:p-4">
            <p className="text-xs sm:text-sm text-red-700 mb-1">Borçlu Üye</p>
            <p className="text-xl sm:text-2xl font-bold text-red-800">{debtorCount}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 md:p-4">
            <p className="text-xs sm:text-sm text-green-700 mb-1">Seçili Alıcı</p>
            <p className="text-xl sm:text-2xl font-bold text-green-800">
              {recipientType === 'all'
                ? members.length
                : recipientType === 'debtors'
                ? debtorCount
                : selectedMemberIds.length}
            </p>
          </div>
        </div>
      </div>

      {showMemberSelection && (
        <MemberSelectionModal
          members={members}
          selectedMemberIds={selectedMemberIds}
          onClose={() => setShowMemberSelection(false)}
          onConfirm={handleMemberSelectionConfirm}
        />
      )}
    </div>
  );
}

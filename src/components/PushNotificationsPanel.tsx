import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Member } from '../types';
import {
  Bell,
  Send,
  Users,
  Smartphone,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  List,
  Trash2,
} from 'lucide-react';
import { MemberSelectionModal } from './MemberSelectionModal';

interface PushNotification {
  id: string;
  title: string;
  body: string;
  recipient_type: string;
  status: string;
  sent_at: string | null;
  total_sent: number;
  total_failed: number;
  created_at: string;
  sent_by_member?: { full_name: string };
}

interface DeviceToken {
  id: string;
  token: string;
  platform: string;
  is_active: boolean;
  is_guest: boolean;
  device_name: string | null;
  last_seen_at: string | null;
  created_at: string;
  member_id: string | null;
  member?: { full_name: string; email: string } | null;
}

interface DeviceTokenStats {
  total: number;
  ios: number;
  android: number;
  members: number;
  guests: number;
}

type Tab = 'send' | 'devices' | 'history';

export function PushNotificationsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('send');
  const [members, setMembers] = useState<Member[]>([]);
  const [history, setHistory] = useState<PushNotification[]>([]);
  const [devices, setDevices] = useState<DeviceToken[]>([]);
  const [tokenStats, setTokenStats] = useState<DeviceTokenStats>({ total: 0, ios: 0, android: 0, members: 0, guests: 0 });
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [recipientType, setRecipientType] = useState<'all' | 'specific'>('all');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [showMemberSelection, setShowMemberSelection] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'member' | 'guest'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadMembers(), loadHistory(), loadTokenStats(), loadDevices()]);
    setLoading(false);
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('id, full_name, email, phone, status')
      .eq('status', 'active')
      .order('full_name');
    setMembers((data as Member[]) || []);
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from('push_notifications')
      .select('*, sent_by_member:sent_by(full_name)')
      .order('created_at', { ascending: false })
      .limit(50);
    setHistory((data as PushNotification[]) || []);
  };

  const loadDevices = async () => {
    const { data } = await supabase
      .from('device_tokens')
      .select('*, member:member_id(full_name, email)')
      .order('last_seen_at', { ascending: false });

    setDevices((data as DeviceToken[]) || []);
  };

  const loadTokenStats = async () => {
    const { data } = await supabase
      .from('device_tokens')
      .select('platform, member_id, is_guest')
      .eq('is_active', true);

    if (data) {
      setTokenStats({
        total: data.length,
        ios: data.filter((t) => t.platform === 'ios').length,
        android: data.filter((t) => t.platform === 'android').length,
        members: data.filter((t) => t.member_id !== null && !t.is_guest).length,
        guests: data.filter((t) => t.member_id === null || t.is_guest).length,
      });
    }
  };

  const handleDeactivateDevice = async (deviceId: string) => {
    await supabase
      .from('device_tokens')
      .update({ is_active: false })
      .eq('id', deviceId);
    await loadDevices();
    await loadTokenStats();
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Baslik ve mesaj alanları zorunludur.');
      return;
    }
    if (recipientType === 'specific' && selectedMemberIds.length === 0) {
      setError('Lutfen en az bir uye secin.');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (!refreshed.session) throw new Error('Oturum suresi doldu, lutfen tekrar giris yapin.');
      }
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      const { data: senderMember } = await supabase
        .from('members')
        .select('id')
        .eq('auth_id', currentSession?.user.id)
        .maybeSingle();

      const { data: notification, error: insertError } = await supabase
        .from('push_notifications')
        .insert({
          title: title.trim(),
          body: body.trim(),
          recipient_type: recipientType,
          status: 'sending',
          sent_by: senderMember?.id || null,
        })
        .select()
        .single();

      if (insertError || !notification) throw insertError;

      const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;
      const res = await fetch(`${VITE_SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentSession?.access_token || VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          notification_id: notification.id,
          title: title.trim(),
          body: body.trim(),
          recipient_type: recipientType,
          member_ids: recipientType === 'specific' ? selectedMemberIds : undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        const errDetail = result.error || result.message || JSON.stringify(result);
        throw new Error(`Gonderim basarisiz (HTTP ${res.status}): ${errDetail}`);
      }

      setSuccess(`Bildirim gonderildi. Basarili: ${result.sent}, Basarisiz: ${result.failed}`);
      setTitle('');
      setBody('');
      setSelectedMemberIds([]);
      setRecipientType('all');
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata olustu');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'sent') return (
      <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
        <CheckCircle size={12} /> Gonderildi
      </span>
    );
    if (status === 'failed') return (
      <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
        <XCircle size={12} /> Basarisiz
      </span>
    );
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
        <Clock size={12} /> Bekliyor
      </span>
    );
  };

  const getPlatformBadge = (platform: string) => {
    const isIos = platform === 'ios';
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
        isIos ? 'bg-gray-100 text-gray-700' : 'bg-green-50 text-green-700'
      }`}>
        <Smartphone size={11} />
        {isIos ? 'iOS' : 'Android'}
      </span>
    );
  };

  const filteredDevices = devices.filter(d => {
    if (deviceFilter === 'member') return d.member_id !== null && !d.is_guest;
    if (deviceFilter === 'guest') return d.member_id === null || d.is_guest;
    return true;
  });

  const selectedNames = members
    .filter((m) => selectedMemberIds.includes(m.id))
    .map((m) => m.full_name)
    .join(', ');

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'send', label: 'Bildirim Gonder', icon: <Bell size={15} /> },
    { id: 'devices', label: 'Cihazlar', icon: <List size={15} />, count: tokenStats.total },
    { id: 'history', label: 'Gecmis', icon: <Clock size={15} />, count: history.length },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Push Bildirimleri</h2>
          <p className="text-sm text-gray-500 mt-0.5">Mobil uygulama kullanicilarına anlık bildirim gonder</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <RefreshCw size={15} />
          Yenile
        </button>
      </div>

      {/* Token istatistikleri */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Smartphone size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{tokenStats.total}</p>
            <p className="text-xs text-gray-500">Toplam Cihaz</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <UserCheck size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{tokenStats.members}</p>
            <p className="text-xs text-gray-500">Uye Cihazi</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <UserX size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{tokenStats.guests}</p>
            <p className="text-xs text-gray-500">Misafir Cihazi</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Smartphone size={20} className="text-gray-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{tokenStats.ios}</p>
            <p className="text-xs text-gray-500">iOS Cihaz</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Smartphone size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{tokenStats.android}</p>
            <p className="text-xs text-gray-500">Android Cihaz</p>
          </div>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-red-600 text-red-600 bg-red-50/50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                  activeTab === tab.id ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Bildirim Gonderme */}
      {activeTab === 'send' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 max-w-lg">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bell size={17} className="text-red-600" />
            Yeni Bildirim Gonder
          </h3>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
              <XCircle size={16} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
              <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Baslik</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bildirim basligi"
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/100</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Bildirim mesajini girin..."
              rows={4}
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{body.length}/500</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Alicilar</label>
            <div className="flex gap-2">
              <button
                onClick={() => { setRecipientType('all'); setSelectedMemberIds([]); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  recipientType === 'all'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
                }`}
              >
                <Users size={14} />
                Tum Kullanicilar
              </button>
              <button
                onClick={() => setRecipientType('specific')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  recipientType === 'specific'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
                }`}
              >
                <Smartphone size={14} />
                Belirli Uyeler
              </button>
            </div>

            {recipientType === 'specific' && (
              <div className="mt-2">
                <button
                  onClick={() => setShowMemberSelection(true)}
                  className="w-full text-left border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 hover:border-red-400 hover:text-red-600 transition-colors"
                >
                  {selectedMemberIds.length > 0 ? (
                    <span className="text-gray-700">{selectedMemberIds.length} uye secildi: {selectedNames.slice(0, 60)}{selectedNames.length > 60 ? '...' : ''}</span>
                  ) : (
                    '+ Uye sec...'
                  )}
                </button>
              </div>
            )}

            {recipientType === 'all' && tokenStats.total > 0 && (
              <p className="text-xs text-gray-500 mt-1.5">
                {tokenStats.total} aktif cihaza gonderilecek
              </p>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {sending ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                Gonderiliyor...
              </>
            ) : (
              <>
                <Send size={15} />
                Bildirim Gonder
              </>
            )}
          </button>
        </div>
      )}

      {/* Cihaz Listesi */}
      {activeTab === 'devices' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Smartphone size={17} className="text-blue-600" />
              Kayitli Cihazlar
              <span className="text-xs text-gray-500 font-normal">({filteredDevices.length})</span>
            </h3>
            <div className="flex gap-1">
              {(['all', 'member', 'guest'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setDeviceFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    deviceFilter === f
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'Tumu' : f === 'member' ? 'Uyeler' : 'Misafirler'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw size={20} className="animate-spin text-gray-400" />
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Smartphone size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Kayitli cihaz bulunamadi</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredDevices.map((device) => {
                const isMember = device.member_id !== null && !device.is_guest;
                const lastSeen = device.last_seen_at
                  ? new Date(device.last_seen_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '-';
                const createdAt = new Date(device.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

                return (
                  <div key={device.id} className={`px-5 py-4 flex items-start gap-4 hover:bg-gray-50/50 transition-colors ${!device.is_active ? 'opacity-50' : ''}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isMember ? 'bg-emerald-50' : 'bg-amber-50'
                    }`}>
                      {isMember
                        ? <UserCheck size={20} className="text-emerald-600" />
                        : <UserX size={20} className="text-amber-600" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {device.device_name || (device.platform === 'ios' ? 'iPhone/iPad' : 'Android Cihaz')}
                        </span>
                        {getPlatformBadge(device.platform)}
                        {isMember ? (
                          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Uye</span>
                        ) : (
                          <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">Misafir</span>
                        )}
                        {!device.is_active && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Pasif</span>
                        )}
                      </div>

                      {isMember && device.member && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          <span className="font-medium">{(device.member as any).full_name}</span>
                          {' '}
                          <span className="text-gray-400">{(device.member as any).email}</span>
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>Son aktif: {lastSeen}</span>
                        <span>Kayit: {createdAt}</span>
                      </div>

                      <p className="text-xs text-gray-300 mt-0.5 font-mono truncate max-w-xs">{device.token}</p>
                    </div>

                    {device.is_active && (
                      <button
                        onClick={() => handleDeactivateDevice(device.id)}
                        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cihazi pasife al"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Gecmis */}
      {activeTab === 'history' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={17} className="text-gray-500" />
              Gonderim Gecmisi
            </h3>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw size={20} className="animate-spin text-gray-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Bell size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Henuz bildirim gonderilmedi</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map((notif) => (
                <div key={notif.id} className="overflow-hidden">
                  <button
                    className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(expandedId === notif.id ? null : notif.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{notif.title}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{notif.body}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notif.created_at).toLocaleString('tr-TR')}
                          {notif.sent_by_member && ` · ${notif.sent_by_member.full_name}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getStatusBadge(notif.status)}
                        {expandedId === notif.id ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </div>
                    </div>
                  </button>

                  {expandedId === notif.id && (
                    <div className="px-5 pb-4 border-t border-gray-100 bg-gray-50 space-y-1.5 pt-3">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Alici:</span>
                        <span className="font-medium">{notif.recipient_type === 'all' ? 'Tum Kullanicilar' : 'Secili Uyeler'}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Basarili:</span>
                        <span className="font-medium text-green-700">{notif.total_sent}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Basarisiz:</span>
                        <span className="font-medium text-red-700">{notif.total_failed}</span>
                      </div>
                      {notif.sent_at && (
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Gonderim:</span>
                          <span className="font-medium">{new Date(notif.sent_at).toLocaleString('tr-TR')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showMemberSelection && (
        <MemberSelectionModal
          members={members}
          selectedIds={selectedMemberIds}
          onConfirm={(ids) => { setSelectedMemberIds(ids); setShowMemberSelection(false); }}
          onClose={() => setShowMemberSelection(false)}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, MessageSquare, Send, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface SMSConfig {
  id: string;
  api_key: string;
  api_hash: string;
  sender_name: string;
  is_active: boolean;
}

interface SMSLog {
  id: string;
  order_id: string | null;
  recipient: string;
  message: string;
  status: string;
  response_code: string | null;
  response_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export function SMSConfiguration() {
  const [config, setConfig] = useState<SMSConfig | null>(null);
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiHash, setShowApiHash] = useState(false);

  const [formData, setFormData] = useState({
    api_key: '',
    api_hash: '',
    sender_name: '',
    is_active: false,
  });

  useEffect(() => {
    loadConfig();
    loadLogs();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('sms_config')
        .select('*')
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setConfig(data);
        setFormData({
          api_key: data.api_key || '',
          api_hash: data.api_hash || '',
          sender_name: data.sender_name || '',
          is_active: data.is_active,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yapılandırma yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('sms_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      if (data) setLogs(data);
    } catch (err) {
      console.error('SMS logları yüklenemedi:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updates = {
        api_key: formData.api_key.trim(),
        api_hash: formData.api_hash.trim(),
        sender_name: formData.sender_name.trim().toUpperCase(),
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (config?.id) {
        const { error: updateError } = await supabase
          .from('sms_config')
          .update(updates)
          .eq('id', config.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('sms_config')
          .insert([updates]);

        if (insertError) throw insertError;
      }

      setSuccess('SMS yapılandırması başarıyla kaydedildi');
      loadConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydetme hatası');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <MessageSquare className="text-blue-600" size={24} />
            <div>
              <h2 className="text-xl font-bold text-gray-900">SMS Yapılandırması</h2>
              <p className="text-sm text-gray-500 mt-0.5">İletimerkezi.com SMS API ayarları</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">API Bilgileri</p>
                <p>
                  İletimerkezi.com panelinize giriş yaparak <strong>Ayarlar</strong> bölümünden API anahtarınızı ve hash değerinizi
                  oluşturabilirsiniz. Gönderici adı (sender) hesabınızda tanımlı ve onaylanmış olmalıdır.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Anahtarı (Key) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  required
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="API anahtarınızı girin"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Hash <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showApiHash ? 'text' : 'password'}
                  value={formData.api_hash}
                  onChange={(e) => setFormData({ ...formData, api_hash: e.target.value })}
                  required
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="API hash değerini girin"
                />
                <button
                  type="button"
                  onClick={() => setShowApiHash(!showApiHash)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiHash ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gönderici Adı (Sender) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.sender_name}
                onChange={(e) => setFormData({ ...formData, sender_name: e.target.value.toUpperCase() })}
                required
                maxLength={11}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                placeholder="Örn: APITEST"
              />
              <p className="text-xs text-gray-500 mt-1">Maksimum 11 karakter, büyük harf</p>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">SMS Sistemini Etkinleştir</span>
                  <p className="text-xs text-gray-500">Bildirimlerde SMS kullanılacak</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Save size={18} />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Send className="text-green-600" size={20} />
            <div>
              <h3 className="font-semibold text-gray-900">SMS Gönderim Logları</h3>
              <p className="text-xs text-gray-500">Son 50 SMS kaydı</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Send size={48} className="mx-auto mb-3 text-gray-300" />
              <p>Henüz SMS gönderimi yapılmadı</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Tarih</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Alıcı</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Mesaj</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Durum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Sipariş ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(log.created_at).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{log.recipient}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={log.message}>
                      {log.message}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : log.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {log.status === 'sent' ? 'Gönderildi' : log.status === 'failed' ? 'Başarısız' : 'Bekliyor'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{log.order_id || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

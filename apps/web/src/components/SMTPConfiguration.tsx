import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Server, Lock, User, Save, Eye, EyeOff } from 'lucide-react';

interface SMTPSettings {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  is_active: boolean;
}

export function SMTPConfiguration() {
  const [settings, setSettings] = useState<SMTPSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('smtp_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        setSettings(data);
      } else {
        setSettings({
          id: '',
          smtp_host: '',
          smtp_port: 587,
          smtp_username: '',
          smtp_password: '',
          from_email: 'info@caybasi.org',
          from_name: 'Çaybaşı Köyü Derneği',
          is_active: true
        });
      }
    } catch (error) {
      console.error('SMTP ayarları yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      if (settings.id) {
        const { error } = await supabase
          .from('smtp_settings')
          .update({
            smtp_host: settings.smtp_host,
            smtp_port: settings.smtp_port,
            smtp_username: settings.smtp_username,
            smtp_password: settings.smtp_password,
            from_email: settings.from_email,
            from_name: settings.from_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('smtp_settings')
          .insert([{
            smtp_host: settings.smtp_host,
            smtp_port: settings.smtp_port,
            smtp_username: settings.smtp_username,
            smtp_password: settings.smtp_password,
            from_email: settings.from_email,
            from_name: settings.from_name,
            is_active: true
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) setSettings(data);
      }

      setMessage({ type: 'success', text: 'SMTP ayarları başarıyla kaydedildi!' });
    } catch (error) {
      console.error('SMTP ayarları kaydedilirken hata:', error);
      setMessage({ type: 'error', text: 'SMTP ayarları kaydedilirken bir hata oluştu.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Lütfen bir e-posta adresi girin.' });
      return;
    }

    if (!settings?.id) {
      setMessage({ type: 'error', text: 'Lütfen önce SMTP ayarlarını kaydedin.' });
      return;
    }

    setTestingEmail(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Oturum bulunamadı');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmail,
          subject: 'Test E-postası - Çaybaşı Köyü Derneği',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #059669;">Test E-postası</h2>
              <p>Merhaba,</p>
              <p>Bu, Çaybaşı Köyü Derneği sisteminden gönderilen bir test e-postasıdır.</p>
              <p>E-posta ayarlarınız başarıyla yapılandırıldı ve çalışıyor!</p>
              <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #6b7280; font-size: 12px;">
                Bu e-posta ${new Date().toLocaleString('tr-TR')} tarihinde gönderilmiştir.
              </p>
            </div>
          `,
          text: 'Bu bir test e-postasıdır. E-posta ayarlarınız başarıyla yapılandırıldı!'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'E-posta gönderilemedi');
      }

      setMessage({ type: 'success', text: `Test e-postası ${testEmail} adresine başarıyla gönderildi!` });
      setTestEmail('');
    } catch (error) {
      console.error('Test e-postası gönderilirken hata:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Test e-postası gönderilemedi. Lütfen ayarları kontrol edin.'
      });
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <Mail className="w-6 h-6 text-emerald-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-800">SMTP E-posta Ayarları</h2>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <Server className="w-4 h-4 mr-1" />
                SMTP Sunucu
              </div>
            </label>
            <input
              type="text"
              value={settings.smtp_host}
              onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
              placeholder="smtp.gmail.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <Server className="w-4 h-4 mr-1" />
                SMTP Port
              </div>
            </label>
            <input
              type="number"
              value={settings.smtp_port}
              onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) || 587 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-1" />
              SMTP Kullanıcı Adı
            </div>
          </label>
          <input
            type="text"
            value={settings.smtp_username}
            onChange={(e) => setSettings({ ...settings, smtp_username: e.target.value })}
            placeholder="kullanici@domain.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center">
              <Lock className="w-4 h-4 mr-1" />
              SMTP Şifre
            </div>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={settings.smtp_password}
              onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Gönderici Bilgileri</h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  Gönderici E-posta
                </div>
              </label>
              <input
                type="email"
                value={settings.from_email}
                onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                placeholder="info@caybasi.org"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  Gönderici Adı
                </div>
              </label>
              <input
                type="text"
                value={settings.from_name}
                onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                placeholder="Çaybaşı Köyü Derneği"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>Not:</strong> Kendi SMTP sunucunuzun bilgilerini girin. Gmail kullanıyorsanız, uygulama şifresi oluşturmanız gerekebilir.
            Google Hesap Ayarları → Güvenlik → 2 Adımlı Doğrulama → Uygulama Şifreleri
          </p>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Test E-postası Gönder</h3>
          <div className="flex gap-4">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              onClick={handleTestEmail}
              disabled={testingEmail || !settings?.id}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Mail className="w-5 h-5" />
              <span>{testingEmail ? 'Gönderiliyor...' : 'Test Gönder'}</span>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Ayarları kaydettikten sonra bir test e-postası göndererek yapılandırmanızı doğrulayın.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

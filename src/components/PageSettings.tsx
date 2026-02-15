import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PageSetting } from '../types';
import { Eye, EyeOff, Save, RefreshCw } from 'lucide-react';
import { logAction, getCurrentMemberId } from '../lib/auditLog';

export function PageSettings() {
  const [settings, setSettings] = useState<PageSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Record<string, Partial<PageSetting>>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('page_settings')
        .select('*')
        .order('display_order', { ascending: true });

      if (data) {
        setSettings(data);
        const initialEdited: Record<string, Partial<PageSetting>> = {};
        data.forEach(setting => {
          initialEdited[setting.id] = { ...setting };
        });
        setEditedSettings(initialEdited);
      }
    } catch (error) {
      console.error('Error loading page settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (settingId: string, field: 'visible_to_admin' | 'visible_to_members' | 'is_enabled') => {
    setEditedSettings(prev => ({
      ...prev,
      [settingId]: {
        ...prev[settingId],
        [field]: !prev[settingId]?.[field]
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const logMemberId = await getCurrentMemberId();

      for (const setting of settings) {
        const edited = editedSettings[setting.id];
        if (!edited) continue;

        const hasChanges =
          edited.visible_to_admin !== setting.visible_to_admin ||
          edited.visible_to_members !== setting.visible_to_members ||
          edited.is_enabled !== setting.is_enabled;

        if (hasChanges) {
          const { error } = await supabase
            .from('page_settings')
            .update({
              visible_to_admin: edited.visible_to_admin,
              visible_to_members: edited.visible_to_members,
              is_enabled: edited.is_enabled,
            })
            .eq('id', setting.id);

          if (error) throw error;

          if (logMemberId) {
            await logAction(logMemberId, 'update', 'page_settings', setting.id, setting, edited);
          }
        }
      }

      await loadSettings();
      alert('Sayfa ayarları başarıyla güncellendi');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Ayarlar kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const initialEdited: Record<string, Partial<PageSetting>> = {};
    settings.forEach(setting => {
      initialEdited[setting.id] = { ...setting };
    });
    setEditedSettings(initialEdited);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Sayfa Görünürlük Ayarları</h2>
        <p className="text-gray-600">
          Her sayfanın admin ve üyeler için görünürlüğünü belirleyin. Kapalı sayfalar menüde görünmez.
        </p>
      </div>

      <div className="space-y-4">
        {settings.map((setting) => {
          const edited = editedSettings[setting.id] || setting;
          const hasChanges =
            edited.visible_to_admin !== setting.visible_to_admin ||
            edited.visible_to_members !== setting.visible_to_members ||
            edited.is_enabled !== setting.is_enabled;

          return (
            <div
              key={setting.id}
              className={`border rounded-lg p-6 transition-colors ${
                hasChanges ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    {setting.page_name}
                    {hasChanges && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Değiştirildi</span>
                    )}
                  </h3>
                  {setting.description && (
                    <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800">Sayfa Aktif</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {edited.is_enabled ? 'Sayfa kullanımda' : 'Sayfa devre dışı'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(setting.id, 'is_enabled')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      edited.is_enabled ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        edited.is_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800 flex items-center gap-2">
                      <Eye size={16} className="text-blue-600" />
                      Admin Görünürlük
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {edited.visible_to_admin ? 'Admin görebilir' : 'Admin göremez'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(setting.id, 'visible_to_admin')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      edited.visible_to_admin ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        edited.visible_to_admin ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800 flex items-center gap-2">
                      <Eye size={16} className="text-green-600" />
                      Üye Görünürlük
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {edited.visible_to_members ? 'Üyeler görebilir' : 'Üyeler göremez'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(setting.id, 'visible_to_members')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      edited.visible_to_members ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        edited.visible_to_members ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 mt-8 pt-6 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </button>
        <button
          onClick={handleReset}
          disabled={saving}
          className="flex items-center gap-2 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed"
        >
          <RefreshCw size={20} />
          Sıfırla
        </button>
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="font-semibold text-amber-800 mb-2">Önemli Notlar:</h4>
        <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
          <li>Sayfa kapalıysa (Aktif değilse), hiç kimse bu sayfayı göremez</li>
          <li>Admin görünürlüğü kapalıysa, admin kullanıcılar bu sayfayı menüde göremez</li>
          <li>Üye görünürlüğü kapalıysa, normal üyeler bu sayfayı menüde göremez</li>
          <li>Toplu İşlemler ve Yönetim sayfaları varsayılan olarak sadece adminlere görünür</li>
        </ul>
      </div>
    </div>
  );
}

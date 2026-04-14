import { useEffect, useState, useCallback } from 'react';
import { Settings, Smartphone, Monitor, Shield, Star, Save, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type ModuleConfig = {
  id: string;
  module_key: string;
  label: string;
  enabled_web: boolean;
  enabled_mobile: boolean;
  admin_only: boolean;
  root_only: boolean;
  sort_order: number;
  icon?: string;
};

const MODULE_GROUPS: Record<string, string[]> = {
  'Genel Modüller': ['home', 'announcements', 'events', 'gallery', 'pharmacy', 'contact', 'whatsapp'],
  'Üye Modülleri': ['dues', 'members', 'donations', 'surveys', 'board'],
  'Yönetici Modülleri': ['treasury', 'dues_admin', 'inventory'],
  'Sistem Modülleri': ['notifications'],
};

export default function ModuleConfigPanel() {
  const { member } = useAuth();
  const [modules, setModules] = useState<ModuleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const loadModules = useCallback(async () => {
    const { data } = await supabase
      .from('module_config')
      .select('*')
      .order('sort_order', { ascending: true });
    setModules(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadModules(); }, [loadModules]);

  const handleToggle = async (moduleId: string, field: 'enabled_web' | 'enabled_mobile' | 'admin_only' | 'root_only', value: boolean) => {
    if (!member?.is_root && !member?.is_admin) return;

    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;

    const updated = { ...mod, [field]: value };

    if (field === 'root_only' && value) updated.admin_only = true;
    if (field === 'admin_only' && !value) updated.root_only = false;

    setModules(prev => prev.map(m => m.id === moduleId ? updated : m));
    setSaving(moduleId);

    const { error } = await supabase
      .from('module_config')
      .update({
        enabled_web: updated.enabled_web,
        enabled_mobile: updated.enabled_mobile,
        admin_only: updated.admin_only,
        root_only: updated.root_only,
        updated_at: new Date().toISOString(),
      })
      .eq('id', moduleId);

    setSaving(null);
    if (!error) {
      setSaved(moduleId);
      setTimeout(() => setSaved(null), 2000);
    } else {
      setModules(prev => prev.map(m => m.id === moduleId ? mod : m));
    }
  };

  const getGroupModules = (keys: string[]) =>
    modules.filter(m => keys.includes(m.module_key));

  if (!member?.is_admin && !member?.is_root) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Bu sayfaya erişim yetkiniz yok.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Settings className="w-6 h-6 text-gray-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Modül Yönetimi</h2>
          <p className="text-sm text-gray-500">Web ve mobil uygulamada hangi modüllerin görünür olacağını yönetin. Değişiklikler anlık olarak her iki platforma da yansır.</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Smartphone className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Gerçek Zamanlı Senkronizasyon</p>
          <p className="text-sm text-blue-700">Burada yaptığınız değişiklikler Supabase Realtime üzerinden anında mobil uygulamaya da yansır. Mobil uygulamayı yeniden başlatmanıza gerek yoktur.</p>
        </div>
      </div>

      {Object.entries(MODULE_GROUPS).map(([groupName, keys]) => {
        const groupMods = getGroupModules(keys);
        if (groupMods.length === 0) return null;
        return (
          <div key={groupName} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{groupName}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {groupMods.map(mod => (
                <ModuleRow
                  key={mod.id}
                  mod={mod}
                  onToggle={handleToggle}
                  isSaving={saving === mod.id}
                  isSaved={saved === mod.id}
                  canEdit={!!(member?.is_root || member?.is_admin)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Yetki Seviyeleri</h4>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Herkese Açık - Giriş yapan tüm üyeler görebilir</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Yönetici - Sadece admin ve root kullanıcılar görebilir</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> Root - Sadece root kullanıcı görebilir</div>
        </div>
      </div>
    </div>
  );
}

function ModuleRow({
  mod,
  onToggle,
  isSaving,
  isSaved,
  canEdit,
}: {
  mod: ModuleConfig;
  onToggle: (id: string, field: 'enabled_web' | 'enabled_mobile' | 'admin_only' | 'root_only', value: boolean) => void;
  isSaving: boolean;
  isSaved: boolean;
  canEdit: boolean;
}) {
  const accessLevel = mod.root_only ? 'root' : mod.admin_only ? 'admin' : 'all';
  const accessColors = { root: 'bg-red-100 text-red-700', admin: 'bg-amber-100 text-amber-700', all: 'bg-green-100 text-green-700' };
  const accessLabels = { root: 'Root', admin: 'Yönetici', all: 'Herkese Açık' };

  return (
    <div className="px-6 py-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800 text-sm">{mod.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${accessColors[accessLevel]}`}>
            {accessLabels[accessLevel]}
          </span>
          {isSaved && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <Save className="w-3 h-3" /> Kaydedildi
            </span>
          )}
          {isSaving && (
            <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Anahtar: <code className="bg-gray-100 px-1 rounded">{mod.module_key}</code></p>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        <ToggleColumn
          icon={<Monitor className="w-4 h-4" />}
          label="Web"
          value={mod.enabled_web}
          onChange={v => canEdit && onToggle(mod.id, 'enabled_web', v)}
          disabled={!canEdit || isSaving}
        />
        <ToggleColumn
          icon={<Smartphone className="w-4 h-4" />}
          label="Mobil"
          value={mod.enabled_mobile}
          onChange={v => canEdit && onToggle(mod.id, 'enabled_mobile', v)}
          disabled={!canEdit || isSaving}
        />
        <ToggleColumn
          icon={<Shield className="w-4 h-4" />}
          label="Admin"
          value={mod.admin_only}
          onChange={v => canEdit && onToggle(mod.id, 'admin_only', v)}
          disabled={!canEdit || isSaving}
        />
        <ToggleColumn
          icon={<Star className="w-4 h-4" />}
          label="Root"
          value={mod.root_only}
          onChange={v => canEdit && onToggle(mod.id, 'root_only', v)}
          disabled={!canEdit || isSaving}
        />
      </div>
    </div>
  );
}

function ToggleColumn({
  icon,
  label,
  value,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[48px]">
      <div className={`${value ? 'text-gray-700' : 'text-gray-300'}`}>{icon}</div>
      <span className="text-xs text-gray-500">{label}</span>
      <button
        type="button"
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${value ? 'bg-green-500' : 'bg-gray-300'}`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-4' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

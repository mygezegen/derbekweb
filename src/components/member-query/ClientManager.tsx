import { useState } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Save, X, Copy, CheckCircle, Eye, EyeOff, Shield, AlertCircle, KeyRound, Globe } from 'lucide-react';
import { ApiClient, QueryResponseTemplate } from './types';

interface Props {
  clients: ApiClient[];
  templates: QueryResponseTemplate[];
  onAdd: (data: Partial<ApiClient>) => Promise<string>;
  onUpdate: (id: string, data: Partial<ApiClient>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  supabaseUrl: string;
}

function ClientForm({
  initial,
  templates,
  onSave,
  onCancel,
}: {
  initial?: ApiClient;
  templates: QueryResponseTemplate[];
  onSave: (data: Partial<ApiClient>) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [allowedIps, setAllowedIps] = useState((initial?.allowed_ips || []).join('\n'));
  const [rateLimitCount, setRateLimitCount] = useState(initial?.rate_limit_count ?? 10);
  const [rateLimitWindow, setRateLimitWindow] = useState(initial?.rate_limit_window_minutes ?? 15);
  const [templateId, setTemplateId] = useState(initial?.template_id || '');
  const [requireApiKey, setRequireApiKey] = useState(initial?.require_api_key ?? true);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const ips = allowedIps
        .split('\n')
        .map(ip => ip.trim())
        .filter(ip => ip.length > 0);
      await onSave({
        name: name.trim(),
        description: description.trim(),
        allowed_ips: ips,
        rate_limit_count: rateLimitCount,
        rate_limit_window_minutes: rateLimitWindow,
        template_id: templateId || null,
        require_api_key: requireApiKey,
        is_active: isActive,
      });
    } finally {
      setSaving(false);
    }
  };

  const noKeyAndNoIp = !requireApiKey && allowedIps.trim() === '';

  return (
    <div className="bg-gray-50 rounded-2xl p-5 space-y-4 border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Istemci Adi *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ornegin: Belediye Sistemi"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Aciklama</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Bu istemcinin amaci..."
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Izin Verilen IP Adresleri
            <span className="text-gray-400 font-normal ml-1">(bos = tum ipler)</span>
          </label>
          <textarea
            value={allowedIps}
            onChange={e => setAllowedIps(e.target.value)}
            placeholder={"192.168.1.1\n10.0.0.0/24\n203.0.113.5"}
            rows={3}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">Her satira bir IP veya CIDR blogu girin</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Cevap Sablonu</label>
          <select
            value={templateId}
            onChange={e => setTemplateId(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Varsayilan sablon</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Max Sorgu</label>
              <input
                type="number"
                value={rateLimitCount}
                onChange={e => setRateLimitCount(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={1000}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Pencere (dk)</label>
              <input
                type="number"
                value={rateLimitWindow}
                onChange={e => setRateLimitWindow(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={1440}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Her IP icin {rateLimitWindow} dakikada {rateLimitCount} sorgu
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setRequireApiKey(v => !v)}
            className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${requireApiKey ? 'bg-blue-500' : 'bg-amber-400'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${requireApiKey ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {requireApiKey ? 'API Key Zorunlu' : 'API Key Gerekmez'}
          </span>
          {requireApiKey
            ? <KeyRound size={13} className="text-blue-500" />
            : <Globe size={13} className="text-amber-500" />
          }
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setIsActive(v => !v)}
            className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm font-medium text-gray-700">{isActive ? 'Aktif' : 'Pasif'}</span>
        </label>
      </div>

      {!requireApiKey && (
        <div className={`rounded-xl p-3 border text-xs flex items-start gap-2 ${noKeyAndNoIp ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
          <div>
            {noKeyAndNoIp
              ? 'Uyari: API key gerekmez + IP kisitlamasi yok = HERKESE ACIK erisim. Guvenlik icin IP listesi ekleyin!'
              : 'Bu istemci API key olmadan, yalnizca IP kontrolu ve rate limit ile erisim saglayacak.'
            }
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <X size={14} /> Iptal
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Save size={14} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}

function NewKeyDisplay({ apiKey, queryUrl, onClose }: { apiKey: string; queryUrl: string; onClose: () => void }) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const copyToClipboard = async (text: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">API Anahtari Olusturuldu</h3>
              <p className="text-xs text-red-500 font-medium">Bu anahtari simdi kopyalayin - bir daha gosterilmeyecek!</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">API Anahtari</label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-200">
                <code className="flex-1 text-sm font-mono text-gray-800 break-all">
                  {showKey ? apiKey : '•'.repeat(Math.min(apiKey.length, 40))}
                </code>
                <button onClick={() => setShowKey(v => !v)} className="p-1.5 text-gray-400 hover:text-gray-600 flex-shrink-0">
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button
                  onClick={() => copyToClipboard(apiKey, setCopiedKey)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 flex-shrink-0"
                >
                  {copiedKey ? <CheckCircle size={15} className="text-green-500" /> : <Copy size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Sorgu URL</label>
              <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-3 border border-blue-200">
                <code className="flex-1 text-xs font-mono text-blue-800 break-all">{queryUrl}</code>
                <button
                  onClick={() => copyToClipboard(queryUrl, setCopiedUrl)}
                  className="p-1.5 text-blue-400 hover:text-blue-600 flex-shrink-0"
                >
                  {copiedUrl ? <CheckCircle size={15} className="text-green-500" /> : <Copy size={15} />}
                </button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-700 space-y-1">
                  <p className="font-semibold">Kullanim Ornekleri:</p>
                  <p className="font-mono bg-amber-100 px-2 py-1 rounded text-xs break-all">
                    GET {queryUrl}?tc=12345678901&api_key=YOUR_KEY
                  </p>
                  <p className="font-mono bg-amber-100 px-2 py-1 rounded text-xs">
                    POST ile: X-Api-Key header + body {'{'}"tc": "12345678901"{'}'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-5 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Anahtari Sakladim, Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientManager({ clients, templates, onAdd, onUpdate, onDelete, supabaseUrl }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKeyData, setNewKeyData] = useState<{ key: string; url: string } | null>(null);

  const queryUrl = `${supabaseUrl}/functions/v1/member-query`;

  const handleAdd = async (data: Partial<ApiClient>) => {
    const generatedKey = await onAdd(data);
    setShowAdd(false);
    setNewKeyData({ key: generatedKey, url: queryUrl });
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">API Istemcileri</h3>
            <p className="text-xs text-gray-400 mt-0.5">Dis sistemlere ozgu API anahtarlari ve kisitlamalar</p>
          </div>
          <button
            onClick={() => { setShowAdd(true); setEditingId(null); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Istemci Ekle
          </button>
        </div>

        {showAdd && !editingId && (
          <ClientForm
            templates={templates}
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
          />
        )}

        {clients.length === 0 && !showAdd && (
          <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-sm font-medium">Henuz istemci yok</p>
            <p className="text-xs mt-1">Dis sistemlere erisim vermek icin istemci ekleyin</p>
          </div>
        )}

        <div className="space-y-3">
          {clients.map(c => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              {editingId === c.id ? (
                <div className="p-4">
                  <ClientForm
                    initial={c}
                    templates={templates}
                    onSave={async (data) => { await onUpdate(c.id, data); setEditingId(null); }}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {c.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                        {c.require_api_key === false ? (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                            <Globe size={10} /> Key'siz Erisim
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                            <KeyRound size={10} /> Key Zorunlu
                          </span>
                        )}
                      </div>
                      {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {c.require_api_key !== false && (
                          <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded-lg">
                            {c.api_key_prefix}••••••••
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {c.rate_limit_window_minutes} dk / {c.rate_limit_count} sorgu
                        </span>
                        {c.allowed_ips && c.allowed_ips.length > 0 ? (
                          <span className="text-xs text-blue-600">{c.allowed_ips.length} IP kisitlamasi</span>
                        ) : (
                          <span className="text-xs text-gray-400">Tum ipler</span>
                        )}
                        {c.query_response_templates && (
                          <span className="text-xs text-amber-600">{c.query_response_templates.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(c.id); setShowAdd(false); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(c.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {newKeyData && (
        <NewKeyDisplay
          apiKey={newKeyData.key}
          queryUrl={queryUrl}
          onClose={() => setNewKeyData(null)}
        />
      )}
    </>
  );
}

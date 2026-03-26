import { useState, useEffect, useCallback } from 'react';
import { Key, FileText, Activity, RefreshCw, Globe, Copy, CheckCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ApiClient, QueryResponseTemplate, QueryLog, TemplateField } from './types';
import { TemplateManager } from './TemplateManager';
import { ClientManager } from './ClientManager';
import { QueryLogs } from './QueryLogs';

type Tab = 'clients' | 'templates' | 'logs' | 'docs';

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(48);
  crypto.getRandomValues(arr);
  return 'mq_' + Array.from(arr).map(b => chars[b % chars.length]).join('');
}

export function MemberQueryManagement() {
  const [activeTab, setActiveTab] = useState<Tab>('clients');
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [templates, setTemplates] = useState<QueryResponseTemplate[]>([]);
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const queryUrl = `${supabaseUrl}/functions/v1/member-query`;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsRes, templatesRes] = await Promise.all([
        supabase
          .from('api_clients')
          .select('*, query_response_templates(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('query_response_templates')
          .select('*')
          .order('created_at', { ascending: true }),
      ]);
      setClients(clientsRes.data || []);
      setTemplates(templatesRes.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const { data } = await supabase
        .from('query_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      setLogs(data || []);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'logs') loadLogs();
  }, [activeTab, loadLogs]);

  const addTemplate = async (name: string, description: string, fields: TemplateField[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('query_response_templates').insert({
      name, description, fields, created_by: user?.id,
    });
    await loadData();
  };

  const updateTemplate = async (id: string, name: string, description: string, fields: TemplateField[]) => {
    await supabase.from('query_response_templates').update({
      name, description, fields, updated_at: new Date().toISOString(),
    }).eq('id', id);
    await loadData();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Bu sablonu silmek istediginize emin misiniz?')) return;
    await supabase.from('query_response_templates').delete().eq('id', id);
    await loadData();
  };

  const addClient = async (data: Partial<ApiClient>): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    const rawKey = generateApiKey();
    const keyHash = await sha256(rawKey);
    const keyPrefix = rawKey.slice(0, 8);

    await supabase.from('api_clients').insert({
      ...data,
      api_key_hash: keyHash,
      api_key_prefix: keyPrefix,
      created_by: user?.id,
    });
    await loadData();
    return rawKey;
  };

  const updateClient = async (id: string, data: Partial<ApiClient>) => {
    await supabase.from('api_clients').update({
      ...data,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    await loadData();
  };

  const deleteClient = async (id: string) => {
    if (!confirm('Bu istemciyi silmek istediginize emin misiniz? Bu istemcinin tum log kayitlari korunacaktir.')) return;
    await supabase.from('api_clients').delete().eq('id', id);
    await loadData();
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { id: 'clients', label: 'API Istemcileri', icon: Key },
    { id: 'templates', label: 'Cevap Sablonlari', icon: FileText },
    { id: 'logs', label: 'Sorgu Kayitlari', icon: Activity },
    { id: 'docs', label: 'Kullanim Kilavuzu', icon: Info },
  ];

  const activeCount = clients.filter(c => c.is_active).length;
  const todayLogs = logs.filter(l => {
    const d = new Date(l.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center">
              <Globe size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Uye Sorgu API</h1>
              <p className="text-sm text-gray-500">Dis sistemler icin guvenli uye sorgulama servisi</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Globe size={12} className="text-blue-500" />
              <span className="font-mono truncate max-w-64">{queryUrl}</span>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(queryUrl);
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2000);
                }}
                className="text-gray-400 hover:text-blue-600 ml-1"
              >
                {copiedUrl ? <CheckCircle size={12} className="text-green-500" /> : <Copy size={12} />}
              </button>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Yenile
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-2xl font-bold text-blue-700">{clients.length}</p>
            <p className="text-xs text-blue-600 mt-0.5">Toplam Istemci</p>
            <p className="text-xs text-blue-500">{activeCount} aktif</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-2xl font-bold text-green-700">{templates.length}</p>
            <p className="text-xs text-green-600 mt-0.5">Cevap Sablonu</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-2xl font-bold text-gray-700">{todayLogs.length || '—'}</p>
            <p className="text-xs text-gray-500 mt-0.5">Bugunki Sorgu</p>
          </div>
        </div>
      </div>

      <div className="px-6 pt-4">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 p-6">
        {activeTab === 'clients' && (
          <div className="max-w-3xl">
            <ClientManager
              clients={clients}
              templates={templates}
              onAdd={addClient}
              onUpdate={updateClient}
              onDelete={deleteClient}
              supabaseUrl={supabaseUrl}
            />
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="max-w-3xl">
            <TemplateManager
              templates={templates}
              onAdd={addTemplate}
              onUpdate={updateTemplate}
              onDelete={deleteTemplate}
            />
          </div>
        )}

        {activeTab === 'logs' && (
          <QueryLogs
            logs={logs}
            loading={logsLoading}
            onRefresh={loadLogs}
          />
        )}

        {activeTab === 'docs' && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <h3 className="text-base font-bold text-gray-900">Kullanim Kilavuzu</h3>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sorgu Endpoint</p>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <code className="text-sm font-mono text-gray-800 break-all">{queryUrl}</code>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">GET ile Sorgu</p>
                <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-xs text-green-400 font-mono whitespace-pre">{`GET ${queryUrl}?tc=12345678901&api_key=mq_YOUR_API_KEY

# veya header ile:
GET ${queryUrl}?tc=12345678901
X-Api-Key: mq_YOUR_API_KEY`}</pre>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">POST ile Sorgu</p>
                <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-xs text-green-400 font-mono whitespace-pre">{`POST ${queryUrl}
Content-Type: application/json
X-Api-Key: mq_YOUR_API_KEY

{
  "tc": "12345678901"
}`}</pre>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Basarili Cevap Ornegi</p>
                <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-xs text-blue-400 font-mono whitespace-pre">{`{
  "success": true,
  "found": true,
  "data": {
    "Ad Soyad": "Ahmet Yilmaz",
    "Uyelik Durumu": "Aktif Uye",
    "Aktif Mi": true
  }
}`}</pre>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Uye Bulunamadi</p>
                <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-xs text-yellow-400 font-mono whitespace-pre">{`{
  "success": true,
  "found": false,
  "message": "Bu TC kimlik numarasina ait kayitli uye bulunamadi."
}`}</pre>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hata Kodlari</p>
                <div className="space-y-2">
                  {[
                    { code: '401', desc: 'Gecersiz veya eksik API anahtari' },
                    { code: '403', desc: 'IP adresi izin verilmedi veya istemci devre disi' },
                    { code: '429', desc: 'Rate limit asildi, retry_after_minutes ile bekleme suresi donulur' },
                    { code: '400', desc: 'Gecersiz TC formati (11 haneli rakam olmali)' },
                    { code: '500', desc: 'Sunucu hatasi' },
                  ].map(e => (
                    <div key={e.code} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">{e.code}</span>
                      <span className="text-sm text-gray-600">{e.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Guvenlik Notlari</p>
                <ul className="text-sm text-blue-800 space-y-1.5 list-disc list-inside">
                  <li>API anahtarlari SHA-256 ile hashlenip saklanir, duzce metin olarak tutulmaz</li>
                  <li>Rate limiting IP + istemci bazlidir, konfigurasyona gore ayarlanabilir</li>
                  <li>IP kisitlamasi ile sadece belirlenen sunucular erisebilir</li>
                  <li>Tum sorgular audit log olarak kaydedilir</li>
                  <li>Cevap sablonu ile sadece izin verilen alanlar paylasilir</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

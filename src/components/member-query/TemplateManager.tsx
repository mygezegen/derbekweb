import { useState } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Save, X, ChevronDown, ChevronUp, CheckSquare, Square, Star, Percent } from 'lucide-react';
import { QueryResponseTemplate, TemplateField, ALL_TEMPLATE_FIELDS } from './types';

interface Props {
  templates: QueryResponseTemplate[];
  onAdd: (name: string, description: string, fields: TemplateField[], discountRate: number, discountThreshold: number) => Promise<void>;
  onUpdate: (id: string, name: string, description: string, fields: TemplateField[], discountRate: number, discountThreshold: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function TemplateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: QueryResponseTemplate;
  onSave: (name: string, description: string, fields: TemplateField[], discountRate: number, discountThreshold: number) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [discountRate, setDiscountRate] = useState<number>(initial?.discount_rate ?? 50);
  const [discountThreshold, setDiscountThreshold] = useState<number>(initial?.discount_threshold ?? 700);
  const [fields, setFields] = useState<TemplateField[]>(() => {
    if (initial?.fields && initial.fields.length > 0) {
      const existingKeys = new Set(initial.fields.map(f => f.key));
      const merged = [...initial.fields];
      for (const f of ALL_TEMPLATE_FIELDS) {
        if (!existingKeys.has(f.key)) merged.push({ ...f, enabled: false });
      }
      return merged;
    }
    return ALL_TEMPLATE_FIELDS.map(f => ({ ...f }));
  });
  const [saving, setSaving] = useState(false);

  const toggleField = (key: string) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
  };

  const discountFieldEnabled = fields.find(f => f.key === 'discount_eligible')?.enabled ?? false;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), description.trim(), fields, discountRate, discountThreshold);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Sablon Adi *</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ornegin: Belediye Sablonu"
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2.5">Donulecek Alanlar</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {fields.map(field => (
            <button
              key={field.key}
              type="button"
              onClick={() => toggleField(field.key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all text-left ${
                field.enabled
                  ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {field.enabled
                ? <CheckSquare size={15} className="flex-shrink-0" />
                : <Square size={15} className="flex-shrink-0" />
              }
              <span className="truncate">{field.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {fields.filter(f => f.enabled).length} alan secildi
        </p>
      </div>

      {discountFieldEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Percent size={15} className="text-amber-600" />
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Indirim Hakki Ayarlari</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">
                Indirim Orani (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountRate}
                  onChange={e => setDiscountRate(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Indirimli uyelere uygulanacak oran</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">
                Maksimum Borc Esigi (TL)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={discountThreshold}
                  onChange={e => setDiscountThreshold(Math.max(0, Number(e.target.value)))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">TL</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Bu tutarin altinda borcu olanlar indirimden yararlanir</p>
            </div>
          </div>
          <div className="bg-amber-100 rounded-lg px-3 py-2">
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Ornek:</span> Borc esigi {discountThreshold} TL, oran %{discountRate} ise — {discountThreshold} TL altinda borcu olan uyeler "
              %{discountRate} indirim hakkiniz var" mesajini alir.
            </p>
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Aciklama</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Bu sablonun kullanim amaci..."
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
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

export function TemplateManager({ templates, onAdd, onUpdate, onDelete }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Cevap Sablonlari</h3>
          <p className="text-xs text-gray-400 mt-0.5">Her istemciye hangi alanlarin donulecegini belirleyin</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} /> Sablon Ekle
        </button>
      </div>

      {showAdd && !editingId && (
        <TemplateForm
          onSave={async (name, desc, fields, rate, threshold) => { await onAdd(name, desc, fields, rate, threshold); setShowAdd(false); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {templates.length === 0 && !showAdd && (
        <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-sm font-medium">Henuz sablon yok</p>
          <p className="text-xs mt-1">Sablon ekleyerek hangi verilerin donulecegini belirleyin</p>
        </div>
      )}

      <div className="space-y-3">
        {templates.map(t => (
          <div key={t.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {editingId === t.id ? (
              <div className="p-4">
                <TemplateForm
                  initial={t}
                  onSave={async (name, desc, fields, rate, threshold) => { await onUpdate(t.id, name, desc, fields, rate, threshold); setEditingId(null); }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                      {t.is_default && (
                        <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          <Star size={10} /> Varsayilan
                        </span>
                      )}
                    </div>
                    {t.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{t.description}</p>}
                    <p className="text-xs text-blue-600 mt-1">
                      {(t.fields || []).filter(f => f.enabled).length} alan aktif
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      {expandedId === t.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    <button
                      onClick={() => { setEditingId(t.id); setShowAdd(false); }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    >
                      <Edit2 size={15} />
                    </button>
                    {!t.is_default && (
                      <button
                        onClick={() => onDelete(t.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
                {expandedId === t.id && (
                  <div className="px-5 pb-4 border-t border-gray-50">
                    <div className="flex flex-wrap gap-2 pt-3">
                      {(t.fields || []).map(f => (
                        <span
                          key={f.key}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            f.enabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400 line-through'
                          }`}
                        >
                          {f.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

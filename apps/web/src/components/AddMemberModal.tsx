import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, UserPlus, User, Phone, Mail, MapPin, Briefcase, GraduationCap, Shield, KeyRound } from 'lucide-react';

interface AddMemberModalProps {
  onClose: () => void;
  onSaved: () => void;
}

type FormData = {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  tc_identity_no: string;
  registry_number: string;
  gender: string;
  province: string;
  district: string;
  profession: string;
  education_level: string;
  title: string;
  member_type: string;
  is_active: boolean;
  registration_date: string;
  board_decision_date: string;
  status_change_date: string;
  passive_status_date: string;
  passive_status_reason: string;
  passive_objection_date: string;
  mother_name: string;
  father_name: string;
  is_legal_entity: boolean;
  legal_entity_number: string;
  representative_name: string;
  representative_tc_no: string;
  website: string;
};

const empty: FormData = {
  full_name: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  tc_identity_no: '',
  registry_number: '',
  gender: '',
  province: '',
  district: '',
  profession: '',
  education_level: '',
  title: '',
  member_type: 'regular',
  is_active: true,
  registration_date: '',
  board_decision_date: '',
  status_change_date: '',
  passive_status_date: '',
  passive_status_reason: '',
  passive_objection_date: '',
  mother_name: '',
  father_name: '',
  is_legal_entity: false,
  legal_entity_number: '',
  representative_name: '',
  representative_tc_no: '',
  website: '',
};

export function AddMemberModal({ onClose, onSaved }: AddMemberModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormData>(empty);

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');

      const payload: Record<string, unknown> = {
        full_name: form.full_name.trim(),
        member_type: form.member_type,
        is_active: form.is_active,
      };

      const optionalText: Array<keyof FormData> = [
        'email', 'password', 'phone', 'address', 'tc_identity_no', 'registry_number',
        'gender', 'province', 'district', 'profession', 'education_level', 'title',
        'registration_date', 'board_decision_date', 'status_change_date',
        'passive_status_date', 'passive_status_reason', 'passive_objection_date',
        'mother_name', 'father_name', 'legal_entity_number',
        'representative_name', 'representative_tc_no', 'website',
      ];

      for (const key of optionalText) {
        const val = form[key];
        if (typeof val === 'string' && val.trim()) payload[key] = val.trim();
      }

      if (form.is_legal_entity) payload.is_legal_entity = true;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-member`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Üye eklenirken hata oluştu');

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <UserPlus size={20} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Yeni Üye Ekle</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Section icon={<KeyRound size={16} />} title="Sistem Erişimi (İsteğe Bağlı)">
              <p className="text-xs text-gray-500 mb-4">
                E-posta ve şifre girilirse üye sisteme giriş yapabilir. Girilmezse sadece kayıt olarak eklenir.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="E-posta">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    className={inputCls}
                    placeholder="ornek@email.com"
                  />
                </Field>
                <Field label="Şifre (min. 6 karakter)">
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    minLength={form.password ? 6 : undefined}
                    className={inputCls}
                    placeholder="En az 6 karakter"
                  />
                </Field>
              </div>
            </Section>

            <Section icon={<User size={16} />} title="Kimlik Bilgileri">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Ad Soyad" required>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => set('full_name', e.target.value)}
                    required
                    className={inputCls}
                    placeholder="Ad ve soyad"
                  />
                </Field>
                <Field label="TC Kimlik No">
                  <input
                    type="text"
                    value={form.tc_identity_no}
                    onChange={(e) => set('tc_identity_no', e.target.value)}
                    maxLength={11}
                    className={inputCls}
                    placeholder="11 haneli TC kimlik no"
                  />
                </Field>
                <Field label="Kayıt No">
                  <input
                    type="text"
                    value={form.registry_number}
                    onChange={(e) => set('registry_number', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Cinsiyet">
                  <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className={inputCls}>
                    <option value="">Seçiniz</option>
                    <option value="male">Erkek</option>
                    <option value="female">Kadın</option>
                    <option value="other">Diğer</option>
                  </select>
                </Field>
                <Field label="Baba Adı">
                  <input type="text" value={form.father_name} onChange={(e) => set('father_name', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Ana Adı">
                  <input type="text" value={form.mother_name} onChange={(e) => set('mother_name', e.target.value)} className={inputCls} />
                </Field>
              </div>
            </Section>

            <Section icon={<Phone size={16} />} title="İletişim Bilgileri">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Telefon">
                  <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} placeholder="0555 555 5555" />
                </Field>
                <Field label="Adres" className="md:col-span-2">
                  <textarea value={form.address} onChange={(e) => set('address', e.target.value)} rows={2} className={inputCls} />
                </Field>
              </div>
            </Section>

            <Section icon={<MapPin size={16} />} title="Konum Bilgileri">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="İl">
                  <input type="text" value={form.province} onChange={(e) => set('province', e.target.value)} className={inputCls} />
                </Field>
                <Field label="İlçe">
                  <input type="text" value={form.district} onChange={(e) => set('district', e.target.value)} className={inputCls} />
                </Field>
              </div>
            </Section>

            <Section icon={<GraduationCap size={16} />} title="Mesleki Bilgiler">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Meslek">
                  <input type="text" value={form.profession} onChange={(e) => set('profession', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Öğrenim Durumu">
                  <select value={form.education_level} onChange={(e) => set('education_level', e.target.value)} className={inputCls}>
                    <option value="">Seçiniz</option>
                    <option value="İlkokul">İlkokul</option>
                    <option value="Ortaokul">Ortaokul</option>
                    <option value="Lise">Lise</option>
                    <option value="Ön Lisans">Ön Lisans</option>
                    <option value="Lisans">Lisans</option>
                    <option value="Yüksek Lisans">Yüksek Lisans</option>
                    <option value="Doktora">Doktora</option>
                  </select>
                </Field>
                <Field label="Ünvan" className="md:col-span-2">
                  <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} />
                </Field>
              </div>
            </Section>

            <Section icon={<Shield size={16} />} title="Üyelik Bilgileri">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Üye Tipi">
                  <select value={form.member_type} onChange={(e) => set('member_type', e.target.value)} className={inputCls}>
                    <option value="regular">Asıl Üye</option>
                    <option value="honorary">Onursal Üye</option>
                    <option value="student">Öğrenci Üye</option>
                  </select>
                </Field>
                <Field label="Üyelik Durumu">
                  <select value={form.is_active ? 'active' : 'passive'} onChange={(e) => set('is_active', e.target.value === 'active')} className={inputCls}>
                    <option value="active">Aktif</option>
                    <option value="passive">Pasif</option>
                  </select>
                </Field>
                <Field label="Kayıt Tarihi">
                  <input type="date" value={form.registration_date} onChange={(e) => set('registration_date', e.target.value)} className={inputCls} />
                </Field>
                <Field label="YK Karar Tarihi">
                  <input type="date" value={form.board_decision_date} onChange={(e) => set('board_decision_date', e.target.value)} className={inputCls} />
                </Field>
              </div>
            </Section>

            <Section icon={<Briefcase size={16} />} title="Tüzel Kişi Bilgileri (İsteğe Bağlı)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Tüzel Kişi mi?">
                  <select value={form.is_legal_entity ? 'yes' : 'no'} onChange={(e) => set('is_legal_entity', e.target.value === 'yes')} className={inputCls}>
                    <option value="no">Hayır</option>
                    <option value="yes">Evet</option>
                  </select>
                </Field>
                <Field label="Tüzel Kişi No">
                  <input type="text" value={form.legal_entity_number} onChange={(e) => set('legal_entity_number', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Temsilci Adı">
                  <input type="text" value={form.representative_name} onChange={(e) => set('representative_name', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Temsilci TC No">
                  <input type="text" value={form.representative_tc_no} onChange={(e) => set('representative_tc_no', e.target.value)} maxLength={11} className={inputCls} />
                </Field>
                <Field label="Web Sitesi" className="md:col-span-2">
                  <input type="url" value={form.website} onChange={(e) => set('website', e.target.value)} className={inputCls} placeholder="https://" />
                </Field>
              </div>
            </Section>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              <UserPlus size={16} />
              {saving ? 'Ekleniyor...' : 'Üye Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors';

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-600">{icon}</span>
        <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, className = '', children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

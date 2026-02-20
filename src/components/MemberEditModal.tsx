import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Member } from '../types';
import { X, Save, User, Phone, Mail, MapPin, Briefcase, GraduationCap, Shield, Calendar, IdCard, Users } from 'lucide-react';

interface MemberEditModalProps {
  member: Member;
  onClose: () => void;
  onSaved: () => void;
}

type FormData = {
  full_name: string;
  email: string;
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

export function MemberEditModal({ member, onClose, onSaved }: MemberEditModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormData>({
    full_name: member.full_name || '',
    email: member.email || '',
    phone: member.phone || '',
    address: member.address || '',
    tc_identity_no: member.tc_identity_no || '',
    registry_number: member.registry_number || '',
    gender: member.gender || '',
    province: member.province || '',
    district: member.district || '',
    profession: member.profession || '',
    education_level: member.education_level || '',
    title: member.title || '',
    member_type: member.member_type || 'regular',
    is_active: member.is_active !== false,
    registration_date: member.registration_date || '',
    board_decision_date: member.board_decision_date || '',
    status_change_date: member.status_change_date || '',
    passive_status_date: member.passive_status_date || '',
    passive_status_reason: member.passive_status_reason || '',
    passive_objection_date: member.passive_objection_date || '',
    mother_name: member.mother_name || '',
    father_name: member.father_name || '',
    is_legal_entity: member.is_legal_entity || false,
    legal_entity_number: member.legal_entity_number || '',
    representative_name: member.representative_name || '',
    representative_tc_no: member.representative_tc_no || '',
    website: member.website || '',
  });

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const updates: Record<string, unknown> = {
        full_name: form.full_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        tc_identity_no: form.tc_identity_no.trim() || null,
        registry_number: form.registry_number.trim() || null,
        gender: form.gender || null,
        province: form.province.trim() || null,
        district: form.district.trim() || null,
        profession: form.profession.trim() || null,
        education_level: form.education_level.trim() || null,
        title: form.title.trim() || null,
        member_type: form.member_type || 'regular',
        is_active: form.is_active,
        registration_date: form.registration_date || null,
        board_decision_date: form.board_decision_date || null,
        status_change_date: form.status_change_date || null,
        passive_status_date: form.passive_status_date || null,
        passive_status_reason: form.passive_status_reason.trim() || null,
        passive_objection_date: form.passive_objection_date || null,
        mother_name: form.mother_name.trim() || null,
        father_name: form.father_name.trim() || null,
        is_legal_entity: form.is_legal_entity,
        legal_entity_number: form.legal_entity_number.trim() || null,
        representative_name: form.representative_name.trim() || null,
        representative_tc_no: form.representative_tc_no.trim() || null,
        website: form.website.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('members')
        .update(updates)
        .eq('id', member.id);

      if (updateError) throw updateError;

      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Üye Bilgilerini Düzenle</h3>
            <p className="text-sm text-gray-500 mt-0.5">{member.full_name}</p>
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

            <Section icon={<User size={16} />} title="Kimlik Bilgileri">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Ad Soyad" required>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => set('full_name', e.target.value)}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="TC Kimlik No">
                  <input
                    type="text"
                    value={form.tc_identity_no}
                    onChange={(e) => set('tc_identity_no', e.target.value)}
                    maxLength={11}
                    className={inputCls}
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
                  <input
                    type="text"
                    value={form.father_name}
                    onChange={(e) => set('father_name', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Ana Adı">
                  <input
                    type="text"
                    value={form.mother_name}
                    onChange={(e) => set('mother_name', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
            </Section>

            <Section icon={<Mail size={16} />} title="İletişim Bilgileri">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="E-posta">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Telefon">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Adres" className="md:col-span-2">
                  <textarea
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    rows={2}
                    className={inputCls}
                  />
                </Field>
              </div>
            </Section>

            <Section icon={<MapPin size={16} />} title="Konum Bilgileri">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="İl">
                  <input
                    type="text"
                    value={form.province}
                    onChange={(e) => set('province', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="İlçe">
                  <input
                    type="text"
                    value={form.district}
                    onChange={(e) => set('district', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
            </Section>

            <Section icon={<GraduationCap size={16} />} title="Mesleki Bilgiler">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Meslek">
                  <input
                    type="text"
                    value={form.profession}
                    onChange={(e) => set('profession', e.target.value)}
                    className={inputCls}
                  />
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
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    className={inputCls}
                  />
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
                  <select
                    value={form.is_active ? 'active' : 'passive'}
                    onChange={(e) => set('is_active', e.target.value === 'active')}
                    className={inputCls}
                  >
                    <option value="active">Aktif</option>
                    <option value="passive">Pasif</option>
                  </select>
                </Field>
                <Field label="Kayıt Tarihi">
                  <input
                    type="date"
                    value={form.registration_date}
                    onChange={(e) => set('registration_date', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="YK Karar Tarihi">
                  <input
                    type="date"
                    value={form.board_decision_date}
                    onChange={(e) => set('board_decision_date', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Durum Değişiklik Tarihi">
                  <input
                    type="date"
                    value={form.status_change_date}
                    onChange={(e) => set('status_change_date', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Pasif Olma Tarihi">
                  <input
                    type="date"
                    value={form.passive_status_date}
                    onChange={(e) => set('passive_status_date', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Pasif Olma Nedeni" className="md:col-span-2">
                  <input
                    type="text"
                    value={form.passive_status_reason}
                    onChange={(e) => set('passive_status_reason', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Pasif İtiraz Tarihi">
                  <input
                    type="date"
                    value={form.passive_objection_date}
                    onChange={(e) => set('passive_objection_date', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
            </Section>

            <Section icon={<Briefcase size={16} />} title="Tüzel Kişi Bilgileri">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Tüzel Kişi mi?">
                  <select
                    value={form.is_legal_entity ? 'yes' : 'no'}
                    onChange={(e) => set('is_legal_entity', e.target.value === 'yes')}
                    className={inputCls}
                  >
                    <option value="no">Hayır</option>
                    <option value="yes">Evet</option>
                  </select>
                </Field>
                <Field label="Tüzel Kişi No">
                  <input
                    type="text"
                    value={form.legal_entity_number}
                    onChange={(e) => set('legal_entity_number', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Temsilci Adı">
                  <input
                    type="text"
                    value={form.representative_name}
                    onChange={(e) => set('representative_name', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Temsilci TC No">
                  <input
                    type="text"
                    value={form.representative_tc_no}
                    onChange={(e) => set('representative_tc_no', e.target.value)}
                    maxLength={11}
                    className={inputCls}
                  />
                </Field>
                <Field label="Web Sitesi" className="md:col-span-2">
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => set('website', e.target.value)}
                    className={inputCls}
                    placeholder="https://"
                  />
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
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Save size={16} />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-blue-600">{icon}</span>
        <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  className = '',
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
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

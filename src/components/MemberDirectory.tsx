import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Member } from '../types';
import { Search, Eye, X } from 'lucide-react';

export function MemberDirectory() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const { data } = await supabase
        .from('members')
        .select('*')
        .order('full_name', { ascending: true });
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.tc_identity_no && m.tc_identity_no.includes(search)) ||
      (m.registry_number && m.registry_number.includes(search)) ||
      (m.phone && m.phone.includes(search))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Üye Dizini</h2>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Ad, e-posta, TC No, kayıt no veya telefon ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kayıt No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ad Soyad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">TC Kimlik No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">E-Posta</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Telefon</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">İl/İlçe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-800">{member.registry_number || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-800">{member.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{member.tc_identity_no || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{member.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{member.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {member.province && member.district
                      ? `${member.province}/${member.district}`
                      : member.province || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {member.is_active !== false ? (
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded">
                        Pasif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedMember(member)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">Sonuç bulunamadı</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-600">
          Toplam {filteredMembers.length} üye
        </div>
      </div>

      {selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Üye Detayları</h3>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoField label="Kayıt No" value={selectedMember.registry_number} />
                <InfoField label="Ad Soyad" value={selectedMember.full_name} />
                <InfoField label="TC Kimlik No" value={selectedMember.tc_identity_no} />
                <InfoField label="Cinsiyet" value={selectedMember.gender === 'male' ? 'Erkek' : selectedMember.gender === 'female' ? 'Kadın' : selectedMember.gender} />
                <InfoField label="E-Posta" value={selectedMember.email} />
                <InfoField label="Telefon" value={selectedMember.phone} />
                <InfoField label="Adres" value={selectedMember.address} className="md:col-span-2" />

                <div className="md:col-span-2 border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Tüzel Kişi Bilgileri</h4>
                </div>
                <InfoField label="Tüzel Kişi" value={selectedMember.is_legal_entity ? 'Evet' : 'Hayır'} />
                <InfoField label="Tüzel Kişi No" value={selectedMember.legal_entity_number} />
                <InfoField label="Temsilci Adı" value={selectedMember.representative_name} />
                <InfoField label="Temsilci TC No" value={selectedMember.representative_tc_no} />
                <InfoField label="Web Sitesi" value={selectedMember.website} className="md:col-span-2" />

                <div className="md:col-span-2 border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Mesleki Bilgiler</h4>
                </div>
                <InfoField label="Meslek" value={selectedMember.profession} />
                <InfoField label="Öğrenim Durumu" value={selectedMember.education_level} />
                <InfoField label="Ünvan" value={selectedMember.title} className="md:col-span-2" />

                <div className="md:col-span-2 border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Konum Bilgileri</h4>
                </div>
                <InfoField label="İl" value={selectedMember.province} />
                <InfoField label="İlçe" value={selectedMember.district} />

                <div className="md:col-span-2 border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Üyelik Bilgileri</h4>
                </div>
                <InfoField label="Üye Tipi" value={selectedMember.member_type} />
                <InfoField label="Üyelik Durumu" value={selectedMember.is_active !== false ? 'Aktif' : 'Pasif'} />
                <InfoField label="Kayıt Tarihi" value={selectedMember.registration_date} />
                <InfoField label="YK Karar Tarihi" value={selectedMember.board_decision_date} />
                <InfoField label="Durum Değişiklik Tarihi" value={selectedMember.status_change_date} />
                <InfoField label="Pasif Olma Tarihi" value={selectedMember.passive_status_date} />
                <InfoField label="Pasif Olma Nedeni" value={selectedMember.passive_status_reason} className="md:col-span-2" />
                <InfoField label="Pasif İtiraz Tarihi" value={selectedMember.passive_objection_date} />
                <InfoField label="Kayıt Tarihi (Sistem)" value={new Date(selectedMember.joined_at).toLocaleDateString('tr-TR')} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoField({ label, value, className = '' }: { label: string; value?: string | boolean | null; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="text-sm text-gray-800">
        {value || '-'}
      </div>
    </div>
  );
}

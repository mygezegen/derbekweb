import { useState, useEffect } from 'react';
import { X, Search, Users, CheckCircle2, Circle } from 'lucide-react';
import { Member } from '../types';

interface MemberSelectionModalProps {
  members: Member[];
  selectedMemberIds: string[];
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
}

export function MemberSelectionModal({
  members,
  selectedMemberIds,
  onClose,
  onConfirm,
}: MemberSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedMemberIds));

  const filteredMembers = members.filter(
    (member) =>
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.includes(searchQuery)
  );

  const toggleMember = (memberId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    setSelected(new Set(filteredMembers.map((m) => m.id)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Users className="text-blue-600" size={24} />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Üye Seçimi</h2>
              <p className="text-sm text-gray-500">
                {selected.size} üye seçildi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Üye ara (isim, e-posta, telefon)..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Tümünü Seç
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Seçimi Temizle
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users size={48} className="mx-auto mb-3 text-gray-300" />
              <p>Üye bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => toggleMember(member.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selected.has(member.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {selected.has(member.id) ? (
                      <CheckCircle2 className="text-blue-600" size={24} />
                    ) : (
                      <Circle className="text-gray-300" size={24} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{member.full_name}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {member.email && (
                        <span className="text-xs text-gray-500">{member.email}</span>
                      )}
                      {member.phone && (
                        <span className="text-xs text-gray-500">{member.phone}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {selected.size} Üye ile Devam Et
          </button>
        </div>
      </div>
    </div>
  );
}

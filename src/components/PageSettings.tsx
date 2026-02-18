import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PageSetting, Permission, RolePermission, Member } from '../types';
import { Eye, EyeOff, Save, RefreshCw, Shield, Users, Crown, Lock } from 'lucide-react';
import { logAction, getCurrentMemberId } from '../lib/auditLog';

export function PageSettings() {
  const [settings, setSettings] = useState<PageSetting[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Record<string, Partial<PageSetting>>>({});
  const [editedPermissions, setEditedPermissions] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'pages' | 'permissions' | 'roles'>('pages');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [settingsData, permissionsData, rolePermData, membersData, currentUserData] = await Promise.all([
        supabase.from('page_settings').select('*').order('display_order', { ascending: true }),
        supabase.from('permissions').select('*').order('category, name'),
        supabase.from('role_permissions').select('*'),
        supabase.from('members').select('*').order('full_name'),
        supabase.from('members').select('*').eq('auth_id', user.id).single()
      ]);

      if (settingsData.data) {
        setSettings(settingsData.data);
        const initialEdited: Record<string, Partial<PageSetting>> = {};
        settingsData.data.forEach(setting => {
          initialEdited[setting.id] = { ...setting };
        });
        setEditedSettings(initialEdited);
      }

      if (permissionsData.data) {
        setPermissions(permissionsData.data);

        if (rolePermData.data) {
          setRolePermissions(rolePermData.data);
          const permMap: Record<string, boolean> = {};

          permissionsData.data.forEach(perm => {
            ['root', 'admin', 'member'].forEach(role => {
              const existingPerm = rolePermData.data.find(
                rp => rp.role === role && rp.permission_code === perm.code
              );
              permMap[`${role}-${perm.code}`] = existingPerm?.enabled ?? false;
            });
          });

          setEditedPermissions(permMap);
        }
      }

      if (membersData.data) setMembers(membersData.data);
      if (currentUserData.data) setCurrentUser(currentUserData.data);
    } catch (error) {
      console.error('Error loading data:', error);
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

  const handlePermissionToggle = (role: string, permissionCode: string) => {
    const key = `${role}-${permissionCode}`;
    setEditedPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleAdminToggle = async (memberId: string, currentIsAdmin: boolean) => {
    if (!currentUser?.is_root) {
      alert('Bu işlem için root yetkisi gereklidir');
      return;
    }

    if (!confirm(`${currentIsAdmin ? 'Admin yetkisini kaldırmak' : 'Admin yapmak'} istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('members')
        .update({ is_admin: !currentIsAdmin })
        .eq('id', memberId);

      if (error) throw error;

      await loadAllData();
      alert('Yetki başarıyla güncellendi');
    } catch (error) {
      console.error('Error updating admin status:', error);
      alert('Yetki güncellenirken hata oluştu');
    }
  };

  const handleSaveSettings = async () => {
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

      await loadAllData();
      alert('Sayfa ayarları başarıyla güncellendi');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Ayarlar kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!currentUser?.is_root) {
      alert('Bu işlem için root yetkisi gereklidir');
      return;
    }

    setSaving(true);
    try {
      let updateCount = 0;

      for (const key in editedPermissions) {
        const [role, ...permissionCodeParts] = key.split('-');
        const permissionCode = permissionCodeParts.join('-');
        const enabled = editedPermissions[key];

        const existing = rolePermissions.find(rp => rp.role === role && rp.permission_code === permissionCode);

        if (existing) {
          if (existing.enabled !== enabled) {
            const { error } = await supabase
              .from('role_permissions')
              .update({ enabled })
              .eq('role', role)
              .eq('permission_code', permissionCode);

            if (error) {
              console.error(`Error updating ${role}-${permissionCode}:`, error);
              throw error;
            }
            updateCount++;
          }
        } else {
          const { error } = await supabase
            .from('role_permissions')
            .insert({ role, permission_code: permissionCode, enabled });

          if (error) {
            console.error(`Error inserting ${role}-${permissionCode}:`, error);
            throw error;
          }
          updateCount++;
        }
      }

      await loadAllData();
      alert(`Yetkiler başarıyla güncellendi (${updateCount} değişiklik)`);
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Yetkiler kaydedilirken hata oluştu: ' + (error as Error).message);
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

    const permMap: Record<string, boolean> = {};
    permissions.forEach(perm => {
      ['root', 'admin', 'member'].forEach(role => {
        const existingPerm = rolePermissions.find(
          rp => rp.role === role && rp.permission_code === perm.code
        );
        permMap[`${role}-${perm.code}`] = existingPerm?.enabled ?? false;
      });
    });
    setEditedPermissions(permMap);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const categoryLabels: Record<string, string> = {
    member_management: 'Üye Yönetimi',
    financial_management: 'Mali Yönetim',
    content_management: 'İçerik Yönetimi',
    settings_management: 'Ayarlar Yönetimi',
    user_management: 'Kullanıcı Yönetimi'
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Sistem Ayarları</h2>
        {currentUser?.is_root && (
          <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg border border-amber-200">
            <Crown className="w-5 h-5" />
            <span className="font-semibold">Root Kullanıcı</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex space-x-1 p-1">
            <button
              onClick={() => setActiveTab('pages')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'pages'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Eye className="w-5 h-5 inline-block mr-2" />
              Sayfa Görünürlüğü
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'permissions'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              disabled={!currentUser?.is_root}
            >
              <Shield className="w-5 h-5 inline-block mr-2" />
              Yetki Yönetimi
              {!currentUser?.is_root && <Lock className="w-4 h-4 inline-block ml-2" />}
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'roles'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              disabled={!currentUser?.is_root}
            >
              <Users className="w-5 h-5 inline-block mr-2" />
              Admin Yetkilendirme
              {!currentUser?.is_root && <Lock className="w-4 h-4 inline-block ml-2" />}
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'pages' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6">
                <p className="text-sm">
                  Bu ayarlar, sayfa erişimlerini ve görünürlüğü kontrol eder. Admin ve üye panellerinde hangi sayfaların görüneceğini belirleyebilirsiniz.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Sayfa
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Admin'e Görünür
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Üyelere Görünür
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Aktif
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {settings.map(setting => (
                      <tr key={setting.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{setting.page_name}</p>
                            {setting.description && (
                              <p className="text-sm text-gray-500">{setting.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggle(setting.id, 'visible_to_admin')}
                            className={`p-2 rounded-lg transition-colors ${
                              editedSettings[setting.id]?.visible_to_admin
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {editedSettings[setting.id]?.visible_to_admin ? (
                              <Eye className="w-5 h-5" />
                            ) : (
                              <EyeOff className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggle(setting.id, 'visible_to_members')}
                            className={`p-2 rounded-lg transition-colors ${
                              editedSettings[setting.id]?.visible_to_members
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {editedSettings[setting.id]?.visible_to_members ? (
                              <Eye className="w-5 h-5" />
                            ) : (
                              <EyeOff className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggle(setting.id, 'is_enabled')}
                            className={`p-2 rounded-lg transition-colors ${
                              editedSettings[setting.id]?.is_enabled
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {editedSettings[setting.id]?.is_enabled ? (
                              <Eye className="w-5 h-5" />
                            ) : (
                              <EyeOff className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Sıfırla
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && currentUser?.is_root && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Root Yetkisi Gerekli: Bu ayarlar sistem genelinde yetki yapısını belirler.
                </p>
              </div>

              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800">{categoryLabels[category] || category}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Yetki
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                            Root
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                            Admin
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                            Üye
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {perms.map(perm => (
                          <tr key={perm.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-gray-900">{perm.name}</p>
                                {perm.description && (
                                  <p className="text-sm text-gray-500">{perm.description}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex items-center justify-center w-6 h-6 bg-amber-100 text-amber-700 rounded">
                                <Crown className="w-4 h-4" />
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={editedPermissions[`admin-${perm.code}`] ?? false}
                                onChange={() => handlePermissionToggle('admin', perm.code)}
                                className="w-5 h-5 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={editedPermissions[`member-${perm.code}`] ?? false}
                                onChange={() => handlePermissionToggle('member', perm.code)}
                                className="w-5 h-5 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Sıfırla
                </button>
                <button
                  onClick={handleSavePermissions}
                  disabled={saving}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'roles' && currentUser?.is_root && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Root Yetkisi Gerekli: Üyeleri admin olarak atayabilir veya yetkilerini kaldırabilirsiniz.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Üye
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        E-posta
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {members.map(member => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{member.full_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-600">{member.email}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {member.is_root ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                              <Crown className="w-4 h-4" />
                              Root
                            </span>
                          ) : member.is_admin ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                              <Shield className="w-4 h-4" />
                              Admin
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                              Üye
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {!member.is_root && (
                            <button
                              onClick={() => handleAdminToggle(member.id, member.is_admin)}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                member.is_admin
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              }`}
                            >
                              {member.is_admin ? 'Admin Yetkisini Kaldır' : 'Admin Yap'}
                            </button>
                          )}
                          {member.is_root && (
                            <span className="text-sm text-gray-500 italic">Root değiştirilemez</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

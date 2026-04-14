import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type ModuleConfig = {
  module_key: string;
  label: string;
  enabled_web: boolean;
  enabled_mobile: boolean;
  admin_only: boolean;
  root_only: boolean;
  sort_order: number;
  icon?: string;
};

export function useModuleConfig() {
  const { member } = useAuth();
  const [modules, setModules] = useState<ModuleConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const loadModules = useCallback(async () => {
    const { data } = await supabase
      .from('module_config')
      .select('*')
      .order('sort_order', { ascending: true });
    setModules(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadModules();

    const channel = supabase
      .channel('module-config-changes-mobile')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'module_config' },
        () => { loadModules(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadModules]);

  const isModuleEnabled = useCallback((moduleKey: string): boolean => {
    const mod = modules.find(m => m.module_key === moduleKey);
    if (!mod) return true;
    if (!mod.enabled_mobile) return false;
    if (mod.root_only && !member?.is_root) return false;
    if (mod.admin_only && !member?.is_admin && !member?.is_root) return false;
    return true;
  }, [modules, member]);

  return { modules, loading, isModuleEnabled, reload: loadModules };
}

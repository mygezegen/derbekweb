import { useEffect, useState, useCallback, useRef } from 'react';
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

let instanceCount = 0;

export function useModuleConfig() {
  const { member } = useAuth();
  const [modules, setModules] = useState<ModuleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const channelNameRef = useRef<string>(`module-config-mobile-${++instanceCount}`);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from('module_config')
        .select('*')
        .order('sort_order', { ascending: true });
      if (active) {
        setModules(data || []);
        setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'module_config' },
        () => { load(); }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const isModuleEnabled = useCallback((moduleKey: string): boolean => {
    const mod = modules.find(m => m.module_key === moduleKey);
    if (!mod) return true;
    if (!mod.enabled_mobile) return false;
    if (mod.root_only && !member?.is_root) return false;
    if (mod.admin_only && !member?.is_admin && !member?.is_root) return false;
    return true;
  }, [modules, member]);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from('module_config')
      .select('*')
      .order('sort_order', { ascending: true });
    setModules(data || []);
  }, []);

  return { modules, loading, isModuleEnabled, reload };
}

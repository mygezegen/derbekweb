import type { SupabaseClient } from '@supabase/supabase-js';

export async function logAction(
  supabase: SupabaseClient,
  memberId: string,
  actionType: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'other',
  tableName: string,
  recordId?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_action', {
      p_member_id: memberId,
      p_action_type: actionType,
      p_table_name: tableName,
      p_record_id: recordId || null,
      p_old_values: oldValues || null,
      p_new_values: newValues || null,
    });
    if (error) {
      console.error('Error logging action:', error);
    }
  } catch (error) {
    console.error('Error in logAction:', error);
  }
}

export async function getCurrentMemberId(supabase: SupabaseClient): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('members')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle();
    return data?.id || null;
  } catch (error) {
    console.error('Error getting current member ID:', error);
    return null;
  }
}

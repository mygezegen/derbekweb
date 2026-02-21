import { logAction as _logAction, getCurrentMemberId as _getCurrentMemberId } from '@dernek/core';
import { supabase } from './supabase';

export async function logAction(
  memberId: string,
  actionType: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'other',
  tableName: string,
  recordId?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
): Promise<void> {
  return _logAction(supabase, memberId, actionType, tableName, recordId, oldValues, newValues);
}

export async function getCurrentMemberId(): Promise<string | null> {
  return _getCurrentMemberId(supabase);
}

import { getSMSConfig as _getSMSConfig, sendSMS as _sendSMS } from '@dernek/core';
import type { SMSConfig, SendSMSParams, SMSResponse } from '@dernek/core';
import { supabase } from './supabase';

export type { SMSConfig, SendSMSParams, SMSResponse };

export async function getSMSConfig(): Promise<SMSConfig | null> {
  return _getSMSConfig(supabase);
}

export async function sendSMS(params: SendSMSParams): Promise<SMSResponse> {
  return _sendSMS(supabase, import.meta.env.VITE_SUPABASE_URL, params);
}


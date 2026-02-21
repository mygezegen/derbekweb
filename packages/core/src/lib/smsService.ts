import type { SupabaseClient } from '@supabase/supabase-js';

export interface SMSConfig {
  api_key: string;
  api_hash: string;
  sender_name: string;
  is_active: boolean;
}

export interface SendSMSParams {
  recipients: string[];
  message: string;
  sendDateTime?: string;
}

export interface SMSResponse {
  success: boolean;
  orderId?: string;
  error?: string;
  code?: string;
}

export async function getSMSConfig(supabase: SupabaseClient): Promise<SMSConfig | null> {
  try {
    const { data, error } = await supabase
      .from('sms_config')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('SMS config yuklenemedi:', err);
    return null;
  }
}

export async function sendSMS(
  supabase: SupabaseClient,
  supabaseUrl: string,
  params: SendSMSParams
): Promise<SMSResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Oturum bulunamadi' };
    }
    const apiUrl = `${supabaseUrl}/functions/v1/send-sms`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipients: params.recipients,
        message: params.message,
        sendDateTime: params.sendDateTime,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || 'SMS gonderilemedi');
    }
    return await response.json();
  } catch (err) {
    console.error('SMS gonderim hatasi:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'SMS gonderilemedi',
    };
  }
}

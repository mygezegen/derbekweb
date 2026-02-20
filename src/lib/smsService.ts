import { supabase } from './supabase';

interface SMSConfig {
  api_key: string;
  api_hash: string;
  sender_name: string;
  is_active: boolean;
}

interface SendSMSParams {
  recipients: string[];
  message: string;
  sendDateTime?: string;
}

interface SMSResponse {
  success: boolean;
  orderId?: string;
  error?: string;
  code?: string;
}

export async function getSMSConfig(): Promise<SMSConfig | null> {
  try {
    const { data, error } = await supabase
      .from('sms_config')
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('SMS config yüklenemedi:', err);
    return null;
  }
}

export async function sendSMS(params: SendSMSParams): Promise<SMSResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Oturum bulunamadı' };
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`;

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
      throw new Error(errorData?.error || 'SMS gönderilemedi');
    }

    const responseData = await response.json();

    return responseData;
  } catch (err) {
    console.error('SMS gönderim hatası:', err);

    return {
      success: false,
      error: err instanceof Error ? err.message : 'SMS gönderilemedi',
    };
  }
}


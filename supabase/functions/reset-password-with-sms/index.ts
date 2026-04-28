import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ResetPasswordRequest {
  action?: 'verify_code' | 'reset_password';
  smsCode: string;
  phoneNumber: string;
  newPassword?: string;
  newEmail?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: ResetPasswordRequest = await req.json();
    const { action, smsCode, phoneNumber, newPassword, newEmail } = body;

    if (!smsCode || !phoneNumber) {
      throw new Error('SMS kodu ve telefon numarası gereklidir');
    }

    // action: 'verify_code' — sadece kodu doğrula, şifre değiştirme
    if (action === 'verify_code') {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );

      const { data, error: verifyError } = await supabaseClient
        .rpc('validate_password_reset_code', {
          p_reset_code: smsCode,
          p_phone_number: phoneNumber
        });

      if (verifyError) {
        throw new Error(`Kod doğrulanamadı: ${verifyError.message}`);
      }

      if (!data || data.length === 0 || !data[0].is_valid) {
        throw new Error(data?.[0]?.error_message || 'Geçersiz veya süresi dolmuş kod');
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Kod doğrulandı' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // action: 'reset_password' or legacy (no action) — kod doğrula + şifre değiştir
    if (!newPassword) {
      throw new Error('SMS kodu, telefon numarası ve yeni şifre gereklidir');
    }

    if (newPassword.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalıdır');
    }

    if (newEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        throw new Error('Geçerli bir e-posta adresi giriniz');
      }
      if (newEmail.toLowerCase().endsWith('@uye.local')) {
        throw new Error('Lütfen gerçek bir e-posta adresi giriniz (@uye.local kullanılamaz)');
      }
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data, error: verifyError } = await supabaseClient
      .rpc('validate_password_reset_code', {
        p_reset_code: smsCode,
        p_phone_number: phoneNumber
      });

    if (verifyError) {
      throw new Error(`Kod doğrulanamadı: ${verifyError.message}`);
    }

    if (!data || data.length === 0 || !data[0].is_valid) {
      throw new Error(data?.[0]?.error_message || 'Geçersiz veya süresi dolmuş kod');
    }

    const userId = data[0].user_id;

    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
      throw new Error('Kullanıcı bulunamadı');
    }

    if (newEmail && newEmail !== userData.user.email) {
      const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
      const emailExists = existingUser.users.some(u => u.email?.toLowerCase() === newEmail.toLowerCase() && u.id !== userId);

      if (emailExists) {
        throw new Error('Bu e-posta adresi zaten kullanılıyor');
      }
    }

    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      throw new Error(`Şifre güncellenemedi: ${updateError.message}`);
    }

    if (newEmail && newEmail !== userData.user.email) {
      const { error: emailUpdateError } = await supabaseClient.auth.admin.updateUserById(
        userId,
        { email: newEmail }
      );

      if (emailUpdateError) {
        throw new Error(`E-posta güncellenemedi: ${emailUpdateError.message}`);
      }

      await supabaseClient
        .from('members')
        .update({ email: newEmail, updated_at: new Date().toISOString() })
        .eq('auth_id', userId);
    }

    await supabaseClient
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('reset_code', smsCode)
      .eq('phone_number', phoneNumber)
      .is('used_at', null);

    const finalEmail = (newEmail && newEmail !== userData.user.email) ? newEmail : userData.user.email;

    return new Response(
      JSON.stringify({
        success: true,
        message: newEmail ? 'Şifreniz ve e-posta adresiniz başarıyla güncellendi' : 'Şifreniz başarıyla değiştirildi',
        emailUpdated: !!newEmail,
        email: finalEmail,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Şifre sıfırlama hatası:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.8';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PasswordResetRequest {
  email: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    if (!email) {
      throw new Error('E-posta adresi gereklidir');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: smtpSettings } = await supabaseClient
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!smtpSettings || !smtpSettings.smtp_host || !smtpSettings.smtp_username || !smtpSettings.smtp_password) {
      throw new Error('SMTP ayarları yapılandırılmamış. Lütfen yönetici panelinden SMTP ayarlarını yapılandırın.');
    }

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://association-app-deve-qlaf.bolt.host';

    const { data: resetData, error: resetError } = await supabaseClient.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${origin}/reset-password`,
      },
    });

    if (resetError) {
      throw new Error(`Şifre sıfırlama linki oluşturulamadı: ${resetError.message}`);
    }

    if (!resetData.properties?.action_link) {
      throw new Error('Şifre sıfırlama bağlantısı oluşturulamadı');
    }

    const resetUrl = resetData.properties.action_link;

    const { data: member } = await supabaseClient
      .from('members')
      .select('full_name')
      .eq('email', email)
      .maybeSingle();

    const recipientName = member?.full_name || email;

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Şifre Sıfırlama</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align: center; padding-bottom: 30px;">
                          <h1 style="color: #dc2626; margin: 0; font-size: 24px; font-weight: bold;">
                            Çaybaşı Köyü Derneği
                          </h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 20px;">
                          <h2 style="color: #374151; margin: 0 0 16px 0; font-size: 20px;">
                            Şifre Sıfırlama Talebi
                          </h2>
                          <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 16px; line-height: 1.5;">
                            Merhaba ${recipientName},
                          </p>
                          <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 16px; line-height: 1.5;">
                            Hesabınız için şifre sıfırlama talebinde bulunuldu. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="text-align: center; padding: 30px 0;">
                          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(to right, #dc2626, #b91c1c); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);">
                            Şifremi Sıfırla
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 20px;">
                          <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;">
                            Veya aşağıdaki linki tarayıcınıza kopyalayıp yapıştırın:
                          </p>
                          <p style="color: #3b82f6; margin: 0 0 20px 0; font-size: 12px; word-break: break-all;">
                            ${resetUrl}
                          </p>
                          <p style="color: #dc2626; margin: 0 0 16px 0; font-size: 14px; line-height: 1.5; font-weight: bold;">
                            Bu link 1 saat geçerlidir.
                          </p>
                          <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;">
                            Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz. Şifreniz değiştirilmeyecektir.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top: 1px solid #e5e7eb; padding-top: 30px; margin-top: 30px;">
                          <p style="color: #9ca3af; margin: 0; font-size: 12px; line-height: 1.5; text-align: center;">
                            Bu e-posta ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} tarihinde gönderilmiştir.<br>
                            Çüngüş Çaybaşı Köyü Yardımlaşma ve Dayanışma Derneği
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const emailText = `
Çaybaşı Köyü Derneği - Şifre Sıfırlama

Merhaba ${recipientName},

Hesabınız için şifre sıfırlama talebinde bulunuldu. Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:

${resetUrl}

Bu link 1 saat geçerlidir.

Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.

Saygılarımızla,
Çüngüş Çaybaşı Köyü Yardımlaşma ve Dayanışma Derneği
    `;

    try {
      const transporter = nodemailer.createTransport({
        host: smtpSettings.smtp_host,
        port: smtpSettings.smtp_port,
        secure: smtpSettings.smtp_port === 465,
        auth: {
          user: smtpSettings.smtp_username,
          pass: smtpSettings.smtp_password,
        },
      });

      await transporter.sendMail({
        from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
        to: email,
        subject: 'Şifre Sıfırlama Talebi - Çaybaşı Köyü Derneği',
        text: emailText,
        html: emailHtml,
      });

      await supabaseClient
        .from('email_logs')
        .insert({
          template_key: 'password_reset',
          recipient_email: email,
          recipient_name: recipientName,
          subject: 'Şifre Sıfırlama Talebi - Çaybaşı Köyü Derneği',
          status: 'sent',
          error_message: null,
          sent_by: null,
        });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Şifre sıfırlama e-postası başarıyla gönderildi'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (emailError) {
      await supabaseClient
        .from('email_logs')
        .insert({
          template_key: 'password_reset',
          recipient_email: email,
          recipient_name: recipientName,
          subject: 'Şifre Sıfırlama Talebi - Çaybaşı Köyü Derneği',
          status: 'failed',
          error_message: emailError instanceof Error ? emailError.message : 'Unknown error',
          sent_by: null,
        });

      throw emailError;
    }
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

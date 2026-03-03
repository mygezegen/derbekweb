import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.8';
import { createHash } from 'node:crypto';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PasswordResetRequest {
  email: string;
  redirectTo?: string;
  tcNumber?: string;
}

// Check if email is a valid external email
function isValidExternalEmail(email: string): boolean {
  const invalidDomains = ['@uye.local'];
  return !invalidDomains.some(domain => email.toLowerCase().endsWith(domain));
}

// Generate 6-digit code
function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    let { email, redirectTo, tcNumber }: PasswordResetRequest = await req.json();

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://caybasi.org';
    const appUrl = redirectTo || `${origin.startsWith('http') ? origin : `https://${origin}`}/reset-password`;
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    if (!email) {
      throw new Error('E-posta adresi gereklidir');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get member info with phone
    // If tcNumber provided, use it to get member info (more reliable)
    let member;
    if (tcNumber) {
      // Check if multiple users have the same TC number
      const { data: membersData, error: membersError } = await supabaseClient
        .from('members')
        .select('id, full_name, phone, auth_id, email')
        .eq('tc_identity_no', tcNumber);

      if (membersError) {
        console.error('Member sorgu hatası:', membersError);
        throw new Error('Kullanıcı sorgulanırken bir hata oluştu');
      }

      if (!membersData || membersData.length === 0) {
        member = null;
      } else if (membersData.length > 1) {
        // Multiple users with same TC number - data integrity issue
        throw new Error('Bu TC kimlik numarası birden fazla kullanıcıda kayıtlı. Lütfen site yöneticisi ile iletişime geçin.');
      } else {
        member = membersData[0];
      }
    } else {
      const { data: memberData } = await supabaseClient
        .from('members')
        .select('id, full_name, phone, auth_id')
        .eq('email', email)
        .maybeSingle();
      member = memberData;
    }

    if (!member) {
      if (tcNumber) {
        throw new Error('Bu TC kimlik numarası ile kayıtlı kullanıcı bulunamadı');
      } else {
        throw new Error('Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı');
      }
    }

    // If TC was provided, use member's email for the rest of the function
    if (tcNumber && member.email) {
      email = member.email;
    }

    // If member has auth_id, verify it actually exists in auth.users
    if (member.auth_id) {
      const { data: existingAuth } = await supabaseClient.auth.admin.getUserById(member.auth_id);
      if (!existingAuth?.user) {
        // auth_id is set but user doesn't exist in auth.users — treat as missing
        member.auth_id = null;
      }
    }

    // If member exists but has no auth_id, try to find existing auth account or create new one
    if (!member.auth_id) {
      const memberEmail = tcNumber ? member.email : email;

      // First, check if auth account already exists with this email
      const { data: existingAuthUser } = await supabaseClient.auth.admin.listUsers();
      const foundUser = existingAuthUser?.users?.find(u => u.email === memberEmail);

      if (foundUser) {
        // Auth account exists, just link it to member
        const { error: updateError } = await supabaseClient
          .from('members')
          .update({ auth_id: foundUser.id })
          .eq('id', member.id);

        if (updateError) {
          console.error('Member auth_id güncelleme hatası:', updateError);
        }

        member.auth_id = foundUser.id;
      } else {
        // Generate a secure temporary password
        const tempPassword = `Temp${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}!`;

        // Create auth user
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
          email: memberEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: member.full_name,
          },
        });

        if (authError || !authData.user) {
          console.error('Auth hesabı oluşturma hatası:', authError);
          throw new Error('Kullanıcı hesabı oluşturulamadı. Lütfen yönetici ile iletişime geçin.');
        }

        // Update member with auth_id
        const { error: updateError } = await supabaseClient
          .from('members')
          .update({ auth_id: authData.user.id })
          .eq('id', member.id);

        if (updateError) {
          console.error('Member auth_id güncelleme hatası:', updateError);
        }

        member.auth_id = authData.user.id;
      }

      // Update email to use the correct one if TC was provided
      if (tcNumber) {
        email = memberEmail;
      }
    }

    // Get the actual email from auth.users (may differ from members.email)
    const { data: authUserData } = await supabaseClient.auth.admin.getUserById(member.auth_id);
    if (authUserData?.user?.email) {
      email = authUserData.user.email;
    }

    // Check if user can request password reset (30 min limit)
    const { data: canRequest } = await supabaseClient
      .rpc('can_request_password_reset', {
        p_user_id: member.auth_id,
        p_reset_type: isValidExternalEmail(email) ? 'email' : 'sms'
      });

    if (!canRequest) {
      throw new Error('Son şifre sıfırlama talebinizden sonra 30 dakika geçmesi gerekiyor. Lütfen daha sonra tekrar deneyin.');
    }

    const recipientName = member.full_name || email;

    // Check if email is valid for external delivery
    if (!isValidExternalEmail(email)) {
      // Use SMS instead
      if (!member.phone) {
        throw new Error('Hesabınızda kayıtlı telefon numarası bulunamadı. Lütfen yönetici ile iletişime geçin.');
      }

      // Generate 6-digit code
      const resetCode = generateResetCode();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Send SMS first - only save token if SMS succeeds
      const smsApiUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`;

      const smsResponse = await fetch(smsApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          to: member.phone,
          message: `Çaybaşı Köyü Derneği - Şifre Sıfırlama Kodunuz: ${resetCode}\n\nBu kod 30 dakika geçerlidir. Kodu kimseyle paylaşmayın.`,
        })
      });

      if (!smsResponse.ok) {
        const smsError = await smsResponse.json();
        throw new Error(`SMS gönderilemedi: ${smsError.error || 'Bilinmeyen hata'}`);
      }

      // SMS sent successfully - now save the token
      const { error: tokenError } = await supabaseClient
        .from('password_reset_tokens')
        .insert({
          user_id: member.auth_id,
          token_hash: createHash('sha256').update(resetCode).digest('hex'),
          reset_type: 'sms',
          reset_code: resetCode,
          phone_number: member.phone,
          expires_at: expiresAt.toISOString(),
          send_count: 1,
          last_sent_at: new Date().toISOString(),
          ip_address: ipAddress,
        });

      if (tokenError) {
        console.error('Token kayıt hatası:', tokenError);
        throw new Error('Şifre sıfırlama kodu kaydedilemedi');
      }

      return new Response(
        JSON.stringify({
          success: true,
          resetType: 'sms',
          message: 'Şifre sıfırlama kodu telefon numaranıza SMS ile gönderildi',
          phoneNumber: member.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'), // Mask phone
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Email path - original code continues below

    const { data: smtpSettings } = await supabaseClient
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!smtpSettings || !smtpSettings.smtp_host || !smtpSettings.smtp_username || !smtpSettings.smtp_password) {
      throw new Error('SMTP ayarları yapılandırılmamış. Lütfen yönetici panelinden SMTP ayarlarını yapılandırın.');
    }

    const { data: resetData, error: resetError } = await supabaseClient.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: appUrl,
      },
    });

    if (resetError) {
      throw new Error(`Şifre sıfırlama linki oluşturulamadı: ${resetError.message}`);
    }

    if (!resetData.properties?.action_link) {
      throw new Error('Şifre sıfırlama bağlantısı oluşturulamadı');
    }

    const rawActionLink = resetData.properties.action_link;
    const actionUrl = new URL(rawActionLink);
    actionUrl.searchParams.set('redirect_to', appUrl);
    const resetUrl = actionUrl.toString();


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
          resetType: 'email',
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

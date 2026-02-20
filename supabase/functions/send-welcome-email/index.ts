import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.8';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Yetkilendirme başlığı gereklidir' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Geçersiz oturum' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: smtpSettings } = await supabaseAdmin
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!smtpSettings || !smtpSettings.smtp_host || !smtpSettings.smtp_username || !smtpSettings.smtp_password) {
      return new Response(
        JSON.stringify({ success: false, error: 'SMTP ayarları yapılandırılmamış' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: member } = await supabaseAdmin
      .from('members')
      .select('full_name, email')
      .eq('auth_id', user.id)
      .maybeSingle();

    const recipientEmail = member?.email || user.email;
    const recipientName = member?.full_name || recipientEmail;

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Üye e-posta adresi bulunamadı' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: template } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('template_key', 'welcome')
      .eq('is_active', true)
      .maybeSingle();

    let emailSubject = 'Üyeliğiniz Onaylandı - Çaybaşı Köyü Derneği';
    let emailHtml = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hoş Geldiniz</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: linear-gradient(to right, #059669, #047857); padding: 40px; border-radius: 8px 8px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">
                      Çaybaşı Köyü Derneği
                    </h1>
                    <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">
                      Diyarbakır Çüngüş Çaybaşı Köyü Yardımlaşma ve Dayanışma Derneği
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 24px; text-align: center;">
                          <h2 style="color: #059669; margin: 0 0 8px 0; font-size: 28px; font-weight: bold;">
                            Hoş Geldiniz!
                          </h2>
                          <p style="color: #6b7280; margin: 0; font-size: 16px;">
                            Derneğimize üye olduğunuz için teşekkürler
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 24px;">
                          <p style="color: #374151; margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;">
                            Sayın <strong>${recipientName}</strong>,
                          </p>
                          <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 15px; line-height: 1.6;">
                            Diyarbakır Çüngüş Çaybaşı Köyü Yardımlaşma ve Dayanışma Derneği'ne hoş geldiniz. Üyeliğiniz başarıyla oluşturulmuştur.
                          </p>
                          <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 15px; line-height: 1.6;">
                            Dernek sistemimize giriş yaparak duyuruları takip edebilir, etkinliklere katılabilir ve dernek faaliyetlerine dahil olabilirsiniz.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                          <p style="color: #047857; margin: 0; font-size: 14px; font-weight: bold;">
                            Sisteme giriş yapmak icin e-posta adresinizi ve belirlediginiz sifreyi kullanabilirsiniz.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
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

    if (template) {
      emailSubject = template.subject;
      emailHtml = template.html_content
        .replace(/\{\{full_name\}\}/g, recipientName)
        .replace(/\{\{email\}\}/g, recipientEmail);
    }

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
        to: recipientEmail,
        subject: emailSubject,
        html: emailHtml,
      });

      await supabaseAdmin
        .from('email_logs')
        .insert({
          template_key: 'welcome',
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          subject: emailSubject,
          status: 'sent',
          error_message: null,
          sent_by: user.id,
        });

      return new Response(
        JSON.stringify({ success: true, message: 'Hoş geldin e-postası gönderildi' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (emailError) {
      await supabaseAdmin
        .from('email_logs')
        .insert({
          template_key: 'welcome',
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          subject: emailSubject,
          status: 'failed',
          error_message: emailError instanceof Error ? emailError.message : 'Unknown error',
          sent_by: user.id,
        });

      throw emailError;
    }
  } catch (error) {
    console.error('Hoş geldin e-postası hatası:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

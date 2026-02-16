import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.8';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  template_key?: string;
  variables?: Record<string, string>;
  recipient_name?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Use anon key for authentication
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: member } = await supabaseClient
      .from('members')
      .select('is_admin')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (!member?.is_admin) {
      console.error('User is not admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Only admins can send emails' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { to, subject, html, text, template_key, variables, recipient_name }: EmailRequest = await req.json();

    if (!to) {
      throw new Error('Missing required field: to');
    }

    let emailSubject = subject;
    let emailHtml = html;
    let emailText = text;
    let templateUsed = template_key;

    if (template_key) {
      const { data: template } = await supabaseClient
        .from('email_templates')
        .select('*')
        .eq('template_key', template_key)
        .eq('is_active', true)
        .maybeSingle();

      if (!template) {
        throw new Error(`Template '${template_key}' not found or inactive`);
      }

      emailSubject = template.subject;
      emailHtml = template.html_content;
      emailText = template.text_content || '';

      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          emailSubject = emailSubject.replace(regex, value);
          emailHtml = emailHtml.replace(regex, value);
          if (emailText) {
            emailText = emailText.replace(regex, value);
          }
        }
      }
    }

    if (!emailSubject || !emailHtml) {
      throw new Error('Missing required fields: subject and html (or template_key)');
    }

    const { data: smtpSettings } = await supabaseClient
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!smtpSettings || !smtpSettings.smtp_host || !smtpSettings.smtp_username || !smtpSettings.smtp_password) {
      throw new Error('SMTP settings not configured. Please configure SMTP settings in admin panel.');
    }

    let emailStatus = 'sent';
    let errorMessage = null;

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
        to: to,
        subject: emailSubject,
        text: emailText || emailHtml.replace(/<[^>]*>/g, ''),
        html: emailHtml,
      });

      await supabaseClient
        .from('email_logs')
        .insert({
          template_key: templateUsed,
          recipient_email: to,
          recipient_name: recipient_name,
          subject: emailSubject,
          status: emailStatus,
          error_message: errorMessage,
          sent_by: user.id,
        });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email sent successfully'
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
          template_key: templateUsed,
          recipient_email: to,
          recipient_name: recipient_name,
          subject: emailSubject,
          status: 'failed',
          error_message: emailError instanceof Error ? emailError.message : 'Unknown error',
          sent_by: user.id,
        });

      throw emailError;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
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

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(
        JSON.stringify({ error: "Authorization header gerekli" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log('Verifying token...');

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth verification failed:', authError);
      return new Response(
        JSON.stringify({ error: `Yetkisiz erişim: ${authError?.message || 'Kullanıcı bulunamadı'}` }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('User verified:', user.id);

    const { data: currentMember } = await supabaseAdmin
      .from("members")
      .select("is_admin")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!currentMember?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Bu işlem için yönetici yetkisi gerekli" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { email, password, full_name, phone, address } = await req.json();

    console.log('Creating member with:', { email, full_name, hasPassword: !!password });

    if (!email || !password || !full_name) {
      console.error('Missing required fields:', { email: !!email, password: !!password, full_name: !!full_name });
      return new Response(
        JSON.stringify({ error: "Email, şifre ve ad soyad gerekli" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (createError) {
      console.error('Auth create user error:', createError);
      return new Response(
        JSON.stringify({ error: `Kullanıcı oluşturulamadı: ${createError.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('User created successfully:', newUser.user.id);

    const memberData: any = {
      auth_id: newUser.user.id,
      full_name,
      email,
      is_admin: false,
    };

    if (phone) memberData.phone = phone;
    if (address) memberData.address = address;

    console.log('Inserting member data:', memberData);

    const { error: insertError } = await supabaseAdmin
      .from("members")
      .insert(memberData);

    if (insertError) {
      console.error('Member insert error:', insertError);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);

      return new Response(
        JSON.stringify({ error: `Üye kaydı oluşturulamadı: ${insertError.message}`, details: insertError }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('Member inserted successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: `${full_name} başarıyla eklendi`,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Create member error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

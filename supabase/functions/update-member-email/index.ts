import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header gerekli" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Yetkisiz erişim" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: currentMember } = await supabaseAdmin
      .from("members")
      .select("is_admin, is_root")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!currentMember?.is_admin && !currentMember?.is_root) {
      return new Response(
        JSON.stringify({ error: "Bu işlem için yönetici yetkisi gerekli" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { member_id, new_email } = await req.json();

    if (!member_id || !new_email) {
      return new Response(
        JSON.stringify({ error: "member_id ve new_email zorunludur" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: targetMember } = await supabaseAdmin
      .from("members")
      .select("auth_id, email")
      .eq("id", member_id)
      .maybeSingle();

    if (!targetMember) {
      return new Response(
        JSON.stringify({ error: "Üye bulunamadı" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetMember.email === new_email) {
      return new Response(
        JSON.stringify({ success: true, message: "Email değişmedi" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetMember.auth_id) {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        targetMember.auth_id,
        { email: new_email, email_confirm: true }
      );

      if (updateAuthError) {
        return new Response(
          JSON.stringify({ error: `Auth email güncellenemedi: ${updateAuthError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email başarıyla güncellendi" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

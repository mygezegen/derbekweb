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

    const body = await req.json();
    const { new_password, target_member_id } = body;

    if (!new_password || new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Şifre en az 6 karakter olmalıdır" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Kendi şifresini değiştiriyor
    if (!target_member_id) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: new_password }
      );
      if (updateError) {
        return new Response(
          JSON.stringify({ error: `Şifre güncellenemedi: ${updateError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, message: "Şifreniz başarıyla güncellendi" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Başka bir üyenin şifresini değiştiriyor — sadece root
    const { data: currentMember } = await supabaseAdmin
      .from("members")
      .select("is_root")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!currentMember?.is_root) {
      return new Response(
        JSON.stringify({ error: "Başka bir üyenin şifresini değiştirmek için root yetkisi gereklidir" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: targetMember } = await supabaseAdmin
      .from("members")
      .select("auth_id, full_name")
      .eq("id", target_member_id)
      .maybeSingle();

    if (!targetMember || !targetMember.auth_id) {
      return new Response(
        JSON.stringify({ error: "Üye bulunamadı veya hesabı aktif değil" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetMember.auth_id,
      { password: new_password }
    );
    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Şifre güncellenemedi: ${updateError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: `${targetMember.full_name || "Üye"} için şifre başarıyla güncellendi` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
      console.error("Authorization header bulunamadı");
      return new Response(
        JSON.stringify({ error: "Authorization header gerekli" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Token alındı, uzunluk:", token.length);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Auth hatası:", authError?.message);
      return new Response(
        JSON.stringify({ error: `Yetkisiz erişim: ${authError?.message || "Kullanıcı bulunamadı"}` }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Kullanıcı doğrulandı:", user.id);

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

    const body = await req.json();
    const {
      email,
      password,
      full_name,
      phone,
      address,
      tc_identity_no,
      registry_number,
      gender,
      province,
      district,
      profession,
      education_level,
      title,
      member_type,
      is_active,
      registration_date,
      board_decision_date,
      status_change_date,
      passive_status_date,
      passive_status_reason,
      passive_objection_date,
      mother_name,
      father_name,
      is_legal_entity,
      legal_entity_number,
      representative_name,
      representative_tc_no,
      website,
    } = body;

    if (!full_name) {
      return new Response(
        JSON.stringify({ error: "Ad soyad zorunludur" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const memberData: Record<string, unknown> = {
      full_name,
      is_admin: false,
      is_active: is_active !== false,
    };

    if (email) memberData.email = email;
    if (phone) memberData.phone = phone;
    if (address) memberData.address = address;
    if (tc_identity_no) memberData.tc_identity_no = tc_identity_no;
    if (registry_number) memberData.registry_number = registry_number;
    if (gender) memberData.gender = gender;
    if (province) memberData.province = province;
    if (district) memberData.district = district;
    if (profession) memberData.profession = profession;
    if (education_level) memberData.education_level = education_level;
    if (title) memberData.title = title;
    if (member_type) memberData.member_type = member_type;
    if (registration_date) memberData.registration_date = registration_date;
    if (board_decision_date) memberData.board_decision_date = board_decision_date;
    if (status_change_date) memberData.status_change_date = status_change_date;
    if (passive_status_date) memberData.passive_status_date = passive_status_date;
    if (passive_status_reason) memberData.passive_status_reason = passive_status_reason;
    if (passive_objection_date) memberData.passive_objection_date = passive_objection_date;
    if (mother_name) memberData.mother_name = mother_name;
    if (father_name) memberData.father_name = father_name;
    if (is_legal_entity !== undefined) memberData.is_legal_entity = is_legal_entity;
    if (legal_entity_number) memberData.legal_entity_number = legal_entity_number;
    if (representative_name) memberData.representative_name = representative_name;
    if (representative_tc_no) memberData.representative_tc_no = representative_tc_no;
    if (website) memberData.website = website;

    if (email && password) {
      const { data: existingUserByEmail } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUserByEmail.users.find(u => u.email === email);

      let authId: string;

      if (existingUser) {
        authId = existingUser.id;
        console.log(`Email zaten mevcut (${email}), mevcut auth kullanılıyor:`, authId);
      } else {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });

        if (createError) {
          return new Response(
            JSON.stringify({ error: `Kullanıcı oluşturulamadı: ${createError.message}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        authId = newUser.user.id;
      }

      memberData.auth_id = authId;

      const { data: existingMember } = await supabaseAdmin
        .from("members")
        .select("id")
        .eq("auth_id", authId)
        .maybeSingle();

      if (existingMember) {
        const { error: updateError } = await supabaseAdmin
          .from("members")
          .update(memberData)
          .eq("id", existingMember.id);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: `Üye kaydı güncellenemedi: ${updateError.message}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: `${full_name} başarıyla güncellendi (sistem erişimi ile)` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        const { error: insertError } = await supabaseAdmin.from("members").insert(memberData);

        if (insertError) {
          if (!existingUser) {
            await supabaseAdmin.auth.admin.deleteUser(authId);
          }
          return new Response(
            JSON.stringify({ error: `Üye kaydı oluşturulamadı: ${insertError.message}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: `${full_name} başarıyla eklendi (sistem erişimi ile)` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      let existingMemberId: string | null = null;

      if (email) {
        const { data: memberByEmail } = await supabaseAdmin
          .from("members")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (memberByEmail) existingMemberId = memberByEmail.id;
      }

      if (!existingMemberId && tc_identity_no) {
        const { data: memberByTc } = await supabaseAdmin
          .from("members")
          .select("id")
          .eq("tc_identity_no", tc_identity_no)
          .maybeSingle();
        if (memberByTc) existingMemberId = memberByTc.id;
      }

      if (existingMemberId) {
        const { error: updateError } = await supabaseAdmin
          .from("members")
          .update(memberData)
          .eq("id", existingMemberId);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: `Üye kaydı güncellenemedi: ${updateError.message}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: `${full_name} başarıyla güncellendi` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        const { error: insertError } = await supabaseAdmin.from("members").insert(memberData);

        if (insertError) {
          return new Response(
            JSON.stringify({ error: `Üye kaydı oluşturulamadı: ${insertError.message}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: `${full_name} başarıyla eklendi` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendCodeRequest {
  action: "send_code";
  tcNumber: string;
  phoneNumber: string;
}

interface VerifyCodeRequest {
  action: "verify_code";
  tcNumber: string;
  phoneNumber: string;
  smsCode: string;
}

type RequestBody = SendCodeRequest | VerifyCodeRequest;

function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("90")) cleaned = cleaned.substring(2);
  else if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
  return cleaned;
}

function maskPhone(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  if (cleaned.length >= 7) {
    return cleaned.substring(0, 3) + "****" + cleaned.substring(cleaned.length - 2);
  }
  return "****";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body: RequestBody = await req.json();

    if (body.action === "send_code") {
      const { tcNumber, phoneNumber } = body;

      if (!tcNumber || !phoneNumber) {
        throw new Error("TC kimlik numarası ve telefon numarası gereklidir");
      }

      if (tcNumber.length !== 11 || !/^\d+$/.test(tcNumber)) {
        throw new Error("Geçerli bir TC kimlik numarası giriniz (11 haneli)");
      }

      const cleanedPhone = cleanPhoneNumber(phoneNumber);
      if (cleanedPhone.length !== 10) {
        throw new Error("Geçerli bir cep telefonu numarası giriniz");
      }

      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("id, auth_id, email, phone, full_name, is_active, pending_approval")
        .eq("tc_identity_no", tcNumber)
        .maybeSingle();

      if (memberError || !member) {
        throw new Error("Bu TC kimlik numarası ile kayıtlı üye bulunamadı");
      }

      if (member.pending_approval === true) {
        throw new Error("Üyelik başvurunuz henüz onaylanmamıştır. Onay sonrası giriş yapabilirsiniz.");
      }

      if (member.is_active === false) {
        throw new Error("Hesabınız pasif durumda. Lütfen dernek yönetimiyle iletişime geçin.");
      }

      if (!member.auth_id) {
        throw new Error("Bu üyenin henüz sisteme giriş yetkisi bulunmamaktadır. Lütfen dernek yönetimiyle iletişime geçin.");
      }

      // Normalize member phone for comparison
      const memberPhone = cleanPhoneNumber(member.phone || "");
      if (memberPhone !== cleanedPhone) {
        throw new Error("Girdiğiniz telefon numarası kayıtlı numaranızla eşleşmiyor");
      }

      // Rate limiting: max 3 requests per 10 minutes per phone
      const { data: recentTokens } = await supabase
        .from("tc_phone_login_tokens")
        .select("id")
        .eq("phone_number", cleanedPhone)
        .gt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .is("used_at", null);

      if (recentTokens && recentTokens.length >= 3) {
        throw new Error("Çok fazla deneme yaptınız. Lütfen 10 dakika sonra tekrar deneyin.");
      }

      // Generate 6-digit SMS code
      const smsCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Save token
      const { error: insertError } = await supabase
        .from("tc_phone_login_tokens")
        .insert({
          user_id: member.auth_id,
          member_id: member.id,
          sms_code: smsCode,
          phone_number: cleanedPhone,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        });

      if (insertError) {
        throw new Error("Giriş kodu oluşturulamadı: " + insertError.message);
      }

      // Send SMS via sms_config
      const { data: smsConfig } = await supabase
        .from("sms_config")
        .select("api_key, api_hash, sender_name, is_active")
        .maybeSingle();

      if (smsConfig?.is_active && smsConfig.api_key && smsConfig.api_hash) {
        const smsMessage = `Dernek sistemi giris kodunuz: ${smsCode}. Bu kod 15 dakika gecerlidir. Kodu kimseyle paylasmayiniz.`;

        const smsBody = {
          request: {
            authentication: { key: smsConfig.api_key, hash: smsConfig.api_hash },
            order: {
              sender: smsConfig.sender_name,
              sendDateTime: [],
              iys: "1",
              iysList: "BIREYSEL",
              message: {
                text: smsMessage,
                receipents: { number: [cleanedPhone] },
              },
            },
          },
        };

        try {
          const smsResponse = await fetch("https://api.iletimerkezi.com/v1/send-sms/json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(smsBody),
          });

          const smsResult = await smsResponse.json();
          const statusCode = smsResult.response?.status?.code;

          await supabase.from("sms_logs").insert({
            recipient: cleanedPhone,
            message: smsMessage,
            status: (statusCode === "200" || statusCode === 200) ? "sent" : "failed",
            response_code: String(statusCode),
            response_message: smsResult.response?.status?.message || "",
            sent_at: (statusCode === "200" || statusCode === 200) ? new Date().toISOString() : null,
          });
        } catch (smsErr) {
          console.error("SMS gönderilemedi:", smsErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          maskedPhone: maskPhone(cleanedPhone),
          message: "SMS kodu gönderildi",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.action === "verify_code") {
      const { tcNumber, phoneNumber, smsCode } = body;

      if (!tcNumber || !phoneNumber || !smsCode) {
        throw new Error("TC kimlik numarası, telefon numarası ve SMS kodu gereklidir");
      }

      const cleanedPhone = cleanPhoneNumber(phoneNumber);

      // Find the token
      const { data: token, error: tokenError } = await supabase
        .from("tc_phone_login_tokens")
        .select("id, user_id, member_id, sms_code, expires_at, used_at")
        .eq("phone_number", cleanedPhone)
        .eq("sms_code", smsCode)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tokenError || !token) {
        throw new Error("Geçersiz veya süresi dolmuş kod. Lütfen yeni kod isteyin.");
      }

      // Verify TC matches this user
      const { data: member } = await supabase
        .from("members")
        .select("id, auth_id, email")
        .eq("id", token.member_id)
        .eq("tc_identity_no", tcNumber)
        .maybeSingle();

      if (!member) {
        throw new Error("TC kimlik numarası doğrulanamadı");
      }

      // Mark token as used
      await supabase
        .from("tc_phone_login_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", token.id);

      // Generate a temporary password for this session
      const tempPassword = "TcLogin_" + crypto.randomUUID().replace(/-/g, "").substring(0, 16) + "!";

      // Update user password temporarily
      const { error: pwError } = await supabase.auth.admin.updateUserById(
        token.user_id,
        { password: tempPassword }
      );

      if (pwError) {
        throw new Error("Geçici giriş oluşturulamadı: " + pwError.message);
      }

      return new Response(
        JSON.stringify({
          success: true,
          email: member.email,
          tempPassword,
          message: "Doğrulama başarılı",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error("Geçersiz işlem");
  } catch (error) {
    console.error("TC+Telefon giriş hatası:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SMSRequest {
  recipients: string[];
  message: string;
  sendDateTime?: string;
}

interface SMSConfig {
  api_key: string;
  api_hash: string;
  sender_name: string;
  is_active: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Environment check:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase yapılandırması eksik");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Authorization header missing");
      return Response.json(
        { success: false, error: "Yetkilendirme başlığı eksik" },
        { headers: corsHeaders, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return Response.json(
        { success: false, error: "Yetkisiz erişim" },
        { headers: corsHeaders, status: 401 }
      );
    }

    console.log("User authenticated:", user.id);

    const { recipients, message, sendDateTime }: SMSRequest = await req.json();
    console.log("Request params:", {
      recipientsCount: recipients?.length,
      messageLength: message?.length
    });

    if (!recipients || recipients.length === 0) {
      throw new Error("Alıcı listesi boş olamaz");
    }

    if (!message) {
      throw new Error("Mesaj boş olamaz");
    }

    const { data: config, error: configError } = await supabase
      .from("sms_config")
      .select("*")
      .maybeSingle();

    console.log("Config fetch result:", {
      hasConfig: !!config,
      error: configError
    });

    if (configError) {
      console.error("Config error:", configError);
      return Response.json(
        { success: false, error: "SMS yapılandırması yüklenemedi: " + configError.message },
        { headers: corsHeaders, status: 500 }
      );
    }

    if (!config) {
      console.error("No config found");
      return Response.json(
        { success: false, error: "SMS yapılandırması bulunamadı" },
        { headers: corsHeaders, status: 404 }
      );
    }

    const smsConfig = config as SMSConfig;
    console.log("Config loaded:", {
      isActive: smsConfig.is_active,
      hasSender: !!smsConfig.sender_name
    });

    if (!smsConfig.is_active) {
      return Response.json(
        { success: false, error: "SMS sistemi aktif değil" },
        { headers: corsHeaders }
      );
    }

    if (!smsConfig.api_key || !smsConfig.api_hash || !smsConfig.sender_name) {
      return Response.json(
        { success: false, error: "SMS yapılandırması eksik" },
        { headers: corsHeaders }
      );
    }

    const cleanedRecipients = recipients.map((num) => cleanPhoneNumber(num));

    const requestBody = {
      request: {
        authentication: {
          key: smsConfig.api_key,
          hash: smsConfig.api_hash,
        },
        order: {
          sender: smsConfig.sender_name,
          sendDateTime: sendDateTime ? [sendDateTime] : [],
          iys: "1",
          iysList: "BIREYSEL",
          message: {
            text: message,
            receipents: {
              number: cleanedRecipients,
            },
          },
        },
      },
    };

    console.log("Sending SMS to API...", {
      recipientsCount: cleanedRecipients.length,
      sender: smsConfig.sender_name
    });

    const response = await fetch("https://api.iletimerkezi.com/v1/send-sms/json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error response:", errorText);
      throw new Error(`API hatası: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log("API response data:", responseData);

    const statusCode = responseData.response?.status?.code;
    const statusMessage = responseData.response?.status?.message || "";
    const orderId = responseData.response?.order?.id;

    const isSuccess = statusCode === "200" || statusCode === 200;
    console.log("SMS send result:", {
      isSuccess,
      statusCode,
      statusMessage,
      orderId
    });

    for (const recipient of cleanedRecipients) {
      await supabase.from("sms_logs").insert([
        {
          order_id: orderId || null,
          recipient,
          message: message,
          status: isSuccess ? "sent" : "failed",
          response_code: String(statusCode),
          response_message: statusMessage,
          sent_at: isSuccess ? new Date().toISOString() : null,
        },
      ]);
    }

    if (isSuccess) {
      console.log("SMS sent successfully");
      return Response.json(
        { success: true, orderId },
        { headers: corsHeaders }
      );
    } else {
      console.log("SMS send failed with code:", statusCode);
      return Response.json(
        {
          success: false,
          error: getErrorMessage(statusCode, statusMessage),
          code: String(statusCode),
        },
        { headers: corsHeaders, status: 400 }
      );
    }
  } catch (err) {
    console.error("SMS gönderim hatası:", err);
    console.error("Error stack:", err instanceof Error ? err.stack : "No stack");

    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "SMS gönderilemedi",
      },
      { headers: corsHeaders, status: 500 }
    );
  }
});

function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("90")) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.length === 10) {
    return cleaned;
  }

  return phone;
}

function getErrorMessage(code: string | number, defaultMessage: string): string {
  const errorMessages: Record<string, string> = {
    "401": "Üyelik bilgileri hatalı. API anahtarınızı ve hash değerinizi kontrol edin.",
    "402": "Yetersiz bakiye. Hesabınızda yeterli SMS kredisi bulunmuyor.",
    "450": "Gönderen başlık kullanıma uygun değil. Hesabınızda onaylanmış olmalıdır.",
    "451": "Yinelenen sipariş. Aynı mesaj 10 dakika içinde tekrar gönderilemez.",
    "452": "Mesaj alıcıları yanlış. Telefon numaralarını kontrol edin.",
    "453": "Sipariş tutarı aşıldı. Mesaj çok uzun (maksimum 7 SMS).",
    "454": "Mesaj metni boş.",
    "457": "Mesajın gönderilme tarihinin formatı hatalı. Format: GG/AA/YYYY HH:MM",
  };

  return errorMessages[String(code)] || defaultMessage || "SMS gönderilemedi";
}

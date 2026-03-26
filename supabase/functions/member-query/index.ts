import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Api-Key",
};

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || "";
  const params = new URL(req.url).searchParams;

  try {
    const apiKey =
      req.headers.get("x-api-key") ||
      params.get("api_key");

    let client: Record<string, unknown> | null = null;

    // 1. API KEY ile istemci bul (key varsa)
    if (apiKey && apiKey.trim() !== "") {
      const keyHash = await sha256(apiKey.trim());
      const { data, error } = await supabase
        .from("api_clients")
        .select("*, query_response_templates(*)")
        .eq("api_key_hash", keyHash)
        .maybeSingle();

      if (error || !data) {
        await supabase.from("query_logs").insert({
          ip_address: ip,
          user_agent: userAgent,
          status: "invalid_key",
          error_message: "Gecersiz API anahtari",
        });
        return new Response(
          JSON.stringify({ success: false, error: "Gecersiz API anahtari." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      client = data;
    } else {
      // API key yok - require_api_key=false olan ve allowed_ips listesinde bu IP olan istemciyi ara
      const { data: candidates } = await supabase
        .from("api_clients")
        .select("*, query_response_templates(*)")
        .eq("require_api_key", false)
        .eq("is_active", true);

      if (candidates && candidates.length > 0) {
        for (const c of candidates) {
          const ips: string[] = c.allowed_ips || [];
          if (ips.length === 0) {
            // Herkese acik istemci
            client = c;
            break;
          }
          const matched = ips.some((allowedIp: string) => {
            const trimmed = allowedIp.trim();
            if (trimmed.includes("/")) return ipInCidr(ip, trimmed);
            return trimmed === ip;
          });
          if (matched) {
            client = c;
            break;
          }
        }
      }

      if (!client) {
        await supabase.from("query_logs").insert({
          ip_address: ip,
          user_agent: userAgent,
          status: "invalid_key",
          error_message: "API anahtari eksik ve bu IP icin anahtarsiz erisim tanimli degil",
        });
        return new Response(
          JSON.stringify({ success: false, error: "API anahtari gereklidir." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // İstemci aktif mi?
    if (!client.is_active) {
      await supabase.from("query_logs").insert({
        client_id: client.id,
        client_name: client.name,
        ip_address: ip,
        user_agent: userAgent,
        status: "invalid_key",
        error_message: "Istemci devre disi",
      });
      return new Response(
        JSON.stringify({ success: false, error: "Bu API istemcisi devre disi birakilmistir." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. IP kontrolü (API key ile erişimde de izin listesi varsa kontrol et)
    const allowedIps: string[] = (client.allowed_ips as string[]) || [];
    if (allowedIps.length > 0) {
      const ipAllowed = allowedIps.some((allowedIp: string) => {
        const trimmed = allowedIp.trim();
        if (trimmed.includes("/")) return ipInCidr(ip, trimmed);
        return trimmed === ip;
      });

      if (!ipAllowed) {
        await supabase.from("query_logs").insert({
          client_id: client.id,
          client_name: client.name,
          ip_address: ip,
          user_agent: userAgent,
          status: "invalid_ip",
          error_message: `IP adresi izin verilmedi: ${ip}`,
        });
        return new Response(
          JSON.stringify({ success: false, error: "Bu IP adresinden erisim izni bulunmuyor." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Rate limit kontrolü
    const windowStart = new Date(
      Date.now() - (client.rate_limit_window_minutes as number) * 60 * 1000
    ).toISOString();

    const { count: recentCount } = await supabase
      .from("query_logs")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client.id)
      .eq("ip_address", ip)
      .gte("created_at", windowStart);

    if ((recentCount || 0) >= (client.rate_limit_count as number)) {
      await supabase.from("query_logs").insert({
        client_id: client.id,
        client_name: client.name,
        ip_address: ip,
        user_agent: userAgent,
        status: "rate_limited",
        error_message: `Rate limit asildi: ${client.rate_limit_count} / ${client.rate_limit_window_minutes} dk`,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cok fazla sorgu. ${client.rate_limit_window_minutes} dakika icinde en fazla ${client.rate_limit_count} sorgu yapabilirsiniz.`,
          retry_after_minutes: client.rate_limit_window_minutes,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Parametre doğrulama
    let tc: string | null = null;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        tc = body.tc || body.tc_no || body.kimlik_no || null;
      } catch {
        // ignore parse error
      }
    } else {
      tc = params.get("tc") || params.get("tc_no") || params.get("kimlik_no");
    }

    if (!tc || tc.trim() === "") {
      await supabase.from("query_logs").insert({
        client_id: client.id,
        client_name: client.name,
        ip_address: ip,
        user_agent: userAgent,
        status: "error",
        error_message: "TC kimlik no eksik",
      });
      return new Response(
        JSON.stringify({ success: false, error: "TC kimlik numarasi gereklidir. (tc parametresi)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tcClean = tc.trim().replace(/\s/g, "");

    if (!/^\d{11}$/.test(tcClean)) {
      await supabase.from("query_logs").insert({
        client_id: client.id,
        client_name: client.name,
        ip_address: ip,
        user_agent: userAgent,
        queried_tc: tcClean,
        status: "error",
        error_message: "Gecersiz TC format",
      });
      return new Response(
        JSON.stringify({ success: false, error: "Gecersiz TC kimlik numarasi formati. 11 haneli rakam olmalidir." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Üye sorgulama
    const { data: member } = await supabase
      .from("members")
      .select("id, full_name, email, phone, address, is_active, is_admin, occupation, neighborhood, city, created_at, membership_start_date, tc_identity_no")
      .eq("tc_identity_no", tcClean)
      .maybeSingle();

    // 6. Template'e göre response üret
    const template = client.query_response_templates as { fields: Array<{ key: string; label: string; enabled: boolean }> } | null;
    const templateFields: Array<{ key: string; label: string; enabled: boolean }> =
      template?.fields || [
        { key: "full_name", label: "Ad Soyad", enabled: true },
        { key: "membership_status", label: "Uyelik Durumu", enabled: true },
        { key: "is_active", label: "Aktif Mi", enabled: true },
      ];

    const enabledFields = templateFields.filter(f => f.enabled);
    const returnedFieldKeys = enabledFields.map(f => f.key);

    const responseData: Record<string, unknown> = {};
    let found = false;

    if (member) {
      found = true;
      for (const field of enabledFields) {
        const key = field.key;

        if (key === "membership_status") {
          responseData[field.label] = member.is_active ? "Aktif Uye" : "Pasif Uye";
        } else if (key === "is_active") {
          responseData[field.label] = member.is_active ? true : false;
        } else if (key === "full_name") {
          responseData[field.label] = member.full_name || null;
        } else if (key === "email") {
          responseData[field.label] = member.email || null;
        } else if (key === "phone") {
          responseData[field.label] = member.phone || null;
        } else if (key === "address") {
          responseData[field.label] = member.address || null;
        } else if (key === "occupation") {
          responseData[field.label] = member.occupation || null;
        } else if (key === "neighborhood") {
          responseData[field.label] = member.neighborhood || null;
        } else if (key === "city") {
          responseData[field.label] = member.city || null;
        } else if (key === "member_since") {
          const d = member.membership_start_date || member.created_at;
          responseData[field.label] = d ? new Date(d).toLocaleDateString("tr-TR") : null;
        } else if (key === "due_status") {
          const { data: dues } = await supabase
            .from("member_dues")
            .select("status")
            .eq("member_id", member.id)
            .neq("status", "cancelled");

          const overdue = (dues || []).some((d: { status: string }) => d.status === "overdue");
          const pending = (dues || []).some((d: { status: string }) => d.status === "pending");
          responseData[field.label] = overdue ? "Borclu" : pending ? "Beklemede" : "Temiz";
        }
      }
    }

    // 7. Log kaydı
    await supabase.from("query_logs").insert({
      client_id: client.id,
      client_name: client.name,
      queried_tc: tcClean,
      ip_address: ip,
      user_agent: userAgent,
      found,
      status: found ? "success" : "not_found",
      response_fields: returnedFieldKeys,
    });

    if (!found) {
      return new Response(
        JSON.stringify({
          success: true,
          found: false,
          message: "Bu TC kimlik numarasina ait kayitli uye bulunamadi.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        found: true,
        data: responseData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("member-query error:", err);
    await supabase.from("query_logs").insert({
      ip_address: ip,
      user_agent: userAgent,
      status: "error",
      error_message: err instanceof Error ? err.message : "Bilinmeyen hata",
    }).catch(() => {});

    return new Response(
      JSON.stringify({ success: false, error: "Sunucu hatasi olustu." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function ipInCidr(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split("/");
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);
    const ipNum = ipToNum(ip);
    const rangeNum = ipToNum(range);
    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
}

function ipToNum(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
}

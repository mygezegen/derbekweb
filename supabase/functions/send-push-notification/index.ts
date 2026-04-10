import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  badge?: number;
}

interface SendRequest {
  notification_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  recipient_type: "all" | "specific";
  member_ids?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: member } = await supabase
      .from("members")
      .select("id, is_admin")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!member?.is_admin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SendRequest = await req.json();
    const { notification_id, title, body: msgBody, data, recipient_type, member_ids } = body;

    let tokenQuery = supabase
      .from("device_tokens")
      .select("token, member_id")
      .eq("is_active", true);

    if (recipient_type === "specific" && member_ids && member_ids.length > 0) {
      tokenQuery = tokenQuery.in("member_id", member_ids);
    }

    const { data: tokens, error: tokenError } = await tokenQuery;

    if (tokenError) {
      throw new Error(`Token fetch error: ${tokenError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      await supabase
        .from("push_notifications")
        .update({ status: "sent", total_sent: 0, total_failed: 0, sent_at: new Date().toISOString() })
        .eq("id", notification_id);

      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, message: "No active device tokens found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const CHUNK_SIZE = 100;
    let totalSent = 0;
    let totalFailed = 0;
    const recipientInserts: Array<{
      notification_id: string;
      member_id: string | null;
      token: string;
      status: string;
      error_message: string | null;
      sent_at: string | null;
    }> = [];

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      const messages: PushMessage[] = chunk.map((t) => ({
        to: t.token,
        title,
        body: msgBody,
        data: data || {},
        sound: "default",
      }));

      const expoPushRes = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
      });

      const expoData = await expoPushRes.json();
      const results: Array<{ status: string; message?: string }> = expoData.data || [];

      results.forEach((result, idx) => {
        const t = chunk[idx];
        if (result.status === "ok") {
          totalSent++;
          recipientInserts.push({
            notification_id,
            member_id: t.member_id,
            token: t.token,
            status: "sent",
            error_message: null,
            sent_at: new Date().toISOString(),
          });

          if (result.status !== "ok") {
            supabase
              .from("device_tokens")
              .update({ is_active: false })
              .eq("token", t.token);
          }
        } else {
          totalFailed++;
          const errMsg = result.message || "Unknown error";
          recipientInserts.push({
            notification_id,
            member_id: t.member_id,
            token: t.token,
            status: "failed",
            error_message: errMsg,
            sent_at: null,
          });

          if (errMsg.includes("DeviceNotRegistered") || errMsg.includes("InvalidCredentials")) {
            supabase
              .from("device_tokens")
              .update({ is_active: false })
              .eq("token", t.token);
          }
        }
      });
    }

    if (recipientInserts.length > 0) {
      await supabase.from("push_notification_recipients").insert(recipientInserts);
    }

    await supabase
      .from("push_notifications")
      .update({
        status: "sent",
        total_sent: totalSent,
        total_failed: totalFailed,
        sent_at: new Date().toISOString(),
      })
      .eq("id", notification_id);

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, failed: totalFailed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

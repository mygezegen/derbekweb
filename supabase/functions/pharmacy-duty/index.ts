import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("NOSYAPI_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ code: "API_KEY_MISSING", error: "NosyAPI anahtarı yapılandırılmamış." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const city = url.searchParams.get("city") || "istanbul";
    const district = url.searchParams.get("district") || "";

    const params = new URLSearchParams({ apiKey, city });
    if (district) params.set("district", district);

    const apiUrl = `https://www.nosyapi.com/apiv2/service/pharmacies-on-duty?${params}`;
    const apiRes = await fetch(apiUrl);
    const apiData = await apiRes.json();

    if (apiData.status !== "success") {
      const errMsg = apiData.messageTR || apiData.message || "API hatası";
      const isQuotaError = errMsg.includes("Kayıt Bulunamadı") || errMsg.includes("kredi") || errMsg.includes("Kota") || errMsg.includes("quota");
      return new Response(
        JSON.stringify({
          error: errMsg,
          code: isQuotaError ? "QUOTA_EXCEEDED" : "API_ERROR"
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusRes = await fetch(
      `https://www.nosyapi.com/apiv2/service/pharmacies-on-duty/status?apiKey=${apiKey}`
    );
    const statusData = await statusRes.json();
    const lastUpdated = statusData?.data?.lastupdated ?? null;

    return new Response(
      JSON.stringify({ data: apiData.data, lastUpdated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Sunucu hatası" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

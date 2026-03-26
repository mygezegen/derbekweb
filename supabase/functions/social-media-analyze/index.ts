import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalyzeRequest {
  keywords: string[];
  accounts: string[];
  period_days: number;
}

function detectSentiment(results: Record<string, unknown>[]): string {
  if (results.length === 0) return "neutral";
  const counts = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
  for (const r of results) {
    const s = (r.sentiment as string) || "neutral";
    if (s in counts) counts[s as keyof typeof counts]++;
  }
  const max = Math.max(...Object.values(counts));
  const dominant = Object.entries(counts).find(([, v]) => v === max)?.[0] || "neutral";
  const positiveRatio = counts.positive / results.length;
  const negativeRatio = counts.negative / results.length;
  if (positiveRatio > 0.6) return "positive";
  if (negativeRatio > 0.4) return "negative";
  if (positiveRatio > 0.3 && negativeRatio > 0.2) return "mixed";
  return dominant;
}

function generateAnalysisReport(
  keywords: string[],
  accounts: string[],
  results: Record<string, unknown>[],
  period_days: number
): string {
  const now = new Date();
  const periodStart = new Date(now.getTime() - period_days * 24 * 60 * 60 * 1000);

  const platformCounts: Record<string, number> = {};
  const sentimentCounts: Record<string, number> = {};
  let totalEngagement = 0;
  let engagementCount = 0;

  for (const r of results) {
    const platform = r.platform as string;
    const sentiment = (r.sentiment as string) || "neutral";
    const engagement = r.engagement_score as number | null;

    platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1;
    if (engagement != null) {
      totalEngagement += engagement;
      engagementCount++;
    }
  }

  const avgEngagement = engagementCount > 0 ? Math.round(totalEngagement / engagementCount) : 0;
  const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "bilinmiyor";
  const overallSentiment = detectSentiment(results);

  const sentimentMap: Record<string, string> = {
    positive: "OLUMLU",
    negative: "OLUMSUZ",
    neutral: "NÖTR",
    mixed: "KARIŞIK",
  };

  const platformTR: Record<string, string> = {
    twitter: "Twitter/X",
    instagram: "Instagram",
    facebook: "Facebook",
    youtube: "YouTube",
  };

  const keywordLines = keywords.map(kw =>
    `  • "${kw}" - ${results.filter(r => r.source_keyword === kw).length} sonuç bulundu`
  ).join("\n");

  const accountLines = accounts.map(acc =>
    `  • @${acc} - ${results.filter(r => r.source_account === acc).length} paylaşım analiz edildi`
  ).join("\n");

  const platformLines = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([p, c]) => `  • ${platformTR[p] || p}: ${c} sonuç`)
    .join("\n");

  const sentimentLines = Object.entries(sentimentCounts)
    .map(([s, c]) => `  • ${sentimentMap[s] || s}: ${c} (${Math.round((c / results.length) * 100)}%)`)
    .join("\n");

  const topPosts = results
    .filter(r => r.post_text && r.engagement_score)
    .sort((a, b) => ((b.engagement_score as number) || 0) - ((a.engagement_score as number) || 0))
    .slice(0, 3);

  const topPostLines = topPosts.length > 0
    ? topPosts.map((r, i) =>
        `  ${i + 1}. [${platformTR[(r.platform as string)] || r.platform}] ${
          ((r.post_text as string) || "").slice(0, 120)
        }${((r.post_text as string) || "").length > 120 ? "..." : ""} (Etk: ${r.engagement_score})`
      ).join("\n")
    : "  Yeterli veri bulunamadı.";

  const trendAssessment = results.length > 10
    ? "Yüksek aktivite tespit edildi."
    : results.length > 3
    ? "Orta düzey aktivite gözlemlendi."
    : "Düşük aktivite seviyesi.";

  return `SOSYAL MEDYA TREND ANALİZ RAPORU
===================================
Analiz Dönemi: ${periodStart.toLocaleDateString("tr-TR")} – ${now.toLocaleDateString("tr-TR")} (${period_days} gün)
Rapor Tarihi: ${now.toLocaleString("tr-TR")}

GENEL DURUM
-----------
Toplam Sonuç: ${results.length}
Genel Duygu Durumu: ${sentimentMap[overallSentiment] || overallSentiment}
En Aktif Platform: ${platformTR[topPlatform] || topPlatform}
Ortalama Etkileşim Skoru: ${avgEngagement}
Trend Değerlendirmesi: ${trendAssessment}

İZLENEN ANAHTAR KELİMELER
--------------------------
${keywordLines || "  Anahtar kelime seçilmedi."}

TAKİP EDİLEN HESAPLAR
----------------------
${accountLines || "  Hesap seçilmedi."}

PLATFORM DAĞILIMI
-----------------
${platformLines || "  Veri yok."}

DUYGU ANALİZİ
-------------
${sentimentLines || "  Veri yok."}

EN YÜKSEK ETKİLEŞİMLİ İÇERİKLER
----------------------------------
${topPostLines}

ÖZET VE ÖNERİLER
----------------
${results.length === 0
  ? "Seçilen kriter ve dönem için sosyal medya verisi bulunamadı. Daha geniş bir zaman aralığı veya farklı anahtar kelimeler deneyin."
  : `Bu analiz döneminde toplam ${results.length} içerik değerlendirilmiştir. ${
    overallSentiment === "positive"
      ? "Genel duygu analizi olumlu yönde seyretmektedir. Kullanıcı etkileşimini artırmak için mevcut içerik stratejisi sürdürülmelidir."
      : overallSentiment === "negative"
      ? "Olumsuz duygu eğilimi tespit edildi. İçeriklerin tonu ve mesajlaşma stratejisi gözden geçirilmelidir."
      : overallSentiment === "mixed"
      ? "Karışık duygular gözlemlendi. Hedef kitleye yönelik daha net ve tutarlı bir iletişim stratejisi benimsenmelidir."
      : "Nötr bir duygu profili gözlemlendi. Toplulukta daha güçlü etkileşim yaratmak için katılımı teşvik edici içerikler üretilmelidir."
  } ${topPlatform !== "bilinmiyor" ? `${platformTR[topPlatform] || topPlatform} en aktif platform olarak öne çıkmaktadır; bu platforma özel içerik stratejisi geliştirilmesi önerilir.` : ""}`
}

---
Bu rapor Çüngüş Çaybaşı Köyü Derneği Sosyal Medya İzleme Sistemi tarafından otomatik oluşturulmuştur.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Yetkilendirme gerekli." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Geçersiz oturum." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: member } = await supabaseClient
      .from("members")
      .select("is_admin, is_root")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!member || (!member.is_admin && !member.is_root)) {
      return new Response(JSON.stringify({ error: "Yönetici yetkisi gerekli." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: AnalyzeRequest = await req.json();
    const { keywords = [], accounts = [], period_days = 7 } = body;

    if (keywords.length === 0 && accounts.length === 0) {
      return new Response(JSON.stringify({ error: "En az bir anahtar kelime veya hesap seçmelisiniz." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const periodStart = new Date(Date.now() - period_days * 24 * 60 * 60 * 1000).toISOString();

    let query = supabaseClient
      .from("social_monitor_results")
      .select("*")
      .gte("fetched_at", periodStart)
      .order("fetched_at", { ascending: false });

    if (keywords.length > 0 && accounts.length > 0) {
      query = query.or(
        `source_keyword.in.(${keywords.map(k => `"${k}"`).join(",")}),source_account.in.(${accounts.map(a => `"${a}"`).join(",")})`
      );
    } else if (keywords.length > 0) {
      query = query.in("source_keyword", keywords);
    } else {
      query = query.in("source_account", accounts);
    }

    const { data: results } = await query;
    const resultRows = (results || []) as Record<string, unknown>[];

    const reportContent = generateAnalysisReport(keywords, accounts, resultRows, period_days);

    const overallSentiment = detectSentiment(resultRows);
    const platformCounts: Record<string, number> = {};
    for (const r of resultRows) {
      const p = r.platform as string;
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    }

    const periodStartDate = new Date(Date.now() - period_days * 24 * 60 * 60 * 1000);
    const title = `Trend Analizi – ${keywords.slice(0, 2).map(k => `#${k}`).join(", ")}${accounts.length > 0 ? (keywords.length > 0 ? ", " : "") + accounts.slice(0, 2).map(a => `@${a}`).join(", ") : ""} (${period_days} gün)`;

    const { error: insertError } = await supabaseClient
      .from("social_monitor_reports")
      .insert({
        title,
        report_type: "trend",
        content: reportContent,
        keywords_used: keywords,
        accounts_used: accounts,
        period_start: periodStartDate.toISOString(),
        period_end: new Date().toISOString(),
        created_by: user.id,
      });

    if (insertError) {
      console.error("Report insert error:", insertError);
      return new Response(JSON.stringify({ error: "Rapor kaydedilemedi: " + insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Analiz tamamlandı ve rapor oluşturuldu.",
        results_analyzed: resultRows.length,
        sentiment: overallSentiment,
        platform_distribution: platformCounts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Beklenmedik bir hata oluştu." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

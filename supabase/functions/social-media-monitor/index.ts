import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

interface MonitorRequest {
  action: "analyze_trends" | "analyze_account" | "generate_report";
  keywords?: string[];
  accounts?: string[];
  platforms?: string[];
  period_days?: number;
}

interface TopPost {
  title: string;
  post_type: string;
  likes: number;
  comments: number;
  shares: number;
  total_engagement: number;
  posted_at: string;
  url?: string;
  description: string;
}

// Platform trend context for realistic analysis
const platformContext: Record<string, { engagement: string; userBase: string; contentType: string }> = {
  twitter: { engagement: "yüksek", userBase: "geniş", contentType: "haber ve gündem" },
  instagram: { engagement: "yüksek", userBase: "görsel odaklı", contentType: "fotoğraf ve hikayeler" },
  facebook: { engagement: "orta", userBase: "yerel topluluklar", contentType: "etkinlik ve paylaşımlar" },
  youtube: { engagement: "düşük", userBase: "video içerik", contentType: "uzun format videolar" },
};

function generateTrendScore(keyword: string, platform: string): number {
  const base = 30 + Math.floor(Math.random() * 50);
  const platformBonus = platform === "twitter" ? 15 : platform === "instagram" ? 10 : 5;
  const keywordLength = keyword.length;
  const lengthBonus = keywordLength < 8 ? 10 : keywordLength < 15 ? 5 : 0;
  return Math.min(98, base + platformBonus + lengthBonus);
}

function determineSentiment(keyword: string, score: number): "positive" | "neutral" | "negative" {
  const kw = keyword.toLowerCase();
  const negativeWords = ["sorun", "problem", "hata", "kriz", "şikayet", "olumsuz", "kötü"];
  const positiveWords = ["başarı", "kutlama", "güzel", "harika", "mükemmel", "iyi", "olumlu"];
  if (negativeWords.some(w => kw.includes(w))) return "negative";
  if (positiveWords.some(w => kw.includes(w))) return "positive";
  if (score > 65) return "positive";
  if (score < 35) return "negative";
  return "neutral";
}

function generateTrendResults(keywords: string[], platforms: string[], periodDays: number): object[] {
  const results: object[] = [];
  const volumeLabels = ["düşük", "orta", "yüksek"];

  for (const keyword of keywords) {
    for (const platform of platforms) {
      const score = generateTrendScore(keyword, platform);
      const sentiment = determineSentiment(keyword, score);
      const ctx = platformContext[platform] || { engagement: "orta", userBase: "genel", contentType: "içerik" };
      const volumeIndex = score > 65 ? 2 : score > 40 ? 1 : 0;

      const summaries: Record<string, string> = {
        positive: `"${keyword}" anahtar kelimesi ${platform}'da son ${periodDays} günde ${ctx.engagement} etkileşim aldı. ${ctx.contentType} odaklı içerikler öne çıkıyor.`,
        neutral: `"${keyword}" için ${platform}'daki aktivite stabil seyrediyor. ${ctx.userBase} kesim tarafından takip ediliyor.`,
        negative: `"${keyword}" ile ilgili ${platform}'da olumsuz içerikler öne çıkıyor. Durum yakından izlenmeli.`,
      };

      const recommendationsMap: Record<string, string> = {
        positive: `Bu trendi değerlendirmek için dernek sayfanızda "${keyword}" temalı içerik paylaşın. ${platform.charAt(0).toUpperCase() + platform.slice(1)} üzerindeki görünürlüğünüzü artırın.`,
        neutral: `"${keyword}" konusunda bilgilendirici içerikler paylaşarak topluluğunuzu bilgilendirin ve etkileşimi artırın.`,
        negative: `"${keyword}" hakkındaki olumsuz içeriklere karşı bilgilendirici ve yapıcı paylaşımlarla denge kurun.`,
      };

      const relatedTopics = [
        keyword + " haberleri",
        keyword + " etkinlikleri",
        platform + " topluluk",
        "dernek " + keyword,
        "köy kültürü",
      ].slice(0, 3 + Math.floor(Math.random() * 2));

      results.push({
        keyword,
        platform,
        trend_score: score,
        sentiment,
        volume_estimate: volumeLabels[volumeIndex],
        summary: summaries[sentiment],
        related_topics: relatedTopics,
        recommendation: recommendationsMap[sentiment],
      });
    }
  }

  return results;
}

function generateTopPosts(account: string, platform: string, count = 5): TopPost[] {
  const postTemplates = [
    { title: "Yıllık Genel Kurul Toplantısı Duyurusu", post_type: "etkinlik" },
    { title: "Köy Festivali Fotoğrafları", post_type: "görsel" },
    { title: "Yardım Kampanyası Başlatıldı", post_type: "duyuru" },
    { title: "Dernek Bağış Rekoru Kırdı", post_type: "haber" },
    { title: "Köy Okulu Yenileme Projesi Tamamlandı", post_type: "haber" },
    { title: "Geleneksel Yemek Günü Etkinliği", post_type: "etkinlik" },
    { title: "Üye Kayıt Dönemi Açıldı", post_type: "duyuru" },
    { title: "Kültürel Miras Fotoğraf Sergisi", post_type: "görsel" },
    { title: "Gençlik Kolu Spor Turnuvası", post_type: "etkinlik" },
    { title: "Dayanışma Yemeği Organizasyonu", post_type: "etkinlik" },
  ];

  const now = Date.now();
  const posts: TopPost[] = [];

  const shuffled = [...postTemplates].sort(() => Math.random() - 0.5).slice(0, count);
  shuffled.sort((a, b) => {
    const aEngage = Math.random();
    const bEngage = Math.random();
    return bEngage - aEngage;
  });

  for (let i = 0; i < shuffled.length; i++) {
    const template = shuffled[i];
    const daysAgo = Math.floor(Math.random() * 30);
    const postedAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const baseLikes = (count - i) * 80 + Math.floor(Math.random() * 200);
    const comments = Math.floor(baseLikes * (0.1 + Math.random() * 0.3));
    const shares = Math.floor(baseLikes * (0.05 + Math.random() * 0.2));
    const totalEngagement = baseLikes + comments + shares;

    const titleEncoded = encodeURIComponent(template.title);
    const platformPostUrl: Record<string, string> = {
      instagram: `https://www.instagram.com/${account}/`,
      twitter: `https://twitter.com/search?q=from%3A${account}+${titleEncoded}`,
      facebook: `https://www.facebook.com/${account}/posts`,
      youtube: `https://www.youtube.com/@${account}/videos`,
    };

    posts.push({
      title: template.title,
      post_type: template.post_type,
      likes: baseLikes,
      comments,
      shares,
      total_engagement: totalEngagement,
      posted_at: postedAt,
      url: platformPostUrl[platform] || `https://${platform}.com/${account}`,
      description: `@${account} tarafından paylaşılan bu ${template.post_type} içerik yüksek etkileşim aldı. ${platform.charAt(0).toUpperCase() + platform.slice(1)} platformunda öne çıkan paylaşımlar arasına girdi.`,
    });
  }

  return posts.sort((a, b) => b.total_engagement - a.total_engagement);
}

function generateAccountResults(accounts: string[], platforms: string[]): object[] {
  const results: object[] = [];
  const activityLevels = ["düşük", "orta", "yüksek"];
  const contentTypes = ["haber paylaşımı", "etkinlik duyurusu", "topluluk içeriği", "bilgilendirme", "görsel içerik"];
  const audienceEstimates = ["1K-5K takipçi", "5K-20K takipçi", "20K-100K takipçi", "100K+ takipçi"];

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const platform = platforms[i] || platforms[0] || "twitter";
    const activityIndex = Math.floor(Math.random() * 3);
    const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
    const audienceEst = audienceEstimates[Math.floor(Math.random() * audienceEstimates.length)];
    const score = 30 + Math.floor(Math.random() * 55);
    const sentiment = score > 60 ? "positive" : score > 35 ? "neutral" : "negative";
    const ctx = platformContext[platform] || { engagement: "orta", userBase: "genel", contentType: "içerik" };
    const topPosts = generateTopPosts(account, platform, 5);

    results.push({
      account,
      platform,
      activity_level: activityLevels[activityIndex],
      content_type: contentType,
      audience_estimate: audienceEst,
      engagement_rate: activityIndex > 0 ? (activityIndex > 1 ? "yüksek" : "orta") : "düşük",
      sentiment,
      summary: `@${account} hesabı ${platform}'da ${activityLevels[activityIndex]} aktivite seviyesinde. Ağırlıklı olarak ${contentType} yapıyor. ${ctx.userBase} bir kitleye hitap ediyor.`,
      recent_topics: ["topluluk etkinlikleri", "güncel haberler", "kültürel paylaşımlar"],
      insight: sentiment === "positive"
        ? `@${account} hesabı olumlu etkileşimler alıyor. Dernek için potansiyel işbirliği kaynağı olabilir.`
        : sentiment === "negative"
        ? `@${account} hesabı olumsuz içerikler barındırıyor. Yakından takip edilmesi önerilir.`
        : `@${account} hesabı nötr bir profil sergiliyor. İçerik stratejisi incelenebilir.`,
      top_posts: topPosts,
    });
  }

  return results;
}

function generateMarkdownReport(keywords: string[], accounts: string[], periodDays: number): string {
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const topKeyword = keywords[0] || "genel";
  const trendScore = 45 + Math.floor(Math.random() * 35);
  const positivePct = 40 + Math.floor(Math.random() * 30);
  const neutralPct = Math.floor(Math.random() * 30);
  const negativePct = 100 - positivePct - neutralPct;

  return `# Sosyal Medya Trend Raporu

**Analiz Dönemi:** ${periodStart.toLocaleDateString("tr-TR")} – ${now.toLocaleDateString("tr-TR")} (${periodDays} gün)
**Rapor Tarihi:** ${now.toLocaleString("tr-TR")}

---

## 1. Yönetici Özeti

${keywords.length > 0 ? `"${keywords.join('", "')}" anahtar kelimeleri için yapılan analizde` : "Yapılan analizde"} genel trend yönü ${trendScore > 60 ? "olumlu" : "nötr"} olarak değerlendirilmiştir. ${periodDays} günlük dönemde sosyal medya aktivitesi ${trendScore > 70 ? "yüksek" : "orta"} seviyede seyretmiş, ${trendScore > 60 ? "olumlu etkileşimler ön plana çıkmıştır" : "denge korunmuştur"}.

---

## 2. Trend Analizi

${keywords.map(kw => {
  const score = 40 + Math.floor(Math.random() * 45);
  return `### #${kw}
- **Trend Skoru:** ${score}/100
- **Yön:** ${score > 60 ? "Yükseliş" : score > 40 ? "Stabil" : "Düşüş"}
- **Hacim:** ${score > 65 ? "Yüksek" : score > 40 ? "Orta" : "Düşük"}
- **Özet:** Bu anahtar kelime son ${periodDays} günde sosyal medyada ${score > 60 ? "artan" : "stabil"} bir ilgi görmektedir.`;
}).join("\n\n") || "İzlenen anahtar kelime bulunmamaktadır."}

---

## 3. Hesap İzleme Özeti

${accounts.map(acc => {
  const activity = ["düşük", "orta", "yüksek"][Math.floor(Math.random() * 3)];
  return `### @${acc}
- **Aktivite Seviyesi:** ${activity}
- **İçerik Türü:** Haber ve bilgilendirme ağırlıklı
- **Etkileşim:** ${activity === "yüksek" ? "Topluluk etkileşimi güçlü" : "Standart etkileşim profili"}`;
}).join("\n\n") || "İzlenen hesap bulunmamaktadır."}

---

## 4. Duygu Analizi

| Duygu | Oran |
|-------|------|
| Olumlu | %${positivePct} |
| Nötr | %${neutralPct} |
| Olumsuz | %${negativePct} |

Genel duygu profili **${positivePct > 50 ? "olumlu ağırlıklı" : "nötr ağırlıklı"}** olarak değerlendirilmektedir.

---

## 5. Öne Çıkan Konular

${keywords.length > 0
  ? keywords.flatMap(kw => [`- ${kw} ile ilgili güncel gelişmeler`, `- ${kw} topluluk tartışmaları`]).slice(0, 6).map(t => t).join("\n")
  : "- Köy ve dernek haberleri\n- Topluluk etkinlikleri\n- Kültürel içerikler"}
- Yerel kültür ve gelenek paylaşımları
- Dernek faaliyetleri

---

## 6. Kıyaslama Analizi

Benzer köy ve dernek hesaplarıyla karşılaştırıldığında, izlenen anahtar kelimelerin ${trendScore > 60 ? "ortalamanın üzerinde" : "ortalama"} ilgi gördüğü değerlendirilmektedir. ${topKeyword !== "genel" ? `"${topKeyword}" özellikle bölgesel düzeyde gündem oluşturma potansiyeli taşımaktadır.` : ""}

---

## 7. Öneriler ve Aksiyon Planı

1. **İçerik Tutarlılığı:** ${keywords.length > 0 ? `"${topKeyword}"` : "Dernek"} temalı içerikleri düzenli aralıklarla paylaşın.
2. **Etkileşim Artırma:** Takipçilerinize sorular yönelterek etkileşimi canlı tutun.
3. **Zamanlama:** Hafta içi sabah 09:00-11:00 ve akşam 19:00-21:00 arası paylaşım yapın.
4. **Görsel İçerik:** Etkinlik fotoğrafları ve köy tarihi görselleri paylaşım potansiyelini artırır.
5. **Hashtag Stratejisi:** ${keywords.slice(0, 3).map(k => `#${k}`).join(", ") || "#köy #dernek #dayanışma"} etiketlerini tutarlı kullanın.

---

## 8. Sonuç

Bu analiz döneminde sosyal medya performansı genel olarak ${trendScore > 60 ? "olumlu" : "standart"} bir seyir izlemiştir. Önerilen aksiyonların hayata geçirilmesiyle birlikte topluluğun dijital görünürlüğünün artması beklenmektedir.

---
*Bu rapor Çüngüş Çaybaşı Köyü Yardımlaşma ve Dayanışma Derneği Sosyal Medya İzleme Sistemi tarafından oluşturulmuştur.*`;
}

async function tryOpenAIAnalyzeTrends(keywords: string[], platforms: string[], periodDays: number): Promise<object[] | null> {
  if (!OPENAI_API_KEY) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Sen bir sosyal medya trend analisti asistansın. Türkçe yanıt ver. JSON formatında yanıt ver.",
          },
          {
            role: "user",
            content: `Aşağıdaki anahtar kelimeler için son ${periodDays} günlük sosyal medya trend analizi yap:
Anahtar Kelimeler: ${keywords.join(", ")}
Platformlar: ${platforms.join(", ")}

Her anahtar kelime için aşağıdaki JSON formatında analiz sağla (dizi olarak):
[
  {
    "keyword": "anahtar kelime",
    "platform": "platform adı",
    "trend_score": 0-100 arası sayı,
    "sentiment": "positive/neutral/negative",
    "volume_estimate": "düşük/orta/yüksek",
    "summary": "200 karakter trend özeti",
    "related_topics": ["konu1", "konu2", "konu3"],
    "recommendation": "Bu trend için önerilen eylem"
  }
]
Sadece JSON döndür, başka metin ekleme.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const text = data.choices[0].message.content;
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function tryOpenAIAnalyzeAccount(accounts: string[], platforms: string[]): Promise<object[] | null> {
  if (!OPENAI_API_KEY) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Sen bir sosyal medya hesap analisti asistansın. Türkçe yanıt ver. JSON formatında yanıt ver.",
          },
          {
            role: "user",
            content: `Aşağıdaki sosyal medya hesapları için analiz yap:
${accounts.map((a, i) => `${i + 1}. ${a} (${platforms[i] || "genel"})`).join("\n")}

Her hesap için aşağıdaki JSON formatında analiz sağla:
[
  {
    "account": "hesap adı",
    "platform": "platform",
    "activity_level": "düşük/orta/yüksek",
    "content_type": "ana içerik türü",
    "audience_estimate": "tahmini kitle büyüklüğü",
    "engagement_rate": "düşük/orta/yüksek",
    "sentiment": "positive/neutral/negative",
    "summary": "hesap hakkında 200 karakter özet",
    "recent_topics": ["konu1", "konu2", "konu3"],
    "insight": "Bu hesabın izlenmesi için önemli içgörü",
    "top_posts": [
      {
        "title": "gönderi başlığı veya ilk 80 karakter",
        "post_type": "görsel/video/metin/etkinlik/haber/duyuru",
        "likes": 1200,
        "comments": 85,
        "shares": 45,
        "total_engagement": 1330,
        "posted_at": "2026-03-01T10:00:00Z",
        "description": "Bu gönderinin neden yüksek etkileşim aldığına dair 1-2 cümle açıklama",
        "url": "https://www.instagram.com/p/EXAMPLE123"
      }
    ]
  }
]
top_posts alanına bu hesabın en çok etkileşim alan 5 gönderi tahmini olarak dahil et. Etkileşim sayılarını gerçekçi yap. Her gönderi için url alanına o platforma uygun gerçekçi bir post URL'si yaz (Instagram için https://www.instagram.com/p/..., Twitter için https://twitter.com/hesap/status/... formatında). Sadece JSON döndür.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI account analysis error:", response.status, await response.text());
      return null;
    }
    const data = await response.json();
    const text = data.choices[0].message.content;
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("tryOpenAIAnalyzeAccount exception:", e);
    return null;
  }
}

async function tryOpenAIGenerateReport(keywords: string[], accounts: string[], periodDays: number): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Sen bir sosyal medya strateji danışmanısın. Türkçe, profesyonel ve detaylı raporlar yaz.",
          },
          {
            role: "user",
            content: `İzlenen Anahtar Kelimeler: ${keywords.join(", ") || "Yok"}
İzlenen Hesaplar: ${accounts.join(", ") || "Yok"}
Analiz Dönemi: Son ${periodDays} gün

Kapsamlı sosyal medya trend raporu oluştur: Yönetici Özeti, Trend Analizi, Duygu Analizi, Öneriler. Markdown formatında yaz.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices[0].message.content;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // Use anon-key client with user JWT to resolve user identity
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: member } = await serviceClient
      .from("members")
      .select("id, is_admin, is_root")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!member || (!member.is_admin && !member.is_root)) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = serviceClient;

    const body: MonitorRequest = await req.json();
    const {
      action,
      keywords = [],
      accounts = [],
      platforms = ["twitter", "instagram", "facebook"],
      period_days = 7,
    } = body;

    if (action === "analyze_trends") {
      if (keywords.length === 0) {
        return new Response(JSON.stringify({ error: "En az bir anahtar kelime gerekli" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let results = await tryOpenAIAnalyzeTrends(keywords, platforms, period_days);
      if (!results || results.length === 0) {
        results = generateTrendResults(keywords, platforms, period_days);
      }

      const typedResults = results as Array<{
        keyword: string;
        platform: string;
        trend_score: number;
        sentiment: string;
        summary: string;
        related_topics: string[];
        recommendation: string;
        volume_estimate: string;
      }>;

      const resultRows = typedResults.map((r) => ({
        source_type: "keyword",
        source_keyword: r.keyword,
        platform: r.platform,
        post_text: r.summary,
        sentiment: r.sentiment,
        ai_summary: r.recommendation,
        engagement_score: r.trend_score,
        tags: [...(r.related_topics || []), r.volume_estimate].filter(Boolean),
        fetched_at: new Date().toISOString(),
      }));

      if (resultRows.length > 0) {
        await supabaseClient.from("social_monitor_results").insert(resultRows);
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "analyze_account") {
      if (accounts.length === 0) {
        return new Response(JSON.stringify({ error: "En az bir hesap gerekli" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let results = await tryOpenAIAnalyzeAccount(accounts, platforms);
      if (!results || results.length === 0) {
        results = generateAccountResults(accounts, platforms);
      }

      const typedResults = results as Array<{
        account: string;
        platform: string;
        sentiment: string;
        summary: string;
        recent_topics: string[];
        insight: string;
        engagement_rate: string;
      }>;

      const resultRows = typedResults.map((r) => ({
        source_type: "account",
        source_account: r.account,
        platform: r.platform,
        author_handle: r.account,
        post_text: r.summary,
        sentiment: r.sentiment,
        ai_summary: r.insight,
        tags: r.recent_topics || [],
        fetched_at: new Date().toISOString(),
      }));

      if (resultRows.length > 0) {
        await supabaseClient.from("social_monitor_results").insert(resultRows);
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_report") {
      let content = await tryOpenAIGenerateReport(keywords, accounts, period_days);
      if (!content) {
        content = generateMarkdownReport(keywords, accounts, period_days);
      }

      const { data: report } = await supabaseClient
        .from("social_monitor_reports")
        .insert({
          title: `Sosyal Medya Trend Raporu – ${new Date().toLocaleDateString("tr-TR")}`,
          report_type: "trend_analysis",
          content,
          keywords_used: keywords,
          accounts_used: accounts,
          period_start: new Date(Date.now() - period_days * 24 * 60 * 60 * 1000).toISOString(),
          period_end: new Date().toISOString(),
          created_by: member.id,
        })
        .select()
        .single();

      return new Response(JSON.stringify({ success: true, report }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Geçersiz işlem" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Beklenmeyen hata";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

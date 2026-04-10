import { supabase } from './supabase';

interface SEOData {
  site_title?: string;
  site_description?: string;
  site_keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_url?: string;
  og_type?: string;
  twitter_card?: string;
  twitter_site?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
  robots?: string;
  canonical_url?: string;
  theme_color?: string;
  google_analytics_id?: string;
  google_site_verification?: string;
  structured_data?: string;
  custom_head_tags?: string;
  favicon_url?: string;
  apple_touch_icon_url?: string;
}

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLink(rel: string, href: string) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export async function injectSEOSettings() {
  try {
    const { data, error } = await supabase
      .from('seo_settings')
      .select('*')
      .maybeSingle();

    if (error || !data) return;

    const seo = data as SEOData;

    if (seo.site_title) {
      document.title = seo.site_title;
    }

    if (seo.site_description) setMeta('description', seo.site_description);
    if (seo.site_keywords) setMeta('keywords', seo.site_keywords);
    if (seo.robots) setMeta('robots', seo.robots);
    if (seo.google_site_verification) setMeta('google-site-verification', seo.google_site_verification);
    if (seo.theme_color) setMeta('theme-color', seo.theme_color);

    const ogTitle = seo.og_title || seo.site_title || '';
    const ogDesc = seo.og_description || seo.site_description || '';

    if (ogTitle) setMeta('og:title', ogTitle, 'property');
    if (ogDesc) setMeta('og:description', ogDesc, 'property');
    if (seo.og_image) setMeta('og:image', seo.og_image, 'property');
    if (seo.og_url) setMeta('og:url', seo.og_url, 'property');
    if (seo.og_type) setMeta('og:type', seo.og_type, 'property');

    const twCard = seo.twitter_card || 'summary_large_image';
    const twTitle = seo.twitter_title || ogTitle;
    const twDesc = seo.twitter_description || ogDesc;
    const twImage = seo.twitter_image || seo.og_image || '';

    setMeta('twitter:card', twCard);
    if (twTitle) setMeta('twitter:title', twTitle);
    if (twDesc) setMeta('twitter:description', twDesc);
    if (twImage) setMeta('twitter:image', twImage);
    if (seo.twitter_site) setMeta('twitter:site', seo.twitter_site);

    if (seo.canonical_url) setLink('canonical', seo.canonical_url);
    if (seo.favicon_url) setLink('icon', seo.favicon_url);
    if (seo.apple_touch_icon_url) setLink('apple-touch-icon', seo.apple_touch_icon_url);

    if (seo.structured_data) {
      const existing = document.querySelector('script[type="application/ld+json"]');
      if (existing) existing.remove();
      try {
        JSON.parse(seo.structured_data);
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = seo.structured_data;
        document.head.appendChild(script);
      } catch {
      }
    }

    if (seo.google_analytics_id) {
      const gaId = seo.google_analytics_id.trim();
      if (gaId && !document.querySelector(`script[data-ga="${gaId}"]`)) {
        const gaScript = document.createElement('script');
        gaScript.async = true;
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        gaScript.setAttribute('data-ga', gaId);
        document.head.appendChild(gaScript);

        const gaInit = document.createElement('script');
        gaInit.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
        document.head.appendChild(gaInit);
      }
    }
  } catch {
  }
}

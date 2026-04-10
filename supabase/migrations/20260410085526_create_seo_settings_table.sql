/*
  # SEO Settings Table

  ## Summary
  Creates a centralized SEO settings table to manage all search engine optimization
  and social sharing metadata for the web application from the admin panel.

  ## New Tables
  - `seo_settings`
    - `id` (uuid, primary key)
    - `site_title` - Browser tab title and default og:title
    - `site_description` - Meta description for search engines
    - `site_keywords` - Comma-separated keywords for meta keywords tag
    - `og_title` - Open Graph title (Facebook, LinkedIn sharing)
    - `og_description` - Open Graph description
    - `og_image` - Open Graph image URL
    - `og_url` - Canonical site URL
    - `twitter_card` - Twitter card type (summary, summary_large_image)
    - `twitter_site` - Twitter @handle
    - `twitter_title` - Twitter specific title (falls back to og_title)
    - `twitter_description` - Twitter specific description
    - `twitter_image` - Twitter specific image URL
    - `robots` - Robots meta tag (index,follow / noindex,nofollow etc.)
    - `canonical_url` - Canonical URL for SEO
    - `theme_color` - Browser theme color (mobile)
    - `pwa_name` - PWA full name
    - `pwa_short_name` - PWA short name
    - `pwa_description` - PWA description
    - `google_analytics_id` - Google Analytics tracking ID
    - `google_site_verification` - Google Search Console verification
    - `structured_data` - JSON-LD structured data (JSON text)
    - `custom_head_tags` - Any additional custom HTML meta tags
    - `created_at` / `updated_at` timestamps

  ## Security
  - RLS enabled
  - Public can read SEO settings (needed for meta tag injection)
  - Only admins and root users can update settings

  ## Notes
  - Only one row should exist (enforced by unique constraint on a constant column)
  - Default values match existing index.html values
*/

CREATE TABLE IF NOT EXISTS seo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_title text NOT NULL DEFAULT 'Çüngüş Çaybaşı Köy Yardımlaşma Ve Dayanışma Derneği',
  site_description text NOT NULL DEFAULT 'Köy derneği üyelik, etkinlik ve finans yönetim sistemi',
  site_keywords text DEFAULT 'dernek, köy derneği, üyelik, etkinlik, Çüngüş, Çaybaşı',
  og_title text DEFAULT 'Köy Derneği Yönetim Sistemi',
  og_description text DEFAULT 'Köy derneği üyelik, etkinlik ve finans yönetim sistemi',
  og_image text DEFAULT '',
  og_url text DEFAULT '',
  og_type text DEFAULT 'website',
  twitter_card text DEFAULT 'summary_large_image',
  twitter_site text DEFAULT '',
  twitter_title text DEFAULT '',
  twitter_description text DEFAULT '',
  twitter_image text DEFAULT '',
  robots text DEFAULT 'index, follow',
  canonical_url text DEFAULT '',
  theme_color text DEFAULT '#dc2626',
  pwa_name text DEFAULT 'Köy Derneği Yönetim Sistemi',
  pwa_short_name text DEFAULT 'Köy Derneği',
  pwa_description text DEFAULT 'Köy derneği üyelik, etkinlik ve finans yönetim sistemi',
  google_analytics_id text DEFAULT '',
  google_site_verification text DEFAULT '',
  structured_data text DEFAULT '',
  custom_head_tags text DEFAULT '',
  favicon_url text DEFAULT '',
  apple_touch_icon_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  singleton_key text UNIQUE DEFAULT 'main'
);

ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read SEO settings"
  ON seo_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can update SEO settings"
  ON seo_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

CREATE POLICY "Admins can insert SEO settings"
  ON seo_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_id = auth.uid()
      AND (members.is_admin = true OR members.is_root = true)
    )
  );

INSERT INTO seo_settings (singleton_key) VALUES ('main')
ON CONFLICT (singleton_key) DO NOTHING;

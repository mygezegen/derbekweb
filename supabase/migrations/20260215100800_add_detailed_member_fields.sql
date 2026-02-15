/*
  # Add Detailed Member Information Fields

  ## Summary
  Extends the members table with comprehensive fields for detailed member records including
  identity information, professional details, membership status, and administrative tracking.

  ## Changes Made
  
  ### New Columns Added to `members` table:
  
  **Identity & Personal Information:**
  - `registry_number` - Defter sıra numarası (member registry number)
  - `tc_identity_no` - T.C. Kimlik numarası
  - `representative_name` - Temsilci bilgisi (for corporate members)
  - `representative_tc_no` - Temsilci T.C. kimlik no
  - `gender` - Cinsiyet (male/female/other)
  
  **Corporate/Legal Information:**
  - `is_legal_entity` - Tüzel kişi mi? (true/false)
  - `legal_entity_number` - Tüzel kişi numarası
  - `website` - İnternet sitesi
  
  **Professional & Educational:**
  - `profession` - Meslek
  - `education_level` - Öğrenim durumu
  - `title` - Ünvan
  
  **Location:**
  - `province` - İl
  - `district` - İlçe
  
  **Membership Status & Tracking:**
  - `member_type` - Üye tipi (regular/honorary/etc)
  - `board_decision_date` - Yönetim kurulu karar tarihi
  - `status_change_date` - Durum değişiklik tarihi
  - `registration_date` - Kayıt tarihi
  - `passive_status_date` - Pasif olma tarihi
  - `passive_status_reason` - Pasif olma nedeni
  - `passive_objection_date` - Pasif olma itiraz tarihi
  - `is_active` - Aktif üye mi?

  ## Notes
  - All new fields are optional to maintain backward compatibility
  - Existing member records will have NULL values for new fields
  - Fields follow Turkish association membership requirements
  - Sensitive data (TC No) is protected by existing RLS policies
*/

-- Add identity and personal information fields
ALTER TABLE members ADD COLUMN IF NOT EXISTS registry_number text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS tc_identity_no text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS representative_name text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS representative_tc_no text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female', 'other'));

-- Add corporate/legal entity fields
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_legal_entity boolean DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS legal_entity_number text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS website text;

-- Add professional and educational fields
ALTER TABLE members ADD COLUMN IF NOT EXISTS profession text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS education_level text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS title text;

-- Add location fields
ALTER TABLE members ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS district text;

-- Add membership status and tracking fields
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_type text DEFAULT 'regular';
ALTER TABLE members ADD COLUMN IF NOT EXISTS board_decision_date date;
ALTER TABLE members ADD COLUMN IF NOT EXISTS status_change_date date;
ALTER TABLE members ADD COLUMN IF NOT EXISTS registration_date date DEFAULT CURRENT_DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS passive_status_date date;
ALTER TABLE members ADD COLUMN IF NOT EXISTS passive_status_reason text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS passive_objection_date date;
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create index for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_members_registry_number ON members(registry_number);
CREATE INDEX IF NOT EXISTS idx_members_tc_identity ON members(tc_identity_no);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON members(is_active);
CREATE INDEX IF NOT EXISTS idx_members_member_type ON members(member_type);
CREATE INDEX IF NOT EXISTS idx_members_province_district ON members(province, district);

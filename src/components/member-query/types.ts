export interface QueryResponseTemplate {
  id: string;
  name: string;
  description: string;
  fields: TemplateField[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateField {
  key: string;
  label: string;
  enabled: boolean;
}

export interface ApiClient {
  id: string;
  name: string;
  api_key_hash: string;
  api_key_prefix: string;
  allowed_ips: string[];
  rate_limit_count: number;
  rate_limit_window_minutes: number;
  template_id: string | null;
  require_api_key: boolean;
  is_active: boolean;
  description: string;
  created_at: string;
  updated_at: string;
  query_response_templates?: QueryResponseTemplate;
}

export interface QueryLog {
  id: string;
  client_id: string | null;
  client_name: string | null;
  queried_tc: string | null;
  ip_address: string | null;
  user_agent: string | null;
  found: boolean;
  status: 'success' | 'rate_limited' | 'invalid_key' | 'invalid_ip' | 'not_found' | 'error';
  error_message: string | null;
  response_fields: string[] | null;
  created_at: string;
}

export const ALL_TEMPLATE_FIELDS: TemplateField[] = [
  { key: 'full_name', label: 'Ad Soyad', enabled: true },
  { key: 'membership_status', label: 'Uyelik Durumu', enabled: true },
  { key: 'is_active', label: 'Aktif Mi', enabled: true },
  { key: 'member_since', label: 'Uyelik Baslangici', enabled: false },
  { key: 'phone', label: 'Telefon', enabled: false },
  { key: 'email', label: 'E-posta', enabled: false },
  { key: 'address', label: 'Adres', enabled: false },
  { key: 'occupation', label: 'Meslek', enabled: false },
  { key: 'neighborhood', label: 'Mahalle/Koy', enabled: false },
  { key: 'city', label: 'Sehir', enabled: false },
  { key: 'due_status', label: 'Aidat Durumu', enabled: false },
  { key: 'due_amount', label: 'Toplam Borc', enabled: false },
  { key: 'discount_eligible', label: 'Indirim Hakki', enabled: false },
];

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  success: { label: 'Basarili', color: 'text-green-700', bg: 'bg-green-100' },
  not_found: { label: 'Bulunamadi', color: 'text-gray-700', bg: 'bg-gray-100' },
  rate_limited: { label: 'Limit Asildi', color: 'text-amber-700', bg: 'bg-amber-100' },
  invalid_key: { label: 'Gecersiz Anahtar', color: 'text-red-700', bg: 'bg-red-100' },
  invalid_ip: { label: 'IP Engellendi', color: 'text-red-700', bg: 'bg-red-100' },
  error: { label: 'Hata', color: 'text-red-700', bg: 'bg-red-100' },
};

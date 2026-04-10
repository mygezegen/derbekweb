export interface Member {
  id: string;
  auth_id: string;
  full_name?: string;
  email: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  is_admin: boolean;
  is_root: boolean;
  joined_at?: string;
  updated_at?: string;
  registry_number?: string;
  tc_identity_no?: string;
  gender?: 'male' | 'female' | 'other';
  profession?: string;
  education_level?: string;
  title?: string;
  province?: string;
  district?: string;
  member_type?: string;
  is_active?: boolean;
  mother_name?: string;
  father_name?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_by: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  members?: Member;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  event_date?: string;
  date?: string;
  time?: string;
  location?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  qr_checkin_enabled?: boolean;
  event_participants?: EventParticipant[];
  participant_count?: number;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  member_id: string;
  status: 'attending' | 'not_attending' | 'maybe';
  registered_at: string;
  checked_in?: boolean;
  checked_in_at?: string;
}

export interface Dues {
  id: string;
  title: string;
  amount: number;
  period_month: number;
  period_year: number;
  due_date: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MemberDues {
  id: string;
  member_id: string;
  dues_id: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_amount: number;
  paid_at?: string;
  payment_method?: 'cash' | 'bank_transfer' | 'credit_card' | 'other';
  notes?: string;
  created_at: string;
  updated_at: string;
  dues?: Dues;
}

export interface Gallery {
  id: string;
  title: string;
  description?: string;
  is_public: boolean;
  cover_image_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  gallery_images?: GalleryImage[];
}

export interface GalleryImage {
  id: string;
  gallery_id: string;
  media_type: 'image' | 'youtube' | 'instagram' | 'facebook' | 'facebook_embed';
  image_url: string;
  video_url?: string;
  caption?: string;
  display_order: number;
  created_by: string;
  created_at: string;
}

export interface DashboardStats {
  totalMembers: number;
  membersInDebt: number;
  totalDebtAmount: number;
  paidThisMonth: number;
  upcomingEvents: number;
  recentAnnouncements: number;
}

export interface ContactInfo {
  id: string;
  phone?: string;
  email?: string;
  address?: string;
  social_media?: Record<string, string>;
  whatsapp_number?: string;
  created_at: string;
  updated_at: string;
}

export interface ManagementInfo {
  id: string;
  member_id: string;
  position: string;
  bio?: string;
  display_order: number;
  is_active: boolean;
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  members?: Member;
}

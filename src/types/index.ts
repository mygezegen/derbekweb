export interface Member {
  id: string;
  auth_id: string;
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  is_admin: boolean;
  is_root: boolean;
  joined_at: string;
  updated_at: string;

  registry_number?: string;
  tc_identity_no?: string;
  representative_name?: string;
  representative_tc_no?: string;
  gender?: 'male' | 'female' | 'other';

  is_legal_entity?: boolean;
  legal_entity_number?: string;
  website?: string;

  profession?: string;
  education_level?: string;
  title?: string;

  province?: string;
  district?: string;

  member_type?: string;
  board_decision_date?: string;
  status_change_date?: string;
  registration_date?: string;
  passive_status_date?: string;
  passive_status_reason?: string;
  passive_objection_date?: string;
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
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementWithCreator extends Announcement {
  members?: Member;
}

export interface EventWithCreator extends Event {
  members?: Member;
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
  status: 'pending' | 'paid' | 'overdue';
  paid_amount: number;
  paid_at?: string;
  payment_method?: 'cash' | 'bank_transfer' | 'credit_card' | 'other';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MemberDuesWithDetails extends MemberDues {
  dues?: Dues;
  members?: Member;
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
}

export interface GalleryImage {
  id: string;
  gallery_id: string;
  media_type: 'image' | 'youtube' | 'instagram' | 'facebook';
  image_url: string;
  video_url?: string;
  caption?: string;
  display_order: number;
  created_by: string;
  created_at: string;
}

export interface GalleryWithImages extends Gallery {
  gallery_images?: GalleryImage[];
}

export interface EventParticipant {
  id: string;
  event_id: string;
  member_id: string;
  status: 'attending' | 'not_attending' | 'maybe';
  registered_at: string;
  updated_at: string;
}

export interface EventWithParticipants extends Event {
  members?: Member;
  event_participants?: EventParticipant[];
  participant_count?: number;
}

export interface DashboardStats {
  totalMembers: number;
  membersInDebt: number;
  totalDebtAmount: number;
  paidThisMonth: number;
  upcomingEvents: number;
  recentAnnouncements: number;
}

export interface AuditLog {
  id: string;
  member_id?: string;
  action_type: string;
  table_name: string;
  record_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ContactInfo {
  id: string;
  phone?: string;
  email?: string;
  address?: string;
  social_media?: Record<string, string>;
  updated_by?: string;
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

export interface PageSetting {
  id: string;
  page_key: string;
  page_name: string;
  visible_to_admin: boolean;
  visible_to_members: boolean;
  is_enabled: boolean;
  display_order: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: 'root' | 'admin' | 'member';
  permission_code: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionWithDetails extends RolePermission {
  permissions?: Permission;
}

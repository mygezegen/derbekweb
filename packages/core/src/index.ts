export { createSupabaseClient } from './supabase/client';

export type {
  Member,
  Announcement,
  AnnouncementWithCreator,
  Event,
  EventWithCreator,
  EventParticipant,
  EventWithParticipants,
  Dues,
  MemberDues,
  MemberDuesWithDetails,
  Gallery,
  GalleryImage,
  GalleryWithImages,
  DashboardStats,
  AuditLog,
  BankAccount,
  ContactInfo,
  ManagementInfo,
  PageSetting,
  Permission,
  RolePermission,
  PermissionWithDetails,
} from './types';

export { logAction, getCurrentMemberId } from './lib/auditLog';
export { getSMSConfig, sendSMS } from './lib/smsService';
export type { SMSConfig, SendSMSParams, SMSResponse } from './lib/smsService';

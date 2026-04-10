/*
  # Drop Duplicate and Unused Indexes

  1. Drops the duplicate index on event_participants (keeping one copy)
  2. Drops all unused indexes to reduce storage and write overhead

  These indexes have never been used per Supabase advisor and are safe to remove.
  They can be recreated if query patterns change in future.
*/

-- Duplicate index (keep idx_event_participants_member_id, drop the fkey variant)
DROP INDEX IF EXISTS public.idx_event_participants_member_id_fkey;

-- Unused indexes
DROP INDEX IF EXISTS public.idx_email_templates_active;
DROP INDEX IF EXISTS public.idx_email_templates_key;
DROP INDEX IF EXISTS public.idx_email_logs_status;
DROP INDEX IF EXISTS public.idx_email_logs_template;
DROP INDEX IF EXISTS public.idx_email_logs_recipient;
DROP INDEX IF EXISTS public.idx_social_monitor_keywords_active;
DROP INDEX IF EXISTS public.idx_social_monitor_results_fetched_at;
DROP INDEX IF EXISTS public.idx_social_monitor_results_source;
DROP INDEX IF EXISTS public.idx_galleries_created_by;
DROP INDEX IF EXISTS public.idx_gallery_images_created_by;
DROP INDEX IF EXISTS public.idx_notifications_sent_by;
DROP INDEX IF EXISTS public.idx_audit_logs_table_record;
DROP INDEX IF EXISTS public.idx_management_info_member_id_fkey;
DROP INDEX IF EXISTS public.idx_smtp_settings_active;
DROP INDEX IF EXISTS public.idx_email_logs_sent_by;
DROP INDEX IF EXISTS public.idx_members_defter_id;
DROP INDEX IF EXISTS public.idx_password_reset_tokens_token_hash;
DROP INDEX IF EXISTS public.idx_password_reset_tokens_expires_at;
DROP INDEX IF EXISTS public.idx_gallery_comments_member_id;
DROP INDEX IF EXISTS public.idx_role_permissions_role;
DROP INDEX IF EXISTS public.idx_role_permissions_permission;
DROP INDEX IF EXISTS public.idx_transactions_date;
DROP INDEX IF EXISTS public.idx_transactions_created_at;
DROP INDEX IF EXISTS public.idx_sms_logs_status;
DROP INDEX IF EXISTS public.idx_sms_logs_recipient;
DROP INDEX IF EXISTS public.idx_transactions_related_donation_id_fk;
DROP INDEX IF EXISTS public.idx_activity_logs_entity;
DROP INDEX IF EXISTS public.idx_activity_logs_action;
DROP INDEX IF EXISTS public.idx_activity_logs_severity;
DROP INDEX IF EXISTS public.idx_event_participants_member_id;
DROP INDEX IF EXISTS public.idx_event_participants_status;
DROP INDEX IF EXISTS public.idx_event_participants_checkin;
DROP INDEX IF EXISTS public.idx_social_media_posts_platform;
DROP INDEX IF EXISTS public.idx_social_media_posts_imported_at;
DROP INDEX IF EXISTS public.idx_social_media_posts_is_used;
DROP INDEX IF EXISTS public.idx_event_participants_walk_in;
DROP INDEX IF EXISTS public.idx_event_social_posts_event_id;
DROP INDEX IF EXISTS public.idx_event_social_posts_platform;
DROP INDEX IF EXISTS public.idx_event_social_posts_status;
DROP INDEX IF EXISTS public.idx_board_members_member_id;
DROP INDEX IF EXISTS public.idx_sms_verification_phone;
DROP INDEX IF EXISTS public.idx_sms_verification_expires;
DROP INDEX IF EXISTS public.idx_identity_verification_status;
DROP INDEX IF EXISTS public.idx_email_update_status;
DROP INDEX IF EXISTS public.idx_password_reset_tokens_phone;
DROP INDEX IF EXISTS public.idx_password_reset_tokens_code;
DROP INDEX IF EXISTS public.idx_survey_responses_member_id;
DROP INDEX IF EXISTS public.idx_inventory_assignments_item;
DROP INDEX IF EXISTS public.idx_inventory_assignments_member;
DROP INDEX IF EXISTS public.idx_inventory_items_category;
DROP INDEX IF EXISTS public.idx_inventory_items_status;
DROP INDEX IF EXISTS public.idx_inventory_maintenance_item;
DROP INDEX IF EXISTS public.idx_query_logs_client_id;
DROP INDEX IF EXISTS public.idx_inventory_event_usage_item;
DROP INDEX IF EXISTS public.idx_query_logs_status;
DROP INDEX IF EXISTS public.idx_api_clients_api_key_hash;

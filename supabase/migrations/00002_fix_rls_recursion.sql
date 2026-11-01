-- ============================================================
-- Migration 00002: Fix RLS Infinite Recursion on Profiles
-- ============================================================
-- Creates a SECURITY DEFINER function is_admin() so checking
-- superadmin status bypasses RLS and prevents error 42P17.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- Fix profiles policy
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- Fix other table admin policies
DROP POLICY IF EXISTS "stars_all_admin" ON public.stars;
CREATE POLICY "stars_all_admin" ON public.stars
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "catalogs_all_admin" ON public.catalogs;
CREATE POLICY "catalogs_all_admin" ON public.catalogs
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "catalog_fields_all_admin" ON public.catalog_fields;
CREATE POLICY "catalog_fields_all_admin" ON public.catalog_fields
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "payments_select_admin" ON public.payments;
CREATE POLICY "payments_select_admin" ON public.payments
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "queue_counters_select_admin" ON public.queue_counters;
CREATE POLICY "queue_counters_select_admin" ON public.queue_counters
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "queue_events_select_admin" ON public.queue_events;
CREATE POLICY "queue_events_select_admin" ON public.queue_events
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "notifications_select_admin" ON public.notifications;
CREATE POLICY "notifications_select_admin" ON public.notifications
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "notification_deliveries_select_admin" ON public.notification_deliveries;
CREATE POLICY "notification_deliveries_select_admin" ON public.notification_deliveries
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "platform_settings_all_admin" ON public.platform_settings;
CREATE POLICY "platform_settings_all_admin" ON public.platform_settings
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

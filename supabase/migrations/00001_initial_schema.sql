-- ============================================================
-- Migration 00001: Initial Schema for Mabar VIP Platform
-- ============================================================
-- All tables use UUID primary keys.
-- Timestamps stored in UTC (timestamptz).
-- RLS enabled on all client-accessible tables.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'star' CHECK (role IN ('star', 'superadmin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Superadmin can read all profiles
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- ============================================================
-- 2. stars
-- ============================================================
CREATE TABLE IF NOT EXISTS stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stars_user_id ON stars(user_id);
CREATE INDEX idx_stars_slug ON stars(slug);

ALTER TABLE stars ENABLE ROW LEVEL SECURITY;

-- Public: anyone can read active stars
CREATE POLICY "stars_select_public" ON stars
  FOR SELECT USING (is_active = true);

-- Star can read/update own record (even if inactive)
CREATE POLICY "stars_select_own" ON stars
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "stars_update_own" ON stars
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Superadmin can do everything
CREATE POLICY "stars_all_admin" ON stars
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- ============================================================
-- 3. catalogs
-- ============================================================
CREATE TABLE IF NOT EXISTS catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  star_id UUID NOT NULL REFERENCES stars(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price_amount INTEGER NOT NULL CHECK (price_amount > 0),
  cover_image_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(star_id, slug)
);

CREATE INDEX idx_catalogs_star_id ON catalogs(star_id);

ALTER TABLE catalogs ENABLE ROW LEVEL SECURITY;

-- Public: anyone can read active catalogs of active stars
CREATE POLICY "catalogs_select_public" ON catalogs
  FOR SELECT USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.is_active = true)
  );

-- Star can manage own catalogs
CREATE POLICY "catalogs_select_own" ON catalogs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  );

CREATE POLICY "catalogs_insert_own" ON catalogs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  );

CREATE POLICY "catalogs_update_own" ON catalogs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  );

CREATE POLICY "catalogs_delete_own" ON catalogs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  );

-- Superadmin can do everything
CREATE POLICY "catalogs_all_admin" ON catalogs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- ============================================================
-- 4. catalog_fields
-- ============================================================
CREATE TABLE IF NOT EXISTS catalog_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'textarea', 'number', 'dropdown')),
  placeholder TEXT DEFAULT '',
  is_required BOOLEAN NOT NULL DEFAULT false,
  options JSONB DEFAULT '[]'::jsonb,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalog_fields_catalog_id ON catalog_fields(catalog_id);

ALTER TABLE catalog_fields ENABLE ROW LEVEL SECURITY;

-- Public: anyone can read fields of active catalogs
CREATE POLICY "catalog_fields_select_public" ON catalog_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM catalogs c
      JOIN stars s ON s.id = c.star_id
      WHERE c.id = catalog_id AND c.is_active = true AND s.is_active = true
    )
  );

-- Star can manage fields of own catalogs
CREATE POLICY "catalog_fields_all_own" ON catalog_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM catalogs c
      JOIN stars s ON s.id = c.star_id
      WHERE c.id = catalog_id AND s.user_id = auth.uid()
    )
  );

-- Superadmin can do everything
CREATE POLICY "catalog_fields_all_admin" ON catalog_fields
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- ============================================================
-- 5. orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  star_id UUID NOT NULL REFERENCES stars(id),
  catalog_id UUID NOT NULL REFERENCES catalogs(id),
  guest_display_name TEXT NOT NULL,
  guest_answers JSONB DEFAULT '{}'::jsonb,
  guest_message TEXT DEFAULT '',
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'IDR',
  payment_status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (payment_status IN ('pending_payment', 'paid', 'payment_failed', 'expired', 'cancelled', 'refunded')),
  queue_status TEXT DEFAULT NULL
    CHECK (queue_status IS NULL OR queue_status IN ('waiting', 'invited', 'in_room', 'completed', 'skipped', 'cancelled')),
  queue_number INTEGER,
  tracking_token TEXT NOT NULL UNIQUE,
  duitku_reference TEXT UNIQUE,
  merchant_order_id TEXT NOT NULL UNIQUE,
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_star_id ON orders(star_id);
CREATE INDEX idx_orders_catalog_id ON orders(catalog_id);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_queue_status ON orders(queue_status);
CREATE INDEX idx_orders_tracking_token ON orders(tracking_token);
CREATE INDEX idx_orders_merchant_order_id ON orders(merchant_order_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Guest: can read own order via tracking token (handled via server API, not direct RLS)
-- Star can read orders for their catalogs
CREATE POLICY "orders_select_own_star" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  );

-- Star can update queue_status of their orders
CREATE POLICY "orders_update_own_star" ON orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  );

-- Superadmin can read all orders
CREATE POLICY "orders_select_admin" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

CREATE POLICY "orders_update_admin" ON orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- Service role inserts orders (checkout API) — no RLS policy needed for anon insert
-- Orders are created server-side with service role key

-- ============================================================
-- 6. payments
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'duitku',
  provider_reference TEXT,
  provider_transaction_id TEXT,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'expired', 'cancelled')),
  callback_payload_redacted JSONB DEFAULT '{}'::jsonb,
  last_callback_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_provider_reference ON payments(provider_reference);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Star can read payments for their orders
CREATE POLICY "payments_select_own_star" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN stars s ON s.id = o.star_id
      WHERE o.id = order_id AND s.user_id = auth.uid()
    )
  );

-- Superadmin can read all payments
CREATE POLICY "payments_select_admin" ON payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- ============================================================
-- 7. queue_counters
-- ============================================================
CREATE TABLE IF NOT EXISTS queue_counters (
  catalog_id UUID PRIMARY KEY REFERENCES catalogs(id) ON DELETE CASCADE,
  last_queue_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE queue_counters ENABLE ROW LEVEL SECURITY;

-- Star can read their own queue counters
CREATE POLICY "queue_counters_select_own" ON queue_counters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM catalogs c
      JOIN stars s ON s.id = c.star_id
      WHERE c.id = catalog_id AND s.user_id = auth.uid()
    )
  );

-- Superadmin can read all
CREATE POLICY "queue_counters_select_admin" ON queue_counters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- ============================================================
-- 8. queue_events
-- ============================================================
CREATE TABLE IF NOT EXISTS queue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_queue_events_order_id ON queue_events(order_id);

ALTER TABLE queue_events ENABLE ROW LEVEL SECURITY;

-- Star can read queue events for their orders
CREATE POLICY "queue_events_select_own" ON queue_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN stars s ON s.id = o.star_id
      WHERE o.id = order_id AND s.user_id = auth.uid()
    )
  );

-- Superadmin can read all
CREATE POLICY "queue_events_select_admin" ON queue_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- ============================================================
-- 9. notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  star_id UUID NOT NULL REFERENCES stars(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  event_type TEXT NOT NULL DEFAULT 'purchase',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_test BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_star_id ON notifications(star_id);
CREATE INDEX idx_notifications_order_id ON notifications(order_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Star can read own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  );

-- Star can update own notifications (mark as read)
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  );

-- Superadmin can read all
CREATE POLICY "notifications_select_admin" ON notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- ============================================================
-- 10. overlay_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS overlay_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  star_id UUID NOT NULL UNIQUE REFERENCES stars(id) ON DELETE CASCADE,
  overlay_token TEXT NOT NULL UNIQUE,
  alert_duration_ms INTEGER NOT NULL DEFAULT 5000,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  show_amount BOOLEAN NOT NULL DEFAULT true,
  show_guest_message BOOLEAN NOT NULL DEFAULT true,
  show_queue_number BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_overlay_settings_overlay_token ON overlay_settings(overlay_token);

ALTER TABLE overlay_settings ENABLE ROW LEVEL SECURITY;

-- Star can read/update own overlay settings
CREATE POLICY "overlay_settings_select_own" ON overlay_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  );

CREATE POLICY "overlay_settings_update_own" ON overlay_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  );

-- Superadmin can read all
CREATE POLICY "overlay_settings_select_admin" ON overlay_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- ============================================================
-- 11. notification_deliveries
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('dashboard', 'overlay')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_deliveries_notification_id ON notification_deliveries(notification_id);

ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Star can read own delivery statuses
CREATE POLICY "notification_deliveries_select_own" ON notification_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notifications n
      JOIN stars s ON s.id = n.star_id
      WHERE n.id = notification_id AND s.user_id = auth.uid()
    )
  );

-- Superadmin can read all
CREATE POLICY "notification_deliveries_select_admin" ON notification_deliveries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- ============================================================
-- 12. platform_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Only superadmin can read/write
CREATE POLICY "platform_settings_all_admin" ON platform_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- ============================================================
-- 13. audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only superadmin can read audit logs
CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- ============================================================
-- FUNCTION: Atomic queue number allocation
-- Called server-side after payment verification.
-- Uses SELECT FOR UPDATE to prevent race conditions.
-- ============================================================
CREATE OR REPLACE FUNCTION allocate_queue_number(
  p_order_id UUID,
  p_catalog_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_number INTEGER;
  v_current_status TEXT;
BEGIN
  -- Check order is in correct state (idempotency guard)
  SELECT payment_status INTO v_current_status
  FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_current_status = 'paid' THEN
    -- Already processed, return existing queue number
    SELECT queue_number INTO v_new_number
    FROM orders WHERE id = p_order_id;
    RETURN v_new_number;
  END IF;

  IF v_current_status != 'pending_payment' THEN
    RAISE EXCEPTION 'Order % is in invalid state: %', p_order_id, v_current_status;
  END IF;

  -- Ensure queue_counter row exists
  INSERT INTO queue_counters (catalog_id, last_queue_number, updated_at)
  VALUES (p_catalog_id, 0, now())
  ON CONFLICT (catalog_id) DO NOTHING;

  -- Atomically increment and get new queue number
  UPDATE queue_counters
  SET last_queue_number = last_queue_number + 1,
      updated_at = now()
  WHERE catalog_id = p_catalog_id
  RETURNING last_queue_number INTO v_new_number;

  -- Update order with paid status and queue number
  UPDATE orders
  SET payment_status = 'paid',
      queue_status = 'waiting',
      queue_number = v_new_number,
      paid_at = now(),
      updated_at = now()
  WHERE id = p_order_id;

  -- Create queue event
  INSERT INTO queue_events (order_id, event_type, previous_status, new_status, metadata)
  VALUES (
    p_order_id,
    'payment_confirmed',
    NULL,
    'waiting',
    jsonb_build_object('queue_number', v_new_number)
  );

  -- Create notification for the Star
  INSERT INTO notifications (star_id, order_id, event_type, payload, is_test)
  SELECT
    o.star_id,
    o.id,
    'purchase',
    jsonb_build_object(
      'catalog_name', c.name,
      'guest_display_name', o.guest_display_name,
      'amount', o.amount,
      'queue_number', v_new_number,
      'message', o.guest_message,
      'is_test', false
    ),
    false
  FROM orders o
  JOIN catalogs c ON c.id = o.catalog_id
  WHERE o.id = p_order_id;

  RETURN v_new_number;
END;
$$;

-- ============================================================
-- FUNCTION: Update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_stars_updated_at BEFORE UPDATE ON stars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_catalogs_updated_at BEFORE UPDATE ON catalogs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_catalog_fields_updated_at BEFORE UPDATE ON catalog_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_overlay_settings_updated_at BEFORE UPDATE ON overlay_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_notification_deliveries_updated_at BEFORE UPDATE ON notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

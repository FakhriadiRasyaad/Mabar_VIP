-- ============================================================
-- Seed Data for Development
-- ============================================================
-- NOTE: You must first create auth users in Supabase Dashboard
-- or via supabase auth admin commands, then update the UUIDs below.
-- These are placeholder UUIDs for development reference.
-- ============================================================

-- Default platform settings
INSERT INTO platform_settings (key, value) VALUES
  ('platform_fee_percentage', '5'::jsonb),
  ('default_alert_duration_ms', '5000'::jsonb),
  ('max_catalog_image_size_bytes', '5242880'::jsonb),
  ('max_guest_message_length', '200'::jsonb),
  ('max_nickname_length', '50'::jsonb),
  ('default_order_expiry_minutes', '60'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- To seed demo data, run the following AFTER creating auth users:
-- ============================================================
-- 
-- 1. Create a Star user in Supabase Auth (email: star@demo.com)
-- 2. Create a Superadmin user in Supabase Auth (email: admin@demo.com)
-- 3. Replace the UUIDs below with actual user IDs from auth.users
--
-- INSERT INTO profiles (id, display_name, role) VALUES
--   ('STAR_USER_UUID', 'Demo Star', 'star'),
--   ('ADMIN_USER_UUID', 'Superadmin', 'superadmin');
--
-- INSERT INTO stars (user_id, slug, display_name, bio, is_active) VALUES
--   ('STAR_USER_UUID', 'demo-star', 'Demo Star', 'Streamer gaming profesional!', true);
--
-- INSERT INTO catalogs (star_id, slug, name, description, price_amount, is_active) VALUES
--   ((SELECT id FROM stars WHERE slug = 'demo-star'), 'mabar-valorant', 'Mabar Valorant', 'Main bareng Valorant 1 game ranked', 25000, true),
--   ((SELECT id FROM stars WHERE slug = 'demo-star'), 'mabar-mlbb', 'Mabar Mobile Legends', 'Main bareng MLBB 2 game classic', 15000, true);
--
-- INSERT INTO catalog_fields (catalog_id, label, field_key, field_type, placeholder, is_required, sort_order) VALUES
--   ((SELECT id FROM catalogs WHERE slug = 'mabar-valorant' LIMIT 1), 'Nickname In-Game', 'nickname', 'text', 'Masukkan nickname Valorant kamu', true, 1),
--   ((SELECT id FROM catalogs WHERE slug = 'mabar-valorant' LIMIT 1), 'Riot ID', 'riot_id', 'text', 'contoh: Player#1234', true, 2),
--   ((SELECT id FROM catalogs WHERE slug = 'mabar-valorant' LIMIT 1), 'Rank', 'rank', 'dropdown', 'Pilih rank kamu', true, 3),
--   ((SELECT id FROM catalogs WHERE slug = 'mabar-valorant' LIMIT 1), 'Pesan untuk Streamer', 'message', 'textarea', 'Tulis pesan singkat (opsional)', false, 4),
--   ((SELECT id FROM catalogs WHERE slug = 'mabar-mlbb' LIMIT 1), 'Nickname ML', 'nickname', 'text', 'Masukkan nickname ML kamu', true, 1),
--   ((SELECT id FROM catalogs WHERE slug = 'mabar-mlbb' LIMIT 1), 'ID Game (Server)', 'game_id', 'text', 'contoh: 123456789 (1234)', true, 2);
--
-- INSERT INTO overlay_settings (star_id, overlay_token, alert_duration_ms, sound_enabled, show_amount, show_guest_message, show_queue_number) VALUES
--   ((SELECT id FROM stars WHERE slug = 'demo-star'), encode(gen_random_bytes(32), 'hex'), 5000, true, true, true, true);
--
-- INSERT INTO queue_counters (catalog_id, last_queue_number) VALUES
--   ((SELECT id FROM catalogs WHERE slug = 'mabar-valorant' LIMIT 1), 0),
--   ((SELECT id FROM catalogs WHERE slug = 'mabar-mlbb' LIMIT 1), 0);

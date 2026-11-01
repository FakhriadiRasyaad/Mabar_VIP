-- ============================================================
-- SQL Script: Seed Akun Star & Superadmin di Supabase
-- ============================================================
-- Jalankan kode ini di:
-- Supabase Dashboard -> SQL Editor -> Tempel & Klik 'RUN'
--
-- Akun yang dibuat:
-- 1. Streamer/Star:
--    Email    : star@demo.com
--    Password : password123
--    URL Star : /[starSlug] -> /demo-star
-- 2. Superadmin:
--    Email    : admin@demo.com
--    Password : admin123
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
  v_star_user_id UUID := gen_random_uuid();
  v_admin_user_id UUID := gen_random_uuid();
  v_star_id UUID := gen_random_uuid();
  v_catalog_val_id UUID := gen_random_uuid();
  v_catalog_ml_id UUID := gen_random_uuid();
  v_overlay_token TEXT := encode(gen_random_bytes(32), 'hex');
BEGIN

  -- ============================================================
  -- 1. Buat Akun Streamer/Star di auth.users jika belum ada
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'star@demo.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      phone_change,
      phone_change_token,
      reauthentication_token
    ) VALUES (
      v_star_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'star@demo.com',
      crypt('password123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Demo Star"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    );

    -- Simpan Profile Star
    INSERT INTO public.profiles (id, display_name, role)
    VALUES (v_star_user_id, 'Demo Star', 'star')
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, role = EXCLUDED.role;

    -- Simpan Data Star
    INSERT INTO public.stars (id, user_id, slug, display_name, bio, is_active)
    VALUES (v_star_id, v_star_user_id, 'demo-star', 'Demo Star', 'Streamer gaming profesional!', true)
    ON CONFLICT (slug) DO UPDATE SET display_name = EXCLUDED.display_name;

    -- Simpan Katalog Mabar
    INSERT INTO public.catalogs (id, star_id, slug, name, description, price_amount, is_active)
    VALUES
      (v_catalog_val_id, v_star_id, 'mabar-valorant', 'Mabar Valorant', 'Main bareng Valorant 1 match kompetitif', 25000, true),
      (v_catalog_ml_id, v_star_id, 'mabar-mlbb', 'Mabar Mobile Legends', 'Main bareng MLBB 2 match ranked', 15000, true)
    ON CONFLICT (star_id, slug) DO NOTHING;

    -- Custom form fields untuk Valorant
    INSERT INTO public.catalog_fields (catalog_id, label, field_key, field_type, placeholder, is_required, sort_order)
    VALUES
      (v_catalog_val_id, 'Nickname Valorant', 'nickname', 'text', 'Masukkan nickname kamu', true, 1),
      (v_catalog_val_id, 'Riot ID / Tagline', 'riot_id', 'text', 'Contoh: Player#1234', true, 2),
      (v_catalog_val_id, 'Rank Kamu', 'rank', 'text', 'Contoh: Diamond 2', true, 3),
      (v_catalog_val_id, 'Pesan untuk Streamer', 'message', 'textarea', 'Pesan singkat atau role favorit', false, 4)
    ON CONFLICT DO NOTHING;

    -- Custom form fields untuk MLBB
    INSERT INTO public.catalog_fields (catalog_id, label, field_key, field_type, placeholder, is_required, sort_order)
    VALUES
      (v_catalog_ml_id, 'Nickname MLBB', 'nickname', 'text', 'Masukkan nickname MLBB', true, 1),
      (v_catalog_ml_id, 'User ID (Server ID)', 'game_id', 'text', 'Contoh: 12345678 (2020)', true, 2),
      (v_catalog_ml_id, 'Rank Saat Ini', 'rank', 'text', 'Contoh: Mythic Glory', true, 3)
    ON CONFLICT DO NOTHING;

    -- Inisialisasi Queue Counter
    INSERT INTO public.queue_counters (catalog_id, last_queue_number)
    VALUES
      (v_catalog_val_id, 0),
      (v_catalog_ml_id, 0)
    ON CONFLICT (catalog_id) DO NOTHING;

    -- Pengaturan Overlay OBS awal
    INSERT INTO public.overlay_settings (
      star_id,
      overlay_token,
      alert_duration_ms,
      sound_enabled,
      show_amount,
      show_guest_message,
      show_queue_number
    ) VALUES (
      v_star_id,
      v_overlay_token,
      5000,
      true,
      true,
      true,
      true
    )
    ON CONFLICT (star_id) DO NOTHING;

    RAISE NOTICE '>>> AKUN STREAMER BERHASIL DIBUAT: star@demo.com / password123';
  ELSE
    RAISE NOTICE '>>> Akun star@demo.com sudah ada.';
  END IF;

  -- ============================================================
  -- 2. Buat Akun Superadmin di auth.users jika belum ada
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@demo.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      phone_change,
      phone_change_token,
      reauthentication_token
    ) VALUES (
      v_admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@demo.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Superadmin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    );

    -- Simpan Profile Admin
    INSERT INTO public.profiles (id, display_name, role)
    VALUES (v_admin_user_id, 'Superadmin', 'superadmin')
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, role = EXCLUDED.role;

    RAISE NOTICE '>>> AKUN SUPERADMIN BERHASIL DIBUAT: admin@demo.com / admin123';
  ELSE
    RAISE NOTICE '>>> Akun admin@demo.com sudah ada.';
  END IF;

  -- ============================================================
  -- 3. Inisialisasi Platform Settings
  -- ============================================================
  INSERT INTO public.platform_settings (key, value) VALUES
    ('platform_fee_percentage', '5'::jsonb),
    ('default_alert_duration_ms', '5000'::jsonb),
    ('max_catalog_image_size_bytes', '5242880'::jsonb),
    ('max_guest_message_length', '200'::jsonb),
    ('max_nickname_length', '50'::jsonb),
    ('default_order_expiry_minutes', '60'::jsonb)
  ON CONFLICT (key) DO NOTHING;

END $$;

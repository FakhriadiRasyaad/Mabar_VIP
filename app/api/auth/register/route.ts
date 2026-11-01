import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password, displayName, slug: customSlug, bio } = body;

    // 1. Validation
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email tidak valid.' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
    }

    if (!displayName || displayName.trim().length < 2) {
      return NextResponse.json({ error: 'Nama tampilan minimal 2 karakter.' }, { status: 400 });
    }

    // Sanitize and validate slug
    let rawSlug = (customSlug || displayName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!rawSlug || rawSlug.length < 3) {
      rawSlug = `star-${Date.now().toString(36)}`;
    }

    const supabase = createAdminClient();

    // 2. Check if slug is already taken
    const { data: existingStar } = await supabase
      .from('stars')
      .select('id')
      .eq('slug', rawSlug)
      .single();

    if (existingStar) {
      return NextResponse.json(
        { error: `Username/URL /${rawSlug} sudah digunakan oleh streamer lain. Silakan pilih yang lain.` },
        { status: 400 }
      );
    }

    // 3. Create user in Supabase auth (with auto email_confirm)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName.trim(),
      },
    });

    if (authError || !authData.user) {
      console.error('Supabase auth createUser error:', authError);
      if (authError?.message?.includes('already registered') || authError?.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: 'Email ini sudah terdaftar. Silakan gunakan email lain atau langsung masuk di tab Login.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: authError?.message || 'Gagal mendaftarkan akun. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // 4. Create profile with role 'star'
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        display_name: displayName.trim(),
        role: 'star',
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    // 5. Create Star record
    const { data: starRecord, error: starError } = await supabase
      .from('stars')
      .insert({
        user_id: userId,
        slug: rawSlug,
        display_name: displayName.trim(),
        bio: bio?.trim() || `Halo, selamat datang di halaman mabar resmi ${displayName.trim()}!`,
        is_active: true,
      })
      .select('id, slug')
      .single();

    if (starError || !starRecord) {
      console.error('Error creating star record:', starError);
      return NextResponse.json(
        { error: 'Gagal membuat profil streamer. Silakan hubungi admin.' },
        { status: 500 }
      );
    }

    // 6. Create Overlay Settings for OBS
    const overlayToken = crypto.randomBytes(32).toString('hex');
    await supabase.from('overlay_settings').insert({
      star_id: starRecord.id,
      overlay_token: overlayToken,
      alert_duration_ms: 5000,
      sound_enabled: true,
      show_amount: true,
      show_guest_message: true,
      show_queue_number: true,
    });

    // 7. Create a Starter Catalog for the new star
    const { data: catalogRecord } = await supabase
      .from('catalogs')
      .insert({
        star_id: starRecord.id,
        slug: 'mabar-1-match',
        name: 'Mabar 1 Match / Game',
        description: 'Mabar seru 1 match langsung masuk antrean live stream!',
        price_amount: 25000,
        is_active: true,
      })
      .select('id')
      .single();

    // Starter Catalog Fields
    if (catalogRecord) {
      await supabase.from('catalog_fields').insert([
        {
          catalog_id: catalogRecord.id,
          field_key: 'in_game_nickname',
          label: 'In-Game Nickname / ID',
          field_type: 'text',
          placeholder: 'Contoh: ProPlayer#1234',
          is_required: true,
          sort_order: 1,
        },
        {
          catalog_id: catalogRecord.id,
          field_key: 'whatsapp_number',
          label: 'Nomor WhatsApp Aktif',
          field_type: 'phone',
          placeholder: 'Contoh: 08123456789',
          is_required: true,
          sort_order: 2,
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      message: 'Akun streamer berhasil didaftarkan!',
      slug: starRecord.slug,
      userId,
    });
  } catch (err: unknown) {
    console.error('Registration API error:', err);
    return NextResponse.json({ error: 'Server error saat mendaftarkan akun.' }, { status: 500 });
  }
}

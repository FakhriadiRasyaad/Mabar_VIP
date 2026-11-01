import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  parseCatalogBundles,
  parseCatalogSlots,
  parseCatalogFastTrack,
  getCleanDescription,
  embedMetadataInDescription,
  embedBundlesInDescription,
  CatalogBundle,
} from '@/lib/bundles';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'star' || !user.starId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: catalogs, error } = await supabase
      .from('catalogs')
      .select(`
        id,
        slug,
        name,
        description,
        price_amount,
        cover_image_path,
        is_active,
        created_at,
        catalog_fields (
          id,
          label,
          field_key,
          field_type,
          placeholder,
          is_required,
          sort_order
        )
      `)
      .eq('star_id', user.starId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const enhancedCatalogs = (catalogs || []).map((c) => ({
      ...c,
      bundles: parseCatalogBundles(c),
      max_slots: parseCatalogSlots(c),
      fast_track: parseCatalogFastTrack(c),
      clean_description: getCleanDescription(c.description),
    }));

    return NextResponse.json({ catalogs: enhancedCatalogs });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'star' || !user.starId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      description,
      price_amount,
      cover_image_path,
      bundles = [],
      max_slots = 4,
      fast_track_enabled = true,
      fast_track_fee = 10000,
      is_active = true,
    } = body;

    if (!name || !slug || !price_amount || price_amount <= 0) {
      return NextResponse.json({ error: 'Nama, slug, dan harga wajib diisi dan valid.' }, { status: 400 });
    }

    // Sanitize slug
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    const supabase = createAdminClient();

    // Check slug unique for this star
    const { data: existing } = await supabase
      .from('catalogs')
      .select('id')
      .eq('star_id', user.starId)
      .eq('slug', cleanSlug)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Slug katalog ini sudah digunakan. Gunakan slug lain.' }, { status: 400 });
    }

    // Embed bundles, max slots, and fast track into description for universal DB persistence
    const fullDescription = embedMetadataInDescription(
      description || '',
      bundles as CatalogBundle[],
      parseInt(String(max_slots), 10) || 4,
      {
        enabled: Boolean(fast_track_enabled),
        fee: parseInt(String(fast_track_fee), 10) || 10000,
      }
    );

    // Insert catalog payload
    const insertPayload: Record<string, any> = {
      star_id: user.starId,
      slug: cleanSlug,
      name: name.trim(),
      description: fullDescription,
      price_amount: parseInt(String(price_amount), 10),
      cover_image_path: cover_image_path ? String(cover_image_path).trim() : null,
      is_active: Boolean(is_active),
    };

    let { data: catalog, error: insertErr } = await supabase
      .from('catalogs')
      .insert({
        ...insertPayload,
        bundles: bundles,
        max_slots: parseInt(String(max_slots), 10) || 4,
        fast_track_enabled: Boolean(fast_track_enabled),
        fast_track_fee: parseInt(String(fast_track_fee), 10) || 10000,
      })
      .select()
      .single();

    // Fallback if specific migration columns don't exist yet
    if (insertErr && insertErr.message?.includes('column')) {
      const fallbackResult = await supabase
        .from('catalogs')
        .insert(insertPayload)
        .select()
        .single();
      catalog = fallbackResult.data;
      insertErr = fallbackResult.error;
    }

    if (insertErr || !catalog) {
      return NextResponse.json({ error: insertErr?.message || 'Gagal membuat katalog' }, { status: 500 });
    }

    // Create default queue_counter
    await supabase
      .from('queue_counters')
      .insert({
        catalog_id: catalog.id,
        last_queue_number: 0,
      })
      .select();

    // Insert default fields: Nickname & Game ID
    await supabase.from('catalog_fields').insert([
      {
        catalog_id: catalog.id,
        label: 'Nickname In-Game',
        field_key: 'nickname',
        field_type: 'text',
        placeholder: 'Contoh: ProPlayer#123',
        is_required: true,
        sort_order: 1,
      },
      {
        catalog_id: catalog.id,
        label: 'ID Akun / Rank',
        field_key: 'game_id',
        field_type: 'text',
        placeholder: 'ID game atau rank saat ini',
        is_required: false,
        sort_order: 2,
      },
    ]);

    return NextResponse.json({ catalog });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

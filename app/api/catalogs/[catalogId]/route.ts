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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ catalogId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'star' || !user.starId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { catalogId } = await params;
    const body = await request.json();
    const {
      name,
      description,
      price_amount,
      cover_image_path,
      bundles,
      max_slots,
      fast_track_enabled,
      fast_track_fee,
      is_active,
    } = body;

    const supabase = createAdminClient();

    // Verify ownership
    const { data: catalog, error: fetchErr } = await supabase
      .from('catalogs')
      .select('id, star_id, description')
      .eq('id', catalogId)
      .single();

    if (fetchErr || !catalog || catalog.star_id !== user.starId) {
      return NextResponse.json({ error: 'Katalog tidak ditemukan' }, { status: 404 });
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (price_amount !== undefined) updateData.price_amount = parseInt(String(price_amount), 10);
    if (cover_image_path !== undefined) updateData.cover_image_path = cover_image_path ? String(cover_image_path).trim() : null;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    // If description, bundles, max_slots, or fast_track are updated, re-embed into description
    if (
      description !== undefined ||
      bundles !== undefined ||
      max_slots !== undefined ||
      fast_track_enabled !== undefined ||
      fast_track_fee !== undefined
    ) {
      const targetDesc = description !== undefined ? description : getCleanDescription(catalog.description);
      const targetBundles = bundles !== undefined ? bundles : parseCatalogBundles(catalog);
      const targetSlots = max_slots !== undefined ? parseInt(String(max_slots), 10) : parseCatalogSlots(catalog);
      const existingFt = parseCatalogFastTrack(catalog);
      const targetFt = {
        enabled: fast_track_enabled !== undefined ? Boolean(fast_track_enabled) : existingFt.enabled,
        fee: fast_track_fee !== undefined ? parseInt(String(fast_track_fee), 10) || 10000 : existingFt.fee,
      };

      updateData.description = embedMetadataInDescription(
        targetDesc,
        targetBundles as CatalogBundle[],
        targetSlots,
        targetFt
      );
    }

    // Try updating with columns if they exist
    const fullUpdateData = { ...updateData };
    if (bundles !== undefined) fullUpdateData.bundles = bundles;
    if (max_slots !== undefined) fullUpdateData.max_slots = parseInt(String(max_slots), 10) || 4;
    if (fast_track_enabled !== undefined) fullUpdateData.fast_track_enabled = Boolean(fast_track_enabled);
    if (fast_track_fee !== undefined) fullUpdateData.fast_track_fee = parseInt(String(fast_track_fee), 10) || 10000;

    let { data: updated, error: updateErr } = await supabase
      .from('catalogs')
      .update(fullUpdateData)
      .eq('id', catalogId)
      .select()
      .single();

    // Fallback if schema does not yet have specific columns
    if (updateErr && updateErr.message?.includes('column')) {
      const fallbackResult = await supabase
        .from('catalogs')
        .update(updateData)
        .eq('id', catalogId)
        .select()
        .single();
      updated = fallbackResult.data;
      updateErr = fallbackResult.error;
    }

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const enhanced = {
      ...updated,
      bundles: parseCatalogBundles(updated),
      max_slots: parseCatalogSlots(updated),
      fast_track: parseCatalogFastTrack(updated),
      clean_description: getCleanDescription(updated.description),
    };

    return NextResponse.json({ catalog: enhanced });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ catalogId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'star' || !user.starId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { catalogId } = await params;
    const supabase = createAdminClient();

    // Verify ownership
    const { data: catalog } = await supabase
      .from('catalogs')
      .select('id, star_id')
      .eq('id', catalogId)
      .single();

    if (!catalog || catalog.star_id !== user.starId) {
      return NextResponse.json({ error: 'Katalog tidak ditemukan' }, { status: 404 });
    }

    const { error: delErr } = await supabase
      .from('catalogs')
      .delete()
      .eq('id', catalogId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

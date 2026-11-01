/**
 * Utilities and types for Catalog Bundling (Paket Mabar), Slot/Party Quota (Kuota Mabar VIP),
 * and Fast Track Priority Queue (Jalur Cepat Naik Antrean).
 */

export interface CatalogBundle {
  id: string;
  name: string;        // e.g. "Paket 6 Match"
  match_count: number; // e.g. 6
  price: number;       // e.g. 25000
  badge?: string;      // e.g. "Hemat 5K 🔥"
}

export interface CatalogFastTrack {
  enabled: boolean;    // Whether Fast Track is active for this catalog
  fee: number;         // Additional fee in IDR, e.g. 10000
}

export const BUNDLE_TAG_REGEX = /<!--BUNDLES:([\s\S]*?)-->/;
export const SLOT_TAG_REGEX = /<!--SLOTS:(\d+)-->/;
export const FASTTRACK_TAG_REGEX = /<!--FASTTRACK:([\s\S]*?)-->/;

/**
 * Parses bundles from catalog object.
 * Checks both `bundles` column (if migrated) and embedded metadata in `description`.
 */
export function parseCatalogBundles(catalog: {
  bundles?: any;
  description?: string | null;
}): CatalogBundle[] {
  // 1. Direct column check
  if (Array.isArray(catalog?.bundles) && catalog.bundles.length > 0) {
    return catalog.bundles;
  }

  // 2. Fallback to embedded description metadata
  if (catalog?.description && typeof catalog.description === 'string') {
    const match = catalog.description.match(BUNDLE_TAG_REGEX);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse embedded bundles from description:', e);
      }
    }
  }

  return [];
}

/**
 * Parses max VIP slots (kuota sekali main) from catalog object.
 * Defaults to 4 (standard squad/party) if not specified.
 */
export function parseCatalogSlots(catalog: {
  max_slots?: any;
  description?: string | null;
}): number {
  if (typeof catalog?.max_slots === 'number' && catalog.max_slots > 0) {
    return catalog.max_slots;
  }
  if (catalog?.description && typeof catalog.description === 'string') {
    const match = catalog.description.match(SLOT_TAG_REGEX);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (parsed > 0) return parsed;
    }
  }
  return 4; // Default: 4 pemain VIP per sesi
}

/**
 * Parses Fast Track settings from catalog object.
 * Checks both columns (`fast_track_enabled`, `fast_track_fee`) and description metadata.
 * Defaults to enabled: true, fee: 10000.
 */
export function parseCatalogFastTrack(catalog: {
  fast_track_enabled?: any;
  fast_track_fee?: any;
  description?: string | null;
}): CatalogFastTrack {
  // 1. Direct column check
  if (typeof catalog?.fast_track_enabled === 'boolean') {
    return {
      enabled: catalog.fast_track_enabled,
      fee: typeof catalog.fast_track_fee === 'number' && catalog.fast_track_fee >= 0 ? catalog.fast_track_fee : 10000,
    };
  }

  // 2. Fallback to embedded description metadata
  if (catalog?.description && typeof catalog.description === 'string') {
    const match = catalog.description.match(FASTTRACK_TAG_REGEX);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            enabled: parsed.enabled !== false,
            fee: typeof parsed.fee === 'number' && parsed.fee >= 0 ? parsed.fee : 10000,
          };
        }
      } catch (e) {
        console.error('Failed to parse embedded fast track from description:', e);
      }
    }
  }

  return {
    enabled: true,
    fee: 10000,
  };
}

/**
 * Strips hidden metadata tags from a catalog's description so users see clean text.
 */
export function getCleanDescription(description?: string | null): string {
  if (!description) return '';
  return description
    .replace(BUNDLE_TAG_REGEX, '')
    .replace(SLOT_TAG_REGEX, '')
    .replace(FASTTRACK_TAG_REGEX, '')
    .trim();
}

/**
 * Embeds bundles, max slots, and fast track into description for universal DB persistence.
 */
export function embedMetadataInDescription(
  cleanDescription: string,
  bundles: CatalogBundle[],
  slots: number = 4,
  fastTrack?: CatalogFastTrack
): string {
  const base = getCleanDescription(cleanDescription);
  let result = base;

  if (bundles && bundles.length > 0) {
    result += `\n\n<!--BUNDLES:${JSON.stringify(bundles)}-->`;
  }

  if (slots && slots > 0) {
    result += `\n<!--SLOTS:${slots}-->`;
  }

  if (fastTrack) {
    result += `\n<!--FASTTRACK:${JSON.stringify(fastTrack)}-->`;
  }

  return result.trim();
}

/**
 * Backwards compatibility helper
 */
export function embedBundlesInDescription(
  cleanDescription: string,
  bundles: CatalogBundle[]
): string {
  return embedMetadataInDescription(cleanDescription, bundles, 4);
}

/**
 * Calculates savings information for a bundle compared to buying matches individually.
 */
export function calculateBundleSavings(
  basePricePerMatch: number,
  bundle: CatalogBundle
): {
  normalTotal: number;
  savings: number;
  discountPercent: number;
  pricePerMatch: number;
} {
  const normalTotal = basePricePerMatch * Math.max(1, bundle.match_count);
  const savings = Math.max(0, normalTotal - bundle.price);
  const discountPercent = normalTotal > 0 ? Math.round((savings / normalTotal) * 100) : 0;
  const pricePerMatch = bundle.match_count > 0 ? Math.round(bundle.price / bundle.match_count) : bundle.price;

  return {
    normalTotal,
    savings,
    discountPercent,
    pricePerMatch,
  };
}

/**
 * Checks whether an order is a Fast Track priority order.
 * Inspects both `is_fast_track` column and embedded `guest_answers._fast_track`.
 */
export function isOrderFastTrack(order: {
  is_fast_track?: any;
  guest_answers?: any;
}): boolean {
  if (order?.is_fast_track === true) return true;
  if (order?.guest_answers && typeof order.guest_answers === 'object') {
    const ft = order.guest_answers._fast_track;
    if (ft && (ft === true || ft.enabled === true)) return true;
  }
  return false;
}

/**
 * Sorts waiting queue orders so that Fast Track orders jump directly to the top!
 * Fast Track orders are prioritized first (sorted by queue_number ascending among fast trackers),
 * followed by regular waiting orders (sorted by queue_number ascending).
 */
export function sortWaitingQueue<
  T extends {
    is_fast_track?: any;
    queue_number?: number | null;
    guest_answers?: any;
  }
>(orders: T[]): T[] {
  return [...orders].sort((a, b) => {
    const aFast = isOrderFastTrack(a);
    const bFast = isOrderFastTrack(b);

    if (aFast && !bFast) return -1;
    if (!aFast && bFast) return 1;

    const aNum = typeof a.queue_number === 'number' ? a.queue_number : 999999;
    const bNum = typeof b.queue_number === 'number' ? b.queue_number : 999999;
    return aNum - bNum;
  });
}

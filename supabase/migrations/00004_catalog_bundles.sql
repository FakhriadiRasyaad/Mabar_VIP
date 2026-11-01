-- Migration 00004: Catalog Bundling & Packages
-- Adds optional 'bundles' JSONB and 'max_slots' INTEGER column to catalogs table

ALTER TABLE public.catalogs 
ADD COLUMN IF NOT EXISTS bundles JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.catalogs 
ADD COLUMN IF NOT EXISTS max_slots INTEGER DEFAULT 4;

COMMENT ON COLUMN public.catalogs.bundles IS 'Array of bundle pricing options, e.g. [{"id": "b1", "name": "Paket 6 Match", "match_count": 6, "price": 25000, "badge": "Hemat 5K"}]';
COMMENT ON COLUMN public.catalogs.max_slots IS 'Maximum VIP player slots per match session (Party Size)';


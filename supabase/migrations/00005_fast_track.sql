-- Migration 00005: Fast Track Priority Queue & Bundling Support
-- Adds Fast Track configuration to catalogs and fast track flag to orders

-- 1. Catalogs: Fast Track settings
ALTER TABLE public.catalogs 
ADD COLUMN IF NOT EXISTS fast_track_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.catalogs 
ADD COLUMN IF NOT EXISTS fast_track_fee INTEGER DEFAULT 10000;

COMMENT ON COLUMN public.catalogs.fast_track_enabled IS 'Whether spectators can purchase Fast Track priority queue for this catalog';
COMMENT ON COLUMN public.catalogs.fast_track_fee IS 'Extra fee in IDR to skip ahead in queue with Fast Track';

-- 2. Orders: Fast Track order flags
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS is_fast_track BOOLEAN DEFAULT false;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS fast_track_fee INTEGER DEFAULT 0;

COMMENT ON COLUMN public.orders.is_fast_track IS 'Whether this order purchased Fast Track priority queue';
COMMENT ON COLUMN public.orders.fast_track_fee IS 'The extra fee paid for Fast Track';

CREATE INDEX IF NOT EXISTS idx_orders_is_fast_track ON public.orders(is_fast_track);

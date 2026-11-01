-- ============================================================
-- Migration 00003: Bank Accounts, Payout Requests & Configurable Deductions
-- ============================================================

-- 1. Tabel Informasi Rekening Bank / E-Wallet Star
CREATE TABLE IF NOT EXISTS star_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  star_id UUID NOT NULL REFERENCES stars(id) ON DELETE CASCADE UNIQUE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE star_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "star_bank_accounts_own" ON star_bank_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  );

CREATE POLICY "star_bank_accounts_admin" ON star_bank_accounts
  FOR ALL USING (public.is_admin());

-- 2. Tabel Pengajuan Pencairan Dana (Payout Requests)
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  star_id UUID NOT NULL REFERENCES stars(id) ON DELETE CASCADE,
  amount_gross INTEGER NOT NULL CHECK (amount_gross > 0),
  amount_net INTEGER NOT NULL CHECK (amount_net >= 0),
  deductions_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  bank_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected')),
  rejection_reason TEXT,
  scheduled_payout_date DATE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payout_requests_star_id ON payout_requests(star_id);
CREATE INDEX idx_payout_requests_status ON payout_requests(status);

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payout_requests_own" ON payout_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM stars s WHERE s.id = star_id AND s.user_id = auth.uid())
  );

CREATE POLICY "payout_requests_admin" ON payout_requests
  FOR ALL USING (public.is_admin());

-- 3. Default Settings untuk Payment Gateway Dinamis & Pajak
INSERT INTO platform_settings (key, value) VALUES
  (
    'active_payment_gateway',
    '"dummy"'::jsonb
  ),
  (
    'payment_gateway_config',
    jsonb_build_object(
      'provider', 'duitku',
      'merchant_code', '',
      'api_key', '',
      'is_sandbox', true,
      'callback_url', 'http://localhost:3000/api/payments/duitku/callback',
      'return_url', 'http://localhost:3000/checkout'
    )
  ),
  (
    'deductions_config',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'platform_fee',
        'name', 'Biaya Platform Mabar VIP',
        'type', 'percentage',
        'value', 5.0,
        'description', 'Biaya pemeliharaan server, antrean real-time, dan alert OBS',
        'is_active', true
      ),
      jsonb_build_object(
        'id', 'pph21',
        'name', 'Potongan Pajak Penghasilan (PPh 21 Streamer)',
        'type', 'percentage',
        'value', 2.5,
        'description', 'Penyesuaian peraturan perpajakan pemerintah untuk penghasilan kreator digital',
        'is_active', true
      ),
      jsonb_build_object(
        'id', 'admin_transfer',
        'name', 'Biaya Administrasi Transfer Pencairan (BI-FAST)',
        'type', 'fixed',
        'value', 2500,
        'description', 'Biaya switching kliring antarbank transfer dana keluar',
        'is_active', true
      )
    )
  ),
  (
    'payout_rules',
    jsonb_build_object(
      'allowed_request_day_name', 'Jumat',
      'allowed_request_day_index', 5,
      'disbursement_day_name', 'Senin',
      'disbursement_day_index', 1,
      'min_payout_amount', 50000
    )
  )
ON CONFLICT (key) DO NOTHING;

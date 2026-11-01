/**
 * Finance & Tax Deduction Calculation Module
 * Supports dynamic government tax and platform deductions configured by Superadmin.
 */

export interface DeductionItem {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
  is_active: boolean;
}

export interface CalculatedDeduction {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  rate: number;
  calculatedAmount: number;
  description: string;
}

export interface EarningsBreakdown {
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
  deductions: CalculatedDeduction[];
}

export const DEFAULT_DEDUCTIONS: DeductionItem[] = [
  {
    id: 'platform_fee',
    name: 'Biaya Platform Mabar VIP',
    type: 'percentage',
    value: 5.0,
    description: 'Biaya pemeliharaan server, antrean real-time, dan alert OBS',
    is_active: true,
  },
  {
    id: 'pph21',
    name: 'Potongan Pajak Penghasilan (PPh 21 Streamer)',
    type: 'percentage',
    value: 2.5,
    description: 'Penyesuaian peraturan perpajakan pemerintah untuk penghasilan kreator digital',
    is_active: true,
  },
  {
    id: 'admin_transfer',
    name: 'Biaya Administrasi Transfer Pencairan (BI-FAST)',
    type: 'fixed',
    value: 2500,
    description: 'Biaya switching kliring antarbank transfer dana keluar',
    is_active: true,
  },
];

export const POPULAR_BANKS = [
  { code: 'BCA', name: 'Bank Central Asia (BCA)' },
  { code: 'MANDIRI', name: 'Bank Mandiri' },
  { code: 'BNI', name: 'Bank Negara Indonesia (BNI)' },
  { code: 'BRI', name: 'Bank Rakyat Indonesia (BRI)' },
  { code: 'SEABANK', name: 'SeaBank Indonesia' },
  { code: 'JAGO', name: 'Bank Jago' },
  { code: 'BCA_DIGITAL', name: 'blu by BCA Digital' },
  { code: 'CIMB', name: 'CIMB Niaga' },
  { code: 'PERMATA', name: 'Bank Permata' },
  { code: 'GOPAY', name: 'GoPay (E-Wallet)' },
  { code: 'OVO', name: 'OVO (E-Wallet)' },
  { code: 'DANA', name: 'DANA (E-Wallet)' },
  { code: 'SHOPEEPAY', name: 'ShopeePay (E-Wallet)' },
];

/**
 * Dynamically compute deductions and net earnings based on active tax/fee rules.
 */
export function calculateEarningsBreakdown(
  grossAmount: number,
  rules: DeductionItem[] = DEFAULT_DEDUCTIONS
): EarningsBreakdown {
  if (grossAmount <= 0) {
    return {
      grossAmount: 0,
      totalDeductions: 0,
      netAmount: 0,
      deductions: [],
    };
  }

  const calculated: CalculatedDeduction[] = [];
  let totalDeductions = 0;

  for (const rule of rules) {
    if (!rule.is_active) continue;

    let amount = 0;
    if (rule.type === 'percentage') {
      amount = Math.round((grossAmount * rule.value) / 100);
    } else {
      amount = Math.min(rule.value, grossAmount);
    }

    totalDeductions += amount;
    calculated.push({
      id: rule.id,
      name: rule.name,
      type: rule.type,
      rate: rule.value,
      calculatedAmount: amount,
      description: rule.description,
    });
  }

  const netAmount = Math.max(0, grossAmount - totalDeductions);

  return {
    grossAmount,
    totalDeductions,
    netAmount,
    deductions: calculated,
  };
}

/**
 * Check if today is Friday (Day 5 in JS Date where 0=Sunday, 5=Friday) in UTC+7 (Asia/Jakarta).
 */
export function isPayoutAllowedToday(now: Date = new Date()): {
  allowed: boolean;
  dayName: string;
  nextFridayDate: string;
  nextMondayDisbursement: string;
} {
  // Convert to Asia/Jakarta timezone
  const jktString = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const jktDate = new Date(jktString);
  const day = jktDate.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = dayNames[day];
  const allowed = day === 5; // Friday only

  // Calculate next Friday
  const daysUntilFriday = (5 - day + 7) % 7 || (allowed ? 0 : 7);
  const nextFriday = new Date(jktDate);
  nextFriday.setDate(jktDate.getDate() + daysUntilFriday);

  // Calculate next Monday after this request
  const daysUntilMonday = (1 - day + 7) % 7 || (day === 1 ? 7 : (8 - day));
  const nextMonday = new Date(jktDate);
  nextMonday.setDate(jktDate.getDate() + (allowed ? 3 : daysUntilMonday));

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };

  return {
    allowed,
    dayName,
    nextFridayDate: nextFriday.toLocaleDateString('id-ID', options),
    nextMondayDisbursement: nextMonday.toLocaleDateString('id-ID', options),
  };
}

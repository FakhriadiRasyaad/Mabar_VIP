import crypto from 'crypto';

/**
 * Security utilities for token generation and hashing.
 */

/**
 * Generate a high-entropy random token.
 * Used for tracking tokens and overlay tokens.
 * @param length Number of random bytes (default 32 = 64 hex chars)
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a URL-safe random token (base64url encoding).
 * Shorter than hex for the same entropy.
 */
export function generateUrlSafeToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Generate a unique merchant order ID for Duitku.
 * Format: MBR-{timestamp}-{random}
 */
export function generateMerchantOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `MBR-${timestamp}-${random}`;
}

/**
 * Hash a token for secure storage using SHA-256.
 * Stored in database instead of raw token.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a raw token against a stored hash.
 */
export function verifyTokenHash(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(tokenHash, 'hex'),
      Buffer.from(hash, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Format currency in Indonesian Rupiah.
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date/time for Indonesian timezone.
 */
export function formatDateTime(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

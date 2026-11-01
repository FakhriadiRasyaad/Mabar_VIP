/**
 * Input validation and sanitization utilities.
 * Prevent XSS, enforce length limits, and validate structured data.
 */

// ============================================================
// Sanitization
// ============================================================

/**
 * Strip HTML tags and entities to prevent XSS.
 * Does NOT allow any HTML — output is plain text.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/&[#\w]+;/g, '') // Strip HTML entities
    .replace(/[<>'"]/g, '') // Strip remaining dangerous chars
    .trim();
}

/**
 * Sanitize and enforce length limit on a string.
 */
export function sanitizeWithLimit(input: string, maxLength: number): string {
  const sanitized = sanitizeText(input);
  return sanitized.slice(0, maxLength);
}

// ============================================================
// Validation
// ============================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate guest display name.
 */
export function validateDisplayName(name: string): ValidationResult {
  const errors: ValidationError[] = [];
  const maxLength = 50;

  if (!name || name.trim().length === 0) {
    errors.push({ field: 'guest_display_name', message: 'Nama harus diisi' });
  } else if (name.trim().length > maxLength) {
    errors.push({
      field: 'guest_display_name',
      message: `Nama maksimal ${maxLength} karakter`,
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate guest message.
 */
export function validateGuestMessage(message: string): ValidationResult {
  const errors: ValidationError[] = [];
  const maxLength = 200;

  if (message && message.length > maxLength) {
    errors.push({
      field: 'guest_message',
      message: `Pesan maksimal ${maxLength} karakter`,
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate answers against catalog field definitions.
 */
export function validateGuestAnswers(
  answers: Record<string, string>,
  fields: Array<{
    field_key: string;
    label: string;
    field_type: string;
    is_required: boolean;
    options?: string[] | null;
    validation_rules?: {
      min_length?: number;
      max_length?: number;
      min?: number;
      max?: number;
    } | null;
  }>
): ValidationResult {
  const errors: ValidationError[] = [];
  const maxFieldLength = 500;

  for (const field of fields) {
    const value = answers[field.field_key] || '';

    // Required check
    if (field.is_required && (!value || value.trim().length === 0)) {
      errors.push({
        field: field.field_key,
        message: `${field.label} harus diisi`,
      });
      continue;
    }

    if (!value || value.trim().length === 0) continue;

    // Length check
    const maxLen =
      field.validation_rules?.max_length || maxFieldLength;
    if (value.length > maxLen) {
      errors.push({
        field: field.field_key,
        message: `${field.label} maksimal ${maxLen} karakter`,
      });
    }

    const minLen = field.validation_rules?.min_length;
    if (minLen && value.length < minLen) {
      errors.push({
        field: field.field_key,
        message: `${field.label} minimal ${minLen} karakter`,
      });
    }

    // Type-specific validation
    if (field.field_type === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push({
          field: field.field_key,
          message: `${field.label} harus berupa angka`,
        });
      } else {
        if (field.validation_rules?.min !== undefined && numValue < field.validation_rules.min) {
          errors.push({
            field: field.field_key,
            message: `${field.label} minimal ${field.validation_rules.min}`,
          });
        }
        if (field.validation_rules?.max !== undefined && numValue > field.validation_rules.max) {
          errors.push({
            field: field.field_key,
            message: `${field.label} maksimal ${field.validation_rules.max}`,
          });
        }
      }
    }

    if (field.field_type === 'dropdown' && field.options && field.options.length > 0) {
      if (!field.options.includes(value)) {
        errors.push({
          field: field.field_key,
          message: `${field.label}: pilihan tidak valid`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate that an amount matches catalog price.
 * Prevents client-side price manipulation.
 */
export function validateAmount(
  submittedAmount: number,
  catalogPrice: number
): boolean {
  return Number.isInteger(submittedAmount) &&
    submittedAmount > 0 &&
    submittedAmount === catalogPrice;
}

/**
 * Validate slug format (lowercase, alphanumeric, hyphens only).
 */
export function validateSlug(slug: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!slug || slug.trim().length === 0) {
    errors.push({ field: 'slug', message: 'Slug harus diisi' });
  } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length > 1) {
    errors.push({
      field: 'slug',
      message: 'Slug hanya boleh huruf kecil, angka, dan tanda hubung (-)',
    });
  } else if (slug.length < 2 || slug.length > 60) {
    errors.push({
      field: 'slug',
      message: 'Slug harus 2-60 karakter',
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate price amount in IDR (integer, positive, reasonable range).
 */
export function validatePrice(price: number): ValidationResult {
  const errors: ValidationError[] = [];
  const MIN_PRICE = 1000; // Rp 1.000
  const MAX_PRICE = 10000000; // Rp 10.000.000

  if (!Number.isInteger(price)) {
    errors.push({ field: 'price_amount', message: 'Harga harus bilangan bulat' });
  } else if (price < MIN_PRICE) {
    errors.push({ field: 'price_amount', message: `Harga minimal Rp ${MIN_PRICE.toLocaleString('id-ID')}` });
  } else if (price > MAX_PRICE) {
    errors.push({ field: 'price_amount', message: `Harga maksimal Rp ${MAX_PRICE.toLocaleString('id-ID')}` });
  }

  return { valid: errors.length === 0, errors };
}

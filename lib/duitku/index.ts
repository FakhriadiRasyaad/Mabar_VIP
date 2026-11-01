import crypto from 'crypto';

// ============================================================
// Duitku Payment Gateway Integration
// ============================================================

const DUITKU_SANDBOX_URL = 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry';
const DUITKU_PRODUCTION_URL = 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry';

export interface DuitkuInquiryRequest {
  merchantCode: string;
  merchantOrderId: string;
  paymentAmount: number;
  paymentMethod?: string;
  productDetails: string;
  email: string;
  phoneNumber?: string;
  additionalParam?: string;
  callbackUrl: string;
  returnUrl: string;
  expiryPeriod: number; // minutes
  signature: string;
}

export interface DuitkuInquiryResponse {
  merchantCode: string;
  reference: string;
  paymentUrl: string;
  vaNumber?: string;
  amount: string;
  statusCode: string;
  statusMessage: string;
}

export interface DuitkuCallbackData {
  merchantCode: string;
  amount: string;
  merchantOrderId: string;
  productDetail?: string;
  additionalParam?: string;
  paymentCode?: string;
  resultCode: string;
  reference: string;
  signature: string;
}

export function isDummyPaymentMode(): boolean {
  if (process.env.PAYMENT_MODE === 'dummy' || process.env.NEXT_PUBLIC_PAYMENT_MODE === 'dummy') {
    return true;
  }
  return !process.env.DUITKU_MERCHANT_CODE || !process.env.DUITKU_API_KEY;
}

/**
 * Get Duitku config from environment variables.
 * Throws if required variables are missing.
 */
export function getDuitkuConfig() {
  const merchantCode = process.env.DUITKU_MERCHANT_CODE;
  const apiKey = process.env.DUITKU_API_KEY;
  const callbackUrl = process.env.DUITKU_CALLBACK_URL;
  const returnUrl = process.env.DUITKU_RETURN_URL;
  const isSandbox = process.env.DUITKU_IS_SANDBOX !== 'false';

  if (!merchantCode || !apiKey || !callbackUrl || !returnUrl) {
    throw new Error(
      'Missing Duitku configuration. Required: DUITKU_MERCHANT_CODE, DUITKU_API_KEY, DUITKU_CALLBACK_URL, DUITKU_RETURN_URL'
    );
  }

  return {
    merchantCode,
    apiKey,
    callbackUrl,
    returnUrl,
    isSandbox,
    baseUrl: isSandbox ? DUITKU_SANDBOX_URL : DUITKU_PRODUCTION_URL,
  };
}

/**
 * Generate HMAC-SHA256 signature for Duitku inquiry request.
 * Formula: HMAC_SHA256(merchantCode + merchantOrderId + paymentAmount, apiKey)
 */
export function generateRequestSignature(
  merchantCode: string,
  merchantOrderId: string,
  paymentAmount: number,
  apiKey: string
): string {
  const stringToSign = `${merchantCode}${merchantOrderId}${paymentAmount}`;
  return crypto
    .createHmac('sha256', apiKey)
    .update(stringToSign)
    .digest('hex');
}

/**
 * Verify callback signature from Duitku.
 * Formula: MD5(merchantCode + amount + merchantOrderId + merchantKey)
 */
export function verifyCallbackSignature(
  merchantCode: string,
  amount: string,
  merchantOrderId: string,
  merchantKey: string,
  receivedSignature: string
): boolean {
  const stringToSign = `${merchantCode}${amount}${merchantOrderId}${merchantKey}`;
  const calculatedSignature = crypto
    .createHash('md5')
    .update(stringToSign)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Create a payment request to Duitku.
 * Returns the payment URL for the guest to complete payment.
 */
export async function createDuitkuPayment(params: {
  merchantOrderId: string;
  paymentAmount: number;
  productDetails: string;
  email: string;
  phoneNumber?: string;
  expiryPeriod?: number;
  paymentMethod?: string;
}): Promise<DuitkuInquiryResponse> {
  const config = getDuitkuConfig();

  const signature = generateRequestSignature(
    config.merchantCode,
    params.merchantOrderId,
    params.paymentAmount,
    config.apiKey
  );

  const requestBody: DuitkuInquiryRequest = {
    merchantCode: config.merchantCode,
    merchantOrderId: params.merchantOrderId,
    paymentAmount: params.paymentAmount,
    productDetails: params.productDetails,
    email: params.email,
    phoneNumber: params.phoneNumber || '',
    callbackUrl: config.callbackUrl,
    returnUrl: `${config.returnUrl}/${params.merchantOrderId}`,
    expiryPeriod: params.expiryPeriod || 60,
    signature,
    ...(params.paymentMethod && { paymentMethod: params.paymentMethod }),
  };

  const response = await fetch(config.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Duitku API error: ${response.status} - ${errorText}`);
  }

  const data: DuitkuInquiryResponse = await response.json();

  if (data.statusCode !== '00') {
    throw new Error(`Duitku transaction error: ${data.statusMessage}`);
  }

  return data;
}

/**
 * Parse and validate Duitku callback data.
 * Returns validated data or throws on invalid signature.
 */
export function validateCallback(
  callbackData: DuitkuCallbackData
): { valid: boolean; isSuccess: boolean; data: DuitkuCallbackData } {
  const config = getDuitkuConfig();

  const isValidSignature = verifyCallbackSignature(
    callbackData.merchantCode,
    callbackData.amount,
    callbackData.merchantOrderId,
    config.apiKey,
    callbackData.signature
  );

  if (!isValidSignature) {
    return { valid: false, isSuccess: false, data: callbackData };
  }

  // Verify merchant code matches
  if (callbackData.merchantCode !== config.merchantCode) {
    return { valid: false, isSuccess: false, data: callbackData };
  }

  const isSuccess = callbackData.resultCode === '00';

  return { valid: true, isSuccess, data: callbackData };
}

/**
 * Redact sensitive information from callback payload for audit storage.
 */
export function redactCallbackPayload(
  data: DuitkuCallbackData
): Record<string, unknown> {
  return {
    merchantCode: data.merchantCode,
    amount: data.amount,
    merchantOrderId: data.merchantOrderId,
    resultCode: data.resultCode,
    reference: data.reference,
    paymentCode: data.paymentCode,
    // Deliberately omit signature and any sensitive fields
    receivedAt: new Date().toISOString(),
  };
}

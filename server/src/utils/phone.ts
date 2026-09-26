/**
 * Validate and normalize phone number to E.164 format (+91XXXXXXXXXX)
 */
export function normalizePhone(phone: string): string | null {
  // Remove all whitespace, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // If starts with 0, replace with +91
  if (cleaned.startsWith('0')) {
    cleaned = '+91' + cleaned.substring(1);
  }

  // If doesn't start with +, assume Indian number
  if (!cleaned.startsWith('+')) {
    cleaned = '+91' + cleaned;
  }

  // Validate E.164 format for Indian numbers
  const e164Regex = /^\+91[6-9]\d{9}$/;
  if (!e164Regex.test(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Validate E.164 phone format
 */
export function isValidE164(phone: string): boolean {
  return /^\+91[6-9]\d{9}$/.test(phone);
}

/**
 * Mask phone number for display (e.g., +91 XXXXX X3456)
 */
export function maskPhone(phone: string): string {
  if (phone.length < 10) return phone;
  return phone.substring(0, 8) + 'XXXXX' + phone.substring(phone.length - 4);
}

/**
 * Validate E.164 Indian phone format
 */
export function isValidPhone(phone: string): boolean {
  return /^\+91[6-9]\d{9}$/.test(phone);
}

/**
 * Normalize phone input to E.164
 */
export function normalizePhone(input: string): string {
  let cleaned = input.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('0')) cleaned = '+91' + cleaned.substring(1);
  if (!cleaned.startsWith('+')) cleaned = '+91' + cleaned;
  return cleaned;
}

/**
 * Format phone for display
 */
export function formatPhone(phone: string): string {
  if (!phone || phone.length < 13) return phone;
  return `${phone.substring(0, 3)} ${phone.substring(3, 8)} ${phone.substring(8)}`;
}

/**
 * Format phone without country code for display alongside a country code badge
 * e.g. "+918758484847" -> "87584 84847"
 */
export function formatNationalPhone(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length > 10 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);
  if (digits.length > 5) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return digits;
}

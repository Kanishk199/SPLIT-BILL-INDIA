/**
 * Format a number as Indian currency with ₹ symbol
 * Supports Indian number system: 1,00,000 format
 */
export function formatCurrency(amount: string | number, decimals = 2): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';

  const fixed = Math.abs(num).toFixed(decimals);
  const [whole, dec] = fixed.split('.');

  // Indian number formatting
  let formatted = '';
  const len = whole.length;
  if (len <= 3) {
    formatted = whole;
  } else {
    const last3 = whole.slice(-3);
    const rest = whole.slice(0, -3);
    const groups = [];
    for (let i = rest.length; i > 0; i -= 2) {
      groups.unshift(rest.slice(Math.max(0, i - 2), i));
    }
    formatted = groups.join(',') + ',' + last3;
  }

  const result = decimals > 0 ? `${formatted}.${dec}` : formatted;
  return num < 0 ? `-₹${result}` : `₹${result}`;
}

/**
 * Format number without currency symbol (for inputs)
 */
export function formatNumber(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  return num.toFixed(2);
}

/**
 * Format date in Indian style: DD MMM YYYY
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format date relative (e.g. "2 days ago")
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateStr);
}

/**
 * Get first letter(s) for avatar
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

/**
 * Get category emoji
 */
export const CATEGORY_EMOJIS: Record<string, string> = {
  restaurant: '🍛',
  cafe: '☕',
  hostel: '🏠',
  grocery: '🛒',
  cab: '🚕',
  trip: '✈️',
  movie: '🎬',
  party: '🎉',
  outing: '🏏',
  sports: '⚽',
  shopping: '🛍️',
  other: '💰',
};

export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJIS[category] || '💰';
}

export const CATEGORIES = [
  { id: 'restaurant', label: 'Restaurant', emoji: '🍛' },
  { id: 'cafe', label: 'Café', emoji: '☕' },
  { id: 'hostel', label: 'Hostel/PG', emoji: '🏠' },
  { id: 'grocery', label: 'Groceries', emoji: '🛒' },
  { id: 'cab', label: 'Cab/Auto', emoji: '🚕' },
  { id: 'trip', label: 'Trip', emoji: '✈️' },
  { id: 'movie', label: 'Movie', emoji: '🎬' },
  { id: 'party', label: 'Party', emoji: '🎉' },
  { id: 'outing', label: 'Outing', emoji: '🏏' },
  { id: 'other', label: 'Other', emoji: '💰' },
];

/**
 * Validate Indian phone number
 */
export function isValidIndianPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''));
}

/**
 * Safe parse float with default
 */
export function safeFloat(value: string | number | undefined, defaultValue = 0): number {
  if (value === undefined || value === null) return defaultValue;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(n) ? defaultValue : n;
}

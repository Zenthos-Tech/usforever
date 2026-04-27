// Shared share-link duration helpers.
// `duration` is one of: '3days' | 'nolimit' | 'date'
// `selectedDate` is the user-picked DD-MM-YYYY string when duration === 'date'.

export const SHARE_DURATIONS = ['3days', 'nolimit', 'date'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + Number(days || 0));
  return x;
}

/** Convert a DD-MM-YYYY string into an ISO timestamp at end-of-day UTC. */
export function parseSelectedDateToISO(selectedDate) {
  const s = String(selectedDate || '').trim();
  const parts = s.split('-').map((x) => parseInt(x, 10));
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd, 23, 59, 59));
  return d.toISOString();
}

/** Compute the absolute expiry timestamp for a duration choice. */
export function computeExpiresAtISO(duration, selectedDate) {
  if (duration === 'nolimit') return null;
  if (duration === '3days') return addDays(new Date(), 3).toISOString();
  if (duration === 'date') return parseSelectedDateToISO(selectedDate);
  return null;
}

/** "1 January 2025" — used in the bottom-sheet dropdown label. */
export function formatSelectedDate(d) {
  const parts = String(d || '').split('-');
  if (parts.length !== 3) return d;
  const [dd, mm, yyyy] = parts;
  const monthName = MONTHS[parseInt(mm, 10) - 1] || mm;
  return `${parseInt(dd, 10)} ${monthName} ${yyyy}`;
}

/** "01 Jan 2025" — used in the share-link result toast. */
export function formatPrettyDate(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
}

/**
 * Human-readable label for the chosen duration. Used everywhere we surface
 * "expires on…" copy. In `share-link` the 3-day case shows the absolute date;
 * in `share-access` it's the literal "3 Days" label, controlled by `style`.
 */
export function getDurationLabel(duration, selectedDate, style = 'absolute') {
  if (duration === 'nolimit') return 'No Limit';
  if (duration === '3days') {
    if (style === 'absolute') {
      return formatPrettyDate(addDays(new Date(), 3)) || '3 Days';
    }
    return '3 Days';
  }
  if (duration === 'date' && selectedDate) {
    return style === 'absolute' ? selectedDate : formatSelectedDate(selectedDate);
  }
  return 'Select Duration';
}

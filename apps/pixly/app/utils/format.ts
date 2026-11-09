export function formatMoney(value: number | null | undefined, currency: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }

  const digits = Math.abs(value) >= 1000 ? 0 : 2;

  try {
    if (currency) {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
    }
  }
  catch {}

  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value)}${currency ? ` ${currency}` : ''}`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function formatPercent(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—';
}

// Days from the API are YYYY-MM-DD, read at noon UTC so no timezone shifts them
export function formatDay(day: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
}

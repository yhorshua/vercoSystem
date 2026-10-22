import type { TimezoneConfig } from '../components/types';

// Configuration for Peru
export const PERU_CONFIG: TimezoneConfig = {
  locale: 'es-PE',
  timeZone: 'America/Lima',
};

/**
 * Formats a UTC date string (from database) to Peru local time.
 * This solves the issue of servers (like Hostinger) saving in UTC.
 */
export const formatToPeruTime = (isoString: string): string => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(PERU_CONFIG.locale, {
    timeZone: PERU_CONFIG.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
};

/**
 * Gets the current time in Peru as a Date object (for comparison logic if needed)
 * or formatted string.
 */
export const getCurrentPeruTimeFormatted = (): string => {
  return new Intl.DateTimeFormat(PERU_CONFIG.locale, {
    timeZone: PERU_CONFIG.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date());
};

/**
 * Helper to display the raw UTC vs the Local conversion
 */
export const getTimezoneComparison = (isoString: string) => {
  const date = new Date(isoString);
  return {
    serverTimeUTC: date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
    localTimePeru: formatToPeruTime(isoString),
  };
};

export const getPeruBusinessDate = (instant: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PERU_CONFIG.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export const addCalendarDays = (dateOnly: string, days: number): string => {
  const date = new Date(`${dateOnly}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/**
 * Extracts and validates the calendar portion of a date returned by the API.
 * It intentionally avoids `new Date(value)` so an ISO timestamp cannot move to
 * the previous or next day when rendered in a different time zone.
 */
export const getStableDateOnly = (
  value: string | null | undefined,
): string | null => {
  const match = String(value ?? '')
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${yearText}-${monthText}-${dayText}`;
};

export const formatStableDate = (
  value: string | null | undefined,
  fallback = '—',
): string => {
  const dateOnly = getStableDateOnly(value);
  if (!dateOnly) return fallback;

  const [year, month, day] = dateOnly.split('-');
  return `${day}/${month}/${year}`;
};

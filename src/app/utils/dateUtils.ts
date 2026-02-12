import { TimezoneConfig } from '../components/types';

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
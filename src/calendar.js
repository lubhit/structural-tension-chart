import { Capacitor } from '@capacitor/core';
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';

const escapeICSText = (str) =>
  String(str).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

// All-day .ics event for a YYYY-MM-DD date.
export const buildICS = (title, description, dueDate) => {
  const dt = dueDate.slice(0, 10).replace(/-/g, '');
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@structuretensionchart`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Structure Tension Charting App//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${dt}`,
    `SUMMARY:${escapeICSText(title)}`,
    description ? `DESCRIPTION:${escapeICSText(description)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
};

/**
 * Add an all-day event for `dueDate` (YYYY-MM-DD or ISO string).
 *   iPhone app -> opens Apple Calendar's native "New Event" sheet, prefilled.
 *   Browser    -> opens an .ics file (Mac/iPhone Safari hand it to Apple Calendar).
 */
export async function addToCalendar({ title, description, dueDate }) {
  if (!title || !dueDate) return;
  const day = dueDate.slice(0, 10);

  if (Capacitor.isNativePlatform()) {
    const start = new Date(day + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    try {
      await CapacitorCalendar.createEventWithPrompt({
        title,
        description: description || undefined,
        isAllDay: true,
        startDate: start.getTime(),
        endDate: end.getTime(),
      });
    } catch (err) {
      console.error('Failed to open calendar:', err);
      alert('Could not open Calendar.');
    }
    return;
  }

  const ics = buildICS(title, description, day);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

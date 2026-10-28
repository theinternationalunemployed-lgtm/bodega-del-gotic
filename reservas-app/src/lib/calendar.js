import { addMinutes } from './time.js';

const PLACE = 'Bodega del Gòtic, Plaça de Correus 7, 08002 Barcelona';
const stamp = (date, hm) => `${date.replaceAll('-', '')}T${hm.replace(':', '')}00`;

/** Enlace a Google Calendar y archivo .ics (Apple, Outlook…) para una reserva. */
export function calendarLinks({ id, date, time, duration, tableLabel, party }) {
  const start = stamp(date, time);
  const end = stamp(date, addMinutes(time, duration));
  const title = 'Reserva en Bodega del Gòtic';
  const details = `Mesa ${tableLabel} · ${party} personas · Tel. +34 935 00 37 69`;

  const google = 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
    action: 'TEMPLATE', text: title, dates: `${start}/${end}`, ctz: 'Europe/Madrid', location: PLACE, details,
  });

  const esc = (s) => s.replace(/([,;\\])/g, '\\$1');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bodega del Gotic//Reservas//ES', 'BEGIN:VEVENT',
    `UID:${id}@bodegadelgtic.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;TZID=Europe/Madrid:${start}`,
    `DTEND;TZID=Europe/Madrid:${end}`,
    `SUMMARY:${esc(title)}`, `LOCATION:${esc(PLACE)}`, `DESCRIPTION:${esc(details)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');

  return { google, icsUrl: URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })) };
}

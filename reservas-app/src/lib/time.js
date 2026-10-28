// Fechas y horas siempre en hora de Barcelona, aunque el visitante (turista) tenga otra zona horaria.
// Las fechas viajan como 'YYYY-MM-DD' y las horas como 'HH:MM'; la conversión a instante la hace Postgres.
const TZ = 'Europe/Madrid';

const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

/** Fecha y hora de Barcelona de un instante: { date: '2026-11-03', time: '21:00' } */
export function madridNow(d = new Date()) {
  const p = Object.fromEntries(parts.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

const toMin = (hm) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
const fromMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export const addMinutes = (hm, mins) => fromMin(toMin(hm) + mins);

export function addDays(date, days) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Franjas reservables de un día: desde la apertura, cada slot_minutes, mientras la mesa
 * quepa entera antes del cierre; hoy, solo las que aún no han pasado.
 * hours: filas de opening_hours ({ weekday, opens: '09:00:00', closes: '23:30:00' }).
 */
export function slotsFor(date, hours, { slot_minutes, duration_minutes }, now = madridNow()) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const h = hours.find((r) => r.weekday === weekday);
  if (!h) return [];
  const out = [];
  for (let m = toMin(h.opens); m + duration_minutes <= toMin(h.closes); m += slot_minutes) {
    const hm = fromMin(m);
    if (date > now.date || (date === now.date && hm > now.time)) out.push(hm);
  }
  return out;
}

/** Fecha legible en castellano: "Martes, 3 de noviembre" */
export function longDate(date) {
  const s = new Date(`${date}T12:00:00Z`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  return s[0].toUpperCase() + s.slice(1);
}

import { useMemo } from 'react';
import { calendarLinks } from '../../lib/calendar';
import { addMinutes, longDate } from '../../lib/time';
import { btnGhost, btnPrimary } from '../ui';

/** Paso 5: resumen y añadir al calendario */
export default function StepDone({ booking, table, result, duration, onRestart }) {
  const cal = useMemo(() => calendarLinks({
    id: result.id, date: booking.date, time: booking.time, duration, tableLabel: table.label, party: booking.party,
  }), [result.id, booking, table.label, duration]);

  return (
    <div className="space-y-4">
      <h2 className="font-titulos text-3xl text-vino">¡Reserva confirmada, {result.name}!</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 rounded-lg bg-white p-4">
        <dt className="font-bold">Día</dt><dd>{longDate(booking.date)}</dd>
        <dt className="font-bold">Hora</dt><dd>{booking.time} – {addMinutes(booking.time, duration)}</dd>
        <dt className="font-bold">Mesa</dt><dd>{table.label}</dd>
        <dt className="font-bold">Personas</dt><dd>{booking.party}</dd>
        <dt className="font-bold">Dónde</dt><dd>Plaça de Correus, 7 · Barcelona</dd>
      </dl>
      <p>Si no podéis venir, avísanos al <a className="underline" href="tel:+34935003769">+34 935 00 37 69</a>.</p>
      <div className="flex flex-wrap gap-3">
        <a className={btnPrimary} href={cal.google} target="_blank" rel="noopener">Añadir a Google Calendar</a>
        <a className={btnGhost} href={cal.icsUrl} download="reserva-bodega-del-gotic.ics">Descargar .ics (Apple, Outlook)</a>
      </div>
      <button type="button" className="underline" onClick={onRestart}>Hacer otra reserva</button>
    </div>
  );
}

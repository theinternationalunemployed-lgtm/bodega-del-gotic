import { madridNow, addDays, slotsFor } from '../../lib/time';
import { btn, btnPrimary, input } from '../ui';

const MAX_PARTY = 8;

/** Paso 1: fecha, franja horaria y número de comensales */
export default function StepWhen({ floor, booking, update, onNext }) {
  const today = madridNow().date;
  const slots = booking.date ? slotsFor(booking.date, floor.hours, floor.settings) : [];

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block font-bold">Fecha
          <input type="date" required className={input} value={booking.date}
            min={today} max={addDays(today, floor.settings.max_days_ahead)}
            onChange={(e) => update({ date: e.target.value, time: '', tableId: null })} />
        </label>
        <label className="block font-bold">Comensales
          <select className={input} value={booking.party}
            onChange={(e) => update({ party: Number(e.target.value), tableId: null })}>
            {Array.from({ length: MAX_PARTY }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'personas'}</option>
            ))}
          </select>
        </label>
      </div>

      {booking.date && (
        <fieldset>
          <legend className="mb-2 font-bold">Hora</legend>
          {slots.length === 0
            ? <p>No hay horas disponibles ese día (los domingos cerramos).</p>
            : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {slots.map((s) => (
                  <button key={s} type="button" aria-pressed={booking.time === s}
                    onClick={() => update({ time: s, tableId: null })}
                    className={`${btn} px-2 ${booking.time === s ? 'bg-vino text-crema' : 'border border-madera/40 bg-white hover:border-vino'}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
        </fieldset>
      )}

      <p className="text-sm">¿Sois más de {MAX_PARTY}? Llámanos al <a className="underline" href="tel:+34935003769">+34 935 00 37 69</a>.</p>
      <button type="submit" className={btnPrimary} disabled={!booking.date || !booking.time}>Ver mesas libres</button>
    </form>
  );
}

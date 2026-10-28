import { useEffect, useState } from 'react';
import FloorPlan from '../FloorPlan';
import { useBusyTables } from '../../lib/data';
import { longDate } from '../../lib/time';
import { Alert, btnGhost, btnPrimary } from '../ui';

/** Pasos 2 y 3: plano con la disponibilidad de esa franja y selección de mesa */
export default function StepTable({ floor, booking, update, notice, onBack, onNext }) {
  const { busy, error } = useBusyTables(booking.date, booking.time);
  const [lost, setLost] = useState('');

  // Si otra persona reserva la mesa elegida mientras miramos el plano, se avisa y se deselecciona
  useEffect(() => {
    if (busy && booking.tableId && busy.has(booking.tableId)) {
      update({ tableId: null });
      setLost('Alguien acaba de reservar la mesa que habías elegido. Elige otra, por favor.');
    }
  }, [busy, booking.tableId, update]);

  const statusOf = (t) =>
    busy?.has(t.id) ? 'busy'
      : t.seats < booking.party ? 'unfit'
        : t.id === booking.tableId ? 'selected' : 'available';

  const free = busy ? floor.tables.filter((t) => statusOf(t) === 'available' || statusOf(t) === 'selected').length : null;

  return (
    <div className="space-y-4">
      <p>
        <strong>{longDate(booking.date)}</strong> a las <strong>{booking.time}</strong> ·{' '}
        {booking.party} {booking.party === 1 ? 'persona' : 'personas'}
      </p>
      <Alert>{notice || lost}</Alert>
      <Alert>{error && 'No se pudo comprobar la disponibilidad. Inténtalo de nuevo o llámanos.'}</Alert>

      {!busy && !error && <p>Comprobando mesas libres…</p>}
      {busy && (
        <>
          <p aria-live="polite">
            {free ? 'Pulsa una mesa verde para elegirla.' : 'No quedan mesas para tu grupo a esa hora. Prueba otra hora.'}
          </p>
          <FloorPlan zones={floor.zones} tables={floor.tables} statusOf={statusOf}
            onSelect={(t) => { setLost(''); update({ tableId: t.id === booking.tableId ? null : t.id }); }} />
        </>
      )}

      <div className="flex gap-3">
        <button type="button" className={btnGhost} onClick={onBack}>Atrás</button>
        <button type="button" className={btnPrimary} disabled={!booking.tableId} onClick={onNext}>Continuar</button>
      </div>
    </div>
  );
}

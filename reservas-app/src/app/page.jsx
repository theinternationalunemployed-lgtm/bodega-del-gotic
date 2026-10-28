'use client';

import { useCallback, useState } from 'react';
import { useFloor } from '../lib/data';
import { Alert, Stepper } from '../components/ui';
import StepWhen from '../components/booking/StepWhen';
import StepTable from '../components/booking/StepTable';
import StepDetails from '../components/booking/StepDetails';
import StepDone from '../components/booking/StepDone';

const STEPS = ['Cuándo', 'Mesa', 'Tus datos', 'Confirmada'];
const EMPTY = { date: '', time: '', party: 2, tableId: null };

export default function ReservarPage() {
  const { floor, error } = useFloor();
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState(EMPTY);
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState(null);
  const update = useCallback((patch) => setBooking((b) => ({ ...b, ...patch })), []);
  const table = floor?.tables.find((t) => t.id === booking.tableId);
  const go = (n) => { setNotice(''); setStep(n); };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <a href="../" className="text-sm underline">← Bodega del Gòtic</a>
      <h1 className="mt-2 font-titulos text-4xl text-vino">Reservar mesa</h1>
      <Stepper steps={STEPS} current={step} />

      <Alert>{error && 'No se pudieron cargar las reservas. Llámanos al +34 935 00 37 69.'}</Alert>
      {!floor && !error && <p>Cargando…</p>}

      {floor && step === 0 && <StepWhen floor={floor} booking={booking} update={update} onNext={() => go(1)} />}
      {floor && step === 1 && (
        <StepTable floor={floor} booking={booking} update={update} notice={notice}
          onBack={() => go(0)} onNext={() => go(2)} />
      )}
      {floor && step === 2 && table && (
        <StepDetails booking={booking} table={table} onBack={() => go(1)}
          onTaken={() => {
            // Otra persona confirmó esa mesa antes: la base de datos rechazó la segunda reserva
            update({ tableId: null });
            setStep(1);
            setNotice('Lo sentimos, esa mesa se acaba de reservar. Elige otra.');
          }}
          onDone={(r) => { setResult(r); go(3); }} />
      )}
      {floor && step === 3 && result && (
        <StepDone booking={booking} table={table} result={result} duration={floor.settings.duration_minutes}
          onRestart={() => { setBooking(EMPTY); setResult(null); go(0); }} />
      )}
    </main>
  );
}

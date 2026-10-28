'use client';

import { useCallback, useEffect, useState } from 'react';
import FloorPlan from '../../components/FloorPlan';
import { Alert, btnGhost, btnPrimary, input } from '../../components/ui';
import { ACTIVE, subscribeReservations, supabase, useFloor } from '../../lib/data';
import { madridNow } from '../../lib/time';

const STATUS_LABEL = {
  confirmed: 'Confirmada', seated: 'Ha llegado', walk_in: 'Sin reserva',
  completed: 'Terminada', cancelled: 'Cancelada', no_show: 'No vino',
};

// Las cuentas del personal se crean en Supabase (Authentication → Users) y se añaden a la tabla staff
export default function AdminPage() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-titulos text-3xl text-vino">Panel de reservas</h1>
      {session === undefined ? <p>Cargando…</p> : session ? <Dashboard /> : <Login />}
    </main>
  );
}

function Login() {
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({ email: f.get('email'), password: f.get('password') });
    setError(error ? 'Email o contraseña incorrectos.' : '');
  }
  return (
    <form onSubmit={submit} className="mt-6 max-w-sm space-y-4">
      <label className="block font-bold">Email<input name="email" type="email" required autoComplete="username" className={input} /></label>
      <label className="block font-bold">Contraseña<input name="password" type="password" required autoComplete="current-password" className={input} /></label>
      <Alert>{error}</Alert>
      <button className={btnPrimary}>Entrar</button>
    </form>
  );
}

// Hora de Barcelona de un instante; si cae en otro día posterior, cuenta como fin de día
function localHM(iso, date) {
  const t = madridNow(new Date(iso));
  return t.date > date ? '24:00' : t.time;
}

function Dashboard() {
  const { floor, error: floorError } = useFloor();
  const now = madridNow();
  const [date, setDate] = useState(now.date);
  const [time, setTime] = useState(now.time);
  const [rows, setRows] = useState([]);
  const [tableFilter, setTableFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() =>
    supabase.rpc('day_reservations', { p_date: date }).then(({ data, error }) => {
      if (error) setError(`No se pudieron cargar las reservas: ${error.message}`);
      else setRows(data);
    }), [date]);
  useEffect(() => { load(); return subscribeReservations(load); }, [load]);

  // Reserva activa de una mesa a la hora elegida
  const activeAt = (tableId) => rows.find((r) => r.table_id === tableId && ACTIVE.includes(r.status)
    && localHM(r.starts_at, date) <= time && time < localHM(r.ends_at, date));

  const statusOf = (t) => (t.id === selected?.id ? 'selected' : activeAt(t.id) ? 'busy' : 'available');

  async function run(query, conflictMsg) {
    setError('');
    const { error } = await query;
    if (error) setError(error.code === '23P01' ? conflictMsg : error.message);
    else { setSelected(null); load(); }
  }

  const setStatus = (id, status) =>
    run(supabase.from('reservations').update({ status }).eq('id', id), 'Ese cambio choca con otra reserva de la misma mesa.');

  // Cliente sin reserva: ocupa la mesa desde ahora durante la duración estándar
  const walkIn = (t) => {
    const start = new Date();
    const end = new Date(start.getTime() + floor.settings.duration_minutes * 60_000);
    run(supabase.from('reservations').insert({
      table_id: t.id, starts_at: start.toISOString(), ends_at: end.toISOString(), party_size: t.seats, status: 'walk_in',
    }), `La mesa ${t.label} tiene una reserva en los próximos ${floor.settings.duration_minutes} minutos.`);
  };

  if (floorError) return <Alert>{floorError.message}</Alert>;
  if (!floor) return <p>Cargando…</p>;

  const current = selected && activeAt(selected.id);
  const isNow = date === now.date;
  const shown = tableFilter ? rows.filter((r) => String(r.table_id) === tableFilter) : rows;

  return (
    <div className="mt-4 space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="font-bold">Día<input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="font-bold">Hora del plano<input type="time" step="900" className={input} value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <button type="button" className={btnGhost} onClick={() => { const n = madridNow(); setDate(n.date); setTime(n.time); }}>Ahora</button>
        <button type="button" className="ml-auto underline" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </div>
      <Alert>{error}</Alert>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <FloorPlan zones={floor.zones} tables={floor.tables} statusOf={statusOf}
          clickable={['available', 'busy', 'selected']}
          onSelect={(t) => setSelected(t.id === selected?.id ? null : t)} />

        <aside className="rounded-lg bg-white p-4" aria-live="polite">
          {!selected && <p>Pulsa una mesa para gestionarla.</p>}
          {selected && (
            <div className="space-y-3">
              <h2 className="font-titulos text-2xl">Mesa {selected.label} · {selected.seats} p.</h2>
              {current ? (
                <>
                  <p>
                    {STATUS_LABEL[current.status]} · {localHM(current.starts_at, date)}–{localHM(current.ends_at, date)}<br />
                    {current.name ?? 'Sin nombre'} {current.phone && `· ${current.phone}`}
                  </p>
                  {current.notes && <p className="rounded bg-amber-100 p-2">⚠ {current.notes}</p>}
                  {current.status === 'confirmed' && (
                    <button type="button" className={btnPrimary} onClick={() => setStatus(current.id, 'seated')}>Han llegado</button>
                  )}
                  <button type="button" className={btnGhost} onClick={() => setStatus(current.id, 'completed')}>Liberar mesa</button>
                </>
              ) : (
                <>
                  <p>Libre a las {time}.</p>
                  {isNow
                    ? <button type="button" className={btnPrimary} onClick={() => walkIn(selected)}>Marcar ocupada (sin reserva)</button>
                    : <p className="text-sm">Solo se puede ocupar manualmente en el día de hoy.</p>}
                </>
              )}
            </div>
          )}
        </aside>
      </div>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-titulos text-2xl">Reservas del día ({shown.length})</h2>
          <label className="font-bold">Mesa
            <select className={input} value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
              <option value="">Todas</option>
              {floor.tables.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] bg-white text-left text-sm">
            <thead className="bg-vino text-crema">
              <tr>{['Hora', 'Mesa', 'Pers.', 'Nombre', 'Teléfono', 'Comentarios', 'Estado'].map((h) => <th key={h} scope="col" className="p-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={`border-b border-madera/20 ${ACTIVE.includes(r.status) ? '' : 'text-madera/50'}`}>
                  <td className="p-2">{localHM(r.starts_at, date)}</td>
                  <td className="p-2 font-bold">{r.table_label}</td>
                  <td className="p-2">{r.party_size}</td>
                  <td className="p-2">{r.name ?? '—'}</td>
                  <td className="p-2">{r.phone ? <a className="underline" href={`tel:${r.phone.replaceAll(' ', '')}`}>{r.phone}</a> : '—'}</td>
                  <td className="p-2">{r.notes}</td>
                  <td className="p-2">
                    <select aria-label={`Estado de la reserva de ${r.name ?? r.table_label}`} value={r.status}
                      onChange={(e) => setStatus(r.id, e.target.value)} className="rounded border border-madera/40 p-1">
                      {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={7} className="p-4 text-center">No hay reservas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

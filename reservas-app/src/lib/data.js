import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// La clave "anon" es pública por diseño: la seguridad la ponen las políticas RLS de supabase/schema.sql
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const ACTIVE = ['confirmed', 'seated', 'walk_in'];

/** Llama a cb cada vez que cambia cualquier reserva (Supabase Realtime). Devuelve la función para dejar de escuchar. */
export function subscribeReservations(cb) {
  const channel = supabase
    .channel(`reservas-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, cb)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/** Plano, horario y ajustes: se cargan una vez. */
export function useFloor() {
  const [state, setState] = useState({ floor: null, error: null });
  useEffect(() => {
    Promise.all([
      supabase.from('zones').select('*').order('id'),
      supabase.from('tables').select('*').eq('active', true).order('label'),
      supabase.from('opening_hours').select('*'),
      supabase.from('settings').select('*').single(),
    ]).then(([zones, tables, hours, settings]) => {
      const error = [zones, tables, hours, settings].find((r) => r.error)?.error;
      setState(error
        ? { floor: null, error }
        : { floor: { zones: zones.data, tables: tables.data, hours: hours.data, settings: settings.data }, error: null });
    });
  }, []);
  return state;
}

/** Ids de las mesas ocupadas en esa fecha y franja; se actualiza en tiempo real. */
export function useBusyTables(date, time) {
  const [state, setState] = useState({ busy: null, error: null });
  useEffect(() => {
    if (!date || !time) return;
    let alive = true;
    const load = () =>
      supabase.rpc('busy_tables', { p_date: date, p_time: time }).then(({ data, error }) => {
        if (alive) setState(error ? { busy: null, error } : { busy: new Set(data.map((r) => r.table_id)), error: null });
      });
    load();
    const stop = subscribeReservations(load);
    return () => { alive = false; stop(); };
  }, [date, time]);
  return state;
}

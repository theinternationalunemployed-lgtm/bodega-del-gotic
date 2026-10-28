import { useState } from 'react';
import { supabase } from '../../lib/data';
import { longDate } from '../../lib/time';
import { Alert, btnGhost, btnPrimary, input } from '../ui';

// Códigos que lanza book_table() en supabase/schema.sql
const ERRORS = {
  INVALID_NAME: 'Escribe tu nombre.',
  INVALID_PHONE: 'Revisa el teléfono: solo números, con prefijo si no es español.',
  INVALID_EMAIL: 'Revisa el email.',
  INVALID_NOTES: 'Los comentarios no pueden pasar de 500 caracteres.',
  INVALID_SLOT: 'Esa hora ya no se puede reservar. Elige otra.',
  INVALID_TABLE: 'Esa mesa no sirve para tu grupo. Elige otra.',
  TOO_MANY: 'Ya tienes varias reservas a tu nombre. Llámanos para hacer otra.',
  PRIVACY_REQUIRED: 'Tienes que aceptar la política de privacidad.',
};

/** Paso 4: datos del cliente y envío de la reserva */
export default function StepDetails({ booking, table, onBack, onTaken, onDone }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '', privacy: false });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    setError('');
    const { data, error } = await supabase.rpc('book_table', {
      p_table_id: booking.tableId, p_date: booking.date, p_time: booking.time, p_party_size: booking.party,
      p_name: form.name, p_phone: form.phone, p_email: form.email, p_notes: form.notes, p_privacy: form.privacy,
    });
    setSending(false);
    if (!error) return onDone({ id: data, name: form.name.trim() });
    if (error.message.includes('TABLE_TAKEN')) return onTaken();
    const known = Object.keys(ERRORS).find((k) => error.message.includes(k));
    setError(known ? ERRORS[known] : 'No se pudo completar la reserva. Llámanos al +34 935 00 37 69.');
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p>Mesa <strong>{table.label}</strong> · {longDate(booking.date)} a las {booking.time} · {booking.party} pers.</p>
      <label className="block font-bold">Nombre
        <input className={input} required autoComplete="name" maxLength={100} value={form.name} onChange={set('name')} />
      </label>
      <label className="block font-bold">Teléfono
        <input className={input} required type="tel" autoComplete="tel" pattern="\+?[0-9 ]{9,20}"
          placeholder="+34 600 00 00 00" value={form.phone} onChange={set('phone')} />
      </label>
      <label className="block font-bold">Email <span className="font-normal">(opcional)</span>
        <input className={input} type="email" autoComplete="email" value={form.email} onChange={set('email')} />
      </label>
      <label className="block font-bold">Comentarios o alergias <span className="font-normal">(opcional)</span>
        <textarea className={`${input} min-h-24 py-2`} maxLength={500} value={form.notes} onChange={set('notes')} />
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" required className="mt-1 size-5" checked={form.privacy} onChange={set('privacy')} />
        <span>
          Acepto la <a className="underline" href="../privacidad.html" target="_blank">política de privacidad</a> y,
          si indico alergias, que se usen solo para preparar mi visita.
        </span>
      </label>
      <Alert>{error}</Alert>
      <div className="flex gap-3">
        <button type="button" className={btnGhost} onClick={onBack}>Atrás</button>
        <button type="submit" className={btnPrimary} disabled={sending}>{sending ? 'Reservando…' : 'Confirmar reserva'}</button>
      </div>
    </form>
  );
}

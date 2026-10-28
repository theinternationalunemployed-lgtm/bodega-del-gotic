// Piezas pequeñas compartidas por el asistente de reserva y el panel

export const btn = 'inline-flex min-h-12 items-center justify-center rounded-md px-5 font-bold transition '
  + 'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-tinta disabled:cursor-not-allowed disabled:opacity-50';
export const btnPrimary = `${btn} bg-vino text-crema hover:bg-vino-osc`;
export const btnGhost = `${btn} border-2 border-vino text-vino hover:bg-vino hover:text-crema`;
export const input = 'mt-1 block w-full min-h-12 rounded-md border border-madera/40 bg-white px-3 '
  + 'focus-visible:outline-4 focus-visible:outline-tinta';

export function Alert({ children }) {
  return children ? <p role="alert" className="my-4 rounded-md border border-red-700 bg-red-50 p-3 text-red-900">{children}</p> : null;
}

export function Stepper({ steps, current }) {
  return (
    <ol className="my-6 flex gap-2 text-sm">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? 'step' : undefined}
          className={`flex-1 border-t-4 pt-1 ${i <= current ? 'border-vino font-bold text-vino' : 'border-madera/20 text-madera/60'}`}>
          <span className="sr-only">Paso {i + 1}: </span>{s}
        </li>
      ))}
    </ol>
  );
}

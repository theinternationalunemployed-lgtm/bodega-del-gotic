// Plano interactivo. Zonas y mesas vienen de la base de datos con coordenadas en un lienzo
// de 1000 × 600; aquí se pasan a porcentajes, así el plano escala a cualquier ancho.
// Cada mesa es un <button> real: se puede usar con teclado y lector de pantalla.

const PLAN_W = 1000;
const PLAN_H = 600;
const pct = (v, total) => `${(v / total) * 100}%`;
const box = ({ x, y, w, h }) => ({ left: pct(x, PLAN_W), top: pct(y, PLAN_H), width: pct(w, PLAN_W), height: pct(h, PLAN_H) });

const SHAPE = { round: 'rounded-full', square: 'rounded-lg', rect: 'rounded-lg' };

// El color nunca va solo: cada estado lleva también un símbolo (daltonismo)
export const STATUS = {
  available: { label: 'Disponible', icon: '', cls: 'bg-emerald-700 text-white hover:bg-emerald-800' },
  selected:  { label: 'Seleccionada', icon: '✓', cls: 'bg-amber-400 text-tinta ring-4 ring-amber-600 scale-110' },
  busy:      { label: 'Ocupada', icon: '✕', cls: 'bg-red-700 text-white opacity-80' },
  unfit:     { label: 'No cabe el grupo', icon: '–', cls: 'bg-stone-300 text-stone-600' },
};

/**
 * @param zones, tables  filas de la base de datos
 * @param statusOf       (table) => 'available' | 'selected' | 'busy' | 'unfit'
 * @param onSelect       (table) => void
 * @param clickable      estados en los que la mesa se puede pulsar
 */
export default function FloorPlan({ zones, tables, statusOf, onSelect, clickable = ['available', 'selected'] }) {
  return (
    <div>
      {/* En móvil el plano se desplaza en horizontal para que las mesas tengan tamaño de dedo */}
      <div className="overflow-x-auto rounded-xl border border-madera/20 bg-crema-2">
        <div className="relative min-w-[640px]" style={{ aspectRatio: `${PLAN_W} / ${PLAN_H}` }}>
          {zones.map((z) => (
            <section key={z.id} aria-label={z.name}
              className="absolute rounded-lg border-2 border-dashed border-madera/30 bg-white/40" style={box(z)}>
              <h3 className="m-1 font-titulos text-sm font-bold text-madera">{z.name}</h3>
            </section>
          ))}
          {tables.map((t) => {
            const status = statusOf(t);
            const s = STATUS[status];
            const enabled = clickable.includes(status);
            return (
              <button key={t.id} type="button" disabled={!enabled} onClick={() => onSelect(t)}
                aria-pressed={status === 'selected'}
                aria-label={`Mesa ${t.label}, ${t.seats} personas, ${s.label}`}
                className={`absolute flex flex-col items-center justify-center text-xs font-bold shadow transition
                  focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-tinta
                  disabled:cursor-not-allowed ${SHAPE[t.shape]} ${s.cls}`}
                style={box(t)}>
                <span>{t.label} {s.icon}</span>
                <span className="font-normal">{t.seats} p.</span>
              </button>
            );
          })}
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Leyenda">
        {Object.entries(STATUS).map(([k, s]) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className={`inline-flex size-5 items-center justify-center rounded text-xs ${s.cls}`}>{s.icon}</span>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

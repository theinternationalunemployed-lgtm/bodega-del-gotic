# Reservas con plano de mesas · Bodega del Gòtic

Next.js 15 (React 19) + Tailwind CSS 4 + Supabase (Postgres, Auth y Realtime).
Se exporta como **web estática**: se publica en GitHub Pages junto a la web, sin servidor Node.
Toda la lógica que importa (validar, evitar dobles reservas, permisos) vive en Postgres.

```
reservas-app/
├── supabase/schema.sql          tablas, seguridad RLS, funciones de reserva, datos de ejemplo
├── src/
│   ├── app/
│   │   ├── page.jsx             asistente de reserva (público)  → /reservas/
│   │   ├── admin/page.jsx       panel del personal               → /reservas/admin/
│   │   ├── layout.jsx, globals.css   (paleta de la web)
│   ├── components/
│   │   ├── FloorPlan.jsx        plano interactivo (zonas + mesas, estados, teclado)
│   │   ├── ui.jsx               botones, alertas, indicador de pasos
│   │   └── booking/             StepWhen · StepTable · StepDetails · StepDone
│   └── lib/
│       ├── data.js              cliente Supabase, hooks useFloor / useBusyTables, tiempo real
│       ├── time.js              franjas y hora de Barcelona (+ time.test.js)
│       └── calendar.js          Google Calendar y archivo .ics
```

## Pasos del asistente
1. **Cuándo**: fecha, franja y comensales. Las franjas salen del horario guardado en la base de datos.
2. **Mesa**: plano con la disponibilidad de esa franja, actualizada en tiempo real.
3. **Selección**: en el mismo plano. Al pulsar una mesa verde se pone amarilla con ✓.
4. **Tus datos**: nombre, teléfono, email, comentarios o alergias y aceptación de la privacidad.
5. **Confirmada**: resumen y botones para añadirla a Google Calendar o descargar el .ics.

Estados de mesa: 🟢 disponible · 🟡 seleccionada · 🔴 ocupada · gris = no cabe el grupo.
Cada estado lleva también un símbolo (✓ ✕ –), así no depende solo del color.

## Esquema de datos
| Tabla | Para qué | ¿Quién la lee? |
|---|---|---|
| `zones` | Salón, Barra, Terraza y su rectángulo en el plano | todos |
| `tables` | etiqueta, forma (`round`/`square`/`rect`), plazas (2/4/6/8), posición | todos |
| `opening_hours`, `settings` | horario, franja (30′), duración de mesa (90′), antelación (60 días) | todos |
| `reservations` | mesa, inicio, fin, personas, estado. **Sin datos personales.** | todos, para el tiempo real |
| `reservation_contacts` | nombre, teléfono, email, notas | solo el personal |
| `staff` | qué usuarios son personal | solo el propio usuario |

El público **no puede escribir** en ninguna tabla. Solo puede reservar llamando a `book_table()`, que valida todo en el servidor:
- consentimiento, nombre, teléfono, email y longitud de las notas;
- que la mesa exista y quepa el grupo;
- que la hora sea una franja exacta dentro del horario, futura y dentro de la antelación máxima;
- un máximo de 3 reservas futuras por teléfono.

## Concurrencia: dos personas, la misma mesa
1. **La base de datos manda.** `reservations` tiene una restricción de exclusión:
   ```sql
   exclude using gist (table_id with =, tstzrange(starts_at, ends_at) with &&)
     where (status in ('confirmed','seated','walk_in'))
   ```
   Postgres no deja que existan dos reservas activas que se solapen en la misma mesa. La comprobación es atómica: si dos personas confirman en el mismo milisegundo, una entra y la otra recibe `exclusion_violation`. `book_table()` la convierte en el error `TABLE_TAKEN`.
2. **La interfaz lo explica.** Con `TABLE_TAKEN`, el asistente vuelve al plano con el aviso "esa mesa se acaba de reservar" y la disponibilidad ya actualizada.
3. **El tiempo real evita la mayoría de choques.** Cada navegador escucha los cambios de `reservations` (Supabase Realtime) y vuelve a pedir la disponibilidad. Si te quitan la mesa que tenías seleccionada, se deselecciona sola y te avisa.
4. **El panel usa la misma regla.** Marcar una mesa como ocupada sin reserva inserta una reserva `walk_in`. Si choca con otra reserva próxima, la base de datos la rechaza y el panel lo dice.

No hay bloqueo temporal de la mesa mientras rellenas el formulario. Se podría añadir una tabla `holds` con caducidad de 5 minutos, pero con el punto 1 no hace falta para que sea correcto.

## Puesta en marcha
1. Crea un proyecto en [supabase.com](https://supabase.com) en una **región de la UE** (Frankfurt, París…).
2. En SQL Editor, pega y ejecuta `supabase/schema.sql`.
3. Personal:
   - En Authentication → Users → *Add user*, crea una cuenta por empleado (email y contraseña).
   - Después ejecuta `insert into staff values ('<id del usuario>');`.
   - En Authentication → Sign In / Providers, **desactiva "Allow new users to sign up"**.
4. Copia `.env.example` a `.env.local` y rellena la URL y la clave *anon*, que encontrarás en Project Settings → API.
5. Ejecuta en local:
   ```bash
   npm install && npm test && npm run dev
   ```
6. Publica dentro de la web:
   ```bash
   BASE_PATH=/reservas npm run build
   ```
   Copia la carpeta `out/` a `reservas/` en la raíz de la web.
   - Mientras la web esté en github.io, usa `BASE_PATH=/bodega-del-gotic/reservas`.
   - Después enlaza "Reservar mesa" desde la sección de contacto de la web.

## Pendiente
- Plano real: zonas, mesas, formas, plazas y posiciones. El de `schema.sql` es de **ejemplo**.
- Confirmar la franja, la duración de mesa, la antelación máxima y si se reserva desde la apertura (9:00) o solo para comidas y cenas.
- Plazo de conservación de los datos (política de privacidad) y quién los borra. Ahora mismo no se borra nada automáticamente.
- Si llega spam de reservas: añadir Cloudflare Turnstile delante de `book_table()`.

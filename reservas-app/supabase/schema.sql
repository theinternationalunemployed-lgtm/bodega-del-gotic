-- Bodega del Gòtic · reservas
-- Ejecutar entero en Supabase → SQL Editor. Crea tablas, reglas de seguridad (RLS),
-- funciones de reserva y datos de ejemplo.

create extension if not exists btree_gist;

-- ───────────── Tablas ─────────────

-- Plano: coordenadas en un lienzo de 1000 × 600 unidades (ver src/components/FloorPlan.jsx)
create table zones (
  id   smallint generated always as identity primary key,
  name text not null,
  x int not null, y int not null, w int not null, h int not null
);

create table tables (
  id      smallint generated always as identity primary key,
  zone_id smallint not null references zones on delete restrict,
  label   text not null unique,
  shape   text not null check (shape in ('round', 'square', 'rect')),
  seats   smallint not null check (seats in (2, 4, 6, 8)),
  x int not null, y int not null, w int not null, h int not null,
  active  boolean not null default true
);

-- weekday como extract(dow): 0 = domingo … 6 = sábado. Día sin fila = cerrado.
create table opening_hours (
  weekday smallint primary key check (weekday between 0 and 6),
  opens   time not null,
  closes  time not null check (closes > opens)
);

-- Una sola fila
create table settings (
  id               boolean primary key default true check (id),
  slot_minutes     smallint not null default 30,
  duration_minutes smallint not null default 90,
  max_days_ahead   smallint not null default 60
);

-- Sin datos personales: se puede leer en público y emitir en tiempo real
create table reservations (
  id         uuid primary key default gen_random_uuid(),
  table_id   smallint not null references tables on delete restrict,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  party_size smallint not null check (party_size between 1 and 8),
  status     text not null default 'confirmed'
             check (status in ('confirmed', 'seated', 'walk_in', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- CONCURRENCIA: la base de datos rechaza dos reservas activas que se solapen en la misma mesa,
  -- aunque lleguen en el mismo milisegundo. Ver README, «Concurrencia».
  constraint no_overlap exclude using gist (
    table_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('confirmed', 'seated', 'walk_in'))
);
create index on reservations (starts_at);

-- Datos personales aparte: solo los ve el personal
create table reservation_contacts (
  reservation_id      uuid primary key references reservations on delete cascade,
  name                text not null,
  phone               text not null,
  email               text,
  notes               text,
  privacy_accepted_at timestamptz not null
);

-- Usuarios de Supabase Auth que son personal del bar
create table staff (
  user_id uuid primary key references auth.users on delete cascade
);

-- ───────────── Seguridad (RLS) ─────────────

create function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid());
$$;

alter table zones                enable row level security;
alter table tables               enable row level security;
alter table opening_hours        enable row level security;
alter table settings             enable row level security;
alter table reservations         enable row level security;
alter table reservation_contacts enable row level security;
alter table staff                enable row level security;

create policy "lectura pública" on zones         for select using (true);
create policy "lectura pública" on tables        for select using (true);
create policy "lectura pública" on opening_hours for select using (true);
create policy "lectura pública" on settings      for select using (true);
create policy "lectura pública" on reservations  for select using (true);

create policy "personal" on zones                for all to authenticated using (is_staff()) with check (is_staff());
create policy "personal" on tables               for all to authenticated using (is_staff()) with check (is_staff());
create policy "personal" on opening_hours        for all to authenticated using (is_staff()) with check (is_staff());
create policy "personal" on settings             for all to authenticated using (is_staff()) with check (is_staff());
create policy "personal" on reservations         for all to authenticated using (is_staff()) with check (is_staff());
create policy "personal" on reservation_contacts for all to authenticated using (is_staff()) with check (is_staff());
create policy "cada uno se ve" on staff for select to authenticated using (user_id = auth.uid());

-- El público NO puede insertar en las tablas: solo reservar a través de book_table().

-- ───────────── Funciones ─────────────

-- Mesas ocupadas en la franja [hora, hora + duración) de un día, en hora de Barcelona
create function busy_tables(p_date date, p_time time) returns table (table_id smallint)
language sql stable security definer set search_path = public as $$
  with s as (
    select (p_date + p_time) at time zone 'Europe/Madrid' as t0,
           make_interval(mins => duration_minutes) as d
    from settings
  )
  select distinct r.table_id
  from reservations r, s
  where r.status in ('confirmed', 'seated', 'walk_in')
    and tstzrange(r.starts_at, r.ends_at) && tstzrange(s.t0, s.t0 + s.d);
$$;

-- Reserva pública. Valida todo en el servidor: el navegador no es de fiar.
create function book_table(
  p_table_id smallint, p_date date, p_time time, p_party_size smallint,
  p_name text, p_phone text, p_email text, p_notes text, p_privacy boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s settings;
  t tables;
  h opening_hours;
  v_min int := extract(epoch from p_time)::int / 60;
  v_start timestamptz := (p_date + p_time) at time zone 'Europe/Madrid';
  v_id uuid;
begin
  select * into s from settings;

  if not coalesce(p_privacy, false) then raise exception 'PRIVACY_REQUIRED'; end if;
  if length(trim(coalesce(p_name, ''))) not between 2 and 100 then raise exception 'INVALID_NAME'; end if;
  if coalesce(p_phone, '') !~ '^\+?[0-9 ]{9,20}$' then raise exception 'INVALID_PHONE'; end if;
  if coalesce(p_email, '') <> '' and p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
  if length(coalesce(p_notes, '')) > 500 then raise exception 'INVALID_NOTES'; end if;

  select * into t from tables where id = p_table_id and active;
  if not found or p_party_size is null or p_party_size < 1 or p_party_size > t.seats then
    raise exception 'INVALID_TABLE';
  end if;

  -- Dentro del horario, en una franja exacta y entre ahora y max_days_ahead
  select * into h from opening_hours where weekday = extract(dow from p_date);
  if not found
     or extract(epoch from p_time)::int % (s.slot_minutes * 60) <> 0
     or v_min < extract(epoch from h.opens)::int / 60
     or v_min + s.duration_minutes > extract(epoch from h.closes)::int / 60
     or v_start < now()
     or v_start > now() + make_interval(days => s.max_days_ahead) then
    raise exception 'INVALID_SLOT';
  end if;

  -- shortcut: límite anti-abuso simple (3 reservas futuras por teléfono); si llega spam, añadir CAPTCHA (README)
  if (select count(*) from reservations r join reservation_contacts c on c.reservation_id = r.id
      where c.phone = trim(p_phone) and r.status = 'confirmed' and r.starts_at > now()) >= 3 then
    raise exception 'TOO_MANY';
  end if;

  insert into reservations (table_id, starts_at, ends_at, party_size)
  values (p_table_id, v_start, v_start + make_interval(mins => s.duration_minutes), p_party_size)
  returning id into v_id;

  insert into reservation_contacts (reservation_id, name, phone, email, notes, privacy_accepted_at)
  values (v_id, trim(p_name), trim(p_phone), nullif(trim(p_email), ''), nullif(trim(p_notes), ''), now());

  return v_id;
exception
  when exclusion_violation then raise exception 'TABLE_TAKEN';
end;
$$;

-- Reservas de un día con datos de contacto (solo personal: RLS oculta los contactos al resto)
create function day_reservations(p_date date) returns table (
  id uuid, table_id smallint, table_label text, starts_at timestamptz, ends_at timestamptz,
  party_size smallint, status text, name text, phone text, email text, notes text
)
language sql stable security invoker set search_path = public as $$
  select r.id, r.table_id, t.label, r.starts_at, r.ends_at, r.party_size, r.status,
         c.name, c.phone, c.email, c.notes
  from reservations r
  join tables t on t.id = r.table_id
  left join reservation_contacts c on c.reservation_id = r.id
  where r.starts_at >= p_date::timestamp at time zone 'Europe/Madrid'
    and r.starts_at < (p_date + 1)::timestamp at time zone 'Europe/Madrid'
  order by r.starts_at, t.label;
$$;

revoke execute on function book_table, busy_tables, day_reservations from public;
grant execute on function book_table, busy_tables to anon, authenticated;
grant execute on function day_reservations to authenticated;

-- Tiempo real: avisa a los navegadores cuando cambia una reserva
alter publication supabase_realtime add table reservations;

-- ───────────── Datos ─────────────

-- Horario real del local
insert into opening_hours (weekday, opens, closes) values
  (1, '09:00', '23:30'), (2, '09:00', '23:30'), (3, '09:00', '23:30'),
  (4, '09:00', '23:30'), (5, '09:00', '23:30'), (6, '10:00', '23:30');

-- PENDIENTE: confirmar con el local franja (30 min), duración de mesa (90 min) y antelación máxima (60 días)
insert into settings default values;

-- PENDIENTE: plano de EJEMPLO. Sustituir por las zonas y mesas reales del local.
insert into zones (name, x, y, w, h) values
  ('Salón principal', 20, 20, 600, 560),
  ('Barra',          640, 20, 340, 200),
  ('Terraza',        640, 240, 340, 340);

insert into tables (zone_id, label, shape, seats, x, y, w, h) values
  (1, 'S1', 'round',  2,  60,  70,  70,  70),
  (1, 'S2', 'round',  2, 180,  70,  70,  70),
  (1, 'S3', 'square', 4, 300,  60,  90,  90),
  (1, 'S4', 'square', 4, 440,  60,  90,  90),
  (1, 'S5', 'rect',   6,  60, 230, 180,  90),
  (1, 'S6', 'rect',   6, 300, 230, 180,  90),
  (1, 'S7', 'rect',   8,  60, 410, 240, 100),
  (1, 'S8', 'square', 4, 360, 415,  90,  90),
  (1, 'S9', 'round',  2, 500, 425,  70,  70),
  (2, 'B1', 'round',  2, 670,  90,  60,  60),
  (2, 'B2', 'round',  2, 770,  90,  60,  60),
  (2, 'B3', 'round',  2, 870,  90,  60,  60),
  (3, 'T1', 'square', 4, 670, 300,  90,  90),
  (3, 'T2', 'square', 4, 830, 300,  90,  90),
  (3, 'T3', 'rect',   6, 680, 450, 220,  90);

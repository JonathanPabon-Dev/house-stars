-- Tablero de tareas: esquema base
-- Convención de días: 0 = lunes ... 6 = domingo (igual que el prototipo).
--
-- El proyecto de Supabase es COMPARTIDO con otras aplicaciones: todos los objetos
-- de House Stars viven en el esquema house_stars. No se crea nada en public ni se
-- modifica ningún objeto de otros esquemas.

create schema if not exists house_stars;

-- PostgREST necesita USAGE en el esquema. anon se queda fuera a propósito.
grant usage on schema house_stars to authenticated, service_role;

create type house_stars.member_role as enum ('admin', 'member');

-- Una familia (o grupo) comparte un tablero.
create table house_stars.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);

-- Personas del tablero. Pueden tener login (user_id) o no (p. ej. un niño pequeño
-- cuyas tareas marca un adulto).
create table house_stars.members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references house_stars.households(id) on delete cascade,
  user_id      uuid unique references auth.users(id) on delete set null,
  username     text unique,
  name         text not null check (char_length(name) between 1 and 40),
  emoji        text not null default '🙂',
  color        text not null default '#3D6FD8' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  role         house_stars.member_role not null default 'member',
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  unique (id, household_id),
  check (username is null or username ~ '^[a-z0-9_]{3,20}$'),
  check (user_id is null or username is not null)
);
create index members_household_idx on house_stars.members (household_id);

-- Tareas recurrentes semanales asignadas a una persona.
create table house_stars.tasks (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references house_stars.households(id) on delete cascade,
  member_id    uuid not null,
  title        text not null check (char_length(title) between 1 and 80),
  emoji        text not null default '⭐',
  weekdays     smallint[] not null default '{0,1,2,3,4,5,6}',
  points       smallint not null default 1 check (points between 0 and 100),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (id, household_id),
  foreign key (member_id, household_id)
    references house_stars.members (id, household_id) on delete cascade,
  check (
    cardinality(weekdays) between 1 and 7
    and weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
  )
);
create index tasks_household_idx on house_stars.tasks (household_id);
create index tasks_member_idx on house_stars.tasks (member_id);

-- Una fila por tarea cumplida en una fecha. Si no hay fila, está pendiente.
create table house_stars.task_completions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  task_id      uuid not null,
  done_on      date not null,
  completed_by uuid references house_stars.members(id) on delete set null,
  completed_at timestamptz not null default now(),
  foreign key (task_id, household_id)
    references house_stars.tasks (id, household_id) on delete cascade,
  unique (task_id, done_on)
);
create index task_completions_household_date_idx
  on house_stars.task_completions (household_id, done_on);

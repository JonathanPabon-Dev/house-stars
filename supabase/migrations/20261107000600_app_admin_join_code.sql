-- Un solo administrador para toda la aplicación + código para unirse a una familia.
--
--  * admin: superusuario único de la app. Solo existe uno (el primero que creó familia).
--    Es el único que crea cuentas con usuario y contraseña para otras personas.
--  * adult: cuenta normal con acceso. Agrega acogidos sin cuenta y administra sus tareas.
--  * child: cuenta normal, con o sin contraseña. Solo marca sus tareas.
--
-- Cada familia tiene un código corto único para que sus miembros se unan a ella en
-- lugar de crear una familia nueva.

-- 1) Código de familia: 8 caracteres sin ambigüedades (sin 0, 1, I ni O).
create or replace function house_stars.new_join_code()
returns text language sql volatile set search_path = '' as $$
  select string_agg(
    substr(
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
      (get_byte(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), g) % 32) + 1,
      1
    ),
    '' order by g
  )
  from generate_series(0, 7) as g
$$;

alter table house_stars.households
  add column join_code text not null default house_stars.new_join_code();

alter table house_stars.households
  add constraint households_join_code_key unique (join_code);

alter table house_stars.households
  add constraint households_join_code_format check (join_code ~ '^[A-HJ-NP-Z2-9]{8}$');

-- El código es un secreto de la familia: no se expone en el SELECT normal de la tabla.
-- Se entrega solo a admin/adultos mediante household_join_code().
revoke select on house_stars.households from authenticated;
grant select (id, name, created_at) on house_stars.households to authenticated;

create or replace function house_stars.household_join_code()
returns text language sql stable security definer set search_path = '' as $$
  select h.join_code
  from house_stars.households h
  where h.id = (select house_stars.current_household_id())
    and (select house_stars.is_household_adult())
$$;

revoke all on function house_stars.household_join_code() from public, anon;
grant execute on function house_stars.household_join_code() to authenticated;

-- 2) Un único admin en toda la aplicación.
create unique index members_single_admin
  on house_stars.members (role)
  where role = 'admin';

-- 3) Registro: la primera familia crea al admin; las siguientes personas son adultas
--    normales. Un alta con household_id (create-member o join-household) usa el rol
--    que fija el servidor: adult o child, nunca admin.
create or replace function house_stars.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hh    uuid;
  r     house_stars.member_role;
  uname text;
  dname text;
begin
  -- Guardia para el proyecto compartido: los registros de otras apps se ignoran.
  if coalesce(new.raw_app_meta_data ->> 'app', '') <> 'house-stars' then
    return new;
  end if;

  -- El alta puede venir en el INSERT o en el UPDATE que fija app_metadata.
  if exists (select 1 from house_stars.members where user_id = new.id) then
    return new;
  end if;

  uname := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  dname := coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), uname);
  hh    := nullif(new.raw_app_meta_data->>'household_id', '')::uuid;

  if hh is null then
    -- Registro propio: crea una familia nueva. Es admin solo si aún no existe ninguno;
    -- a partir de ahí, quien cree una familia es un adulto normal.
    insert into house_stars.households (name)
    values (coalesce(nullif(new.raw_user_meta_data->>'household_name', ''), 'Mi familia'))
    returning id into hh;

    if exists (select 1 from house_stars.members where role = 'admin') then
      r := 'adult';
    else
      r := 'admin';
    end if;
  else
    -- Cuenta creada por el servidor (admin o unión con código). Nunca se crea otro admin.
    r := (case
            when new.raw_app_meta_data->>'role' = 'adult' then 'adult'
            else 'child'
          end)::house_stars.member_role;
  end if;

  insert into house_stars.members (household_id, user_id, username, name, role)
  values (hh, new.id, uname, dname, r)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Tres roles: administrador, adulto y niño.
--
-- Antes "admin" significaba "adulto" y cualquier adulto podía crear cuentas. Ahora:
--  * admin: dueño de la familia. Es el único que crea cuentas con usuario y contraseña.
--  * adult: adulto con cuenta. Agrega personas sin cuenta (sus acogidos) y administra
--    sus propias tareas y las de sus acogidos.
--  * child: solo marca sus tareas.
--
-- Los valores existentes ('member') pasan a 'child'; no se pierde ningún dato.

-- 1) Enum nuevo. Postgres no permite quitar valores de un enum, así que se recrea
--    el tipo y se convierte la columna.
alter type house_stars.member_role rename to member_role_legacy;
create type house_stars.member_role as enum ('admin', 'adult', 'child');

alter table house_stars.members alter column role drop default;

alter table house_stars.members
  alter column role type house_stars.member_role
  using (case role::text when 'member' then 'child' else role::text end)::house_stars.member_role;

alter table house_stars.members alter column role set default 'child';

drop type house_stars.member_role_legacy;

-- 2) ¿Quién inicia sesión es adulto (administrador o adulto)?
--    Security definer para no depender de las políticas de members.
create or replace function house_stars.is_household_adult()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select m.role in ('admin', 'adult') from house_stars.members m where m.user_id = (select auth.uid())),
    false
  )
$$;

revoke all on function house_stars.is_household_adult() from public, anon;
grant execute on function house_stars.is_household_adult() to authenticated;

-- 3) Administrar tareas: administrador y adulto, sobre sí mismos y sus acogidos.
create or replace function house_stars.can_manage_member(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from house_stars.members me
    where me.user_id = (select auth.uid())
      and me.role in ('admin', 'adult')
      and (
        me.id = target
        or exists (
          select 1 from house_stars.member_guardians g
          where g.guardian_id = me.id and g.child_id = target
        )
      )
  )
$$;

-- 4) El trigger de registro: rol por defecto para cuentas creadas por el admin.
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
    -- Registro propio: crea una familia nueva y esta persona es admin.
    insert into house_stars.households (name)
    values (coalesce(nullif(new.raw_user_meta_data->>'household_name', ''), 'Mi familia'))
    returning id into hh;
    r := 'admin';
  else
    -- Cuenta creada por un admin desde el servidor. Nunca se crea otro admin.
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

-- 5) Personas: el administrador puede con todo; el adulto solo agrega personas
--    sin cuenta (sus acogidos) y como niño. Nunca crea cuentas desde la API.
create policy members_adult_insert on house_stars.members for insert to authenticated
  with check (
    household_id = (select house_stars.current_household_id())
    and (select house_stars.is_household_adult())
    and user_id is null
    and role = 'child'
  );

-- 6) Tutorías: el adulto solo puede vincularse a sí mismo como tutor de un niño
--    de su familia, y deshacer ese vínculo. El administrador conserva el control total.
create policy guardians_adult_insert on house_stars.member_guardians for insert to authenticated
  with check (
    household_id = (select house_stars.current_household_id())
    and (select house_stars.is_household_adult())
    and guardian_id = (select house_stars.current_member_id())
    and exists (
      select 1 from house_stars.members c
      where c.id = child_id
        and c.household_id = household_id
        and c.role = 'child'
    )
  );

create policy guardians_adult_delete on house_stars.member_guardians for delete to authenticated
  using (
    household_id = (select house_stars.current_household_id())
    and (select house_stars.is_household_adult())
    and guardian_id = (select house_stars.current_member_id())
  );

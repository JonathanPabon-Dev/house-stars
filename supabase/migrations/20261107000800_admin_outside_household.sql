-- El administrador es una cuenta de administración de la aplicación, sin familia.
--
--  * members.household_id pasa a ser opcional, pero SOLO para role = 'admin'.
--    El resto de roles sigue perteneciendo obligatoriamente a una familia.
--  * El administrador se crea con la service role (app_metadata.role = 'admin'):
--    no tiene familia, no aparece en la lista de personas de ninguna familia y no
--    se le asignan tareas. Su autoridad viene de is_app_admin(), no de un hogar.
--  * Quien crea una familia desde el registro público queda siempre como adult.
--    Ya no existe el "primer registro es admin": el admin se aprovisiona aparte.

-- 1) Ningún admin existente puede conservar una familia (el único admin actual,
--    tatan, pasa a adult y sigue siendo el creador de su familia).
update house_stars.members
   set role = 'adult'
 where role = 'admin' and household_id is not null;

-- 2) La familia es opcional solo para el admin; para los demás sigue siendo exigida.
alter table house_stars.members alter column household_id drop not null;

alter table house_stars.members
  add constraint members_admin_no_household check (
    (role = 'admin' and household_id is null)
    or (role <> 'admin' and household_id is not null)
  );

-- 3) Registro: el admin solo lo crea la service role; lo demás nunca crea admin.
--    Un alta con household_id (create-member o join-household) usa el rol que fija
--    el servidor: adult o child.
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

  -- Cuenta de administración de la aplicación: sin familia. Solo la service role
  -- puede escribir app_metadata, así que un registro público no llega aquí.
  if new.raw_app_meta_data->>'role' = 'admin' then
    insert into house_stars.members (household_id, user_id, username, name, role)
    values (null, new.id, uname, dname, 'admin')
    on conflict (user_id) do nothing;
    return new;
  end if;

  hh := nullif(new.raw_app_meta_data->>'household_id', '')::uuid;

  if hh is null then
    -- Registro propio: crea una familia nueva y esta persona es adult.
    insert into house_stars.households (name)
    values (coalesce(nullif(new.raw_user_meta_data->>'household_name', ''), 'Mi familia'))
    returning id into hh;
    r := 'adult';
  else
    -- Cuenta creada por el servidor: adult o child, nunca admin.
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

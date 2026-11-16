-- Al crearse un usuario de House Stars en auth.users se crea su fila en members.
--
-- El proyecto de Supabase es COMPARTIDO: el trigger de auth.users se dispara para
-- todos los registros (también los de otras apps). Por eso la primera comprobación
-- lo desactiva salvo que el usuario venga marcado con app = 'house-stars'.
-- Esa marca vive en raw_app_meta_data, que solo escribe el servidor (service role /
-- Edge Functions), nunca el cliente.
--
-- GoTrue no escribe app_metadata en el INSERT: crea el usuario y lo actualiza en una
-- sentencia aparte. Por eso el trigger escucha INSERT y UPDATE de raw_app_meta_data,
-- y la inserción en members es idempotente (user_id es único).
--
-- Login con usuario y contraseña: Supabase Auth usa email, así que la app convierte
-- el usuario en un email interno (p. ej. sofia -> sofia@tablero.local) al registrar
-- e iniciar sesión. El usuario real se guarda en members.username.
--
-- Seguridad:
--  * raw_user_meta_data lo puede escribir cualquiera al registrarse: solo se usa
--    para nombre, usuario y nombre de la familia.
--  * raw_app_meta_data solo lo escribe el servidor: ahí viene app y, cuando un
--    admin crea la cuenta de otra persona, household_id y role.

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
    -- Cuenta creada por un admin desde el servidor.
    r := coalesce(new.raw_app_meta_data->>'role', 'member')::house_stars.member_role;
  end if;

  insert into house_stars.members (household_id, user_id, username, name, role)
  values (hh, new.id, uname, dname, r)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- La función no se llama por API: solo la ejecuta el trigger.
revoke all on function house_stars.handle_new_user() from public, anon;

-- Nombre único para no pisar triggers de otras apps del proyecto compartido.
-- Nunca se borra "on_auth_user_created": puede pertenecer a otra aplicación.
drop trigger if exists house_stars_on_auth_user_created on auth.users;
create trigger house_stars_on_auth_user_created
  after insert or update of raw_app_meta_data on auth.users
  for each row execute function house_stars.handle_new_user();

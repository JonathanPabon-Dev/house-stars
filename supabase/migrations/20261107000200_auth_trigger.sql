-- Al crearse un usuario en auth.users se crea su fila en members.
--
-- Login con usuario y contraseña: Supabase Auth usa email, así que la app convierte
-- el usuario en un email interno (p. ej. sofia -> sofia@tablero.local) al registrar
-- e iniciar sesión. El usuario real se guarda en members.username.
--
-- Seguridad:
--  * raw_user_meta_data lo puede escribir cualquiera al registrarse: solo se usa
--    para nombre, usuario y nombre de la familia.
--  * raw_app_meta_data solo lo escribe el servidor (service role / Edge Function):
--    ahí viene household_id y role cuando un admin crea la cuenta de otra persona.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hh    uuid;
  r     public.member_role;
  uname text;
  dname text;
begin
  uname := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  dname := coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), uname);
  hh    := nullif(new.raw_app_meta_data->>'household_id', '')::uuid;

  if hh is null then
    -- Registro propio: crea una familia nueva y esta persona es admin.
    insert into public.households (name)
    values (coalesce(nullif(new.raw_user_meta_data->>'household_name', ''), 'Mi familia'))
    returning id into hh;
    r := 'admin';
  else
    -- Cuenta creada por un admin desde el servidor.
    r := coalesce(new.raw_app_meta_data->>'role', 'member')::public.member_role;
  end if;

  insert into public.members (household_id, user_id, username, name, role)
  values (hh, new.id, uname, dname, r);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

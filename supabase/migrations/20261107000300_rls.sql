-- Seguridad por fila (RLS). Cada persona solo ve y toca datos de su familia.
-- Reglas:
--  * Admin: administra personas y tareas, y marca/desmarca cualquier tarea.
--  * Member: ve toda su familia y solo marca/desmarca sus propias tareas.
--
-- Todo vive en el esquema house_stars. Los permisos se limitan a ese esquema:
-- este proyecto de Supabase es compartido y no se revoca nada en public.

-- Funciones auxiliares (security definer para no caer en recursión de RLS)
create or replace function house_stars.current_household_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select household_id from house_stars.members where user_id = (select auth.uid())
$$;

create or replace function house_stars.current_member_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from house_stars.members where user_id = (select auth.uid())
$$;

create or replace function house_stars.is_household_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select role = 'admin' from house_stars.members where user_id = (select auth.uid())),
    false)
$$;

revoke all on function house_stars.current_household_id() from public, anon;
revoke all on function house_stars.current_member_id()    from public, anon;
revoke all on function house_stars.is_household_admin()   from public, anon;
grant execute on function house_stars.current_household_id() to authenticated;
grant execute on function house_stars.current_member_id()    to authenticated;
grant execute on function house_stars.is_household_admin()   to authenticated;

-- Activar RLS
alter table house_stars.households       enable row level security;
alter table house_stars.members          enable row level security;
alter table house_stars.tasks            enable row level security;
alter table house_stars.task_completions enable row level security;

-- Permisos acotados al esquema house_stars. anon no recibe nada.
grant select, insert, update, delete on all tables in schema house_stars to authenticated;
grant all privileges on all tables in schema house_stars to service_role;

-- households
create policy households_select on house_stars.households for select to authenticated
  using (id = (select house_stars.current_household_id()));
create policy households_update on house_stars.households for update to authenticated
  using (id = (select house_stars.current_household_id()) and (select house_stars.is_household_admin()))
  with check (id = (select house_stars.current_household_id()));

-- members
create policy members_select on house_stars.members for select to authenticated
  using (household_id = (select house_stars.current_household_id()));
create policy members_admin_write on house_stars.members for all to authenticated
  using (household_id = (select house_stars.current_household_id()) and (select house_stars.is_household_admin()))
  with check (household_id = (select house_stars.current_household_id()) and (select house_stars.is_household_admin()));

-- tasks
create policy tasks_select on house_stars.tasks for select to authenticated
  using (household_id = (select house_stars.current_household_id()));
create policy tasks_admin_write on house_stars.tasks for all to authenticated
  using (household_id = (select house_stars.current_household_id()) and (select house_stars.is_household_admin()))
  with check (household_id = (select house_stars.current_household_id()) and (select house_stars.is_household_admin()));

-- task_completions
create policy completions_select on house_stars.task_completions for select to authenticated
  using (household_id = (select house_stars.current_household_id()));

create policy completions_insert on house_stars.task_completions for insert to authenticated
  with check (
    household_id = (select house_stars.current_household_id())
    and (
      (select house_stars.is_household_admin())
      or exists (
        select 1 from house_stars.tasks t
        where t.id = task_id and t.member_id = (select house_stars.current_member_id())
      )
    )
  );

create policy completions_delete on house_stars.task_completions for delete to authenticated
  using (
    household_id = (select house_stars.current_household_id())
    and (
      (select house_stars.is_household_admin())
      or exists (
        select 1 from house_stars.tasks t
        where t.id = task_id and t.member_id = (select house_stars.current_member_id())
      )
    )
  );

-- Tiempo real: un tablero abierto en la tablet se actualiza al marcar desde el celular.
-- La publicación la crea Supabase; solo se agrega la tabla si existe y aún no está.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'house_stars'
         and tablename = 'task_completions'
     )
  then
    execute 'alter publication supabase_realtime add table house_stars.task_completions';
  end if;
end;
$$;

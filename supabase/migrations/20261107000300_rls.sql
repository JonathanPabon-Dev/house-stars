-- Seguridad por fila (RLS). Cada persona solo ve y toca datos de su familia.
-- Reglas:
--  * Admin: administra personas y tareas, y marca/desmarca cualquier tarea.
--  * Member: ve toda su familia y solo marca/desmarca sus propias tareas.

-- Funciones auxiliares (security definer para no caer en recursión de RLS)
create or replace function public.current_household_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select household_id from public.members where user_id = (select auth.uid())
$$;

create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.members where user_id = (select auth.uid())
$$;

create or replace function public.is_household_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select role = 'admin' from public.members where user_id = (select auth.uid())),
    false)
$$;

revoke all on function public.current_household_id() from public, anon;
revoke all on function public.current_member_id()    from public, anon;
revoke all on function public.is_household_admin()   from public, anon;
grant execute on function public.current_household_id() to authenticated;
grant execute on function public.current_member_id()    to authenticated;
grant execute on function public.is_household_admin()   to authenticated;

-- Activar RLS
alter table public.households       enable row level security;
alter table public.members          enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_completions enable row level security;

revoke all on all tables in schema public from anon;

-- households
create policy households_select on public.households for select to authenticated
  using (id = (select public.current_household_id()));
create policy households_update on public.households for update to authenticated
  using (id = (select public.current_household_id()) and (select public.is_household_admin()))
  with check (id = (select public.current_household_id()));

-- members
create policy members_select on public.members for select to authenticated
  using (household_id = (select public.current_household_id()));
create policy members_admin_write on public.members for all to authenticated
  using (household_id = (select public.current_household_id()) and (select public.is_household_admin()))
  with check (household_id = (select public.current_household_id()) and (select public.is_household_admin()));

-- tasks
create policy tasks_select on public.tasks for select to authenticated
  using (household_id = (select public.current_household_id()));
create policy tasks_admin_write on public.tasks for all to authenticated
  using (household_id = (select public.current_household_id()) and (select public.is_household_admin()))
  with check (household_id = (select public.current_household_id()) and (select public.is_household_admin()));

-- task_completions
create policy completions_select on public.task_completions for select to authenticated
  using (household_id = (select public.current_household_id()));

create policy completions_insert on public.task_completions for insert to authenticated
  with check (
    household_id = (select public.current_household_id())
    and (
      (select public.is_household_admin())
      or exists (
        select 1 from public.tasks t
        where t.id = task_id and t.member_id = (select public.current_member_id())
      )
    )
  );

create policy completions_delete on public.task_completions for delete to authenticated
  using (
    household_id = (select public.current_household_id())
    and (
      (select public.is_household_admin())
      or exists (
        select 1 from public.tasks t
        where t.id = task_id and t.member_id = (select public.current_member_id())
      )
    )
  );

-- Tiempo real: un tablero abierto en la tablet se actualiza al marcar desde el celular
alter publication supabase_realtime add table public.task_completions;

-- Cada adulto administra sus propias tareas y las de sus hijos.
--
-- Cambio de criterio respecto a la migración 3:
--  * role = 'admin' pasa a significar "adulto": crea personas y vínculos.
--  * Las TAREAS ya no las administra cualquier admin de la familia, sino quien
--    es la persona dueña de la tarea o su tutor (padre/madre vinculado).

-- Relación tutor -> hijo (una persona puede tener varios tutores y viceversa)
create table public.member_guardians (
  household_id uuid not null,
  guardian_id  uuid not null,
  child_id     uuid not null,
  primary key (guardian_id, child_id),
  foreign key (guardian_id, household_id)
    references public.members (id, household_id) on delete cascade,
  foreign key (child_id, household_id)
    references public.members (id, household_id) on delete cascade,
  check (guardian_id <> child_id)
);
create index member_guardians_child_idx on public.member_guardians (child_id);
create index member_guardians_household_idx on public.member_guardians (household_id);

-- ¿La persona que inicia sesión puede administrar las tareas de "target"?
-- Sí si es un adulto (admin) y target es ella misma o uno de sus hijos.
create or replace function public.can_manage_member(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.members me
    where me.user_id = (select auth.uid())
      and me.role = 'admin'
      and (
        me.id = target
        or exists (
          select 1 from public.member_guardians g
          where g.guardian_id = me.id and g.child_id = target
        )
      )
  )
$$;

-- ¿Puede marcar/desmarcar esta tarea? Su dueño, o quien la administra.
create or replace function public.can_complete_task(p_task uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = p_task
      and (
        t.member_id = (select public.current_member_id())
        or public.can_manage_member(t.member_id)
      )
  )
$$;

revoke all on function public.can_manage_member(uuid)  from public, anon;
revoke all on function public.can_complete_task(uuid)  from public, anon;
grant execute on function public.can_manage_member(uuid)  to authenticated;
grant execute on function public.can_complete_task(uuid)  to authenticated;

-- RLS de member_guardians: todos ven los vínculos de su familia; solo admins los editan
alter table public.member_guardians enable row level security;
revoke all on public.member_guardians from anon;

create policy guardians_select on public.member_guardians for select to authenticated
  using (household_id = (select public.current_household_id()));
create policy guardians_admin_write on public.member_guardians for all to authenticated
  using (household_id = (select public.current_household_id()) and (select public.is_household_admin()))
  with check (household_id = (select public.current_household_id()) and (select public.is_household_admin()));

-- tasks: reemplaza la política "cualquier admin" por la de tutor
drop policy tasks_admin_write on public.tasks;

create policy tasks_insert on public.tasks for insert to authenticated
  with check (household_id = (select public.current_household_id())
              and public.can_manage_member(member_id));
create policy tasks_update on public.tasks for update to authenticated
  using (household_id = (select public.current_household_id())
         and public.can_manage_member(member_id))
  with check (household_id = (select public.current_household_id())
              and public.can_manage_member(member_id));
create policy tasks_delete on public.tasks for delete to authenticated
  using (household_id = (select public.current_household_id())
         and public.can_manage_member(member_id));

-- task_completions: marcar/desmarcar según la misma regla
drop policy completions_insert on public.task_completions;
drop policy completions_delete on public.task_completions;

create policy completions_insert on public.task_completions for insert to authenticated
  with check (household_id = (select public.current_household_id())
              and public.can_complete_task(task_id));
create policy completions_delete on public.task_completions for delete to authenticated
  using (household_id = (select public.current_household_id())
         and public.can_complete_task(task_id));

-- Ejemplo de uso (reemplaza los ids):
-- insert into public.member_guardians (household_id, guardian_id, child_id)
-- values ('<household>', '<id de mamá>', '<id de Sofía>'),
--        ('<household>', '<id de papá>', '<id de Mateo>');

-- El administrador único es un superusuario: acceso y permisos sobre TODAS las familias.
--
--  * is_app_admin(): true para la única cuenta con role = 'admin' (tatan).
--  * Las políticas de admin se abren a cualquier familia; las de adult/child siguen
--    limitadas a su propia familia y a sus acogidos.
--  * El cliente usa un selector de familia para que el admin elija qué tablero ve.

-- 1) ¿La persona que inició sesión es el administrador de toda la aplicación?
create or replace function house_stars.is_app_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from house_stars.members m
    where m.user_id = (select auth.uid())
      and m.role = 'admin'
  )
$$;

revoke all on function house_stars.is_app_admin() from public, anon;
grant execute on function house_stars.is_app_admin() to authenticated;

-- 2) El admin administra cualquier miembro; los adultos siguen limitados a sí mismos
--    y a sus acogidos.
create or replace function house_stars.can_manage_member(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select house_stars.is_app_admin()) or exists (
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

-- 3) Código de familia: el admin puede consultar el de cualquier familia; un
--    admin/adulto normal solo el de la suya. (Se conserva la versión sin argumentos
--    para no romper pestañas abiertas con el bundle anterior.)
create or replace function house_stars.household_join_code(p_household uuid)
returns text language sql stable security definer set search_path = '' as $$
  select h.join_code
  from house_stars.households h
  where h.id = p_household
    and (
      (select house_stars.is_app_admin())
      or (
        h.id = (select house_stars.current_household_id())
        and (select house_stars.is_household_adult())
      )
    )
$$;

revoke all on function house_stars.household_join_code(uuid) from public, anon;
grant execute on function house_stars.household_join_code(uuid) to authenticated;

-- 4) Políticas: admin = todas las familias; resto = solo la suya.

-- households
drop policy households_select on house_stars.households;
create policy households_select on house_stars.households for select to authenticated
  using (
    id = (select house_stars.current_household_id())
    or (select house_stars.is_app_admin())
  );

drop policy households_update on house_stars.households;
create policy households_update on house_stars.households for update to authenticated
  using ((select house_stars.is_app_admin()))
  with check ((select house_stars.is_app_admin()));

-- members
drop policy members_select on house_stars.members;
create policy members_select on house_stars.members for select to authenticated
  using (
    household_id = (select house_stars.current_household_id())
    or (select house_stars.is_app_admin())
  );

drop policy members_admin_write on house_stars.members;
create policy members_admin_write on house_stars.members for all to authenticated
  using ((select house_stars.is_app_admin()))
  with check ((select house_stars.is_app_admin()));

drop policy members_adult_insert on house_stars.members;
create policy members_adult_insert on house_stars.members for insert to authenticated
  with check (
    (
      household_id = (select house_stars.current_household_id())
      and (select house_stars.is_household_adult())
      and user_id is null
      and role = 'child'
    )
    or (select house_stars.is_app_admin())
  );

-- tasks
drop policy tasks_select on house_stars.tasks;
create policy tasks_select on house_stars.tasks for select to authenticated
  using (
    household_id = (select house_stars.current_household_id())
    or (select house_stars.is_app_admin())
  );

drop policy tasks_insert on house_stars.tasks;
create policy tasks_insert on house_stars.tasks for insert to authenticated
  with check (
    (
      household_id = (select house_stars.current_household_id())
      and house_stars.can_manage_member(member_id)
    )
    or (select house_stars.is_app_admin())
  );

drop policy tasks_update on house_stars.tasks;
create policy tasks_update on house_stars.tasks for update to authenticated
  using (
    (
      household_id = (select house_stars.current_household_id())
      and house_stars.can_manage_member(member_id)
    )
    or (select house_stars.is_app_admin())
  )
  with check (
    (
      household_id = (select house_stars.current_household_id())
      and house_stars.can_manage_member(member_id)
    )
    or (select house_stars.is_app_admin())
  );

drop policy tasks_delete on house_stars.tasks;
create policy tasks_delete on house_stars.tasks for delete to authenticated
  using (
    (
      household_id = (select house_stars.current_household_id())
      and house_stars.can_manage_member(member_id)
    )
    or (select house_stars.is_app_admin())
  );

-- task_completions
drop policy completions_select on house_stars.task_completions;
create policy completions_select on house_stars.task_completions for select to authenticated
  using (
    household_id = (select house_stars.current_household_id())
    or (select house_stars.is_app_admin())
  );

drop policy completions_insert on house_stars.task_completions;
create policy completions_insert on house_stars.task_completions for insert to authenticated
  with check (
    (
      household_id = (select house_stars.current_household_id())
      and house_stars.can_complete_task(task_id)
    )
    or (select house_stars.is_app_admin())
  );

drop policy completions_delete on house_stars.task_completions;
create policy completions_delete on house_stars.task_completions for delete to authenticated
  using (
    (
      household_id = (select house_stars.current_household_id())
      and house_stars.can_complete_task(task_id)
    )
    or (select house_stars.is_app_admin())
  );

-- member_guardians
drop policy guardians_select on house_stars.member_guardians;
create policy guardians_select on house_stars.member_guardians for select to authenticated
  using (
    household_id = (select house_stars.current_household_id())
    or (select house_stars.is_app_admin())
  );

drop policy guardians_admin_write on house_stars.member_guardians;
create policy guardians_admin_write on house_stars.member_guardians for all to authenticated
  using ((select house_stars.is_app_admin()))
  with check ((select house_stars.is_app_admin()));

notify pgrst, 'reload schema';

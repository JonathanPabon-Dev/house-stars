# TODO — House Stars

Última revisión: 2026-11-16
Estado base: `pnpm typecheck` pasa; no hay `TODO`/`FIXME` en `src` ni `supabase`.

## 1. Despliegue (bloqueante)

- [x] **Inicializar el repositorio git.** Repo público creado en `JonathanPabon-Dev/house-stars`, rama `main` y primer commit.
- [x] **Cambiar el workflow a lockfile congelado.** `.github/workflows/deploy.yml` ya usa `pnpm install --frozen-lockfile`.
- [x] **Configurar GitHub Pages.** Publicado con GitHub Actions en https://jonathanpabon-dev.github.io/house-stars/.
- [x] **Crear variables del repositorio.** `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configuradas; el sitio ya compila con la URL del proyecto `mwdnptylqsmzadfweqgy`.
- [x] **Crear `.env.local` en local** (ignorado por git) con las mismas variables para `pnpm dev`.
- [x] **Desplegar Supabase (proyecto compartido).** Esquema `house_stars` aplicado con `pnpm db:apply` (7 migraciones) y expuesto en la API; `create-member`, `join-household` y `signup-household` desplegadas con `--use-api`. Verificado de extremo a extremo: alta de familia, login, creación de miembros y aislamiento frente a usuarios de otras apps.
- [x] **Modelo de tres roles.** `admin` (superusuario único de la app: solo él crea cuentas), `adult` (agrega acogidos y administra sus tareas) y `child` (solo marca las suyas). Migraciones `20261107000600_app_admin_join_code.sql` y `20261107000700_app_admin_superuser.sql`; la UI muestra «Crear cuenta» solo al administrador y la Edge Function rechaza cualquier rol distinto de `adult`/`child`.
- [x] **Administrador superusuario.** `is_app_admin()` en RLS: el admin ve y administra todas las familias (miembros, tareas, cumplimiento, tutorías y códigos). Selector de familia activa en la cabecera; `create-member` crea la cuenta en la familia elegida.
- [x] **Código de familia.** Cada familia tiene un código único de 8 caracteres para que sus miembros se unan con una cuenta normal (`adult`) en lugar de crear otra familia. Visible solo para admin/adultos.
- **No cambiar los ajustes globales de Auth.** El proyecto es compartido con otras apps: deja "Confirm email" como está. Las cuentas se crean con `email_confirm: true` desde las Edge Functions.
- [x] **Publicar el frontend.** Push a `main` desplegado en GitHub Pages; el bundle servido incluye el esquema `house_stars` y `signup-household`.

## 2. Funcionalidad faltante

- [ ] **Editar tareas existentes.** Hoy `TaskDialog.tsx` solo crea y el borrado es lógico (`useRemoveTask` → `active = false`). Permitir editar título, emoji, días y responsable; agregar `useUpdateTask` en `src/lib/data.ts`.
- [ ] **Definir el sistema de puntos.** `tasks.points` existe en el esquema (`20261107000100_schema.sql:49`) y en `Task` (`src/lib/types.ts:22`), pero ninguna UI lo usa. Decidir: implementar puntaje/ranking por persona o eliminar la columna.
- [ ] **Editar y eliminar miembros.** `Family.tsx` solo crea personas y cuentas. Falta editar nombre, emoji, color y rol, y dar de baja miembros sin perder el historial de tareas.
- [ ] **Cambio de contraseña.** No hay flujo (el README documenta que no hay recuperación por correo). Definir si un adulto puede resetear la contraseña de otro miembro.
- [ ] **Orden de miembros.** `sort_order` nunca se asigna (todos quedan en 0). Definir un orden explícito o confiar en `created_at`.

## 3. Calidad

- [ ] **Tests.** No hay runner ni archivos de prueba. Agregar Vitest + Testing Library y cubrir permisos (`makePerms`), fechas (`src/lib/dates.ts`) y el toggle optimista (`useToggle`).
- [ ] **Lint.** No hay ESLint. Agregar configuración para React + TypeScript.
- [ ] **Revisar `dist/`.** Está ignorado por git y desactualizado respecto a `Family.tsx`; solo importa para `pnpm preview`.

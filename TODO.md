# TODO — House Stars

Última revisión: 2026-11-16
Estado base: `pnpm typecheck` pasa; no hay `TODO`/`FIXME` en `src` ni `supabase`.

## 1. Despliegue (bloqueante)

- [ ] **Inicializar el repositorio git.** La carpeta no es un repo, así que el workflow de GitHub Pages no puede ejecutarse. Hace falta `git init`, primer commit, remoto en GitHub y rama `main`.
- [ ] **Cambiar el workflow a lockfile congelado.** En `.github/workflows/deploy.yml:27`, reemplazar `pnpm install --no-frozen-lockfile` por `pnpm install --frozen-lockfile` (el `pnpm-lock.yaml` ya existe y debe commitearse).
- [ ] **Configurar GitHub Pages.** Settings → Pages → Source: GitHub Actions.
- [ ] **Crear variables del repositorio.** `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Settings → Secrets and variables → Actions → Variables.
- [ ] **Crear `.env.local` en local** (ignorado por git) con las mismas variables para `pnpm dev`.
- [ ] **Desplegar Supabase.** `supabase link`, `supabase db push` y `supabase functions deploy create-member`.
- [ ] **Desactivar "Confirm email"** en Supabase Auth (los usuarios usan un correo interno, no real).

## 2. Funcionalidad faltante

- [ ] **Editar tareas existentes.** Hoy `TaskDialog.tsx` solo crea y el borrado es lógico (`useRemoveTask` → `active = false`). Permitir editar título, emoji, días y responsable; agregar `useUpdateTask` en `src/lib/data.ts`.
- [ ] **Definir el sistema de puntos.** `tasks.points` existe en el esquema (`20261107000100_schema.sql:40`) y en `Task` (`src/lib/types.ts:22`), pero ninguna UI lo usa. Decidir: implementar puntaje/ranking por persona o eliminar la columna.
- [ ] **Editar y eliminar miembros.** `Family.tsx` solo crea personas y cuentas. Falta editar nombre, emoji, color y rol, y dar de baja miembros sin perder el historial de tareas.
- [ ] **Cambio de contraseña.** No hay flujo (el README documenta que no hay recuperación por correo). Definir si un adulto puede resetear la contraseña de otro miembro.
- [ ] **Orden de miembros.** `sort_order` nunca se asigna (todos quedan en 0). Definir un orden explícito o confiar en `created_at`.

## 3. Calidad

- [ ] **Tests.** No hay runner ni archivos de prueba. Agregar Vitest + Testing Library y cubrir permisos (`makePerms`), fechas (`src/lib/dates.ts`) y el toggle optimista (`useToggle`).
- [ ] **Lint.** No hay ESLint. Agregar configuración para React + TypeScript.
- [ ] **Revisar `dist/`.** Está ignorado por git y desactualizado respecto a `Family.tsx`; solo importa para `pnpm preview`.

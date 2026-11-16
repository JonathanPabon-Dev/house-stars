# ⭐ House Stars

Tablero familiar de tareas (vistas de día, semana y mes) con login por usuario y contraseña.
Interfaz en **español e inglés** (ES/EN) y tema **claro u oscuro**.
Stack: Vite + React + TypeScript (gestor de paquetes: pnpm), Supabase (Postgres, Auth, Realtime, Edge Functions) y GitHub Pages.

## 1. Base de datos (Supabase)

```bash
pnpm add -g supabase         # o usa: pnpm dlx supabase <comando>
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase db push             # aplica supabase/migrations/*
```

Ajustes en el panel de Supabase (Authentication → Providers → Email):

- Desactiva **Confirm email** (los usuarios usan un correo interno, no real).
- Deja habilitado el registro (así se puede crear la primera familia desde la app).

### Función para crear cuentas de otras personas

Un adulto crea la cuenta (usuario + contraseña) de su pareja o de sus hijos desde la pantalla **Familia**.
Eso requiere la service role key, así que vive en una Edge Function:

```bash
supabase functions deploy create-member
```

(`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya las inyecta Supabase.)

## 2. Desarrollo local

```bash
cp .env.example .env.local   # completa URL y anon key (Project Settings → API)
pnpm install
pnpm dev
pnpm typecheck               # opcional
```

## 3. Despliegue en GitHub Pages

1. Sube el proyecto a GitHub (rama `main`).
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Secrets and variables → Actions → **Variables**: crea `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Cada push a `main` despliega con `.github/workflows/deploy.yml`.
   Usa `HashRouter`, así que las rutas no dan 404 al recargar.

El proyecto usa **pnpm** (versión fijada en `packageManager`; actívala con `corepack enable`). Mantén `pnpm-lock.yaml` commiteado: el workflow instala con `pnpm install --frozen-lockfile`.

## Idioma y tema

- Selector **ES / EN** y botón ☀️/🌙 en la cabecera (y en la pantalla de acceso). Ambas preferencias se guardan en el navegador (`hs-lang`, `hs-theme`).
- Idioma inicial: el del navegador (español si empieza por `es`; si no, inglés). Tema inicial: el del sistema.
- Los textos están en `src/lib/i18n.tsx`. Para agregar un idioma, añade un diccionario con las mismas claves que `es`.

## Cómo funcionan el login y los permisos

- El **usuario** se convierte en un email interno (`usuario@tablero.local`). No hay recuperación de contraseña por correo: un adulto crea la cuenta de nuevo o se gestiona desde el panel de Supabase.
- Quien usa **Crear familia** en el login queda como adulto (`admin`) de una familia nueva.
- Los adultos crean personas y vínculos de tutoría (Familia → Tutores).
- Cada adulto administra **sus propias tareas y las de sus hijos** (tutorías muchos a muchos). Cada persona marca solo sus tareas; un adulto también las de sus hijos.
- La seguridad real está en las políticas RLS (`supabase/migrations`). La interfaz solo las refleja.
- La anon key es pública por diseño. Nunca pongas la service role key en el frontend ni en las variables `VITE_*`.

## Estructura

```
src/lib/          supabase, auth (usuario→email), datos (React Query), fechas, i18n, tema
src/components/   Login, Board (día/semana/mes), Views, TaskDialog, Family, Preferences
supabase/migrations/        esquema, trigger de registro, RLS, tutorías
supabase/functions/create-member/   crea cuentas (service role)
```

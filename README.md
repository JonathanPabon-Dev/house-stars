# ⭐ House Stars

Tablero familiar de tareas (vistas de día, semana y mes) con login por usuario y contraseña.
Interfaz en **español e inglés** (ES/EN) y tema **claro u oscuro**.
Stack: Vite + React + TypeScript (gestor de paquetes: pnpm), Supabase (Postgres, Auth, Realtime, Edge Functions) y GitHub Pages.

> **El proyecto de Supabase es compartido con otras aplicaciones.** Por eso:
>
> - Todos los objetos de House Stars (tablas, funciones, políticas, índices) viven en el esquema `house_stars`.
> - El trigger de Auth solo actúa sobre usuarios marcados con `app_metadata.app = 'house-stars'`.
> - **No cambies ajustes globales de Auth en el panel** (por ejemplo, "Confirm email"): afectarían a las otras apps.

## 1. Base de datos (Supabase)

### Puesta en marcha en el proyecto compartido

1. Expón el esquema: **Project Settings → API → Exposed schemas** → agrega `house_stars` sin quitar los existentes.
2. Enlaza el proyecto y aplica las migraciones:

```bash
pnpm add -g supabase         # o usa: pnpm dlx supabase <comando>
supabase login
supabase link --project-ref TU_PROJECT_REF
pnpm db:apply:dry            # valida las migraciones pendientes en una transacción y revierte
pnpm db:apply                # aplica solo las pendientes
```

3. Despliega las Edge Functions (sin Docker, usando la API):

```bash
supabase functions deploy create-member --project-ref TU_PROJECT_REF --use-api
supabase functions deploy signup-household --project-ref TU_PROJECT_REF --use-api
```

Las migraciones no crean objetos en `public`, no revocan permisos de otros esquemas y no
borran triggers genéricos de `auth.users`.

`pnpm db:apply` **no usa `supabase db push`**. El historial de migraciones de Supabase
(`supabase_migrations.schema_migrations`) es global del proyecto y otras apps ya tienen
versiones ahí, así que `db push` se niega a continuar. El script
`scripts/apply-migrations.mjs` ejecuta cada archivo con `supabase db query --linked` y
guarda su propio historial en `house_stars.schema_migrations`.

### Ajustes del panel

| Ajuste | Acción |
| --- | --- |
| Project Settings → API → Exposed schemas | Agregar `house_stars`. No quitar ni cambiar los demás esquemas. |
| Authentication → Confirm email | **No cambiarlo**; otras apps dependen del ajuste actual. |
| Registro / signup global | **No cambiarlo**. Las altas de House Stars pasan por las Edge Functions. |

### Funciones (Edge Functions)

| Función | Quién la llama | Qué hace |
| --- | --- | --- |
| `signup-household` | Pantalla de acceso, sin sesión | Crea la primera cuenta y su familia (botón **Crear familia**). |
| `create-member` | Solo el administrador de la familia | Crea la cuenta de otra persona: `adult` o `child`, nunca otro administrador. |

Ambas usan la service role key y crean el usuario con `email_confirm: true`, sin enviar
correo real (el email es interno: `usuario@tablero.local`).
(`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta Supabase.)

### Trigger de registro

`house_stars.handle_new_user()` escucha los `insert` de `auth.users` y también los `update`
que fijan `raw_app_meta_data` (GoTrue crea el usuario y aplica la metadata en dos pasos), pero
lo primero que hace es comprobar `raw_app_meta_data->>'app'`: si no es `house-stars`, devuelve
el usuario sin cambios. Esa metadata solo la escribe el servidor, así que los registros de las
otras apps del proyecto compartido quedan intactos. La inserción en `members` es idempotente
(`on conflict (user_id) do nothing`) y el trigger se llama `house_stars_on_auth_user_created`
para no chocar con triggers de otras aplicaciones. Un registro propio crea la familia y queda
como `admin`; una cuenta creada por el administrador recibe `adult` o `child` (nunca otro
`admin`, para evitar escaladas de privilegios).

## 2. Desarrollo local

```bash
cp .env.example .env.local   # completa URL y anon key (Project Settings → API)
pnpm install
pnpm dev
pnpm typecheck               # opcional
```

`supabase/config.toml` expone `house_stars` en la API local (`[api] schemas`). Ese archivo es
solo para el entorno local: en el proyecto remoto los ajustes de Auth no se tocan.

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

Hay tres roles en `house_stars.member_role`:

- **`admin`**: dueño de la familia. Es el único que crea cuentas con usuario y contraseña
  (Familia → Crear cuenta) y puede administrar todos los vínculos de tutoría.
- **`adult`**: adulto con cuenta. Agrega personas sin cuenta (sus acogidos), se vincula como
  tutor de los niños y administra sus propias tareas y las de sus acogidos.
- **`child`**: solo marca sus tareas. Puede tener cuenta o no; si no la tiene, un tutor las marca.

- El **usuario** se convierte en un email interno (`usuario@tablero.local`). No hay recuperación de contraseña por correo: el administrador crea la cuenta de nuevo o se gestiona desde el panel de Supabase.
- **Crear familia** llama a `signup-household`: la cuenta se crea en el servidor y luego la app inicia sesión con usuario y contraseña. Quien la crea queda como `admin`.
- Solo el administrador ve y usa **Crear cuenta con usuario y contraseña**. `create-member` valida el rol en el servidor: acepta `adult` o `child`, nunca `admin`.
- El administrador y los adultos agregan personas sin cuenta, que quedan como `child`. El adulto se vincula como tutor desde la tabla de Tutores; el administrador puede editar cualquier vínculo.
- Cada adulto administra **sus propias tareas y las de sus acogidos** (tutorías muchos a muchos). Cada persona marca solo sus tareas; un adulto también las de sus acogidos.
- La seguridad real está en las políticas RLS (`supabase/migrations`), todas en `house_stars`. La interfaz solo las refleja.
- La anon key es pública por diseño. Nunca pongas la service role key en el frontend ni en las variables `VITE_*`.

## Estructura

```
src/lib/          supabase (cliente con esquema house_stars), auth (usuario→email), datos (React Query), fechas, i18n, tema
src/components/   Login, Board (día/semana/mes), Views, TaskDialog, Family, Preferences
supabase/migrations/                  house_stars: esquema, trigger de registro, RLS, tutorías y tres roles
supabase/functions/create-member/     crea cuentas de la familia (service role)
supabase/functions/signup-household/  crea la primera cuenta y su familia (service role)
```

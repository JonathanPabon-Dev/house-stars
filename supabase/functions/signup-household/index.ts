// House Stars — Edge Function: crea una familia y su primera cuenta desde el login.
// Vive en el servidor para crear el usuario con email_confirm: true, sin depender de
// los ajustes globales de Auth (el proyecto de Supabase es compartido).
// Quien crea la familia es siempre adulto; el administrador es una cuenta aparte
// de la aplicación, sin familia, creada por el servidor. Despliegue: supabase functions deploy signup-household
import { createClient } from "npm:@supabase/supabase-js@2";

const EMAIL_DOMAIN = "tablero.local"; // debe coincidir con src/lib/auth.tsx
const DB_SCHEMA = "house_stars";       // el proyecto de Supabase es compartido
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// Devuelve { error, code }: la app traduce el code (ES/EN) y usa error como respaldo
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (code: string, error: string, status: number) => json({ code, error }, status);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1) Validar datos (el nombre y la familia se recortan a lo que acepta el esquema)
    const b = await req.json();
    const username = String(b.username ?? "").trim().toLowerCase();
    const password = String(b.password ?? "");
    const name = String(b.name ?? "").trim().slice(0, 40);
    const household = String(b.household ?? "").trim().slice(0, 60) || "Mi familia";
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return fail("bad_username", "Invalid username", 400);
    if (password.length < 6) return fail("short_password", "Password must be at least 6 characters", 400);
    if (!name) return fail("no_name", "Name is required", 400);

    const admin = createClient(url, service, { db: { schema: DB_SCHEMA } });

    // 2) Comprobar el usuario antes de crear la cuenta en Auth
    const { data: existing, error: existingError } = await admin
      .from("members")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existingError) return fail("unknown", existingError.message, 500);
    if (existing) return fail("exists", "Username already exists", 400);

    // 3) Crear la cuenta. app_metadata.app es la marca que usa el trigger para saber
    // que este usuario pertenece a House Stars y no a otra app del proyecto.
    const { data: created, error } = await admin.auth.admin.createUser({
      email: `${username}@${EMAIL_DOMAIN}`,
      password,
      email_confirm: true,
      app_metadata: { app: "house-stars" },
      user_metadata: { username, display_name: name, household_name: household },
    });
    if (error || !created.user) {
      const m = error?.message ?? "Could not create the account";
      return m.toLowerCase().includes("already") ? fail("exists", "Username already exists", 400) : fail("unknown", m, 500);
    }

    // 4) El trigger de auth crea la familia y la fila en house_stars.members. Si no
    // existe, se deshace la cuenta para no dejar un usuario de Auth sin perfil.
    const { data: member, error: memberError } = await admin
      .from("members")
      .select("id")
      .eq("user_id", created.user.id)
      .maybeSingle();
    if (memberError || !member) {
      await admin.auth.admin.deleteUser(created.user.id);
      return fail("unknown", memberError?.message ?? "The member profile was not created", 500);
    }

    return json({ ok: true });
  } catch (e) {
    return fail("unknown", e instanceof Error ? e.message : "Unexpected error", 500);
  }
});

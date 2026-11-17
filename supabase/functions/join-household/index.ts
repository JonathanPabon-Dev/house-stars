// House Stars — Edge Function: una persona se une a una familia existente con su código.
// Crea su cuenta (usuario + contraseña) como adulto normal en esa familia. Nunca crea
// una familia nueva ni otro administrador. Despliegue: supabase functions deploy join-household
import { createClient } from "npm:@supabase/supabase-js@2";

const EMAIL_DOMAIN = "tablero.local"; // debe coincidir con src/lib/auth.tsx
const DB_SCHEMA = "house_stars";      // el proyecto de Supabase es compartido
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;
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

    // 1) Validar datos
    const b = await req.json();
    const code = String(b.code ?? "").trim().toUpperCase();
    const username = String(b.username ?? "").trim().toLowerCase();
    const password = String(b.password ?? "");
    const name = String(b.name ?? "").trim();
    if (!CODE_RE.test(code)) return fail("bad_code", "Invalid family code", 400);
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return fail("bad_username", "Invalid username", 400);
    if (password.length < 6) return fail("short_password", "Password must be at least 6 characters", 400);
    if (!name) return fail("no_name", "Name is required", 400);

    const admin = createClient(url, service, { db: { schema: DB_SCHEMA } });

    // 2) Buscar la familia por el código (el servidor la resuelve; el cliente no la elige)
    const { data: hh, error: hhError } = await admin
      .from("households")
      .select("id, name")
      .eq("join_code", code)
      .maybeSingle();
    if (hhError) return fail("unknown", hhError.message, 500);
    if (!hh) return fail("invalid_code", "Family code not found", 404);

    // 3) Comprobar el usuario antes de crear la cuenta en Auth
    const { data: existing, error: existingError } = await admin
      .from("members")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existingError) return fail("unknown", existingError.message, 500);
    if (existing) return fail("exists", "Username already exists", 400);

    // 4) Crear la cuenta en la familia encontrada. role adult: una unión nunca crea admin.
    const { data: created, error } = await admin.auth.admin.createUser({
      email: `${username}@${EMAIL_DOMAIN}`,
      password,
      email_confirm: true,
      app_metadata: { app: "house-stars", household_id: hh.id, role: "adult" },
      user_metadata: { username, display_name: name },
    });
    if (error || !created.user) {
      const m = error?.message ?? "Could not create the account";
      return m.toLowerCase().includes("already") ? fail("exists", "Username already exists", 400) : fail("unknown", m, 500);
    }

    // 5) El trigger de auth crea la fila en house_stars.members. Si no existe, se
    // deshace la cuenta para no dejar un usuario de Auth sin perfil.
    const { data: member, error: memberError } = await admin
      .from("members")
      .select("id")
      .eq("user_id", created.user.id)
      .maybeSingle();
    if (memberError || !member) {
      await admin.auth.admin.deleteUser(created.user.id);
      return fail("unknown", memberError?.message ?? "The member profile was not created", 500);
    }

    return json({ ok: true, household: hh.name });
  } catch (e) {
    return fail("unknown", e instanceof Error ? e.message : "Unexpected error", 500);
  }
});

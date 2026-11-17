// House Stars — Edge Function: el administrador de la familia crea la cuenta
// (usuario + contraseña) de otra persona. Los demás adultos solo agregan acogidos
// sin cuenta desde la app. Necesita la service role key, por eso NO puede hacerse
// desde el frontend (GitHub Pages). Despliegue: supabase functions deploy create-member
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
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1) Quién llama: debe ser el administrador de la familia. Un adulto normal
    //    no crea cuentas con contraseña, solo acogidos sin cuenta (lo impone RLS).
    const userClient = createClient(url, anon, {
      db: { schema: DB_SCHEMA },
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return fail("not_authenticated", "Not authenticated", 401);
    const { data: me } = await userClient
      .from("members")
      .select("household_id, role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!me || me.role !== "admin") return fail("not_admin", "Only the application administrator can create accounts", 403);

    // 2) Validar datos. El rol solo puede ser adult o child: nunca se crea otro admin.
    const b = await req.json();
    const username = String(b.username ?? "").trim().toLowerCase();
    const password = String(b.password ?? "");
    const name = String(b.name ?? "").trim();
    const role = b.role === "adult" || b.role === "child" ? b.role : null;
    const emoji = String(b.emoji ?? "").trim().slice(0, 8) || "🙂";
    const color = /^#[0-9A-Fa-f]{6}$/.test(String(b.color ?? "")) ? String(b.color) : "#3D6FD8";
    if (!role) return fail("bad_role", "Invalid role", 400);
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return fail("bad_username", "Invalid username", 400);
    if (password.length < 6) return fail("short_password", "Password must be at least 6 characters", 400);
    if (!name) return fail("no_name", "Name is required", 400);

    const admin = createClient(url, service, { db: { schema: DB_SCHEMA } });

    // 3) Comprobar el usuario antes de crear la cuenta en Auth
    const { data: existing, error: existingError } = await admin
      .from("members")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existingError) return fail("unknown", existingError.message, 500);
    if (existing) return fail("exists", "Username already exists", 400);

    // 4) Crear la cuenta en la misma familia (app_metadata solo lo escribe el servidor)
    const { data: created, error } = await admin.auth.admin.createUser({
      email: `${username}@${EMAIL_DOMAIN}`,
      password,
      email_confirm: true,
      app_metadata: { app: "house-stars", household_id: me.household_id, role },
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

    // 6) Completar ícono y color
    await admin.from("members").update({ emoji, color }).eq("id", member.id);
    return json({ ok: true, user_id: created.user.id });
  } catch (e) {
    return fail("unknown", e instanceof Error ? e.message : "Unexpected error", 500);
  }
});

// House Stars — Edge Function: un adulto crea la cuenta (usuario + contraseña) de otra persona de su familia.
// Necesita la service role key, por eso NO puede hacerse desde el frontend (GitHub Pages).
// Despliegue: supabase functions deploy create-member
import { createClient } from "npm:@supabase/supabase-js@2";

const EMAIL_DOMAIN = "tablero.local"; // debe coincidir con src/lib/auth.tsx
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

    // 1) Quién llama: debe ser un adulto (admin) de una familia
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return fail("not_authenticated", "Not authenticated", 401);
    const { data: me } = await userClient
      .from("members")
      .select("household_id, role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!me || me.role !== "admin") return fail("not_admin", "Only adults can create accounts", 403);

    // 2) Validar datos
    const b = await req.json();
    const username = String(b.username ?? "").trim().toLowerCase();
    const password = String(b.password ?? "");
    const name = String(b.name ?? "").trim();
    const role = b.role === "admin" ? "admin" : "member";
    const emoji = String(b.emoji ?? "").trim().slice(0, 8) || "🙂";
    const color = /^#[0-9A-Fa-f]{6}$/.test(String(b.color ?? "")) ? String(b.color) : "#3D6FD8";
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return fail("bad_username", "Invalid username", 400);
    if (password.length < 6) return fail("short_password", "Password must be at least 6 characters", 400);
    if (!name) return fail("no_name", "Name is required", 400);

    // 3) Crear la cuenta en la misma familia (app_metadata solo lo escribe el servidor)
    const admin = createClient(url, service);
    const { data: created, error } = await admin.auth.admin.createUser({
      email: `${username}@${EMAIL_DOMAIN}`,
      password,
      email_confirm: true,
      app_metadata: { household_id: me.household_id, role },
      user_metadata: { username, display_name: name },
    });
    if (error || !created.user) {
      const m = error?.message ?? "Could not create the account";
      return m.toLowerCase().includes("already") ? fail("exists", "Username already exists", 400) : fail("unknown", m, 400);
    }

    // El trigger ya creó la fila en members; completamos ícono y color
    await admin.from("members").update({ emoji, color }).eq("user_id", created.user.id);
    return json({ ok: true, user_id: created.user.id });
  } catch (e) {
    return fail("unknown", e instanceof Error ? e.message : "Unexpected error", 500);
  }
});

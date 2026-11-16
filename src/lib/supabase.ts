import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// El proyecto de Supabase es compartido: House Stars vive en su propio esquema.
export const DB_SCHEMA = "house_stars";

export const configured = Boolean(url && anon);
// db.schema hace que todas las consultas .from() usen house_stars sin repetirlo.
export const supabase = createClient(url ?? "http://localhost", anon ?? "anon", {
  db: { schema: DB_SCHEMA },
});

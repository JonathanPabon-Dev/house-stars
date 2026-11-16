// Aplica las migraciones de House Stars al proyecto compartido.
//
// El historial de migraciones de Supabase (supabase_migrations.schema_migrations)
// es global del proyecto: otras apps ya tienen versiones ahí y `supabase db push`
// se niega a continuar. Este script usa `supabase db query --linked` y guarda su
// propio historial en house_stars.schema_migrations.
//
// Requisitos: `supabase login` y `supabase link --project-ref <ref>`.
// Uso:
//   pnpm db:apply:dry   valida todo en una transacción y hace rollback
//   pnpm db:apply       aplica solo las migraciones pendientes
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";
const SCHEMA = "house_stars";
const dryRun = process.argv.includes("--dry-run");

function runCli(args) {
  try {
    return execFileSync("supabase", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  } catch (e) {
    if (e.stdout) process.stderr.write(e.stdout);
    if (e.stderr) process.stderr.write(e.stderr);
    throw new Error(`supabase ${args.join(" ")} exited with code ${e.status ?? "unknown"}`);
  }
}

function runSql(sql) {
  const dir = mkdtempSync(join(tmpdir(), "house-stars-migrations-"));
  const file = join(dir, "migration.sql");
  try {
    writeFileSync(file, sql, "utf8");
    runCli(["db", "query", "--linked", "--file", file]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function query(sql) {
  const raw = runCli(["db", "query", "--linked", sql, "--output-format", "json"]);
  const start = raw.indexOf("{");
  if (start < 0) throw new Error(`Unexpected Supabase CLI output: ${raw}`);
  return JSON.parse(raw.slice(start)).rows ?? [];
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => /^\d+.*\.sql$/.test(f))
  .sort();

if (!files.length) {
  console.log("No hay migraciones.");
  process.exit(0);
}

if (dryRun) {
  const sql = ["begin;", ...files.map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8")), "rollback;"].join("\n");
  runSql(sql);
  console.log(`Dry run OK: ${files.length} migración(es) ejecutadas y revertidas.`);
  process.exit(0);
}

runSql(`
create schema if not exists ${SCHEMA};
create table if not exists ${SCHEMA}.schema_migrations (
  version text primary key,
  name text not null,
  applied_at timestamptz not null default now()
);
`);

const applied = new Set(
  query(`select version from ${SCHEMA}.schema_migrations order by version`).map((r) => r.version),
);

let count = 0;
for (const file of files) {
  const version = file.slice(0, file.indexOf("_"));
  if (applied.has(version)) {
    console.log(`skip ${file}`);
    continue;
  }
  const name = file.slice(file.indexOf("_") + 1, -4).replace(/'/g, "''");
  const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
  runSql(
    `begin;\n${sql}\ninsert into ${SCHEMA}.schema_migrations (version, name) values ('${version}', '${name}');\ncommit;`,
  );
  console.log(`applied ${file}`);
  count++;
}

console.log(count ? `Listo: ${count} migración(es) aplicadas.` : "Ya está al día.");

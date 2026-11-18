// Utilidades de prueba contra el Supabase LOCAL (nunca contra producción).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

export const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
export const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!/127\.0\.0\.1|localhost/.test(URL_)) {
  throw new Error("Las pruebas solo pueden ejecutarse contra Supabase local.");
}

export const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });

export const PASSWORD = "Prueba-Local-2026!";

/** Crea (si no existe) una cuenta de PRUEBA vinculada a una ficha del equipo. */
export async function ensureUser(shortName, email) {
  if (shortName) {
    const { error } = await admin.from("staff").update({ email }).eq("short_name", shortName);
    if (error) throw error;
  }
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (error) throw error;
    user = data.user;
  }
  if (shortName) {
    await admin.from("staff").update({ user_id: user.id }).eq("short_name", shortName);
  }
  return user;
}

export async function login(email) {
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return client;
}

export async function staffId(shortName) {
  const { data } = await admin.from("staff").select("id").eq("short_name", shortName).single();
  return data.id;
}

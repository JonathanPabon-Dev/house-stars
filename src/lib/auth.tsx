import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { errText, useI18n, type Key } from "./i18n";

// Supabase Auth usa email. El "usuario" se convierte en un email interno.
export const EMAIL_DOMAIN = "tablero.local";
export const toEmail = (u: string) => `${u.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const JOIN_CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;

interface SignUpInput {
  username: string;
  password: string;
  name: string;
  household: string;
}

interface JoinInput {
  code: string;
  username: string;
  password: string;
  name: string;
}

interface Ctx {
  session: Session | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<string | null>;
  signUp: (v: SignUpInput) => Promise<string | null>;
  join: (v: JoinInput) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: Ctx["signIn"] = async (username, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: toEmail(username), password });
    if (!error) return null;
    return error.message.toLowerCase().includes("invalid") ? t("errBadCreds") : error.message;
  };

  // La Edge Function responde { error, code }: se conserva el code para traducirlo.
  async function edgeError(error: unknown, fallback: Key): Promise<string> {
    let msg = (error as Error).message;
    let code: string | undefined;
    try {
      const j = await (error as unknown as { context: Response }).context.json();
      if (j?.error) msg = j.error;
      code = j?.code;
    } catch {
      /* se usa el mensaje genérico */
    }
    return errText(t, Object.assign(new Error(msg), { code }), fallback);
  }

  async function signInAfter(username: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email: toEmail(username), password });
    return error ? error.message : null;
  }

  // El proyecto de Supabase es compartido: la cuenta se crea en el servidor con
  // email_confirm: true, sin depender de los ajustes globales de Auth.
  const signUp: Ctx["signUp"] = async (v) => {
    const username = v.username.trim().toLowerCase();
    if (!USERNAME_RE.test(username)) return t("errUsernameFormat");
    if (v.password.length < 6) return t("errPasswordShort");
    if (!v.name.trim()) return t("errNameRequired");

    const { error } = await supabase.functions.invoke("signup-household", {
      body: {
        username,
        password: v.password,
        name: v.name.trim(),
        household: v.household.trim(),
      },
    });
    if (error) return edgeError(error, "errCreate");
    return signInAfter(username, v.password);
  };

  // Unirse a una familia existente con su código: la cuenta queda como adulto normal.
  const join: Ctx["join"] = async (v) => {
    const code = v.code.trim().toUpperCase();
    const username = v.username.trim().toLowerCase();
    if (!JOIN_CODE_RE.test(code)) return t("errCodeFormat");
    if (!USERNAME_RE.test(username)) return t("errUsernameFormat");
    if (v.password.length < 6) return t("errPasswordShort");
    if (!v.name.trim()) return t("errNameRequired");

    const { error } = await supabase.functions.invoke("join-household", {
      body: { code, username, password: v.password, name: v.name.trim() },
    });
    if (error) return edgeError(error, "errJoin");
    return signInAfter(username, v.password);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
  };

  return <AuthCtx.Provider value={{ session, loading, signIn, signUp, join, signOut }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth fuera de AuthProvider");
  return c;
}

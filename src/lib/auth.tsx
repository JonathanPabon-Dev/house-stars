import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useI18n } from "./i18n";

// Supabase Auth usa email. El "usuario" se convierte en un email interno.
export const EMAIL_DOMAIN = "tablero.local";
export const toEmail = (u: string) => `${u.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

interface SignUpInput {
  username: string;
  password: string;
  name: string;
  household: string;
}

interface Ctx {
  session: Session | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<string | null>;
  signUp: (v: SignUpInput) => Promise<string | null>;
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

  const signUp: Ctx["signUp"] = async (v) => {
    const username = v.username.trim().toLowerCase();
    if (!USERNAME_RE.test(username)) return t("errUsernameFormat");
    if (v.password.length < 6) return t("errPasswordShort");
    if (!v.name.trim()) return t("errNameRequired");
    const { data, error } = await supabase.auth.signUp({
      email: toEmail(username),
      password: v.password,
      options: {
        data: { username, display_name: v.name.trim(), household_name: v.household.trim() || "Mi familia" },
      },
    });
    if (error) return error.message.toLowerCase().includes("already") ? t("errUserExists") : error.message;
    if (!data.session)
      return t("errConfirmEmail");
    return null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
  };

  return <AuthCtx.Provider value={{ session, loading, signIn, signUp, signOut }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth fuera de AuthProvider");
  return c;
}

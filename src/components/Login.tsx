import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import Preferences from "./Preferences";
import Help from "./Help";

type Mode = "in" | "up" | "join";

export default function Login() {
  const { signIn, signUp, join } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [household, setHousehold] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err =
      mode === "in"
        ? await signIn(username, password)
        : mode === "up"
          ? await signUp({ username, password, name, household })
          : await join({ code, username, password, name });
    setError(err);
    setBusy(false);
  }

  return (
    <div className="login">
      <div className="prefs end"><Preferences /><Help /></div>
      <div className="brand">
        <h1>⭐ {t("appName")}</h1>
        <small>{t("tagline")}</small>
      </div>
      <div className="seg" role="group" aria-label={t("access")}>
        <button className={mode === "in" ? "on" : ""} onClick={() => setMode("in")} type="button">{t("signIn")}</button>
        <button className={mode === "up" ? "on" : ""} onClick={() => setMode("up")} type="button">{t("createFamily")}</button>
        <button className={mode === "join" ? "on" : ""} onClick={() => setMode("join")} type="button">{t("joinFamily")}</button>
      </div>
      <form onSubmit={submit}>
        {mode === "up" && (
          <>
            <label className="f" htmlFor="hh">{t("familyName")}</label>
            <input id="hh" className="inp" value={household} onChange={(e) => setHousehold(e.target.value)} placeholder={t("familyPh")} />
            <label className="f" htmlFor="nm">{t("yourName")}</label>
            <input id="nm" className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("yourNamePh")} required />
          </>
        )}
        {mode === "join" && (
          <>
            <label className="f" htmlFor="jc">{t("familyCode")}</label>
            <input
              id="jc"
              className="inp"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("familyCodePh")}
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={8}
              required
            />
            <label className="f" htmlFor="nm">{t("yourName")}</label>
            <input id="nm" className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("yourNamePh")} required />
          </>
        )}
        <label className="f" htmlFor="us">{t("username")}</label>
        <input id="us" className="inp" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        <label className="f" htmlFor="pw">{t("password")}</label>
        <input id="pw" className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} required />
        <div className="err" role="alert">{error}</div>
        <button className="btn primary wide" disabled={busy}>{mode === "in" ? t("signIn") : mode === "up" ? t("createFamily") : t("joinBtn")}</button>
      </form>
    </div>
  );
}

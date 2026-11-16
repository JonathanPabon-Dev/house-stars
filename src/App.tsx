import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { configured } from "./lib/supabase";
import { useMe } from "./lib/data";
import { useI18n } from "./lib/i18n";
import Login from "./components/Login";
import Board from "./components/Board";
import Family from "./components/Family";
import Preferences from "./components/Preferences";

export default function App() {
  const { session, loading, signOut } = useAuth();
  const { me } = useMe();
  const { t } = useI18n();

  if (!configured)
    return (
      <div className="login">
        <div className="prefs end"><Preferences /></div>
        <h1>{t("configMissingTitle")}</h1>
        <p className="muted">{t("configMissingBody")}</p>
      </div>
    );
  if (loading) return <p className="center muted">{t("loading")}</p>;
  if (!session) return <Login />;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>⭐ {t("appName")}</h1>
          <small>{t("tagline")}</small>
        </div>
        <nav className="links">
          <NavLink to="/" end>{t("navBoard")}</NavLink>
          <NavLink to="/familia">{t("navFamily")}</NavLink>
        </nav>
        <div className="who">
          {me && <span>{me.emoji} {me.name}</span>}
          <Preferences />
          <button className="btn" onClick={signOut}>{t("signOut")}</button>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Board />} />
        <Route path="/familia" element={<Family />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

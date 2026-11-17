import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { configured } from "./lib/supabase";
import { useMe } from "./lib/data";
import { useActiveHousehold } from "./lib/household";
import { useI18n } from "./lib/i18n";
import Login from "./components/Login";
import Board from "./components/Board";
import Family from "./components/Family";
import Preferences from "./components/Preferences";
import UserMenu from "./components/UserMenu";

export default function App() {
  const { session, loading } = useAuth();
  const { me } = useMe();
  const { households, active, activeId, setActiveId } = useActiveHousehold();
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
          {/* El admin siempre ve el selector: sabe qué tablero está mirando incluso
              cuando solo existe una familia. */}
          {me?.role === "admin" && households.length > 0 && (
            <select
              className="hhsel"
              aria-label={t("activeFamily")}
              title={t("activeFamily")}
              value={activeId}
              onChange={(e) => setActiveId(e.target.value)}
            >
              {households.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          )}
          {/* Las cuentas normales no eligen familia, pero también ven cuál es la suya. */}
          {me && me.role !== "admin" && active && (
            <span className="tag" title={t("activeFamily")}>{active.name}</span>
          )}
          {me && <UserMenu member={me} />}
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

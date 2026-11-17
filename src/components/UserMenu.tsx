import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";
import { useI18n, type Lang } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import type { Member } from "../lib/types";

// Menú de la cuenta al estilo Google/Gmail/YouTube: se abre desde la pastilla
// del usuario y reúne idioma, tema y salida. La ayuda vive aparte, como botón
// flotante global. Idioma y tema actúan sin cerrar el menú.
export default function UserMenu({ member }: { member: Member }) {
  const { signOut } = useAuth();
  const { lang, setLang, t } = useI18n();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      chipRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="umenu-wrap" ref={wrapRef}>
      <button
        ref={chipRef}
        type="button"
        className="userchip"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("accountMenu")}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="uav" aria-hidden="true">{member.emoji}</span>
        <span className="uname">{member.name}</span>
        <span className="ucaret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="umenu" role="menu" aria-label={t("accountMenu")}>
          <div className="umenu-head">
            <b>{member.emoji} {member.name}</b>
            {member.username && <small>@{member.username}</small>}
          </div>

          <div className="uitem" role="none">
            <span>{t("language")}</span>
            <div className="seg" role="group" aria-label={t("language")}>
              {(["es", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  className={lang === l ? "on" : ""}
                  aria-pressed={lang === l}
                  onClick={() => setLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="uitem" role="menuitem" onClick={toggle}>
            <span>{theme === "dark" ? t("menuThemeLight") : t("menuThemeDark")}</span>
            <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
          </button>

          <div className="usep" role="none" />

          <button
            type="button"
            className="uitem danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
          >
            <span>{t("signOut")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

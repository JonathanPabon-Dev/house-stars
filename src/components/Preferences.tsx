import { useI18n, type Lang } from "../lib/i18n";
import { useTheme } from "../lib/theme";

export default function Preferences() {
  const { lang, setLang, t } = useI18n();
  const { theme, toggle } = useTheme();
  return (
    <div className="prefs">
      <div className="seg" role="group" aria-label={t("language")}>
        {(["es", "en"] as Lang[]).map((l) => (
          <button key={l} className={lang === l ? "on" : ""} aria-pressed={lang === l} onClick={() => setLang(l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <button className="btn icon" onClick={toggle} aria-label={theme === "dark" ? t("themeToLight") : t("themeToDark")}>
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    </div>
  );
}

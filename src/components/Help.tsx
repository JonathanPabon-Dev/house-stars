import { useRef } from "react";
import { useI18n } from "../lib/i18n";

// Botón de ayuda flotante, siempre visible abajo a la derecha (también en el
// acceso). Se monta una sola vez en main.tsx; abre las instrucciones para crear
// cuentas. En reposo tiene opacidad baja y se resalta al pasar el puntero.
export default function Help() {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="help-fab"
        aria-label={t("helpOpen")}
        aria-haspopup="dialog"
        title={t("helpOpen")}
        onClick={() => ref.current?.showModal()}
      >
        ?
      </button>
      <dialog ref={ref}>
        <h2>{t("helpTitle")}</h2>
        <ol className="help">
          <li>{t("helpStep1")}</li>
          <li>{t("helpStep2")}</li>
          <li>{t("helpStep3")}</li>
          <li>{t("helpStep4")}</li>
          <li>{t("helpStep5")}</li>
        </ol>
        <div className="dact">
          <button type="button" className="btn primary" onClick={() => ref.current?.close()}>
            {t("helpClose")}
          </button>
        </div>
      </dialog>
    </>
  );
}

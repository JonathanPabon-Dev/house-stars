import { useRef } from "react";
import { useI18n } from "../lib/i18n";

// Botón de ayuda con las instrucciones para crear cuentas. Se usa en el acceso
// (donde se crea la primera familia) y en la cabecera del tablero.
export default function Help() {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="btn icon"
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

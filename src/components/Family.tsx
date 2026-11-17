import { useState, type CSSProperties, type FormEvent } from "react";
import { useAddMember, useCreateAccount, useGuardians, useMe, useToggleGuardian } from "../lib/data";
import { USERNAME_RE } from "../lib/auth";
import { errText, useI18n } from "../lib/i18n";

const COLORS = ["#3D6FD8", "#178A66", "#D6457F", "#8A55D6", "#B96A00"];

function ColorPick({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="days" role="radiogroup" aria-label="Color">
      {COLORS.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={c} className={"swatch" + (value === c ? " on" : "")} style={{ background: c }} onClick={() => onChange(c)} />
      ))}
    </div>
  );
}

export default function Family() {
  const { t } = useI18n();
  const { me, members } = useMe();
  const guardians = useGuardians().data ?? [];
  const addMember = useAddMember();
  const createAccount = useCreateAccount();
  const toggleG = useToggleGuardian();
  const isAdmin = me?.role === "admin";
  // Administrador y adultos pueden agregar personas sin cuenta (acogidos).
  const canAddWard = me?.role === "admin" || me?.role === "adult";
  const adults = members.filter((m) => m.role !== "child");

  // Persona sin cuenta
  const [pName, setPName] = useState("");
  const [pEmoji, setPEmoji] = useState("🙂");
  const [pColor, setPColor] = useState(COLORS[0]);
  const [pErr, setPErr] = useState("");

  // Persona con cuenta
  const [aName, setAName] = useState("");
  const [aUser, setAUser] = useState("");
  const [aPass, setAPass] = useState("");
  const [aRole, setARole] = useState<"adult" | "child">("adult");
  const [aEmoji, setAEmoji] = useState("🙂");
  const [aColor, setAColor] = useState(COLORS[1]);
  const [aErr, setAErr] = useState("");
  const [aOk, setAOk] = useState("");

  async function onAddMember(e: FormEvent) {
    e.preventDefault();
    setPErr("");
    if (!me || !pName.trim()) return setPErr(t("errNameRequired"));
    try {
      await addMember.mutateAsync({ household_id: me.household_id, name: pName.trim(), emoji: pEmoji.trim() || "🙂", color: pColor });
      setPName("");
    } catch (err) {
      setPErr(errText(t, err, "errAdd"));
    }
  }

  async function onCreateAccount(e: FormEvent) {
    e.preventDefault();
    setAErr("");
    setAOk("");
    const username = aUser.trim().toLowerCase();
    if (!aName.trim()) return setAErr(t("errNameRequired"));
    if (!USERNAME_RE.test(username)) return setAErr(t("errUsernameFormat"));
    if (aPass.length < 6) return setAErr(t("errPasswordShort"));
    try {
      await createAccount.mutateAsync({ username, password: aPass, name: aName.trim(), role: aRole, emoji: aEmoji.trim() || "🙂", color: aColor });
      setAOk(t("accountCreated", { u: username }));
      setAName("");
      setAUser("");
      setAPass("");
    } catch (err) {
      setAErr(errText(t, err, "errCreate"));
    }
  }

  return (
    <div className="family">
      <section className="card">
        <h2>{t("people")}</h2>
        <ul className="plist">
          {members.map((m) => (
            <li key={m.id} style={{ "--c": m.color } as CSSProperties}>
              <span className="av" aria-hidden="true">{m.emoji}</span>
              <span className="mn">{m.name}</span>
              <span className="tag">{m.role === "admin" ? t("admin") : m.role === "adult" ? t("adult") : t("child")}</span>
              <span className="muted">{m.username ? t("usernameIs", { u: m.username }) : t("noAccount")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>{t("guardians")}</h2>
        <p className="muted">{t("guardiansHelp")}</p>
        <div className="wrap">
          <table className="gt">
            <thead>
              <tr>
                <th>{t("person")}</th>
                {adults.map((a) => (
                  <th key={a.id}>{a.emoji} {a.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <th scope="row">{m.emoji} {m.name}</th>
                  {adults.map((a) => {
                    if (a.id === m.id) return <td key={a.id} className="muted">—</td>;
                    const linked = guardians.some((g) => g.guardian_id === a.id && g.child_id === m.id);
                    // El administrador administra todos los vínculos; un adulto solo
                    // puede vincularse a sí mismo con un niño de la familia.
                    const canToggle =
                      isAdmin || (me?.role === "adult" && me.id === a.id && m.role === "child");
                    return (
                      <td key={a.id}>
                        <input
                          type="checkbox"
                          checked={linked}
                          disabled={!canToggle || toggleG.isPending}
                          aria-label={t("manages", { a: a.name, m: m.name })}
                          onChange={() => me && toggleG.mutate({ household_id: me.household_id, guardian_id: a.id, child_id: m.id, linked })}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {toggleG.error && <div className="err" role="alert">{(toggleG.error as Error).message}</div>}
      </section>

      {canAddWard && (
        <section className="card">
          <h2>{t("addPerson")}</h2>
          <p className="muted">{t("addPersonHelp")}</p>
          <form onSubmit={onAddMember}>
            <div className="row">
              <div><label className="f" htmlFor="pe">{t("icon")}</label><input id="pe" className="inp" value={pEmoji} maxLength={4} onChange={(e) => setPEmoji(e.target.value)} /></div>
              <div><label className="f" htmlFor="pn">{t("name")}</label><input id="pn" className="inp" value={pName} maxLength={40} onChange={(e) => setPName(e.target.value)} /></div>
            </div>
            <label className="f">{t("color")}</label>
            <ColorPick value={pColor} onChange={setPColor} />
            <div className="err" role="alert">{pErr}</div>
            <button className="btn primary" disabled={addMember.isPending}>{t("add")}</button>
          </form>
        </section>
      )}

      {isAdmin && (
        <section className="card">
          <h2>{t("createAccount")}</h2>
          <form onSubmit={onCreateAccount}>
            <div className="row">
              <div><label className="f" htmlFor="ae">{t("icon")}</label><input id="ae" className="inp" value={aEmoji} maxLength={4} onChange={(e) => setAEmoji(e.target.value)} /></div>
              <div><label className="f" htmlFor="an">{t("name")}</label><input id="an" className="inp" value={aName} maxLength={40} onChange={(e) => setAName(e.target.value)} /></div>
            </div>
            <label className="f" htmlFor="au">{t("username")}</label>
            <input id="au" className="inp" value={aUser} autoCapitalize="none" autoComplete="off" onChange={(e) => setAUser(e.target.value)} />
            <label className="f" htmlFor="ap">{t("password")}</label>
            <input id="ap" className="inp" type="password" value={aPass} autoComplete="new-password" onChange={(e) => setAPass(e.target.value)} />
            <label className="f" htmlFor="ar">{t("type")}</label>
            <select id="ar" className="inp" value={aRole} onChange={(e) => setARole(e.target.value as "adult" | "child")}>
              <option value="adult">{t("typeAdult")}</option>
              <option value="child">{t("typeChild")}</option>
            </select>
            <label className="f">{t("color")}</label>
            <ColorPick value={aColor} onChange={setAColor} />
            <div className="err" role="alert">{aErr}</div>
            {aOk && <div className="ok" role="status">{aOk}</div>}
            <button className="btn primary" disabled={createAccount.isPending}>{t("createAccountBtn")}</button>
          </form>
        </section>
      )}
    </div>
  );
}

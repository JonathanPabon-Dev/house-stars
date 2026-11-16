import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAddTask } from "../lib/data";
import { errText, useI18n } from "../lib/i18n";
import type { Member } from "../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  householdId: string;
  members: Member[]; // solo las personas cuyas tareas puede administrar quien inició sesión
}

export default function TaskDialog({ open, onClose, householdId, members }: Props) {
  const { t, dayInitial, dayFull } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const add = useAddTask();
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("⭐");
  const [memberId, setMemberId] = useState("");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [error, setError] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setTitle("");
      setError("");
      setMemberId((id) => (members.some((m) => m.id === id) ? id : members[0]?.id ?? ""));
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, members]);

  const toggleDay = (i: number) => setDays((ds) => (ds.includes(i) ? ds.filter((x) => x !== i) : [...ds, i].sort()));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError(t("errTaskTitle"));
    if (!days.length) return setError(t("errTaskDays"));
    if (!memberId) return setError(t("errTaskMember"));
    try {
      await add.mutateAsync({ household_id: householdId, member_id: memberId, title: title.trim(), emoji: emoji.trim() || "⭐", weekdays: days });
      onClose();
    } catch (err) {
      setError(errText(t, err, "errSave"));
    }
  }

  return (
    <dialog ref={ref} onClose={onClose}>
      <form onSubmit={submit}>
        <h2>{t("newTaskTitle")}</h2>
        <div className="row">
          <div>
            <label className="f" htmlFor="te">{t("icon")}</label>
            <input id="te" className="inp" value={emoji} maxLength={4} onChange={(e) => setEmoji(e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="tt">{t("task")}</label>
            <input id="tt" className="inp" value={title} maxLength={80} placeholder={t("taskPh")} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>
        <label className="f" htmlFor="tm">{t("whoDoes")}</label>
        <select id="tm" className="inp" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>
          ))}
        </select>
        <label className="f">{t("whichDays")}</label>
        <div className="days">
          {dayInitial.map((l, i) => (
            <label key={i} className="dchip" title={dayFull[i]}>
              <input type="checkbox" checked={days.includes(i)} onChange={() => toggleDay(i)} />
              <span>{l}</span>
            </label>
          ))}
        </div>
        <div className="err" role="alert">{error}</div>
        <div className="dact">
          <button type="button" className="btn" onClick={onClose}>{t("cancel")}</button>
          <button className="btn primary" disabled={add.isPending}>{t("saveTask")}</button>
        </div>
      </form>
    </dialog>
  );
}

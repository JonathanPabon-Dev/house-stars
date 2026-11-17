import { useMemo, useState } from "react";
import { key, labelFor, shiftCur, viewDays, weekdayIdx, type View } from "../lib/dates";
import { makePerms, useCompletions, useGuardians, useMe, useRealtime, useRemoveTask, useTasks, useToggle } from "../lib/data";
import { useActiveHousehold } from "../lib/household";
import { useI18n } from "../lib/i18n";
import { DayView, MonthView, WeekView } from "./Views";
import TaskDialog from "./TaskDialog";

const VIEWS: [View, "viewDay" | "viewWeek" | "viewMonth"][] = [["day", "viewDay"], ["week", "viewWeek"], ["month", "viewMonth"]];

export default function Board() {
  useRealtime();
  const { t, locale } = useI18n();
  const { me, members: allMembers } = useMe();
  const { activeId } = useActiveHousehold();
  // El administrador ve todas las familias: el tablero muestra solo la activa.
  const members = allMembers.filter((m) => m.household_id === activeId);
  const tasks = (useTasks().data ?? []).filter((x) => x.household_id === activeId);
  const guardians = (useGuardians().data ?? []).filter((g) => g.household_id === activeId);
  const [view, setView] = useState<View>("week");
  const [cur, setCur] = useState(() => new Date());
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);

  const days = useMemo(() => viewDays(view, cur), [view, cur]);
  const comps = (useCompletions(key(days[0]), key(days[days.length - 1])).data ?? []).filter(
    (c) => c.household_id === activeId,
  );
  const done = useMemo(() => new Set(comps.map((c) => `${c.task_id}|${c.done_on}`)), [comps]);
  const toggle = useToggle();
  const remove = useRemoveTask();
  const perms = useMemo(() => makePerms(me, guardians), [me, guardians]);
  const manageable = members.filter((m) => perms.canManage(m.id));

  // Progreso del periodo visible (en el mes, solo los días del mes actual)
  const scope = view === "month" ? days.filter((d) => d.getMonth() === cur.getMonth()) : days;
  let total = 0;
  let doneN = 0;
  for (const d of scope) {
    const i = weekdayIdx(d);
    const ks = key(d);
    for (const t of tasks) {
      if (!t.weekdays.includes(i)) continue;
      total++;
      if (done.has(`${t.id}|${ks}`)) doneN++;
    }
  }
  const pct = total ? Math.round((doneN / total) * 100) : 0;
  const when = t(view === "day" ? "whenDay" : view === "week" ? "whenWeek" : "whenMonth");
  const msg = !total ? t("msgNone", { when }) : pct === 100 ? t("msgAll", { when }) : pct >= 50 ? t("msgHalf") : t("msgGo");

  const common = {
    members,
    tasks,
    done,
    perms,
    editing,
    onToggle: (t: (typeof tasks)[number], date: string, isDone: boolean) =>
      toggle.mutate({ task: t, date, done: isDone, by: me?.id ?? null }),
    onDelete: (t: (typeof tasks)[number]) => remove.mutate(t.id),
  };

  return (
    <>
      <div className="top">
        <div className="seg" role="group" aria-label={t("view")}>
          {VIEWS.map(([v, l]) => (
            <button key={v} className={view === v ? "on" : ""} aria-pressed={view === v} onClick={() => setView(v)}>{t(l)}</button>
          ))}
        </div>
        <div className="nav">
          <button className="btn icon" aria-label={t("prev")} onClick={() => setCur(shiftCur(view, cur, -1))}>‹</button>
          <div className="range" aria-live="polite">{labelFor(view, cur, locale)}</div>
          <button className="btn icon" aria-label={t("next")} onClick={() => setCur(shiftCur(view, cur, 1))}>›</button>
          <button className="btn" onClick={() => setCur(new Date())}>{t("today")}</button>
        </div>
        <div className="actions">
          <button className={"btn" + (editing ? " on" : "")} aria-pressed={editing} onClick={() => setEditing(!editing)}>{editing ? t("done") : t("edit")}</button>
          {me && manageable.length > 0 && <button className="btn primary" onClick={() => setOpen(true)}>{t("newTask")}</button>}
        </div>
      </div>

      <div className="summary">
        <div>
          <div className="msg">{msg}</div>
          <div className="sub">{t("summarySub", { done: doneN, total, when })}</div>
        </div>
        <div className="bar" role="progressbar" aria-label={t("progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>

      {view === "week" && <WeekView days={days} {...common} />}
      {view === "day" && <DayView day={days[0]} {...common} />}
      {view === "month" && (
        <MonthView days={days} cur={cur} onGoDay={(d) => { setCur(d); setView("day"); }} {...common} />
      )}

      <p className="foot">
        {view === "month" ? t("footMonth") : t("footDefault")}
      </p>

      {me && activeId && <TaskDialog open={open} onClose={() => setOpen(false)} householdId={activeId} members={manageable} />}
    </>
  );
}

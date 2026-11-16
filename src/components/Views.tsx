import { Fragment, type CSSProperties } from "react";
import { key, weekdayIdx } from "../lib/dates";
import { useI18n } from "../lib/i18n";
import type { Perms } from "../lib/data";
import type { Member, Task } from "../lib/types";

const cv = (c: string) => ({ "--c": c }) as CSSProperties;

interface Common {
  members: Member[];
  tasks: Task[];
  done: Set<string>;
  perms: Perms;
  editing: boolean;
  onToggle: (t: Task, date: string, isDone: boolean) => void;
  onDelete: (t: Task) => void;
}

function Chip({ task, dateKey, c }: { task: Task; dateKey: string; c: Common }) {
  const { t } = useI18n();
  const isDone = c.done.has(`${task.id}|${dateKey}`);
  const allowed = c.perms.canComplete(task.member_id);
  return (
    <div className="cw">
      <button
        className={"chip" + (isDone ? " done" : "")}
        aria-pressed={isDone}
        disabled={!allowed}
        title={allowed ? undefined : t("chipDisabled")}
        onClick={() => c.onToggle(task, dateKey, isDone)}
      >
        <span className="ck">{isDone ? "✓" : ""}</span>
        <span className="e">{task.emoji}</span>
        <span className="t">{task.title}</span>
      </button>
      {c.editing && c.perms.canManage(task.member_id) && (
        <button className="del" aria-label={t("deleteTask", { title: task.title })} onClick={() => c.onDelete(task)}>×</button>
      )}
    </div>
  );
}

function tasksFor(c: Common, memberId: string, d: Date) {
  const i = weekdayIdx(d);
  return c.tasks.filter((t) => t.member_id === memberId && t.weekdays.includes(i));
}

export function WeekView({ days, ...c }: Common & { days: Date[] }) {
  const { dayShort } = useI18n();
  const todayK = key(new Date());
  return (
    <div className="wrap">
      <div className="board">
        <div className="dh" />
        {days.map((d, i) => (
          <div key={i} className={"dh" + (key(d) === todayK ? " today" : "")}>
            {dayShort[i]}
            <br />
            <b>{d.getDate()}</b>
          </div>
        ))}
        {c.members.map((m) => {
          let mt = 0;
          let md = 0;
          days.forEach((d) =>
            tasksFor(c, m.id, d).forEach((t) => {
              mt++;
              if (c.done.has(`${t.id}|${key(d)}`)) md++;
            }),
          );
          return (
            <Fragment key={m.id}>
              <div className="mc" style={cv(m.color)}>
                <div className="av" aria-hidden="true">{m.emoji}</div>
                <div>
                  <div className="mn">{m.name}</div>
                  <div className="ms">⭐ {md} · {md}/{mt}</div>
                  <div className="mbar"><i style={{ width: `${mt ? Math.round((md / mt) * 100) : 0}%` }} /></div>
                </div>
              </div>
              {days.map((d) => {
                const ks = key(d);
                return (
                  <div key={ks} className={"cell" + (ks === todayK ? " today" : "")} style={cv(m.color)}>
                    {tasksFor(c, m.id, d).map((t) => (
                      <Chip key={t.id} task={t} dateKey={ks} c={c} />
                    ))}
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export function DayView({ day, ...c }: Common & { day: Date }) {
  const { t } = useI18n();
  const ks = key(day);
  return (
    <div className="wrap">
      <div className="board dayv">
        {c.members.map((m) => {
          const items = tasksFor(c, m.id, day);
          const md = items.filter((t) => c.done.has(`${t.id}|${ks}`)).length;
          return (
            <section key={m.id} className="dc" style={cv(m.color)}>
              <div className="dh2">
                <div className="av" aria-hidden="true">{m.emoji}</div>
                <div>
                  <div className="mn">{m.name}</div>
                  <div className="ms">⭐ {md} · {md}/{items.length}</div>
                </div>
              </div>
              <div className="dl">
                {items.length ? items.map((t) => <Chip key={t.id} task={t} dateKey={ks} c={c} />) : <p className="none">{t("noTasksToday")}</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function MonthView({ days, cur, onGoDay, ...c }: Common & { days: Date[]; cur: Date; onGoDay: (d: Date) => void }) {
  const { t, locale, dayShort } = useI18n();
  const todayK = key(new Date());
  return (
    <div className="wrap">
      <div className="board monthv">
        {dayShort.map((n) => (
          <div key={n} className="dh">{n}</div>
        ))}
        {days.map((d) => {
          const ks = key(d);
          const inM = d.getMonth() === cur.getMonth();
          let dt = 0;
          let dd = 0;
          const dots = c.members.flatMap((m) => {
            const items = tasksFor(c, m.id, d);
            if (!items.length) return [];
            const md = items.filter((t) => c.done.has(`${t.id}|${ks}`)).length;
            dt += items.length;
            dd += md;
            return [<i key={m.id} className={"dot " + (md === items.length ? "full" : md ? "part" : "")} style={cv(m.color)} />];
          });
          const label = t("monthDayLabel", {
            date: d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" }),
            done: dd,
            total: dt,
          });
          return (
            <button key={ks} className={"mday" + (inM ? "" : " out") + (ks === todayK ? " today" : "")} aria-label={label} onClick={() => onGoDay(d)}>
              <span className="n">{d.getDate()}</span>
              <span className="dots">{dots}</span>
              <span className="cnt">{dt ? `${dd}/${dt}` : ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

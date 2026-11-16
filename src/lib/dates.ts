export type View = "day" | "week" | "month";

const pad = (n: number) => String(n).padStart(2, "0");
export const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function parseKey(k: string) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const weekdayIdx = (d: Date) => (d.getDay() + 6) % 7; // 0 = lunes
export function mondayOf(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return addDays(x, -weekdayIdx(x));
}

export function monthGrid(cur: Date): Date[] {
  const y = cur.getFullYear();
  const m = cur.getMonth();
  const last = new Date(y, m + 1, 0);
  const days: Date[] = [];
  for (let d = mondayOf(new Date(y, m, 1)); d <= last || weekdayIdx(d) !== 0; d = addDays(d, 1)) days.push(d);
  return days;
}

export function viewDays(view: View, cur: Date): Date[] {
  if (view === "day") return [new Date(cur.getFullYear(), cur.getMonth(), cur.getDate())];
  if (view === "week") {
    const m = mondayOf(cur);
    return Array.from({ length: 7 }, (_, i) => addDays(m, i));
  }
  return monthGrid(cur);
}

export function labelFor(view: View, cur: Date, locale: string): string {
  if (view === "day") return cur.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  if (view === "month") return cur.toLocaleDateString(locale, { month: "long", year: "numeric" });
  const d = viewDays("week", cur);
  return `${d[0].toLocaleDateString(locale, { day: "numeric", month: "short" })} – ${d[6].toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`;
}

export function shiftCur(view: View, cur: Date, n: number): Date {
  if (view === "week") return addDays(cur, 7 * n);
  if (view === "day") return addDays(cur, n);
  return new Date(cur.getFullYear(), cur.getMonth() + n, 1);
}

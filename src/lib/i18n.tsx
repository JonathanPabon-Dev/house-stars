import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "es" | "en";

const es = {
  appName: "House Stars",
  tagline: "Tareas en familia",
  configMissingTitle: "Falta configurar Supabase",
  configMissingBody: "Crea un archivo .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (mira .env.example) y reinicia el servidor.",
  loading: "Cargando…",
  navBoard: "Tablero",
  navFamily: "Familia",
  signOut: "Salir",
  language: "Idioma",
  themeToLight: "Cambiar a tema claro",
  themeToDark: "Cambiar a tema oscuro",

  signIn: "Entrar",
  createFamily: "Crear familia",
  access: "Acceso",
  familyName: "Nombre de la familia",
  familyPh: "Ej. Familia Pérez",
  yourName: "Tu nombre",
  yourNamePh: "Ej. Mamá",
  username: "Usuario",
  password: "Contraseña",
  errBadCreds: "Usuario o contraseña incorrectos.",
  errUsernameFormat: "El usuario debe tener de 3 a 20 letras minúsculas, números o guion bajo.",
  errPasswordShort: "La contraseña debe tener al menos 6 caracteres.",
  errNameRequired: "Escribe un nombre.",
  errUserExists: "Ese usuario ya existe.",
  errNotAuth: "No has iniciado sesión.",
  errNotAdmin: "Solo los adultos pueden crear cuentas.",
  errConfirmEmail: "Cuenta creada, pero Supabase pide confirmar el correo. Desactiva «Confirm email» en Authentication → Providers → Email.",

  viewDay: "Día",
  viewWeek: "Semana",
  viewMonth: "Mes",
  view: "Vista",
  prev: "Anterior",
  next: "Siguiente",
  today: "Hoy",
  edit: "Editar",
  done: "Listo",
  newTask: "+ Nueva tarea",
  progress: "Progreso",
  whenDay: "hoy",
  whenWeek: "esta semana",
  whenMonth: "este mes",
  msgNone: "Sin tareas {when}",
  msgAll: "¡Todo listo {when}! 🎉",
  msgHalf: "¡Ya vamos a más de la mitad!",
  msgGo: "¡Vamos con ganas!",
  summarySub: "{done} de {total} tareas hechas {when}",
  footMonth: "Cada punto es una persona: lleno = todo hecho, mitad = en progreso, vacío = pendiente. Toca un día para ver su detalle.",
  footDefault: "Toca una tarea para marcarla como hecha. Solo puedes marcar tus tareas y las de tus hijos.",
  noTasksToday: "Sin tareas hoy 🎈",
  chipDisabled: "Solo quien administra esta tarea puede marcarla",
  deleteTask: "Borrar {title}",
  monthDayLabel: "{date}: {done} de {total} tareas hechas",

  newTaskTitle: "Nueva tarea",
  icon: "Ícono",
  task: "Tarea",
  taskPh: "Ej. Tender la cama",
  whoDoes: "¿Quién la hace?",
  whichDays: "¿Qué días?",
  cancel: "Cancelar",
  saveTask: "Guardar tarea",
  errTaskTitle: "Escribe el nombre de la tarea.",
  errTaskDays: "Elige al menos un día.",
  errTaskMember: "Elige quién la hace.",
  errSave: "No se pudo guardar la tarea.",

  people: "Personas",
  adult: "Adulto",
  child: "Niño/a",
  noAccount: "sin cuenta",
  usernameIs: "usuario: {u}",
  guardians: "Tutores",
  guardiansHelp: "Marca quién administra las tareas de cada persona. Un adulto siempre administra las suyas.",
  person: "Persona",
  manages: "{a} administra a {m}",
  addPerson: "Agregar persona sin cuenta",
  addPersonHelp: "Para quien no inicia sesión (por ejemplo, un niño pequeño). Sus tareas las marca un adulto tutor.",
  name: "Nombre",
  color: "Color",
  add: "Agregar",
  createAccount: "Crear cuenta con usuario y contraseña",
  type: "Tipo",
  typeChild: "Niño/a (marca sus tareas)",
  typeAdult: "Adulto (administra tareas)",
  createAccountBtn: "Crear cuenta",
  accountCreated: "Cuenta creada: {u}",
  errAdd: "No se pudo agregar.",
  errCreate: "No se pudo crear la cuenta.",
};

export type Key = keyof typeof es;

const en: Record<Key, string> = {
  appName: "House Stars",
  tagline: "Family chores",
  configMissingTitle: "Supabase is not configured",
  configMissingBody: "Create a .env.local file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example) and restart the dev server.",
  loading: "Loading…",
  navBoard: "Board",
  navFamily: "Family",
  signOut: "Sign out",
  language: "Language",
  themeToLight: "Switch to light theme",
  themeToDark: "Switch to dark theme",

  signIn: "Sign in",
  createFamily: "Create family",
  access: "Access",
  familyName: "Family name",
  familyPh: "E.g. The Smiths",
  yourName: "Your name",
  yourNamePh: "E.g. Mom",
  username: "Username",
  password: "Password",
  errBadCreds: "Wrong username or password.",
  errUsernameFormat: "Username must be 3–20 lowercase letters, numbers or underscores.",
  errPasswordShort: "Password must be at least 6 characters.",
  errNameRequired: "Enter a name.",
  errUserExists: "That username already exists.",
  errNotAuth: "You are not signed in.",
  errNotAdmin: "Only adults can create accounts.",
  errConfirmEmail: "Account created, but Supabase is asking for email confirmation. Turn off “Confirm email” in Authentication → Providers → Email.",

  viewDay: "Day",
  viewWeek: "Week",
  viewMonth: "Month",
  view: "View",
  prev: "Previous",
  next: "Next",
  today: "Today",
  edit: "Edit",
  done: "Done",
  newTask: "+ New task",
  progress: "Progress",
  whenDay: "today",
  whenWeek: "this week",
  whenMonth: "this month",
  msgNone: "No tasks {when}",
  msgAll: "All done {when}! 🎉",
  msgHalf: "Over halfway there!",
  msgGo: "Let’s go!",
  summarySub: "{done} of {total} tasks done {when}",
  footMonth: "Each dot is a person: filled = all done, half = in progress, empty = pending. Tap a day to see its details.",
  footDefault: "Tap a task to check it off. You can only check your own tasks and your children’s.",
  noTasksToday: "No tasks today 🎈",
  chipDisabled: "Only someone who manages this task can check it",
  deleteTask: "Delete {title}",
  monthDayLabel: "{date}: {done} of {total} tasks done",

  newTaskTitle: "New task",
  icon: "Icon",
  task: "Task",
  taskPh: "E.g. Make the bed",
  whoDoes: "Who does it?",
  whichDays: "Which days?",
  cancel: "Cancel",
  saveTask: "Save task",
  errTaskTitle: "Enter the task name.",
  errTaskDays: "Pick at least one day.",
  errTaskMember: "Pick who does it.",
  errSave: "Could not save the task.",

  people: "People",
  adult: "Adult",
  child: "Child",
  noAccount: "no account",
  usernameIs: "username: {u}",
  guardians: "Guardians",
  guardiansHelp: "Check who manages each person’s tasks. An adult always manages their own.",
  person: "Person",
  manages: "{a} manages {m}",
  addPerson: "Add a person without an account",
  addPersonHelp: "For someone who does not sign in (for example, a young child). A guardian adult checks off their tasks.",
  name: "Name",
  color: "Color",
  add: "Add",
  createAccount: "Create an account with username and password",
  type: "Type",
  typeChild: "Child (checks their own tasks)",
  typeAdult: "Adult (manages tasks)",
  createAccountBtn: "Create account",
  accountCreated: "Account created: {u}",
  errAdd: "Could not add.",
  errCreate: "Could not create the account.",
};

const dict = { es, en };

const DAYS = {
  es: {
    short: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    initial: ["L", "M", "X", "J", "V", "S", "D"],
    full: ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
  },
  en: {
    short: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    initial: ["M", "T", "W", "T", "F", "S", "S"],
    full: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  },
};

// Códigos de error que devuelve la Edge Function -> clave de traducción
export const EDGE_ERR: Record<string, Key> = {
  not_authenticated: "errNotAuth",
  not_admin: "errNotAdmin",
  bad_username: "errUsernameFormat",
  short_password: "errPasswordShort",
  no_name: "errNameRequired",
  exists: "errUserExists",
};

const LS = "hs-lang";
function initialLang(): Lang {
  try {
    const s = localStorage.getItem(LS);
    if (s === "es" || s === "en") return s;
  } catch {
    /* sin almacenamiento */
  }
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}

type Vars = Record<string, string | number>;
interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key, vars?: Vars) => string;
  locale: string;
  dayShort: string[];
  dayInitial: string[];
  dayFull: string[];
}

const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<Ctx>(() => {
    const t: Ctx["t"] = (k, vars) => {
      let s = dict[lang][k];
      if (vars) for (const [a, b] of Object.entries(vars)) s = s.split(`{${a}}`).join(String(b));
      return s;
    };
    return {
      lang,
      setLang: (l) => {
        setLangState(l);
        try {
          localStorage.setItem(LS, l);
        } catch {
          /* sin almacenamiento */
        }
      },
      t,
      locale: lang === "es" ? "es-CO" : "en-US",
      dayShort: DAYS[lang].short,
      dayInitial: DAYS[lang].initial,
      dayFull: DAYS[lang].full,
    };
  }, [lang]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n fuera de I18nProvider");
  return c;
}

// Texto de un error: traduce los códigos conocidos; si no, usa el mensaje o un texto genérico
export function errText(t: Ctx["t"], err: unknown, fallback: Key): string {
  const code = (err as { code?: string } | null)?.code;
  if (code && EDGE_ERR[code]) return t(EDGE_ERR[code]);
  const m = (err as { message?: string } | null)?.message;
  return m || t(fallback);
}

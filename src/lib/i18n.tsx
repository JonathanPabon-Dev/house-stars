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
  activeFamily: "Familia activa",
  signOut: "Salir",
  language: "Idioma",
  themeToLight: "Cambiar a tema claro",
  themeToDark: "Cambiar a tema oscuro",

  signIn: "Entrar",
  createFamily: "Crear familia",
  joinFamily: "Unirse a una familia",
  joinBtn: "Unirse",
  access: "Acceso",
  familyName: "Nombre de la familia",
  familyPh: "Ej. Familia Pérez",
  familyCode: "Código de la familia",
  familyCodePh: "Ej. ABCD2345",
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
  errNotAdmin: "Solo el administrador de la aplicación puede crear cuentas.",
  errCodeFormat: "El código debe tener 8 caracteres (letras y números).",
  errInvalidCode: "Ese código no existe. Pídelo a un adulto de tu familia.",
  errJoin: "No se pudo unir a la familia.",

  helpOpen: "Cómo se crea un usuario",
  helpTitle: "Cómo se crea un usuario",
  helpStep1: "Primera cuenta: «Crear familia» crea la familia y tu cuenta. Solo el administrador de la aplicación crea cuentas con contraseña para otras personas.",
  helpStep2: "Los demás miembros se unen con el código de la familia (Familia → Código para unirse). También pueden agregarse como personas sin cuenta.",
  helpStep3: "El administrador crea cuentas de adulto o niño con contraseña; el administrador y los adultos agregan personas sin cuenta. Un adulto tutor marca sus tareas.",
  helpStep4: "El usuario no lleva espacios: de 3 a 20 caracteres, solo letras minúsculas, números o guion bajo. La contraseña tiene al menos 6.",
  helpStep5: "Las cuentas se crean desde la app. Si las creas en el panel de Supabase, quedan sin familia ni tablero.",
  helpClose: "Entendido",

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
  admin: "Administrador/a",
  adult: "Adulto",
  child: "Niño/a",
  noAccount: "sin cuenta",
  usernameIs: "usuario: {u}",
  guardians: "Tutores",
  guardiansHelp: "Marca quién administra las tareas de cada persona. El administrador puede con todas; un adulto administra las suyas y las de sus acogidos.",
  person: "Persona",
  manages: "{a} administra a {m}",
  addPerson: "Agregar persona sin cuenta",
  addPersonHelp: "Para quien no inicia sesión (por ejemplo, un niño pequeño). El administrador y los adultos pueden agregarlos; sus tareas las marca un adulto tutor.",
  name: "Nombre",
  color: "Color",
  add: "Agregar",
  createAccount: "Crear cuenta con usuario y contraseña",
  type: "Tipo",
  typeChild: "Niño/a (solo marca sus tareas)",
  typeAdult: "Adulto (agrega acogidos y administra tareas)",
  createAccountBtn: "Crear cuenta",
  accountCreated: "Cuenta creada: {u}",
  familyCodeTitle: "Código para unirse",
  familyCodeHelp: "Comparte este código con los miembros de tu familia para que creen su cuenta y se unan a este tablero, en lugar de crear una familia nueva.",
  copyCode: "Copiar",
  copied: "Copiado",
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
  activeFamily: "Active family",
  signOut: "Sign out",
  language: "Language",
  themeToLight: "Switch to light theme",
  themeToDark: "Switch to dark theme",

  signIn: "Sign in",
  createFamily: "Create family",
  joinFamily: "Join a family",
  joinBtn: "Join",
  access: "Access",
  familyName: "Family name",
  familyPh: "E.g. The Smiths",
  familyCode: "Family code",
  familyCodePh: "E.g. ABCD2345",
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
  errNotAdmin: "Only the application administrator can create accounts.",
  errCodeFormat: "The code must be 8 characters (letters and numbers).",
  errInvalidCode: "That code does not exist. Ask an adult in your family for it.",
  errJoin: "Could not join the family.",

  helpOpen: "How to create a user",
  helpTitle: "How to create a user",
  helpStep1: "First account: “Create family” creates the family and your account. Only the application administrator creates password accounts for other people.",
  helpStep2: "Other members join with the family code (Family → Code to join). They can also be added as people without an account.",
  helpStep3: "The administrator creates adult or child accounts with a password; the administrator and adults add people without an account. A guardian adult checks off their tasks.",
  helpStep4: "Usernames have no spaces: 3 to 20 characters, lowercase letters, numbers or underscores only. Passwords are at least 6 characters.",
  helpStep5: "Accounts are created from the app. If you create them in the Supabase dashboard, they end up without a family or board.",
  helpClose: "Got it",

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
  admin: "Administrator",
  adult: "Adult",
  child: "Child",
  noAccount: "no account",
  usernameIs: "username: {u}",
  guardians: "Guardians",
  guardiansHelp: "Check who manages each person’s tasks. The administrator manages everyone; an adult manages their own and their wards’.",
  person: "Person",
  manages: "{a} manages {m}",
  addPerson: "Add a person without an account",
  addPersonHelp: "For someone who does not sign in (for example, a young child). The administrator and adults can add them; a guardian adult checks off their tasks.",
  name: "Name",
  color: "Color",
  add: "Add",
  createAccount: "Create an account with username and password",
  type: "Type",
  typeChild: "Child (only checks their own tasks)",
  typeAdult: "Adult (adds wards and manages tasks)",
  createAccountBtn: "Create account",
  accountCreated: "Account created: {u}",
  familyCodeTitle: "Code to join",
  familyCodeHelp: "Share this code with your family members so they create their account and join this board instead of creating a new family.",
  copyCode: "Copy",
  copied: "Copied",
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
  bad_code: "errCodeFormat",
  invalid_code: "errInvalidCode",
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

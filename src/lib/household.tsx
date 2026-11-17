import { createContext, useContext, useState, type ReactNode } from "react";
import { useHouseholds, useMe } from "./data";
import type { Household } from "./types";

const LS = "hs-household";

interface Ctx {
  activeId: string;
  active: Household | null;
  households: Household[];
  setActiveId: (id: string) => void;
}

const HouseholdCtx = createContext<Ctx | null>(null);

// Familia activa del tablero. El administrador de la aplicación puede cambiar
// entre todas las familias; cualquier otra persona queda fija en la suya.
export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { me } = useMe();
  const all = useHouseholds().data ?? [];
  const [picked, setPicked] = useState(() => {
    try {
      return localStorage.getItem(LS) ?? "";
    } catch {
      return "";
    }
  });

  const households = me?.role === "admin" ? all : all.filter((h) => h.id === me?.household_id);
  const active =
    households.find((h) => h.id === picked) ??
    households.find((h) => h.id === me?.household_id) ??
    households[0] ??
    null;

  function setActiveId(id: string) {
    setPicked(id);
    try {
      localStorage.setItem(LS, id);
    } catch {
      /* sin almacenamiento: la selección dura la sesión */
    }
  }

  return (
    <HouseholdCtx.Provider value={{ activeId: active?.id ?? me?.household_id ?? "", active, households, setActiveId }}>
      {children}
    </HouseholdCtx.Provider>
  );
}

export function useActiveHousehold() {
  const c = useContext(HouseholdCtx);
  if (!c) throw new Error("useActiveHousehold debe usarse dentro de HouseholdProvider");
  return c;
}

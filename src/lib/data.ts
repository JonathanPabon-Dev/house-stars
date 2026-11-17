import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DB_SCHEMA, supabase } from "./supabase";
import { useAuth } from "./auth";
import type { Completion, Guardian, Member, Task } from "./types";

// ---------- Lecturas ----------
export function useMembers() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["members"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data as Member[];
    },
  });
}

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("active", true).order("created_at");
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useGuardians() {
  return useQuery({
    queryKey: ["guardians"],
    queryFn: async () => {
      const { data, error } = await supabase.from("member_guardians").select("*");
      if (error) throw error;
      return data as Guardian[];
    },
  });
}

// Código para que otros miembros se unan a esta familia. La base lo entrega solo
// a admin/adultos; un niño recibe null.
export function useJoinCode(enabled: boolean) {
  return useQuery({
    queryKey: ["join-code"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("household_join_code");
      if (error) throw error;
      return (data as string | null) ?? null;
    },
  });
}

export function useCompletions(from: string, to: string) {
  return useQuery({
    queryKey: ["completions", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_completions")
        .select("*")
        .gte("done_on", from)
        .lte("done_on", to);
      if (error) throw error;
      return data as Completion[];
    },
  });
}

// La persona que inició sesión (su fila en members)
export function useMe() {
  const { session } = useAuth();
  const q = useMembers();
  const members = q.data ?? [];
  const me = members.find((m) => m.user_id === session?.user.id) ?? null;
  return { me, members, loading: q.isLoading };
}

// Refleja en la UI lo que ya imponen las políticas RLS (la base de datos manda).
export function makePerms(me: Member | null, guardians: Guardian[]) {
  const canManage = (memberId: string) =>
    !!me &&
    (me.role === "admin" || me.role === "adult") &&
    (me.id === memberId || guardians.some((g) => g.guardian_id === me.id && g.child_id === memberId));
  const canComplete = (memberId: string) => !!me && (me.id === memberId || canManage(memberId));
  return { canManage, canComplete };
}
export type Perms = ReturnType<typeof makePerms>;

// Tiempo real: si alguien marca una tarea en otro dispositivo, se actualiza aquí
export function useRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("task-completions")
      .on("postgres_changes", { event: "*", schema: DB_SCHEMA, table: "task_completions" }, () =>
        qc.invalidateQueries({ queryKey: ["completions"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
}

// ---------- Escrituras ----------
export function useToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { task: Task; date: string; done: boolean; by: string | null }) => {
      if (v.done) {
        const { error } = await supabase
          .from("task_completions")
          .delete()
          .eq("task_id", v.task.id)
          .eq("done_on", v.date);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("task_completions").insert({
          household_id: v.task.household_id,
          task_id: v.task.id,
          done_on: v.date,
          completed_by: v.by,
        });
        if (error && error.code !== "23505") throw error; // 23505 = ya estaba marcada
      }
    },
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["completions"] });
      const prev = qc.getQueriesData<Completion[]>({ queryKey: ["completions"] });
      qc.setQueriesData<Completion[]>({ queryKey: ["completions"] }, (old) => {
        if (!old) return old;
        const rest = old.filter((c) => !(c.task_id === v.task.id && c.done_on === v.date));
        if (v.done) return rest;
        return [
          ...rest,
          { id: `tmp-${v.task.id}-${v.date}`, household_id: v.task.household_id, task_id: v.task.id, done_on: v.date, completed_by: v.by },
        ];
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev.forEach(([k, d]) => qc.setQueryData(k, d)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["completions"] }),
  });
}

export function useAddTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: { household_id: string; member_id: string; title: string; emoji: string; weekdays: number[] }) => {
      const { error } = await supabase.from("tasks").insert(t);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

// Borrado lógico: se conserva el historial de cumplimiento
export function useRemoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").update({ active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: { household_id: string; name: string; emoji: string; color: string }) => {
      const { error } = await supabase.from("members").insert({ ...m, role: "child" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { username: string; password: string; name: string; role: "adult" | "child"; emoji: string; color: string }) => {
      const { data, error } = await supabase.functions.invoke("create-member", { body });
      if (error) {
        let msg = error.message;
        let code: string | undefined;
        try {
          const j = await (error as unknown as { context: Response }).context.json();
          if (j?.error) msg = j.error;
          code = j?.code;
        } catch {
          /* se usa el mensaje genérico */
        }
        throw Object.assign(new Error(msg), { code });
      }
      if (data?.error) throw Object.assign(new Error(data.error), { code: data.code });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useToggleGuardian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { household_id: string; guardian_id: string; child_id: string; linked: boolean }) => {
      if (v.linked) {
        const { error } = await supabase
          .from("member_guardians")
          .delete()
          .eq("guardian_id", v.guardian_id)
          .eq("child_id", v.child_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("member_guardians")
          .insert({ household_id: v.household_id, guardian_id: v.guardian_id, child_id: v.child_id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guardians"] }),
  });
}

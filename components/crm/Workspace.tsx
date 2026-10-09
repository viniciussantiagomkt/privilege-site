"use client";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { EMPTY_DATA, type WorkspaceData } from "@/lib/crm/model";
interface Result {
  error: { message: string } | null;
}
interface Workspace {
  data: WorkspaceData;
  loading: boolean;
  refreshing: boolean;
  errors: Record<string, string>;
  userId: string;
  email: string;
  role: string;
  operations: boolean;
  query: string;
  setQuery: (s: string) => void;
  reload: () => Promise<void>;
  run: (
    action: () => PromiseLike<Result>,
    success?: string,
  ) => Promise<boolean>;
  busy: boolean;
  notice: { text: string; error: boolean } | null;
  setNotice: (n: { text: string; error: boolean } | null) => void;
  updatedAt: Date | null;
}
const Context = createContext<Workspace | null>(null);
export const useWorkspace = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("CRM workspace missing");
  return ctx;
};
const tables = Object.keys(EMPTY_DATA) as (keyof WorkspaceData)[];
async function allRows(table: keyof WorkspaceData) {
  const rows: unknown[] = [];
  for (let start = 0; ; start += 500) {
    let q = supabase
      .from(table)
      .select("*")
      .order("id")
      .range(start, start + 499);
    if (["properties", "clients", "tasks"].includes(table))
      q = q.is("deleted_at", null);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 500) break;
  }
  return rows;
}
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WorkspaceData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Workspace["notice"]>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const gen = ++generation.current;
    setRefreshing(true);
    const result = await Promise.allSettled(tables.map(allRows));
    if (!mounted.current || gen !== generation.current) return;
    const nextErrors: Record<string, string> = {};
    const next: Record<string, unknown> = {};
    result.forEach((r, i) => {
      if (r.status === "fulfilled") next[tables[i]] = r.value;
      else
        nextErrors[tables[i]] =
          r.reason instanceof Error
            ? r.reason.message
            : "Não foi possível carregar.";
    });
    setData((old) => ({ ...old, ...next }));
    setErrors(nextErrors);
    setLoading(false);
    setRefreshing(false);
    setUpdatedAt(new Date());
  }, []);
  useEffect(() => {
    mounted.current = true;
    let alive = true;
    async function init() {
      const [
        {
          data: { user },
        },
        { data: dbRole, error },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc("current_user_role"),
      ]);
      if (!alive) return;
      if (!user || error) {
        setErrors({
          session: "Sua sessão não pôde ser validada. Entre novamente.",
        });
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setEmail(user.email || "");
      setRole(dbRole);
      await reload();
    }
    void init();
    const refresh = () => {
      if (document.visibilityState === "visible") void reload();
    };
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [reload]);
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout>;
    const channel = supabase.channel(`crm-workspace-${userId}`);
    tables.forEach((table) =>
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          clearTimeout(timer);
          timer = setTimeout(() => void reload(), 400);
        },
      ),
    );
    channel.subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [userId, reload]);
  const run = useCallback(
    async (action: () => PromiseLike<Result>, success = "Alteração salva.") => {
      if (lock.current) return false;
      lock.current = true;
      setBusy(true);
      setNotice(null);
      try {
        const { error } = await action();
        if (error) throw new Error(error.message);
        await reload();
        setNotice({ text: success, error: false });
        return true;
      } catch (err) {
        setNotice({
          text:
            err instanceof Error
              ? err.message
              : "Não foi possível salvar. Tente novamente.",
          error: true,
        });
        return false;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [reload],
  );
  return (
    <Context.Provider
      value={{
        data,
        loading,
        refreshing,
        errors,
        userId,
        email,
        role,
        operations: ["admin", "manager"].includes(role),
        query,
        setQuery,
        reload,
        run,
        busy,
        notice,
        setNotice,
        updatedAt,
      }}
    >
      {children}
    </Context.Provider>
  );
}

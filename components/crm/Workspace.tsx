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
import { usePathname } from "next/navigation";
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
  realtimeStatus: string;
  unreadCount: number | null;
}
const Context = createContext<Workspace | null>(null);
export const useWorkspace = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("CRM workspace missing");
  return ctx;
};
const tables = Object.keys(EMPTY_DATA) as (keyof WorkspaceData)[];
const marketingTables: (keyof WorkspaceData)[] = tables.filter((t) =>
  /^(marketing_|asset_|develop)/.test(t),
);
const modules: Record<string, (keyof WorkspaceData)[]> = {
  "/admin": ["leads", "properties", "sales", "tasks", "visits"],
  "/admin/campanhas": ["crm_campaigns", "crm_lead_attributions", "leads", "properties", "developments"],
  "/admin/leads": [
    "crm_lead_attributions",
    "leads",
    "clients",
    "properties",
    "tasks",
    "crm_contact_links",
    ...marketingTables,
  ],
  "/admin/contatos": ["clients", "leads", "properties", "crm_contact_links"],
  "/admin/agenda": ["tasks", "visits", "clients", "leads", "properties"],
  "/admin/imoveis": ["properties", "leads", "clients", ...marketingTables],
  "/admin/negocios": [
    "proposals",
    "negotiations",
    "sales",
    "clients",
    "properties",
  ],
  "/admin/marketing": ["properties", "leads", "clients", ...marketingTables],
  "/admin/apresentacoes": [
    "properties",
    "leads",
    "clients",
    ...marketingTables,
  ],
  "/admin/empreendimentos": [
    "developers",
    "developments",
    "development_units",
    "properties",
  ],
  "/admin/automacoes": ["crm_automation_preferences", "crm_event_log"],
  "/admin/equipe": ["leads", "properties", "sales", "tasks"],
};
async function allRows(table: keyof WorkspaceData) {
  if (table === "notifications") {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data || [];
  }
  const rows: unknown[] = [];
  // Bound the read. Larger portfolios need server pagination, not an unlimited loop.
  for (let start = 0; start < 500; start += 500) {
    let q = supabase
      .from(table)
      .select("*")
      .order(
        table === "crm_automation_preferences" ||
          table === "marketing_favorites"
          ? "owner_id"
          : "id",
      )
      .range(start, start + 500);
    if (["properties", "clients", "tasks", "leads"].includes(table))
      q = q.is("deleted_at", null);
    if (table === "marketing_favorites") q = q.order("asset_id");
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    if ((data || []).length > 500)
      throw new Error(
        "Mais de 500 registros. A lista requer paginação no servidor; os totais da equipe continuam no painel agregado.",
      );
    rows.push(...(data || []));
    if (!data || data.length < 500) break;
  }
  return rows;
}
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
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
  const [realtimeStatus, setRealtimeStatus] = useState("CONNECTING");
  const lock = useRef(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  const identity = useRef<{ id: string; role: string } | null>(null);
  const clearIdentity = useCallback(() => {
    generation.current++;
    identity.current = null;
    setData(EMPTY_DATA);
    setUnreadCount(null);
    setUserId("");
    setEmail("");
    setRole("");
    setQuery("");
    setNotice(null);
    setUpdatedAt(null);
  }, []);
  const reload = useCallback(async () => {
    const gen = ++generation.current;
    setRefreshing(true);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    const { data: dbRole, error: roleError } =
      await supabase.rpc("current_user_role");
    if (!mounted.current || gen !== generation.current) return;
    if (
      authError ||
      !user ||
      roleError ||
      !["admin", "manager", "broker", "corretor"].includes(dbRole)
    ) {
      clearIdentity();
      setErrors({ session: "Sessão ou permissão inválida. Entre novamente." });
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (
      identity.current &&
      (identity.current.id !== user.id || identity.current.role !== dbRole)
    ) {
      clearIdentity();
      setErrors({
        session: "A conta ou permissão mudou. Recarregue a página.",
      });
      setLoading(false);
      setRefreshing(false);
      return;
    }
    identity.current = { id: user.id, role: dbRole };
    setUserId(user.id);
    setEmail(user.email || "");
    setRole(dbRole);
    const requested = [
      ...new Set<keyof WorkspaceData>([
        "brokers",
        "notifications",
        ...(modules[pathname] || []),
      ]),
    ];
    const [result, countResult] = await Promise.all([
      Promise.allSettled(requested.map(allRows)),
      supabase.rpc("crm_unread_notification_count"),
    ]);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!mounted.current || gen !== generation.current) return;
    if (session?.user.id !== user.id) {
      clearIdentity();
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const nextErrors: Record<string, string> = {};
    setUnreadCount(countResult.error ? null : Number(countResult.data));
    if (countResult.error)
      nextErrors.notifications =
        "Não foi possível atualizar a contagem de notificações.";
    const next: Record<string, unknown> = {};
    result.forEach((r, i) => {
      if (r.status === "fulfilled") next[requested[i]] = r.value;
      else
        nextErrors[requested[i]] =
          r.reason instanceof Error
            ? r.reason.message
            : "Não foi possível carregar.";
    });
    // A denied request must discard the previous private rows.
    setData({ ...EMPTY_DATA, ...next } as WorkspaceData);
    setErrors(nextErrors);
    setLoading(false);
    setRefreshing(false);
    setUpdatedAt(new Date());
  }, [clearIdentity, pathname]);
  useEffect(() => {
    mounted.current = true;
    queueMicrotask(() => {
      if (mounted.current) void reload();
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session || identity.current?.id !== session.user.id) {
        clearIdentity();
        setLoading(!!session);
      }
      if (session)
        queueMicrotask(() => {
          void reload();
        });
    });
    const refresh = () => {
      if (document.visibilityState === "visible") void reload();
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      mounted.current = false;
      subscription.unsubscribe();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [reload, clearIdentity]);
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout>;
    const channel = supabase.channel(`crm-workspace-${userId}`);
    // Private Postgres Changes DELETE events are intentionally not subscribed.
    (["properties"] as const).forEach((table) =>
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          clearTimeout(timer);
          timer = setTimeout(() => void reload(), 400);
        },
      ),
    );
    channel.subscribe((status) => setRealtimeStatus(status));
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
      const expected = identity.current;
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        const { data: dbRole, error: roleError } =
          await supabase.rpc("current_user_role");
        if (
          !expected ||
          authError ||
          roleError ||
          user?.id !== expected.id ||
          dbRole !== expected.role ||
          identity.current?.id !== expected.id ||
          identity.current?.role !== expected.role
        ) {
          clearIdentity();
          setErrors({
            session: "A sessão ou permissão mudou. Reabra a sessão.",
          });
          throw new Error("A sessão ou permissão mudou. Reabra o formulário.");
        }
        const { error } = await action();
        if (error) throw new Error(error.message);
        if (
          identity.current?.id !== expected.id ||
          identity.current?.role !== expected.role
        )
          return false;
        await reload();
        if (
          identity.current?.id !== expected.id ||
          identity.current?.role !== expected.role
        )
          return false;
        setNotice({ text: success, error: false });
        return true;
      } catch (err) {
        if (!expected || identity.current?.id !== expected.id) return false;
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
    [reload, clearIdentity],
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
        realtimeStatus,
        unreadCount,
      }}
    >
      {children}
    </Context.Provider>
  );
}

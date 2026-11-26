// Standalone loopback fixtures. Never imported by the Next application.
import { createServer, request } from "node:http";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { DEMO_PROFILES, demoData } from "../tests/fixtures/operational-demo-data.mjs";
if (!process.argv.includes("--local-fixtures")) throw Error("Explicit --local-fixtures required");
const frontPort = Number(process.env.CRM_DEMO_PORT || 3210), nextPort = frontPort + 1, apiPort = frontPort + 2;
if (!Number.isInteger(frontPort) || frontPort < 1024 || apiPort > 65535) throw Error("Invalid loopback demo port");
const origin = `http://127.0.0.1:${frontPort}`, apiOrigin = `http://127.0.0.1:${apiPort}`;
const data = demoData(), tokens = new Map(), refresh = new Map(), key = randomBytes(32);
const encode = v => Buffer.from(JSON.stringify(v)).toString("base64url");
function session(profile) {
  const user = { id: profile.id, email: `${profile.alias}@example.invalid`, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  const exp = Math.floor(Date.now() / 1000) + 3600, parts = encode({ alg: "HS256", typ: "JWT" }) + "." + encode({ sub: profile.id, aud: "authenticated", role: "authenticated", exp });
  const token = parts + "." + createHmac("sha256", key).update(parts).digest("base64url"), r = randomUUID();
  tokens.set(token, { profile, exp }); refresh.set(r, profile);
  return { access_token: token, refresh_token: r, token_type: "bearer", expires_at: exp, expires_in: 3600, user };
}
function scoped(table, profile) {
  const rows = data[table] || [];
  if (table === "brokers") return rows;
  if (table === "negotiations") return rows.filter(r => scoped("proposals", profile).some(p => p.id === r.proposal_id));
  if (table === "crm_contact_links") return rows.filter(r => scoped("clients", profile).some(c => c.id === r.contact_id));
  return rows.filter(r => r.broker_id === profile.id || r.owner_id === profile.id || r.user_id === profile.id);
}
const api = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", origin);res.setHeader("Access-Control-Allow-Headers", "authorization,apikey,content-type,accept-profile,content-profile,prefer,x-client-info,range,range-unit,x-supabase-api-version");res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,PATCH,OPTIONS");res.setHeader("Access-Control-Expose-Headers", "Content-Range");
  const send = (value, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" });res.end(req.method === "HEAD" ? undefined : JSON.stringify(value)); };
  if (req.headers.origin && req.headers.origin !== origin) return send({ code: "42501" }, 403);
  if (req.method === "OPTIONS") return send(null, 200);
  const url = new URL(req.url, apiOrigin); let body = {};
  try { let text = "";for await (const c of req) { text += c;if (text.length > 40000) return send({ code: "22023" }, 413); }if (text) body = JSON.parse(text); } catch { return send({ code: "22023" }, 400); }
  const bearer = String(req.headers.authorization || "").replace(/^Bearer /, ""), stored = tokens.get(bearer), profile = stored && stored.exp > Date.now() / 1000 ? stored.profile : undefined;
  if (url.pathname === "/auth/v1/token") {
    const p = url.searchParams.get("grant_type") === "refresh_token" ? refresh.get(body.refresh_token) : body.password === "demo-local-only" && DEMO_PROFILES.find(p => `${p.alias}@example.invalid` === body.email);
    return p ? send(session(p)) : send({ code: "invalid_credentials" }, 400);
  }
  if (url.pathname === "/auth/v1/logout") { tokens.delete(bearer);res.writeHead(204);return res.end(); }
  if (url.pathname === "/auth/v1/user") return profile ? send({ id: profile.id, email: `${profile.alias}@example.invalid`, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} }) : send({ message: "Session absent" }, 401);
  if (!profile) return send({ code: "42501", message: "Local fixture session required" }, 401);
  if (url.pathname.startsWith("/rest/v1/rpc/")) {
    const rpc = url.pathname.split("/").at(-1);
    if (rpc === "current_user_role") return send(profile.role);
    if (rpc === "crm_unread_notification_count") return send(0);
    if (rpc === "crm_management_metrics") return send({ leads: 0, active_leads: 0, queue: 0, converted: 0, sales: 0, volume: 0, brokers: [] });
    // Unsupported writes never fall through to a real provider or report success.
    return send({ code: "PGRST202", message: "RPC not implemented in local fixtures" }, 404);
  }
  const table = url.pathname.split("/").at(-1);let rows = scoped(table, profile);
  for (const [field, condition] of url.searchParams) { if (condition.startsWith("eq.")) rows = rows.filter(r => String(r[field]) === condition.slice(3));if (condition === "is.null") rows = rows.filter(r => r[field] == null); }
  if (["POST", "PATCH"].includes(req.method)) {
    if (!["tasks", "visits"].includes(table)) return send({ code: "42501", message: "Only local agenda fixtures are writable" }, 403);
    if (body.broker_id && body.broker_id !== profile.id) return send({ code: "42501" }, 403);
    if (body.client_id && !scoped("clients", profile).some(c => c.id === Number(body.client_id))) return send({ code: "42501" }, 403);
    if (body.property_id && !scoped("properties", profile).some(p => p.id === Number(body.property_id))) return send({ code: "42501" }, 403);
    if (req.method === "PATCH") { if (!rows.length) return send({ code: "42501" }, 403);for (const row of rows) Object.assign(row, body, { updated_at: new Date().toISOString() }); }
    else { const row = { ...body, id: Math.max(0, ...data[table].map(r => r.id)) + 1, broker_id: profile.id, status: table === "tasks" ? "pendente" : "agendada", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null };data[table].push(row);rows = [row]; }
  } else if (!["GET", "HEAD"].includes(req.method)) return send({ code: "42501" }, 405);
  res.setHeader("Content-Range", rows.length ? `0-${rows.length - 1}/${rows.length}` : "*/0");
  const single = String(req.headers.accept || "").includes("vnd.pgrst.object");return send(single ? rows[0] || null : rows, req.method === "POST" ? 201 : 200);
});
await new Promise((resolve, reject) => { api.once("error", reject);api.listen(apiPort, "127.0.0.1", resolve); });
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(PATH|SystemRoot|WINDIR|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|ProgramFiles|ProgramFiles\(x86\)|ComSpec|PATHEXT)$/i.test(k)));
Object.assign(env, { NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_CRM_DEMO: "synthetic-loopback", NEXT_PUBLIC_SUPABASE_URL: apiOrigin, NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-local-fixture-only", NEXT_PUBLIC_SITE_URL: origin, VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "local/crm-demo" });
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(nextPort)], { env, stdio: ["ignore", "pipe", "pipe"] });
child.stdout.on("data", d => process.stdout.write(d));child.stderr.on("data", d => process.stderr.write(d));
const front = createServer((req, res) => {
  const upstream = request({ hostname: "127.0.0.1", port: nextPort, path: req.url, method: req.method, headers: req.headers }, response => {
    const headers = { ...response.headers, "content-security-policy": `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ${apiOrigin} ws://127.0.0.1:${frontPort} ws://127.0.0.1:${apiPort}; frame-src 'none'; form-action 'self'; base-uri 'self'` };
    res.writeHead(response.statusCode || 502, headers);response.pipe(res);
  });
  upstream.on("error", () => { res.writeHead(503);res.end("Local CRM starting"); });req.pipe(upstream);
});
front.on("upgrade", (req, socket, head) => {
  const upstream = request({ hostname: "127.0.0.1", port: nextPort, path: req.url, headers: req.headers });
  upstream.on("upgrade", (response, remote, extra) => { socket.write("HTTP/1.1 101 Switching Protocols\r\n" + Object.entries(response.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n") + "\r\n\r\n");if (head.length) remote.write(head);if (extra.length) socket.write(extra);socket.pipe(remote);remote.pipe(socket);remote.on("error", () => socket.destroy());socket.on("error", () => remote.destroy()); });
  upstream.on("error", () => socket.destroy());upstream.end();
});
await new Promise((resolve, reject) => { front.once("error", reject);front.listen(frontPort, "127.0.0.1", resolve); });
console.log(`LOCAL SYNTHETIC CRM: ${origin}/login; account a@example.invalid; password demo-local-only; writes only tasks/visits in memory.`);
const stop = () => { process.stdin.pause();child.kill();api.close();front.close(); };
process.on("SIGTERM", stop);process.on("SIGINT", stop);child.on("exit", () => { api.close();front.close(); });
process.stdin.on("data", value => { if (String(value).trim() === "stop") stop(); });

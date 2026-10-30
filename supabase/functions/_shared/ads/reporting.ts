// Backend-only adapters. No HTTP handler, credentials storage or scheduler is exposed here.
// Call only after resolving an authorized account in a trusted server worker.
export type Provider = "meta" | "google";
export interface AdCampaign { externalId: string; name: string; status: string; active: boolean }
export interface DailyMetric {
  campaignId: string; day: string; spendMicros: string;
  impressions: string; clicks: string;
  // Provider conversions are not CRM leads or closed sales.
  conversions: string | null;
  actions: { type: string; value: string }[];
}
export interface AdReport {
  provider: Provider; accountId: string; currency: string; timezone: string;
  campaigns: AdCampaign[]; daily: DailyMetric[];
}
type Fetcher = typeof fetch;
type Json = Record<string, unknown>;
export class AdsReadError extends Error {
  constructor(public code: "invalid_config" | "invalid_response" | "auth" | "rate_limit" | "unavailable" | "page_limit") {
    super(`ads_${code}`); this.name = "AdsReadError";
  }
}
function fail(): never { throw new AdsReadError("invalid_response"); }
function object(v: unknown): Json { if (!v || typeof v !== "object" || Array.isArray(v)) return fail(); return v as Json; }
function list(v: unknown): unknown[] { if (!Array.isArray(v)) return fail(); return v; }
function str(v: unknown): string { if (typeof v !== "string" || !v || v.length > 1000) return fail(); return v; }
function digits(v: unknown): string { const s = typeof v === "number" && Number.isSafeInteger(v) ? String(v) : str(v); if (!/^\d{1,30}$/.test(s)) return fail(); return s; }
function decimal(v: unknown): string {
  const s = typeof v === "number" && Number.isFinite(v) ? String(v) : str(v);
  if (!/^\d{1,24}(\.\d{1,12})?$/.test(s)) return fail(); return s;
}
export function spendToMicros(v: unknown): string {
  const [whole, fraction = ""] = decimal(v).split(".");
  if (fraction.length > 6) return fail();
  return (BigInt(whole) * BigInt(1000000) + BigInt(fraction.padEnd(6, "0"))).toString();
}
function day(v: unknown): string {
  const s = str(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) !== s) return fail();
  return s;
}
function windowDates(since: string, until: string) {
  day(since); day(until);
  const span = (Date.parse(until) - Date.parse(since)) / 86400000;
  if (span < 0 || span > 30) throw new AdsReadError("invalid_config");
}
function config(accountId: string, version: string, token: string, provider: Provider) {
  if (!/^\d{1,30}$/.test(accountId) || !(provider === "meta" ? /^v\d+\.\d+$/ : /^v\d+$/).test(version) || !token || /[\r\n]/.test(token)) throw new AdsReadError("invalid_config");
}
async function json(fetcher: Fetcher, url: string, token: string, body?: Json, extraHeaders?: Record<string,string>): Promise<Json> {
  try {
    const r = await fetcher(url, {
      method: body ? "POST" : "GET", redirect: "error", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}), ...extraHeaders },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!r.ok) {
      // Never log or propagate upstream bodies, tokens, URLs or account details.
      throw new AdsReadError(r.status === 401 || r.status === 403 ? "auth" : r.status === 429 ? "rate_limit" : "unavailable");
    }
    return object(await r.json());
  } catch (e) { if (e instanceof AdsReadError) throw e; throw new AdsReadError("unavailable"); }
}
function accountMeta(p: Json) {
  const currency = str(p.currency), timezone = str(p.timezone_name ?? p.timeZone);
  if (!/^[A-Z]{3}$/.test(currency)) return fail();
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }); } catch { return fail(); }
  return { currency, timezone };
}
async function metaPages(fetcher: Fetcher, base: string, params: URLSearchParams, token: string) {
  const rows: unknown[] = [], seen = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const p = await json(fetcher, `${base}?${params}`, token);
    rows.push(...list(p.data));
    if (!p.paging || !object(p.paging).next) return rows;
    const after = str(object(object(p.paging).cursors).after);
    if (seen.has(after)) return fail();
    seen.add(after); params.set("after", after);
    // The provider's next URL is deliberately never followed with credentials.
  }
  throw new AdsReadError("page_limit");
}
export interface ReadConfig { accountId: string; version: string; accessToken: string; since: string; until: string }
export async function readMetaReport(c: ReadConfig, fetcher: Fetcher = fetch): Promise<AdReport> {
  config(c.accountId, c.version, c.accessToken, "meta"); windowDates(c.since, c.until);
  const base = `https://graph.facebook.com/${c.version}/act_${c.accountId}`;
  const meta = await json(fetcher, `${base}?fields=account_id,currency,timezone_name`, c.accessToken);
  if (digits(meta.account_id) !== c.accountId) return fail();
  const campaigns = (await metaPages(fetcher, `${base}/campaigns`, new URLSearchParams({ fields: "id,name,effective_status", limit: "100" }), c.accessToken)).map(v => {
    const r = object(v), status = str(r.effective_status);
    return { externalId: digits(r.id), name: str(r.name), status, active: status === "ACTIVE" };
  });
  // Read the whole bounded period, including paused campaigns, to retain late corrections.
  const rows = await metaPages(fetcher, `${base}/insights`, new URLSearchParams({ level: "campaign", time_increment: "1", fields: "campaign_id,date_start,date_stop,spend,impressions,clicks,actions", time_range: JSON.stringify({ since: c.since, until: c.until }), limit: "100" }), c.accessToken);
  const ids = new Set(campaigns.map(v => v.externalId));
  const daily = rows.map(v => {
    const r = object(v), campaignId = digits(r.campaign_id), date = day(r.date_start);
    if (!ids.has(campaignId) || r.date_stop !== date || date < c.since || date > c.until) return fail();
    return { campaignId, day: date, spendMicros: spendToMicros(r.spend), impressions: digits(r.impressions), clicks: digits(r.clicks), conversions: null,
      actions: r.actions === undefined ? [] : list(r.actions).map(a => { const x = object(a); return { type: str(x.action_type), value: decimal(x.value) }; }),
    };
  });
  assertUnique(daily);
  return { provider: "meta", accountId: c.accountId, ...accountMeta(meta), campaigns, daily };
}
async function googlePages(c: ReadConfig & { loginCustomerId?: string }, query: string, fetcher: Fetcher) {
  const rows: unknown[] = [], seen = new Set<string>(); let pageToken: string | undefined;
  const headers: Record<string,string> = {};
  if (c.loginCustomerId) { if (!/^\d{10}$/.test(c.loginCustomerId)) throw new AdsReadError("invalid_config"); headers["login-customer-id"] = c.loginCustomerId; }
  for (let i = 0; i < 100; i++) {
    const p = await json(fetcher, `https://googleads.googleapis.com/${c.version}/customers/${c.accountId}/googleAds:search`, c.accessToken, { query, ...(pageToken ? { pageToken } : {}) }, headers);
    rows.push(...(p.results === undefined ? [] : list(p.results)));
    if (!p.nextPageToken) return rows;
    pageToken = str(p.nextPageToken); if (seen.has(pageToken)) return fail(); seen.add(pageToken);
  }
  throw new AdsReadError("page_limit");
}
export async function readGoogleReport(c: ReadConfig & { loginCustomerId?: string }, fetcher: Fetcher = fetch): Promise<AdReport> {
  config(c.accountId, c.version, c.accessToken, "google"); windowDates(c.since, c.until);
  if (!/^\d{10}$/.test(c.accountId)) throw new AdsReadError("invalid_config");
  const accounts = await googlePages(c, "SELECT customer.id, customer.currency_code, customer.time_zone FROM customer LIMIT 1", fetcher);
  if (accounts.length !== 1) return fail();
  const customer = object(object(accounts[0]).customer);
  if (digits(customer.id) !== c.accountId) return fail();
  const campaigns = (await googlePages(c, "SELECT campaign.id, campaign.name, campaign.status FROM campaign", fetcher)).map(v => {
    const r = object(object(v).campaign), status = str(r.status);
    return { externalId: digits(r.id), name: str(r.name), status, active: status === "ENABLED" };
  });
  const rows = await googlePages(c, `SELECT campaign.id, segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${c.since}' AND '${c.until}'`, fetcher);
  const ids = new Set(campaigns.map(v => v.externalId));
  const daily = rows.map(v => {
    const r = object(v), m = object(r.metrics), campaignId = digits(object(r.campaign).id), date = day(object(r.segments).date);
    if (!ids.has(campaignId) || date < c.since || date > c.until) return fail();
    // Google protobuf JSON omits default numeric values; keep int64 fields as strings.
    return { campaignId, day: date, spendMicros: digits(m.costMicros ?? "0"), impressions: digits(m.impressions ?? "0"), clicks: digits(m.clicks ?? "0"), conversions: decimal(m.conversions ?? "0"), actions: [] };
  });
  assertUnique(daily);
  return { provider: "google", accountId: c.accountId, ...accountMeta({ currency: customer.currencyCode, timeZone: customer.timeZone }), campaigns, daily };
}
function assertUnique(rows: DailyMetric[]) {
  const seen = new Set<string>();
  for (const r of rows) { const key = `${r.campaignId}:${r.day}`; if (seen.has(key)) return fail(); seen.add(key); }
}

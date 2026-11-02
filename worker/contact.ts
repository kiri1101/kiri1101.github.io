import { sendViaResend } from "./resend";
import { validateContact } from "./validate";

export { validateContact } from "./validate";

export type Env = {
  CONTACT_TO: string;
  RESEND_API_KEY: string;
  TURNSTILE_SECRET: string;
};

type Msg = { name: string; email: string; message: string };
type Deps = {
  verify?: (token: string, ip: string | null) => Promise<boolean>;
  send?: (msg: Msg) => Promise<void>;
};

const MAX_BODY_BYTES = 16 * 1024;
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SITEVERIFY_TIMEOUT_MS = 5000;

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "strict-origin-when-cross-origin", ...extra },
  });

/** Turnstile siteverify. Any failure, timeout or odd answer is a plain `false`: the caller treats it as 403. */
export async function verifyTurnstile(secret: string, token: string, ip: string | null, doFetch: typeof fetch = fetch): Promise<boolean> {
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip) form.set("remoteip", ip);
    const res = await doFetch(SITEVERIFY, { method: "POST", body: form.toString(), headers: { "content-type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS) });
    if (!res.ok) return false;
    return ((await res.json()) as { success?: unknown }).success === true;
  } catch {
    return false;
  }
}

/** Reads at most MAX_BODY_BYTES; null when the body is larger (counted as it streams, whatever Content-Length says). */
async function readCapped(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

export async function handleContact(request: Request, env: Env, deps: Deps = {}): Promise<Response> {
  if (request.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" }, { allow: "POST" });

  // Same-origin only: a browser form on another site sends its own Origin; non-browser clients send none.
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== new URL(request.url).origin) return json(403, { ok: false, error: "forbidden" });
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return json(415, { ok: false, error: "unsupported_media_type" });

  const raw = await readCapped(request);
  if (raw === null) return json(413, { ok: false, error: "too_large" });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, errors: { form: "invalid_request" } });
  }
  const parsed = validateContact(body);
  if (!parsed.ok) return json(400, { ok: false, errors: parsed.errors });
  const { token, ...msg } = parsed.value;

  if (!token) return json(403, { ok: false, error: "verification_failed" });
  const verify = deps.verify ?? ((t: string, ip: string | null) => verifyTurnstile(env.TURNSTILE_SECRET, t, ip));
  let human = false;
  try {
    human = await verify(token, request.headers.get("cf-connecting-ip"));
  } catch {
    human = false;
  }
  if (!human) return json(403, { ok: false, error: "verification_failed" });

  try {
    await (deps.send ?? ((m: Msg) => sendViaResend(env, m)))(msg);
  } catch (err) {
    // Only the error's class is logged: never its message (it can echo the visitor's address) or the form data.
    console.error("contact: send failed", err instanceof Error ? err.name : "unknown");
    return json(502, { ok: false, error: "send_failed" });
  }
  return json(200, { ok: true });
}

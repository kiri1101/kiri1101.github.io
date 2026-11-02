import { describe, expect, it, vi } from "vitest";
import { handleContact, verifyTurnstile, type Env } from "./contact";
import { isErrorCode, validateContact } from "./validate";

const env = { CONTACT_TO: "hello@jordan-tukum.pages.dev", RESEND_API_KEY: "k", TURNSTILE_SECRET: "s" } as unknown as Env;
const good = { name: "Amara Okafor", email: "amara@studio.example", message: "I need a calmer onboarding flow.", token: "tok" };

const post = (body: unknown, headers: Record<string, string> = {}, raw?: string) =>
  new Request("https://jordan-tukum.pages.dev/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: raw ?? JSON.stringify(body),
  });

function deps(over: { verify?: boolean; sendThrows?: boolean } = {}) {
  const verify = vi.fn(async (_token: string, _ip: string | null) => over.verify ?? true);
  const send = vi.fn(async (_msg: { name: string; email: string; message: string }) => {
    if (over.sendThrows) throw new Error("smtp secret stack boom");
  });
  return { verify, send };
}

describe("validateContact", () => {
  it("accepts a good body and trims", () => {
    const r = validateContact({ ...good, name: "  Amara Okafor  " });
    expect(r).toEqual({ ok: true, value: good });
  });
  it("rejects non-objects and bad fields with per-field errors", () => {
    expect(validateContact(null).ok).toBe(false);
    const r = validateContact({ name: "", email: "amara@studio", message: "short" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["email", "message", "name"]);
  });
  it("enforces length limits", () => {
    expect(validateContact({ ...good, name: "x".repeat(101) }).ok).toBe(false);
    expect(validateContact({ ...good, message: "x".repeat(4001) }).ok).toBe(false);
    expect(validateContact({ ...good, message: "x".repeat(4000) }).ok).toBe(true);
  });
  it("strips CR/LF from the name and rejects them in the email", () => {
    const r = validateContact({ ...good, name: "Amara\r\nBcc: evil@x.example" });
    expect(r.ok && r.value.name).toBe("Amara Bcc: evil@x.example");
    expect(validateContact({ ...good, email: "a@b.example\r\nBcc: e@x.example" }).ok).toBe(false);
  });
});

describe("validateContact email shapes", () => {
  it.each(["a@b.c>,<x@evil.example", "a@b.c,x@evil.example", "<a@b.c>", "a@b.c;x@e.example", "a\"x@b.c", "a@b.c\u0000"])("rejects %s", (email) => {
    expect(validateContact({ ...good, email }).ok).toBe(false);
  });
});

describe("handleContact", () => {
  it("200 and sends once on a good request", async () => {
    const d = deps();
    const res = await handleContact(post(good, { "cf-connecting-ip": "203.0.113.9" }), env, d);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(d.verify).toHaveBeenCalledWith("tok", "203.0.113.9");
    expect(d.send).toHaveBeenCalledWith({ name: "Amara Okafor", email: "amara@studio.example", message: good.message });
  });
  it("405 for non-POST", async () => {
    const res = await handleContact(new Request("https://jordan-tukum.pages.dev/api/contact"), env, deps());
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });
  it("400 with field errors, nothing verified or sent", async () => {
    const d = deps();
    const res = await handleContact(post({ ...good, email: "nope" }), env, d);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; errors: Record<string, string> };
    expect(body.ok).toBe(false);
    expect(body.errors).toEqual({ email: "email_invalid" });
    expect(d.send).not.toHaveBeenCalled();
  });
  it("400 on malformed JSON, with a code and not a sentence", async () => {
    const res = await handleContact(post(null, {}, "{not json"), env, deps());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, errors: { form: "invalid_request" } });
  });
  it("validateContact reports each failure as its fixed code", () => {
    const bad = (over: Record<string, string>) => {
      const r = validateContact({ ...good, ...over });
      return r.ok ? {} : r.errors;
    };
    expect(bad({ name: "" })).toEqual({ name: "name_required" });
    expect(bad({ name: "x".repeat(101) })).toEqual({ name: "name_too_long" });
    expect(bad({ email: "<b>@x.y" })).toEqual({ email: "email_invalid" });
    expect(bad({ message: "short" })).toEqual({ message: "message_too_short" });
    expect(bad({ message: "x".repeat(4001) })).toEqual({ message: "message_too_long" });
  });
  it("isErrorCode accepts the codes and rejects any other text", () => {
    for (const c of ["name_required", "name_too_long", "email_invalid", "message_too_short", "message_too_long", "invalid_request"]) {
      expect(isErrorCode(c)).toBe(true);
    }
    for (const t of ["Tell me your name.", "", "<script>", "NAME_REQUIRED", 5, null, undefined]) expect(isErrorCode(t)).toBe(false);
  });
  it("403 on a missing token, without sending or calling siteverify", async () => {
    const d = deps();
    const { token: _t, ...noToken } = good;
    const res = await handleContact(post(noToken), env, d);
    expect(res.status).toBe(403);
    expect(d.send).not.toHaveBeenCalled();
    expect(d.verify).not.toHaveBeenCalled();
  });
  it("403 when Turnstile rejects the token", async () => {
    const d = deps({ verify: false });
    const res = await handleContact(post(good), env, d);
    expect(res.status).toBe(403);
    expect(d.send).not.toHaveBeenCalled();
  });
  it("403 when verification throws", async () => {
    const d = deps();
    d.verify.mockRejectedValueOnce(new Error("timeout"));
    const res = await handleContact(post(good), env, d);
    expect(res.status).toBe(403);
    expect(d.send).not.toHaveBeenCalled();
  });
  it("413 for a 1 MB body before parsing", async () => {
    const d = deps();
    const big = JSON.stringify({ ...good, message: "x".repeat(1024 * 1024) });
    const res = await handleContact(post(null, {}, big), env, d);
    expect(res.status).toBe(413);
    expect(d.verify).not.toHaveBeenCalled();
  });
  it("413 when Content-Length is absent or lies", async () => {
    const big = JSON.stringify({ ...good, message: "x".repeat(40_000) });
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(big));
        c.close();
      },
    });
    const req = new Request("https://jordan-tukum.pages.dev/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "100" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect((await handleContact(req, env, deps())).status).toBe(413);
  });
  it("502 on a send failure, leaking nothing from the error", async () => {
    const res = await handleContact(post(good), env, deps({ sendThrows: true }));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ ok: false, error: "send_failed" });
    expect(text).not.toMatch(/smtp|secret|stack|boom/);
  });
  it("403 for a foreign Origin, allows the site's own and a missing one", async () => {
    const d = deps();
    expect((await handleContact(post(good, { origin: "https://evil.example" }), env, d)).status).toBe(403);
    expect(d.send).not.toHaveBeenCalled();
    expect((await handleContact(post(good, { origin: "https://jordan-tukum.pages.dev" }), env, d)).status).toBe(200);
    expect((await handleContact(post(good), env, d)).status).toBe(200);
  });
  it("415 for a non-JSON content type", async () => {
    const d = deps();
    const res = await handleContact(post(good, { "content-type": "text/plain" }), env, d);
    expect(res.status).toBe(415);
    expect(d.send).not.toHaveBeenCalled();
  });
  it("never logs the message or email", async () => {
    const spies = (["log", "info", "warn", "error"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    await handleContact(post(good), env, deps({ sendThrows: true }));
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain("amara@studio.example");
    expect(logged).not.toContain("calmer onboarding");
    spies.forEach((s) => s.mockRestore());
  });
});

describe("verifyTurnstile", () => {
  it("posts secret, response and ip with a timeout signal, and reads success", async () => {
    const f = vi.fn(async (_u: string, init: RequestInit) => {
      expect(init.signal).toBeDefined();
      const p = new URLSearchParams(init.body as string);
      expect([p.get("secret"), p.get("response"), p.get("remoteip")]).toEqual(["s", "tok", "1.2.3.4"]);
      return new Response(JSON.stringify({ success: true }));
    });
    expect(await verifyTurnstile("s", "tok", "1.2.3.4", f as unknown as typeof fetch)).toBe(true);
    expect(f.mock.calls[0]![0]).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
  });
  it("is false on failure, non-2xx or a thrown fetch", async () => {
    const bad = async () => new Response(JSON.stringify({ success: false }));
    const down = async () => new Response("x", { status: 500 });
    const boom = async () => {
      throw new Error("t");
    };
    expect(await verifyTurnstile("s", "t", null, bad as unknown as typeof fetch)).toBe(false);
    expect(await verifyTurnstile("s", "t", null, down as unknown as typeof fetch)).toBe(false);
    expect(await verifyTurnstile("s", "t", null, boom as unknown as typeof fetch)).toBe(false);
  });
});

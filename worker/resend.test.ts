import { describe, expect, it, vi } from "vitest";
import { handleContact, type Env } from "./contact";
import { sendViaResend } from "./resend";

const env = { CONTACT_TO: "owner@example.test", RESEND_API_KEY: "re_key" };
const msg = { name: "Amara Okafor", email: "amara@studio.example", message: "Hello there." };

describe("sendViaResend", () => {
  it("POSTs the mail to Resend with the bearer key, Reply-To the visitor and a plain-text body", async () => {
    const doFetch = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response("{}", { status: 200 }));
    await sendViaResend(env, msg, doFetch as unknown as typeof fetch);
    expect(doFetch).toHaveBeenCalledOnce();
    const [url, init] = doFetch.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ authorization: "Bearer re_key", "content-type": "application/json" });
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({
      from: "Jordan Tukum — Portfolio <onboarding@resend.dev>",
      to: "owner@example.test",
      reply_to: "amara@studio.example",
      subject: "New message from Amara Okafor",
      text: "From: Amara Okafor <amara@studio.example>\n\nHello there.\n",
    });
    expect(body.html).toBeUndefined();
  });

  it.each([400, 401, 422, 429, 500])("throws on HTTP %i without echoing Resend's body", async (status) => {
    const doFetch = async () => new Response("secret amara@studio.example", { status });
    const err = await sendViaResend(env, msg, doFetch as unknown as typeof fetch).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe(`resend: HTTP ${status}`);
  });

  it("lets a network failure propagate", async () => {
    const doFetch = async () => {
      throw new TypeError("network");
    };
    await expect(sendViaResend(env, msg, doFetch as unknown as typeof fetch)).rejects.toThrow("network");
  });

  it("passes an abort signal so a stalled Resend cannot hang the request", async () => {
    const doFetch = vi.fn(async (_u: string | URL | Request, _i?: RequestInit) => new Response("{}"));
    await sendViaResend(env, msg, doFetch as unknown as typeof fetch);
    expect(doFetch.mock.calls[0]![1]?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("handleContact with the Resend sender", () => {
  const fullEnv = { ...env, TURNSTILE_SECRET: "s" } as unknown as Env;
  const post = (body: unknown) =>
    new Request("https://site.example/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const good = { name: "Amara Okafor", email: "amara@studio.example", message: "I need a calmer onboarding flow.", token: "t" };
  const run = (body: unknown, doFetch: typeof fetch) =>
    handleContact(post(body), fullEnv, { verify: async () => true, send: (m) => sendViaResend(fullEnv, m, doFetch) });

  it("answers 502 send_failed when the Resend call times out", async () => {
    const doFetch = async () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    };
    const res = await run(good, doFetch as unknown as typeof fetch);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "send_failed" });
  });

  it("rejects a CR/LF email with 400 and never calls Resend", async () => {
    const doFetch = vi.fn();
    const res = await run({ ...good, email: "a@b.example\nBcc: x@y.example" }, doFetch as unknown as typeof fetch);
    expect(res.status).toBe(400);
    expect(doFetch).not.toHaveBeenCalled();
  });

  it("sends a name with CR/LF with no raw CR or LF in the subject", async () => {
    const doFetch = vi.fn(async (_u: string | URL | Request, _i?: RequestInit) => new Response("{}"));
    const res = await run({ ...good, name: "a\r\nBcc: x" }, doFetch as unknown as typeof fetch);
    expect(res.status).toBe(200);
    const sent = JSON.parse(String(doFetch.mock.calls[0]![1]?.body));
    expect(sent.subject).not.toMatch(/[\r\n]/);
    expect(sent.subject).toContain("Bcc: x");
  });
});

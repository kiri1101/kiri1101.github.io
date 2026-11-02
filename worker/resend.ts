import type { Env } from "./contact";

const ENDPOINT = "https://api.resend.com/emails";
// With no custom domain, Resend only lets onboarding@resend.dev send, and only to the Resend account's own address.
const TIMEOUT_MS = 8000;
const FROM = "Jordan Tukum — Portfolio <onboarding@resend.dev>";

type Msg = { name: string; email: string; message: string };

/**
 * Sends one contact-form message through Resend. The visitor is only Reply-To (validated: no whitespace or control
 * characters). A non-2xx answer throws, which handleContact turns into a 502; the error carries the status only, never
 * Resend's body (it can echo the visitor's address).
 */
export async function sendViaResend(env: Pick<Env, "RESEND_API_KEY" | "CONTACT_TO">, msg: Msg, doFetch: typeof fetch = fetch): Promise<void> {
  const res = await doFetch(ENDPOINT, {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: env.CONTACT_TO,
      reply_to: msg.email,
      subject: `New message from ${msg.name}`,
      text: `From: ${msg.name} <${msg.email}>\n\n${msg.message}\n`,
    }),
  });
  if (!res.ok) throw new Error(`resend: HTTP ${res.status}`);
}

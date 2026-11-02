import { handleContact, type Env } from "../../worker/contact";
import { sendViaResend } from "../../worker/resend";

// Cloudflare Pages Function for /api/contact. `onRequestPost` is the handler; `onRequest` catches every other method so
// handleContact answers it with 405 (Pages would otherwise fall through to the static 404 page).
type Context = { request: Request; env: Env };
const handle = ({ request, env }: Context) => handleContact(request, env, { send: (msg) => sendViaResend(env, msg) });

export const onRequestPost = handle;
export const onRequest = handle;

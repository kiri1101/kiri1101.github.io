/** Contact-form validation, shared by the Worker (the authority) and the form (instant feedback). Pure: no runtime APIs. */
export const LIMITS = { nameMax: 100, messageMin: 10, messageMax: 4000, emailMax: 254 } as const;

export type ContactInput = { name: string; email: string; message: string; token: string };
/**
 * What the Worker says is wrong, as codes and never as sentences: the form turns them into words in the visitor's
 * language (app/i18n/strings.ts). A code is a fixed word, so nothing the visitor typed can come back in a response.
 */
export const ERROR_CODES = ["name_required", "name_too_long", "email_invalid", "message_too_short", "message_too_long", "invalid_request"] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
export type ContactResult = { ok: true; value: ContactInput } | { ok: false; errors: Record<string, ErrorCode> };

export const isErrorCode = (v: unknown): v is ErrorCode => ERROR_CODES.includes(v as ErrorCode);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** C0 controls (CR and LF included) and DEL: never allowed to reach a header. */
// eslint-disable-next-line no-control-regex
const CONTROLS = /[\u0000-\u001f\u007f]+/g;

export function validateContact(body: unknown): ContactResult {
  const src = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  // The name ends up in the Subject: control characters (CR/LF) are replaced, never passed on.
  const name = str(src.name).replace(CONTROLS, " ").trim();
  const email = str(src.email).trim();
  const message = str(src.message).trim();
  const token = str(src.token);

  const errors: Record<string, ErrorCode> = {};
  if (name.length < 1) errors.name = "name_required";
  else if (name.length > LIMITS.nameMax) errors.name = "name_too_long";
  if (!EMAIL.test(email) || EMAIL_FORBIDDEN.test(email) || email.length > LIMITS.emailMax) errors.email = "email_invalid";
  if (message.length < LIMITS.messageMin) errors.message = "message_too_short";
  else if (message.length > LIMITS.messageMax) errors.message = "message_too_long";

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { name, email, message, token } };
}

/** Characters that could end or split a mailbox in a header: angle brackets, list separators, quotes, controls. */
// eslint-disable-next-line no-control-regex
const EMAIL_FORBIDDEN = /[<>,;"\u0000-\u001f\u007f]/;

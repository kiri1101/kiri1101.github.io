import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { LIMITS, isErrorCode, validateContact, type ErrorCode } from "../../worker/validate";
import { useSite, useUi } from "~/i18n/use-locale";
import type { Strings } from "~/i18n/strings";
import { site as rawSite } from "~/site.config";

type TurnstileApi = {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id?: string): void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
/** How early the script is fetched: a screen's height before the form shows. Never at page load. */
const NEAR = "400px 0px";
const TOKEN_WAIT_MS = 10_000;

let scriptLoad: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  scriptLoad ??= new Promise<TurnstileApi>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    el.onerror = () => {
      scriptLoad = null;
      reject(new Error("turnstile blocked"));
    };
    document.head.append(el);
  });
  return scriptLoad;
}

type Fields = "name" | "email" | "message";
type Status = "idle" | "sending" | "sent" | "failed";
const FIELDS: { id: Fields; autoComplete: string }[] = [
  { id: "name", autoComplete: "name" },
  { id: "email", autoComplete: "email" },
  { id: "message", autoComplete: "off" },
];

/** The words for an error code the Worker (or the form's own check) reported, in the page's language. */
function errorText(u: Strings["form"]["errors"], code: ErrorCode): string {
  switch (code) {
    case "name_too_long":
      return u.name_too_long(LIMITS.nameMax);
    case "message_too_short":
      return u.message_too_short(LIMITS.messageMin);
    case "message_too_long":
      return u.message_too_long(LIMITS.messageMax);
    default:
      return u[code];
  }
}

export function ContactForm() {
  const u = useUi().form;
  const site = useSite();
  const formRef = useRef<HTMLFormElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const token = useRef<string | null>(null);
  const waiter = useRef<((t: string | null) => void) | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const [wanted, setWanted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Partial<Record<Fields, ErrorCode>>>({});
  const [firstName, setFirstName] = useState("");

  const setToken = useCallback((t: string | null) => {
    token.current = t;
    if (t) {
      waiter.current?.(t);
      waiter.current = null;
    }
  }, []);

  // Load Turnstile only when the form is about to be seen (or touched), never with the page.
  useEffect(() => {
    const form = formRef.current;
    if (!form || wanted) return;
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && setWanted(true),
      { rootMargin: NEAR },
    );
    io.observe(form);
    return () => io.disconnect();
  }, [wanted]);

  useEffect(() => {
    if (!wanted) return;
    let gone = false;
    loadTurnstile()
      .then((api) => {
        if (gone || !widgetRef.current) return;
        widgetId.current = api.render(widgetRef.current, {
          sitekey: rawSite.contact.turnstileSiteKey,
          theme: "dark",
          size: "flexible", // the real widget, always shown and as wide as the form; no look-alike checkbox of ours
          callback: (t: string) => {
            setBlocked(false); // a retry that works clears an earlier widget error
            setToken(t);
          },
          "expired-callback": () => setToken(null),
          "error-callback": () => {
            setToken(null);
            setBlocked(true);
            waiter.current?.(null);
            waiter.current = null;
          },
        });
      })
      .catch(() => {
        if (gone) return;
        setBlocked(true);
        waiter.current?.(null);
        waiter.current = null;
      });
    return () => {
      gone = true;
      if (widgetId.current !== undefined) window.turnstile?.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, [wanted, setToken]);

  useEffect(() => {
    if (status === "sent") successRef.current?.focus();
  }, [status]);

  const resetWidget = () => {
    setToken(null);
    if (widgetId.current !== undefined) window.turnstile?.reset(widgetId.current);
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const data = new FormData(e.currentTarget);
    const input = { name: String(data.get("name") ?? ""), email: String(data.get("email") ?? ""), message: String(data.get("message") ?? "") };
    const checked = validateContact(input);
    if (!checked.ok) {
      setErrors(checked.errors as Partial<Record<Fields, ErrorCode>>);
      const first = FIELDS.find((f) => checked.errors[f.id]);
      if (first) e.currentTarget.elements.namedItem(first.id) instanceof HTMLElement && (e.currentTarget.elements.namedItem(first.id) as HTMLElement).focus();
      return;
    }
    setErrors({});
    setStatus("sending");
    setWanted(true);

    // The token is usually ready by now; if the check is still running, wait for it a moment.
    const t = token.current ?? (blocked ? null : await new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), TOKEN_WAIT_MS);
      waiter.current = (tk) => {
        clearTimeout(timer);
        resolve(tk);
      };
    }));
    waiter.current = null;
    if (!t) return setStatus("failed");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...checked.value, token: t }),
      });
      resetWidget(); // a Turnstile token works once
      if (res.ok) {
        setFirstName(checked.value.name.split(" ")[0] ?? "");
        return setStatus("sent");
      }
      if (res.status === 400) {
        const body = (await res.json().catch(() => null)) as { errors?: Partial<Record<Fields, unknown>> } | null;
        // Only the Worker's known codes are taken; anything else is a failure, never text shown as it came.
        const known = Object.fromEntries(FIELDS.filter((f) => isErrorCode(body?.errors?.[f.id])).map((f) => [f.id, body!.errors![f.id]]));
        if (Object.keys(known).length > 0) {
          setErrors(known as Partial<Record<Fields, ErrorCode>>);
          return setStatus("idle");
        }
      }
      setStatus("failed");
    } catch {
      resetWidget();
      setStatus("failed");
    }
  }

  const mail = `mailto:${site.owner.email}`;

  return (
    <form ref={formRef} className="cf" method="post" action="/api/contact" noValidate onSubmit={onSubmit} onFocusCapture={() => setWanted(true)} aria-label={u.aria}>
      {status === "sent" ? (
        <div className="cf-status" data-kind="ok" role="status" tabIndex={-1} ref={successRef}>
          <b>{u.sentTitle(firstName)}</b>
          <span>{u.sentBody}</span>
        </div>
      ) : (
        <>
          {FIELDS.map((f) => {
            const err = errors[f.id];
            const common = {
              id: `cf-${f.id}`,
              name: f.id,
              placeholder: site.contact.placeholders[f.id],
              autoComplete: f.autoComplete,
              required: true,
              "aria-invalid": err ? (true as const) : undefined,
              "aria-describedby": err ? `cf-${f.id}-err` : undefined,
            };
            return (
              <div className="cf-field" key={f.id} data-invalid={err ? "" : undefined}>
                <label htmlFor={common.id}>{u[f.id === "message" ? "project" : f.id]}</label>
                {f.id === "message" ? <textarea {...common} rows={5} /> : <input {...common} type={f.id === "email" ? "email" : "text"} />}
                {err && (
                  <p className="cf-msg" id={`cf-${f.id}-err`}>
                    {errorText(u.errors, err)}
                  </p>
                )}
              </div>
            );
          })}
          <div className="cf-widget" ref={widgetRef} />
          <button className="cf-send" type="submit" disabled={status === "sending"} aria-busy={status === "sending"}>
            {status === "sending" ? u.sending : u.send} <i aria-hidden="true">↗</i>
          </button>
          <p className="cf-note">{site.contact.note}</p>
          {(status === "failed" || blocked) && (
            <div className="cf-status" data-kind="fail" role="alert">
              <b>{u.failTitle}</b>
              <span>
                {u.failBefore}
                <a href={mail}>{site.owner.email}</a>
                {u.failAfter}
              </span>
            </div>
          )}
        </>
      )}
    </form>
  );
}

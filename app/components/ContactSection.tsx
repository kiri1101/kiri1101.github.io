import { useRef, useState } from "react";
import { ContactForm } from "~/components/ContactForm";
import { useSite, useUi } from "~/i18n/use-locale";

/** Puts text on the clipboard: the async API where there is one, else a hidden textarea and `execCommand`. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.append(field);
    field.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      field.remove();
    }
  }
}

/** The address as a mailto link, with a real button beside it that copies the address. */
function EmailRow({ email }: { email: string }) {
  const u = useUi().contact;
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const copy = async () => {
    setState((await copyText(email)) ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2500);
  };
  return (
    <div className="direct-email">
      <a href={`mailto:${email}`}>{email}</a>
      <button type="button" className="tag" onClick={copy}>
        {state === "copied" ? u.copied : u.copy}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? u.copiedSr : state === "failed" ? u.copyFailedSr : ""}
      </span>
    </div>
  );
}

/** The contact layout; the working form mounts into `#contact-form-slot`. */
export function ContactSection() {
  const u = useUi().contact;
  const site = useSite();
  return (
    <section className="contact" id="contact" aria-labelledby="contact-heading">
      <div>
        <div className="kicker">
          <b>02</b>{u.kicker}
        </div>
        <h2 id="contact-heading">
          {site.cta.label}<i>.</i>
        </h2>
        <p className="lead">
          {site.contact.lead}
        </p>
        <div className="direct">
          <EmailRow email={site.owner.email} />
          <a href={site.call.url} target="_blank" rel="noopener noreferrer">
            {site.call.label} <span>{site.owner.phone}</span>
          </a>
        </div>
        <ul className="socials" aria-label={u.elsewhere}>
          {site.socials.map(({ label, url }) => (
            <li key={label}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {label} ↗
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div id="contact-form-slot">
        <ContactForm />
      </div>
    </section>
  );
}

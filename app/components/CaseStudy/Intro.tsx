import { useUi } from "~/i18n/use-locale";
import type { CaseStudy } from "~/lib/case-study";

const pad = (n: number) => String(n).padStart(2, "0");

/** The title's id: client-side navigation moves focus to it (work.$slug.tsx). */
export const TITLE_ID = "cs-title";

/**
 * The case study's left column, pinned while the gallery scrolls on wide screens: its place in the collection, the
 * title, the category, the summary, the facts and the outcome figures.
 *
 * Phones show less here, as the approved phone layout does, so the hero image fits the first screen: the summary's
 * claim without its dimmed purpose, two figures with their short labels. The rest stays in the HTML, visually hidden
 * (case-study.css), so screen readers still read the whole summary and every figure.
 */
export function CaseStudyIntro({ cs }: { cs: CaseStudy }) {
  const u = useUi().study;
  const facts = [
    { term: u.role, value: cs.role },
    { term: u.timeline, value: cs.timeline },
    { term: u.team, value: cs.team },
    { term: u.platforms, value: cs.platforms },
  ];
  // "…patients," then "so …": on phones the claim ends with a full stop instead of the comma.
  const { lead, rest } = cs.summary;
  const claim = rest ? lead.replace(/,$/, "") : lead;
  return (
    <div className="cs-intro">
      <p className="cs-idx">
        {pad(cs.index + 1)} / {pad(cs.count)}
      </p>
      <h1 id={TITLE_ID} tabIndex={-1}>
        {cs.title}
      </h1>
      <p className="cs-cat">
        {cs.discipline} · {cs.year}
      </p>
      <p className="cs-lead">
        {claim}
        {rest && (
          <>
            <span className="cs-lead-comma">,</span>
            <span className="cs-lead-stop" aria-hidden="true">
              .
            </span>
            <span className="cs-lead-rest"> {rest}</span>
          </>
        )}
      </p>
      <dl className="cs-meta">
        {facts.map((f) => (
          <div key={f.term}>
            <dt>{f.term}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
      <ul className="cs-stats" aria-label={u.outcomes}>
        {cs.stats.map((s) => (
          <li key={s.label} className={s.short ? "has-short" : undefined}>
            <strong>{s.value}</strong>
            <span className="cs-stat-label">{s.label}</span>
            {s.short && (
              <span className="cs-stat-short" aria-hidden="true">
                {s.short}
              </span>
            )}
          </li>
        ))}
      </ul>
      {cs.links.length > 0 && (
        <ul className="cs-links">
          {cs.links.map((l) => (
            <li key={l.url}>
              <a href={l.url} rel="noopener">
                {l.label} <i aria-hidden="true">↗</i>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

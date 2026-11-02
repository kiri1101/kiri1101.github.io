import { useUi } from "~/i18n/use-locale";
import type { CaseStudy } from "~/lib/case-study";
import { Picture } from "./Picture";

/**
 * The case study's right column: the cover (the first screen's image), the story, then each section's image with
 * its caption, a bold lead-in and one sentence.
 */
export function CaseStudyGallery({ cs }: { cs: CaseStudy }) {
  const u = useUi().study;
  return (
    <div className="cs-gallery">
      <figure className="cs-shot cs-cover">
        <Picture picture={cs.cover} priority />
        {cs.illustrative && <figcaption className="cs-illus">{u.illustrative}</figcaption>}
      </figure>
      <section className="cs-story" aria-labelledby="cs-overview">
        <h2 className="cs-kicker" id="cs-overview">
          {u.overview}
        </h2>
        {/* Written by the owner in the project's Markdown file and rendered at build time. */}
        <div className="cs-body" dangerouslySetInnerHTML={{ __html: cs.bodyHtml }} />
        {cs.architecture.length > 0 && (
          <>
            <h2 className="cs-kicker cs-sub" id="cs-architecture">
              {u.architecture}
            </h2>
            <ol className="cs-layers" aria-labelledby="cs-architecture">
              {cs.architecture.map((a) => (
                <li key={a.label}>
                  <b>{a.label}</b>
                  <span>{a.description}</span>
                </li>
              ))}
            </ol>
          </>
        )}
        {cs.keyDecision && (
          <>
            <h2 className="cs-kicker cs-sub" id="cs-decision">
              {u.keyDecision}
            </h2>
            <p className="cs-decision">
              {cs.keyDecision}
            </p>
          </>
        )}
      </section>
      {cs.sections.map((s) => (
        <figure className="cs-shot" key={s.picture.src}>
          <Picture picture={s.picture} />
          <figcaption>
            <b>{s.lead}</b> {s.caption}
            {cs.illustrative && <span className="cs-illus">{u.illustrative}</span>}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

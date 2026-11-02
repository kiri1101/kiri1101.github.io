import { useLocale, useSite, useUi } from "~/i18n/use-locale";
import { formatYears, monogramOf } from "~/site.config";

export function About({ year }: { year: number }) {
  const locale = useLocale();
  const u = useUi().about;
  const site = useSite();
  const { about } = site;
  return (
    <section className="about" id="about" aria-labelledby="about-statement">
      <div>
        <div className="portrait" aria-hidden="true">
          <span>{monogramOf(site.owner.name)}</span>
        </div>
        <dl className="facts">
          {about.facts.map(({ term, value }) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{typeof value === "function" ? value(year, locale) : value}</dd>
            </div>
          ))}
        </dl>
        <a className="cv-link" href={site.cv} download>
          {u.cv} <i aria-hidden="true">↓</i>
        </a>
      </div>
      <div>
        <div className="kicker">
          <b>01</b>{u.kicker}
        </div>
        <h2 className="stmt" id="about-statement">
          {about.statement.lead} <span>{about.statement.span}</span>
        </h2>
        <ul className="figures" aria-label={u.figures}>
          {about.stats.map((s) => (
            <li key={s.label}>
              <strong>{typeof s.value === "function" ? s.value(year) : s.value}</strong>
              <span>{s.label}</span>
              <small>{s.caption}</small>
            </li>
          ))}
        </ul>
        <h3 className="sub">{u.method}</h3>
        <ul className="principles">
          {about.method.map(({ title, text }) => (
            <li key={title}>
              <h4>{title}</h4>
              <p>{text}</p>
            </li>
          ))}
        </ul>
        <h3 className="sub">{u.experience}</h3>
        <ul className="exp" aria-label={u.experience}>
          {about.experience.map((e) => (
            <li key={e.organisation}>
              <span>{formatYears(e.from, e.to, u.now)}</span>
              <span>
                {e.role}, {e.organisation}
                <small>{e.text}</small>
              </span>
            </li>
          ))}
        </ul>
        <h3 className="sub">{u.education}</h3>
        <ul className="exp" aria-label={u.education}>
          {about.education.map((e) => (
            <li key={e.title}>
              <span>{e.year}</span>
              <span>
                {e.title}
                <small>{[e.school, ...e.notes].join(" · ")}</small>
              </span>
            </li>
          ))}
        </ul>
        <h3 className="sub">{u.skills}</h3>
        <ul className="exp" aria-label={u.skills}>
          {about.skills.map((tier) => (
            <li key={tier.title}>
              <span>{tier.title}</span>
              <span>{tier.items.join(" · ")}</span>
            </li>
          ))}
        </ul>
        <h3 className="sub">{u.reach}</h3>
        <ul className="exp" aria-label={u.reach}>
          <li>
            <span>{u.sectors}</span>
            <span>{about.sectors.join(" · ")}</span>
          </li>
          <li>
            <span>{u.deliveredFor}</span>
            <span>{about.deliveredFor.join(" · ")}</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

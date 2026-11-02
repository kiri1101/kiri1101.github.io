import { useSite, useUi } from "~/i18n/use-locale";

export function Hero() {
  const site = useSite();
  const u = useUi().hero;
  const { headline, sub, aside } = site.hero;
  return (
    <section className="hero" id="hero" aria-label={u.aria}>
      <div className="hero-left">
        <h1>
          {headline[0]}
          <span>{headline[1]}</span>
        </h1>
        <p className="sub">{sub}</p>
        <a className="cta" href="#contact">
          {site.cta.label} <i aria-hidden="true">↗</i>
        </a>
      </div>
      <div className="hero-right">
        <p>
          {aside.lead}
          <span>{aside.dim}</span>
        </p>
        <ul className="pills" aria-label={u.services}>
          {site.services.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      <div className="hint" aria-hidden="true">
        {u.scroll}
      </div>
    </section>
  );
}

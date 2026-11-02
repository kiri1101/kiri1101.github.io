import { useUi } from "~/i18n/use-locale";

/** Title shown while the camera flies from the studio into the galaxy. Starts hidden; Task 5 fades it. */
export function Transit({ summary }: { summary: string }) {
  const u = useUi().transit;
  return (
    <div className="transit" id="transit">
      <div>
        <h2>
          {u.lead} <em>{u.em}</em>
        </h2>
        <p id="summary">{summary}</p>
      </div>
    </div>
  );
}

import type { Picture as PictureData } from "~/lib/case-study";

/**
 * How wide the gallery's images are drawn (case-study.css). From 1024 px they fill the right-hand column: the
 * viewport less the gutters, the left column and the gap (capped by the page's 1680 px max width). Below, one column
 * between the gutters (40 px, then 22 px on phones).
 */
export const GALLERY_SIZES = [
  "(min-width: 1280px) min(calc(100vw - 646px), 1034px)",
  "(min-width: 1024px) calc(100vw - 560px)",
  "(min-width: 761px) calc(100vw - 80px)",
  "calc(100vw - 44px)",
].join(", ");

type Props = {
  picture: PictureData;
  /** The first screen's image: fetched at high priority. Every other image waits until it nears the viewport. */
  priority?: boolean;
  sizes?: string;
};

/**
 * A content image: AVIF where the browser takes it, else WebP, at the width the layout needs, sized against shifts.
 * An art-directed source (the cover's phone crop) carries its own media query, `sizes`, width and height, so the box
 * takes that crop's shape before it loads.
 */
export function Picture({ picture, priority = false, sizes = GALLERY_SIZES }: Props) {
  return (
    <picture>
      {picture.sources.map((s) => (
        <source
          key={`${s.media ?? "all"} ${s.type}`}
          type={s.type}
          srcSet={s.srcSet}
          sizes={s.sizes ?? sizes}
          media={s.media}
          width={s.width}
          height={s.height}
        />
      ))}
      <img
        src={picture.src}
        srcSet={picture.srcSet}
        sizes={sizes}
        width={picture.width}
        height={picture.height}
        alt={picture.alt}
        {...(priority ? { fetchPriority: "high" as const } : { loading: "lazy" as const, decoding: "async" as const })}
      />
    </picture>
  );
}

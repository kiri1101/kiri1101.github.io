/**
 * The image pipeline's sizes, shared by the pages (case-study.ts) and the capture script (scripts/capture-images.ts).
 * No imports, so Node can load it as it is.
 */

/** The widths the image pipeline writes (`npm run images`): each image at 800 w and at 1600 w. */
export const IMAGE_WIDTHS = [800, 1600] as const;

/**
 * Every cover has a portrait crop for phones beside it, `<name>-phone.avif` (and its variants), at this size: the
 * approved phone layout's tall hero frame (5:6). The image pipeline writes it from the same composition.
 */
export const PHONE_CROP = { suffix: "-phone", width: 1600, height: 1920 } as const;

/** Pixel size of a card texture (the 3D scene's upload size). Here, import-free, so the card-textures script can load it under plain Node. */
export const CARD_TEXTURE = { width: 1024, height: 640 } as const;

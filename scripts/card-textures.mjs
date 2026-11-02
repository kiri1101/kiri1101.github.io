// Writes each project's card texture beside its cover: card.avif and card.webp at exactly the size the 3D scene
// uploads (CARD_TEXTURE in app/scene/types.ts). Decoded at that size, a texture needs no resize or flip in
// createImageBitmap, which Chrome would otherwise do on the main thread. Run after any cover changes:
//   npm run card-textures
// It also records, in scripts/card-textures.lock.json, the hash of each cover and of the textures made from it. The
// projects unit test compares them with the files, so a cover changed without new textures fails `npm test`.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import sharp from "sharp";
import { CARD_TEXTURE } from "../app/lib/images.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content", "projects", "fr");
const lockFile = join(root, "scripts", "card-textures.lock.json");
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

const lock = {};
for (const file of readdirSync(contentDir).filter((f) => f.endsWith(".md")).sort()) {
  const { data } = matter(readFileSync(join(contentDir, file), "utf8"));
  const cover = data.cover?.src;
  if (typeof cover !== "string") throw new Error(`${file}: no cover.src`);
  const source = join(root, "public", cover);
  const outDir = dirname(source);
  // The same framing as the card shows it: the cover scaled to fill the card, centred. Cards are opaque, so no alpha.
  const img = sharp(source).resize(CARD_TEXTURE.width, CARD_TEXTURE.height, { fit: "cover", position: "centre" }).removeAlpha();
  await img.clone().avif({ quality: 60 }).toFile(join(outDir, "card.avif"));
  await img.clone().webp({ quality: 85 }).toFile(join(outDir, "card.webp"));
  lock[data.slug] = {
    cover: sha256(source),
    avif: sha256(join(outDir, "card.avif")),
    webp: sha256(join(outDir, "card.webp")),
  };
  console.log(`card texture: ${cover} -> ${join(dirname(cover), "card.{avif,webp}").replaceAll("\\", "/")}`);
}
writeFileSync(lockFile, `${JSON.stringify(lock, null, 2)}\n`);
console.log(`card texture: hashes recorded in ${lockFile.slice(root.length + 1).replaceAll("\\", "/")}`);

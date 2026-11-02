import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const dir = join(process.cwd(), "content", "projects", "en");

/** The English projects as the content files define them, in order: the tests derive counts and titles from here. */
export const projects = readdirSync(dir)
  .filter((f) => f.endsWith(".md"))
  .map((f) => matter(readFileSync(join(dir, f), "utf8")).data)
  .map((d) => ({ slug: String(d.slug), title: String(d.title), order: Number(d.order) }))
  .sort((a, b) => a.order - b.order);

export const COUNT = projects.length;
export const pad2 = (n: number) => String(n).padStart(2, "0");
/** "NN / MM" for the 1-based position `n`. */
export const idx = (n: number) => `${pad2(n)} / ${pad2(COUNT)}`;
export const last = projects[COUNT - 1];

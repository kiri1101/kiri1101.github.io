import { NotFound } from "~/components/NotFound";

/** `/en/404`: the English 404 page as a prerendered route, which the build writes as `en/404.html` (react-router.config.ts). */
export default function EnglishNotFound() {
  return <NotFound />;
}

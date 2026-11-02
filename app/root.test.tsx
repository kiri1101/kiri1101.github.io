import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, test } from "vitest";
import { ErrorBoundary } from "./root";

const page = (path: string) => {
  const router = createMemoryRouter([{ path: "*", element: <ErrorBoundary error={new Error("boom")} params={{}} /> }], {
    initialEntries: [path],
  });
  return renderToStaticMarkup(<RouterProvider router={router} />);
};

// M1: the generic error page is the 404 page's style (cream on night) with a way back, not unstyled template markup.
test("a generic error renders in the 404 style with a way back, in the page's language", () => {
  const en = page("/en/projects/x");
  expect(en).toContain('class="cs cs-404"');
  expect(en).toContain("Something went wrong");
  expect(en).toContain('aria-label="Back to orbit"');
  expect(en).toContain('href="/en"');
  expect(en).not.toMatch(/\b(pt-16|container|mx-auto)\b/);

  const fr = page("/projets/x");
  expect(fr).toContain("Une erreur est survenue");
  expect(fr).toContain("Retour à l’orbite");
  expect(fr).not.toContain("Something went wrong");
});

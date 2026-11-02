/**
 * Whether the app has finished its first render. The root marks it in an effect, and a parent's effects run after
 * its children's, so a route that checks this in its own effect sees `false` on the page load and `true` once it is
 * reached by client-side navigation.
 */
let rendered = false;

export function markFirstRender(): void {
  rendered = true;
}

export function afterFirstRender(): boolean {
  return rendered;
}

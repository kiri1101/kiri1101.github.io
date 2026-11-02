import { expect, test, type Page, type Route } from "@playwright/test";

// The Worker is covered by worker/contact.test.ts; here /api/contact is mocked to drive every UI state of the form,
// and Cloudflare's script is replaced by a stub that "passes" at once, so nothing depends on the network.
const STUB = `window.turnstile={render:function(el,o){setTimeout(function(){o.callback('test-token')},50);return 'w1'},reset:function(){},remove:function(){}};`;
const stubTurnstile = (page: Page) =>
  page.route("https://challenges.cloudflare.com/**", (r: Route) => r.fulfill({ contentType: "text/javascript", body: STUB }));

const fill = async (page: Page, over: Partial<Record<"name" | "email" | "message", string>> = {}) => {
  await page.getByLabel("Name", { exact: true }).fill(over.name ?? "Amara Okafor");
  await page.getByLabel("Email", { exact: true }).fill(over.email ?? "amara@studio.example");
  await page.getByLabel("Project", { exact: true }).fill(over.message ?? "I need a calmer onboarding flow for our clinic app.");
};

test.beforeEach(async ({ page }) => {
  await stubTurnstile(page);
});

test("Turnstile is not requested until the form is near, then loads once", async ({ page }) => {
  const seen: string[] = [];
  page.on("request", (r) => r.url().includes("challenges.cloudflare.com") && seen.push(r.url()));
  await page.goto("/en");
  await page.waitForLoadState("load");
  await page.waitForTimeout(1500);
  expect(seen).toHaveLength(0);
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect.poll(() => seen.length).toBe(1);
});

test("empty and invalid fields show inline errors and send nothing", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/contact", (r) => (calls++, r.fulfill({ status: 200, json: { ok: true } })));
  await page.goto("/en#contact");
  const send = page.getByRole("button", { name: /send message/i });
  await send.click();
  await expect(page.getByText("Tell me your name.")).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
  await fill(page, { email: "amara@studio", message: "short" });
  await send.click();
  await expect(page.getByText("Enter a full email address, like name@company.com")).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("aria-invalid", "true");
  expect(calls).toBe(0);
});

test("a good message shows sending, posts the Turnstile token, then the success state", async ({ page }) => {
  let body: Record<string, string> = {};
  await page.route("**/api/contact", async (r) => {
    body = r.request().postDataJSON();
    await new Promise((res) => setTimeout(res, 400));
    await r.fulfill({ status: 200, json: { ok: true } });
  });
  await page.goto("/en#contact");
  await fill(page);
  const send = page.getByRole("button", { name: /send/i });
  await expect(page.getByText("Verified you're human")).toBeVisible();
  await send.click();
  await expect(page.getByRole("button", { name: /sending/i })).toBeDisabled();
  await expect(page.getByText("Message sent. Thank you, Amara.")).toBeVisible();
  expect(body).toMatchObject({ name: "Amara Okafor", email: "amara@studio.example", token: "test-token" });
});

test("on phones the Send button spans the full form width", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout only");
  await page.goto("/en#contact");
  const form = await page.locator("form.cf").boundingBox();
  const btn = await page.getByRole("button", { name: /send message/i }).boundingBox();
  expect(form && btn && Math.abs(form.width - 2 * 22 - 2 - btn.width) <= 2).toBe(true);
});

for (const status of [403, 502, 500]) {
  test(`a ${status} answer shows the friendly failure with the direct email link`, async ({ page }) => {
    await page.route("**/api/contact", (r) => r.fulfill({ status, json: { ok: false, error: "x" } }));
    await page.goto("/en#contact");
    await fill(page);
    await page.getByRole("button", { name: /send message/i }).click();
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("That didn't go through.");
    await expect(alert.getByRole("link", { name: "jtukum@outlook.com" })).toHaveAttribute("href", "mailto:jtukum@outlook.com");
    await expect(page.getByLabel("Project", { exact: true })).toHaveValue(/calmer onboarding/); // nothing typed is lost
  });
}

test("server-side field errors (400) show inline", async ({ page }) => {
  await page.route("**/api/contact", (r) => r.fulfill({ status: 400, json: { ok: false, errors: { email: "email_invalid" } } }));
  await page.goto("/en#contact");
  await fill(page);
  await page.getByRole("button", { name: /send message/i }).click();
  await expect(page.getByText("Enter a full email address, like name@company.com")).toBeVisible();
});

test("a blocked Turnstile script shows the friendly failure instead of a dead end", async ({ page }) => {
  await page.unroute("https://challenges.cloudflare.com/**");
  await page.route("https://challenges.cloudflare.com/**", (r) => r.abort());
  await page.goto("/en#contact");
  await page.locator("#contact").scrollIntoViewIfNeeded();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("That didn't go through.");
  await expect(alert.getByRole("link", { name: "jtukum@outlook.com" })).toBeVisible();
});

test("a retry that passes after a widget error clears the failure alert", async ({ page }) => {
  await page.unroute("https://challenges.cloudflare.com/**");
  const flaky = "window.turnstile={render:function(el,o){setTimeout(function(){o[\"error-callback\"]()},50);setTimeout(function(){o.callback(\"tok\")},2500);return \"w1\"},reset:function(){},remove:function(){}};";
  await page.route("https://challenges.cloudflare.com/**", (r) => r.fulfill({ contentType: "text/javascript", body: flaky }));
  await page.goto("/en#contact");
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("alert")).toBeHidden();
  await expect(page.getByText("Verified you're human")).toBeVisible();
});

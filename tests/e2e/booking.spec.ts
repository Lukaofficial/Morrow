import { expect, Page, test } from "@playwright/test";

/** A date far enough out for the train to have plenty of free places. */
function dateAhead(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

async function openBerthMap(page: Page, date: string) {
  await page.goto(`/search?from=paris&to=vienna&date=${date}`);
  await page.getByRole("link", { name: /^Couchette from/ }).click();
  await expect(page).toHaveURL(/\/book\/transalpine-out-/);
}

const freeBerth = (page: Page) => page.getByRole("button", { name: /^Car 5, compartment .*€/ });

test("a traveller books a berth, finds it again, and cancels it", async ({ page }) => {
  await openBerthMap(page, dateAhead(20));

  await freeBerth(page).first().click();
  await page.getByRole("button", { name: "Hold these" }).click();
  await expect(page).toHaveURL(/\/book\/checkout\//);

  // The form refuses bad input and says why.
  await page.getByRole("button", { name: /^Confirm/ }).click();
  await expect(page.locator("p[role=alert]")).toBeVisible();

  await page.getByLabel("Name on the door").fill("Test Passenger");
  await page.getByLabel("Email").fill("passenger@example.com");
  await page.getByRole("button", { name: /^Confirm/ }).click();

  await expect(page).toHaveURL(/\/ticket\//);
  await expect(page.getByRole("heading", { name: /going to sleep well/i })).toBeVisible();
  const reference = (await page.locator("strong").filter({ hasText: "MRW-" }).first().textContent())!.trim();

  const calendar = await page.request.get(`${new URL(page.url()).pathname.replace("/ticket/", "/api/tickets/")}/calendar`);
  expect(calendar.headers()["content-type"]).toContain("text/calendar");
  expect(await calendar.text()).toContain(`Booking ${reference}`);

  // Wrong email finds nothing, and doesn't say which half was wrong.
  await page.goto("/manage");
  await page.getByLabel("Booking reference").fill(reference);
  await page.getByLabel("Email you booked with").fill("someone@else.com");
  await page.getByRole("button", { name: "Find it" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("No booking matches");

  await page.getByLabel("Email you booked with").fill("passenger@example.com");
  await page.getByRole("button", { name: "Find it" }).click();
  await expect(page).toHaveURL(/\/ticket\//);

  await page.getByRole("button", { name: "Cancel booking" }).click();
  await page.getByRole("button", { name: "Yes, cancel" }).click();
  await expect(page.getByRole("heading", { name: "Booking cancelled" })).toBeVisible();
});

test("two people can't hold the same berth", async ({ browser }) => {
  const date = dateAhead(21);
  const alice = await (await browser.newContext()).newPage();
  const bruno = await (await browser.newContext()).newPage();
  await openBerthMap(alice, date);
  await openBerthMap(bruno, date);

  const label = await freeBerth(alice).first().getAttribute("aria-label");
  const name = label!.replace(/, €.*$/, "");

  // Both have it selected. Alice gets to the button first.
  await alice.getByRole("button", { name: label! }).click();
  await bruno.getByRole("button", { name: label! }).click();
  await alice.getByRole("button", { name: "Hold these" }).click();
  await expect(alice).toHaveURL(/\/book\/checkout\//);

  // Bruno is told, whether the poll or his own click gets there first.
  await bruno.getByRole("button", { name: "Hold these" }).click({ timeout: 2000 }).catch(() => undefined);
  await expect(bruno.getByText(/Someone (else just took|got there first)/)).toBeVisible();
  await expect(bruno.getByRole("button", { name: `${name}, taken` })).toBeDisabled();
});

test("the operations room needs a password, and its changes reach the public board", async ({ page, request }) => {
  await page.goto("/ops");
  await expect(page).toHaveURL(/\/ops\/login/);

  const refused = await request.patch("/api/ops/departures/anything", { data: { delayMinutes: 5 } });
  expect(refused.status()).toBe(401);

  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("not the password");

  await page.getByLabel("Password").fill("e2e-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Sales by day" })).toBeVisible();

  // Tomorrow's trains are all still to leave, so they can always be delayed.
  await page.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/ops\?date=/);
  const date = new URL(page.url()).searchParams.get("date")!;

  const firstTrain = page.locator("tbody tr").first();
  const [from, to] = (await firstTrain.locator("td").nth(2).textContent())!.toLowerCase().split(" to ");
  await firstTrain.getByRole("button", { name: /^Add 15 minutes of delay/ }).click();
  await expect(page.getByText("15 min late")).toBeVisible();
  await expect(page.getByText("departure.updated").first()).toBeVisible();

  // The public search page now says so.
  const publicPage = await page.context().newPage();
  await publicPage.goto(`/search?from=${from}&to=${to}&date=${date}`);
  await expect(publicPage.getByText("Running 15 minutes late")).toBeVisible();

  await firstTrain.getByRole("button", { name: /^Clear the delay/ }).click();
  await expect(page.getByText("15 min late")).toHaveCount(0);
  await publicPage.reload();
  await expect(publicPage.getByText("Running 15 minutes late")).toHaveCount(0);
});

test("the public site holds up without errors", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });

  for (const path of ["/", "/lines", "/lines/transalpine", "/lines/boreal", "/manage"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} scrolls sideways`).toBe(0);
  }
  expect(problems).toEqual([]);

  const missing = await page.goto("/no-such-page");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeAttached();
});

test("search handles journeys we don't run", async ({ page }) => {
  await page.goto(`/search?from=lisbon&to=istanbul&date=${dateAhead(5)}`);
  await expect(page.getByRole("heading", { name: /go straight there/i })).toBeVisible();
  await page.getByRole("link", { name: "Bordeaux" }).click();
  await expect(page).toHaveURL(/to=bordeaux/);
});

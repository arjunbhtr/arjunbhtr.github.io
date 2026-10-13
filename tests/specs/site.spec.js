import { test, expect } from '@playwright/test';

test.describe('Hero', () => {
  test('loads with name, role, and reveals content', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero__name')).toHaveText('Arjun Singh');

    // the typing effect fills #typeTarget asynchronously — wait for it rather
    // than asserting exact text, since speed is intentionally randomized
    await expect
      .poll(async () => (await page.locator('#typeTarget').textContent())?.length ?? 0)
      .toBeGreaterThan(0);

    await expect(page.locator('.hero__cta .btn--primary')).toBeVisible();
  });

  test('resume download link points to a real PDF, not a placeholder', async ({ page }) => {
    await page.goto('/');
    const resumeLink = page.locator('a[href$=".pdf"]').first();
    await expect(resumeLink).toHaveAttribute('href', /assets\/.*\.pdf$/);
    await expect(resumeLink).toHaveAttribute('download', '');
  });
});

test.describe('Navigation', () => {
  // force desktop width regardless of project device preset, since the nav
  // bar itself collapses into a hamburger menu below 680px (tested separately)
  test.use({ viewport: { width: 1280, height: 800 } });

  test('every nav link resolves to a real section on the page', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator('nav.nav__links a[data-nav]').evaluateAll(
      els => els.map(el => el.getAttribute('href'))
    );

    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs) {
      expect(href?.startsWith('#')).toBeTruthy();
      const id = href.slice(1);
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });

  test('clicking a nav link scrolls its section into view', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[data-nav][href="#skills"]').click();
    await expect(page.locator('#skills')).toBeInViewport();
  });
});

test.describe('Theme toggle', () => {
  test('switches theme on click and persists across reload', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const toggle = page.locator('#themeToggle');

    const before = await html.getAttribute('data-theme');
    const expected = before === 'light' ? 'dark' : 'light';
    await toggle.click();

    // the switch commits inside a View Transition callback, so it lands a
    // frame after the click — use auto-retrying assertions, not a snapshot read
    await expect(html).toHaveAttribute('data-theme', expected);
    await expect(toggle).toHaveAttribute('aria-pressed', expected === 'light' ? 'true' : 'false');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', expected);
  });

  test('toggling twice quickly via keyboard returns to the original theme', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const before = await html.getAttribute('data-theme');

    // regression guard: the commit lands a frame late inside the View
    // Transition, so reading state from the DOM made rapid toggles flip only
    // once. Keyboard is used because a mouse second-click is (correctly)
    // swallowed by the transition's snapshot overlay; Enter on the focused
    // button is not.
    await page.locator('#themeToggle').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(1000);
    await expect(html).toHaveAttribute('data-theme', before ?? '');
  });
});

test.describe('Contact section', () => {
  test('has real LinkedIn, email, and GitHub links — no leftover placeholders', async ({ page }) => {
    await page.goto('/#contact');
    const contact = page.locator('#contact');
    await contact.scrollIntoViewIfNeeded();

    // scoped to #contact specifically — the same LinkedIn link also appears
    // (hidden) in the desktop nav bar, which would make an unscoped locator
    // ambiguous and viewport-dependent
    await expect(contact.locator('a[href*="linkedin.com/in/"]')).toBeVisible();
    await expect(contact.locator('a[href^="mailto:"]')).toHaveCount(1);
    await expect(contact.locator('a[href*="github.com/arjunbhtr"]')).toBeVisible();

    // regression guard: this is exactly the kind of thing that's easy to
    // forget to replace when copy-pasting a template contact section
    await expect(contact.locator('.btn--placeholder')).toHaveCount(0);
  });

  test('copy-email button copies the real address to the clipboard', async ({ page, context, browserName }) => {
    // clipboard permission grants aren't reliably supported outside Chromium
    test.skip(browserName !== 'chromium', 'clipboard-read permission is Chromium-only in Playwright');

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/#contact');

    const copyBtn = page.locator('#copyEmailBtn');
    await expect(copyBtn).toHaveAttribute('data-email', 'arjun9621bhtr@gmail.com');

    await copyBtn.click();
    await expect(copyBtn).toHaveAttribute('aria-label', 'Copied!');

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe('arjun9621bhtr@gmail.com');
  });
});

test.describe('Scroll interactions', () => {
  test('back-to-top button appears after scrolling and returns to top', async ({ page }) => {
    await page.goto('/');
    const button = page.locator('#backToTop');
    await expect(button).not.toHaveClass(/is-visible/);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(button).toHaveClass(/is-visible/);

    await button.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(50);
  });
});

test.describe('Responsive layout', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('mobile viewport collapses the nav into a hamburger menu', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nav__links')).toBeHidden();

    const navToggle = page.locator('#navToggle');
    await expect(navToggle).toBeVisible();
    await navToggle.click();
    await expect(page.locator('.nav__links')).toBeVisible();
  });
});

test.describe('Accessibility preferences', () => {
  test.use({ reducedMotion: 'reduce' });

  test('skips the 3D background and typing animation when reduced motion is requested', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#heroBg3d canvas')).toHaveCount(0);
    await expect(page.locator('#typeTarget')).toHaveText('SDET // Playwright + JavaScript');
  });
});

test.describe('Health check', () => {
  test('page loads with no console or page errors', async ({ page }) => {
    const messages = [];
    page.on('pageerror', err => messages.push(`pageerror: ${err.message}`));
    page.on('console', msg => { if (msg.type() === 'error') messages.push(`console: ${msg.text()}`); });

    await page.goto('/');
    await page.waitForTimeout(1500);

    expect(messages).toEqual([]);
  });
});

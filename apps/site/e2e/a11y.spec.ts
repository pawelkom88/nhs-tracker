import { test, expect, type Page } from '@playwright/test';
import { axeCheck } from './fixtures';

interface RouteDef {
  readonly name: string;
  readonly path: string;
  readonly hasFilter?: boolean;
}

const REPRESENTATIVE_ROUTES: readonly RouteDef[] = [
  // Home
  { name: 'Home', path: '/' },

  // Nation lists
  { name: 'England Home', path: '/england', hasFilter: true },
  { name: 'Wales Home', path: '/wales', hasFilter: true },
  { name: 'Scotland Home', path: '/scotland', hasFilter: true },

  // Specialty pages
  { name: 'England Specialty', path: '/england/trauma-and-orthopaedics', hasFilter: true },
  { name: 'Wales Specialty', path: '/wales/trauma-and-orthopaedics', hasFilter: true },
  { name: 'Scotland Specialty', path: '/scotland/trauma-and-orthopaedics', hasFilter: true },

  // Unit detail pages
  { name: 'England Unit Detail', path: '/england/ophthalmology/a1d1b' },
  { name: 'Wales Unit Detail', path: '/wales/trauma-and-orthopaedics/7a1' },
  { name: 'Scotland Unit Detail', path: '/scotland/trauma-and-orthopaedics/s08000024' },

  // Explainers
  { name: 'England About the Figures', path: '/england/about-the-figures' },
  { name: 'England Your Rights', path: '/england/your-rights' },
  { name: 'Wales About the Figures', path: '/wales/about-the-figures' },
  { name: 'Wales Your Rights', path: '/wales/your-rights' },
  { name: 'Scotland About the Figures', path: '/scotland/about-the-figures' },
  { name: 'Scotland Your Rights', path: '/scotland/your-rights' },

  // Static pages
  { name: 'About', path: '/about' },
  { name: 'Accessibility', path: '/accessibility' },
  { name: 'Cookies', path: '/cookies' },
  { name: 'Privacy', path: '/privacy' },
  { name: 'Sources', path: '/sources' },

  // 404
  { name: '404 Page', path: '/404' },
];

async function checkHeadingHierarchy(page: Page): Promise<void> {
  const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) =>
    elements.map((el) => ({
      level: Number.parseInt(el.tagName.replace(/^H/i, ''), 10),
      text: el.textContent ? el.textContent.trim() : '',
    })),
  );

  // Exactly one <h1>
  const h1s = headings.filter((h) => h.level === 1);
  expect(h1s.length, 'Page must contain exactly one <h1>').toBe(1);

  // First heading in document must be h1
  if (headings.length > 0 && headings[0]) {
    expect(headings[0].level, 'First heading in document must be <h1>').toBe(1);
  }

  // Heading levels must not be skipped (e.g. h1 -> h3 without h2)
  for (let i = 1; i < headings.length; i++) {
    const prevHeading = headings[i - 1];
    const currHeading = headings[i];
    if (!prevHeading || !currHeading) continue;

    const prevLevel = prevHeading.level;
    const currLevel = currHeading.level;
    expect(
      currLevel,
      `Heading level skipped from h${String(prevLevel)} to h${String(currLevel)} (${currHeading.text})`,
    ).toBeLessThanOrEqual(prevLevel + 1);
  }
}

async function checkReflow320(page: Page): Promise<void> {
  await page.setViewportSize({ width: 320, height: 640 });
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasHorizontalScroll, 'Page must reflow at 320px width without horizontal scroll').toBe(
    false,
  );
}

async function checkTargetSizes(page: Page): Promise<void> {
  const violations = await page.$$eval(
    'button, input:not([type="hidden"]), select, textarea, [role="button"], [role="searchbox"]',
    (elements) => {
      const issues: { tag: string; id: string; width: number; height: number }[] = [];
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        // Skip hidden or invisible elements
        if (rect.width === 0 && rect.height === 0) continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        // WCAG 2.5.8 Target Size (Minimum): 24x24 CSS pixels
        if (rect.width < 24 || rect.height < 24) {
          const nameAttr = el.getAttribute('name');
          const text = el.textContent ? el.textContent.trim() : '';
          const identifier = el.id ? el.id : (nameAttr ?? text);
          issues.push({
            tag: el.tagName.toLowerCase(),
            id: identifier,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
      return issues;
    },
  );

  expect(
    violations,
    `Interactive elements must meet 24x24px target size (WCAG 2.5.8): ${JSON.stringify(violations)}`,
  ).toEqual([]);
}

test.describe('Accessibility & Keyboard checks across route types', () => {
  for (const route of REPRESENTATIVE_ROUTES) {
    test.describe(`${route.name} (${route.path})`, () => {
      test('passes axe WCAG 2.2 AA and heading structure checks', async ({ page }) => {
        await page.goto(route.path);

        // 1. Axe check
        await axeCheck(page);

        // 2 & 3. Heading hierarchy (single h1 and no skipped levels)
        await checkHeadingHierarchy(page);
      });

      test('reflows at 320px viewport without horizontal scroll', async ({ page }) => {
        await page.goto(route.path);
        await checkReflow320(page);
      });

      test('interactive elements satisfy WCAG 2.5.8 target size', async ({ page }) => {
        await page.goto(route.path);
        await checkTargetSizes(page);
      });

      test('skip link is visible on focus and targets #main', async ({ page }) => {
        await page.goto(route.path);

        const skipLink = page.locator('a[href="#main"]');
        await expect(skipLink).toBeAttached();

        // Focus skip link directly (cross-browser compatible including WebKit and mobile)
        await skipLink.focus();
        await expect(skipLink).toBeFocused();
        await expect(skipLink).toBeVisible();

        // Activate skip link
        await page.keyboard.press('Enter');

        // Target #main exists and receives focus or is active anchor
        const main = page.locator('main#main');
        await expect(main).toBeAttached();
      });

      if (route.hasFilter) {
        test('filter input is accessible with labelled input and live region announcements', async ({
          page,
        }) => {
          await page.goto(route.path);

          const isJsDisabled =
            (page.context() as unknown as { _options?: { javaScriptEnabled?: boolean } })._options
              ?.javaScriptEnabled === false;

          if (isJsDisabled) {
            // In no-JS mode, filter controls are not rendered, content is plain accessible list
            const searchInput = page.locator('input[type="search"]');
            await expect(searchInput).toHaveCount(0);
            return;
          }

          // In JS mode, filter is rendered with search input and live status region
          const searchInput = page.getByRole('searchbox');
          await expect(searchInput).toBeVisible();

          // Has associated accessible label
          const inputId = await searchInput.getAttribute('id');
          expect(inputId).toBeTruthy();
          const label = page.locator(`label[for="${inputId ?? ''}"]`);
          await expect(label).toBeVisible();

          // Has live region with role="status" and aria-live="polite"
          const liveRegion = page.locator('[role="status"][aria-live="polite"]');
          await expect(liveRegion).toBeAttached();
          const initialText = await liveRegion.textContent();
          expect(initialText).toBeTruthy();

          // Typing filter query updates live region text
          await searchInput.fill('xyznonexistentquery123');
          await expect(liveRegion).not.toHaveText(initialText ?? '');
        });
      }
    });
  }
});

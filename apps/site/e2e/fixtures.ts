import { AxeBuilder } from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export async function axeCheck(page: Page): Promise<void> {
  // Axe accessibility engine requires a JavaScript execution environment.
  // Skip axe analysis in projects running with javaScriptEnabled: false.
  const isJsDisabled =
    (page.context() as unknown as { _options?: { javaScriptEnabled?: boolean } })._options
      ?.javaScriptEnabled === false;

  if (isJsDisabled) {
    return;
  }

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  expect(results.violations).toEqual([]);
}

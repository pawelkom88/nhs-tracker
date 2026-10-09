import { test, expect } from '@playwright/test';

test.describe('Wales user journey ("Done means")', () => {
  test('navigates from home to specialty, health board details, and your rights', async ({
    page,
  }) => {
    // 1. Home page -> choose Wales
    await page.goto('/');
    await expect(page).toHaveTitle(/Know Your Wait/i);

    const walesLink = page.getByRole('link', { name: 'Wales', exact: true });
    await expect(walesLink).toBeVisible();
    await walesLink.click();

    // 2. Wales specialties list page
    await expect(page).toHaveURL(/\/wales$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Wales');

    // If JavaScript is enabled, test search filter input
    const filterInput = page.getByRole('searchbox');
    if (await filterInput.isVisible()) {
      await filterInput.fill('orthopaedic');
    }

    const tAndOLink = page.getByRole('link', {
      name: /Trauma and Orthopaedics/i,
    });
    await expect(tAndOLink).toBeVisible();
    await tAndOLink.click();

    // 3. Wales specialty page (/wales/trauma-and-orthopaedics)
    await expect(page).toHaveURL(/\/wales\/trauma-and-orthopaedics$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Trauma and Orthopaedics');

    // Select Health Board: Betsi Cadwaladr University Health Board
    const healthBoardLink = page.getByRole('link', {
      name: /Betsi Cadwaladr University Health Board/i,
    });
    await expect(healthBoardLink).toBeVisible();
    await healthBoardLink.click();

    // 4. Reporting Unit Detail page (/wales/trauma-and-orthopaedics/7a1)
    await expect(page).toHaveURL(/\/wales\/trauma-and-orthopaedics\/7a1$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Betsi Cadwaladr University Health Board',
    );

    // Assert figures section and headline statements with Reporting Period
    const figuresSection = page.locator('.figures-section');
    await expect(figuresSection).toBeVisible();

    // Assert headline statement contains Reporting Period and median wait
    await expect(figuresSection).toContainText(/31 July 2026/);
    await expect(figuresSection).toContainText(/24\.1 weeks or less/);

    // Assert standard caption text with "not a prediction" notice
    const figCaption = figuresSection.locator('figcaption').first();
    await expect(figCaption).toBeVisible();
    await expect(figCaption).toContainText(
      /This shows people already on the list as of 31 July 2026/i,
    );
    await expect(figCaption).toContainText(/It is not a prediction of how long you will wait/i);

    // Assert published line with Publication Date and source link
    const publishedLine = figuresSection.getByText(/Published/i).first();
    await expect(publishedLine).toContainText(/Published 17 September 2026 by Welsh Government/);
    const sourceLink = publishedLine.getByRole('link', { name: /Welsh Government/i });
    await expect(sourceLink).toBeVisible();
    await expect(sourceLink).toHaveAttribute('href', /stats\.gov\.wales/);

    // 5. Navigate to "Your rights"
    const rightsLink = page.getByRole('link', { name: /^Your rights$/i });
    await expect(rightsLink).toBeVisible();
    await rightsLink.click();

    // Assert your-rights page and mandatory closing "not medical advice" notice
    await expect(page).toHaveURL(/\/wales\/your-rights$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your rights: Wales');
    await expect(
      page.getByText(
        'This is not medical advice. Speak to your GP or care team about your own care.',
      ),
    ).toBeVisible();
  });
});

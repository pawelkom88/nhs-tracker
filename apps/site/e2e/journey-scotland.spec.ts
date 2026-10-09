import { test, expect } from '@playwright/test';

test.describe('Scotland user journey ("Done means")', () => {
  test('navigates from home to specialty, health board details, and your rights', async ({
    page,
  }) => {
    // 1. Home page -> choose Scotland
    await page.goto('/');
    await expect(page).toHaveTitle(/Know Your Wait/i);

    const scotlandLink = page.getByRole('link', { name: 'Scotland', exact: true });
    await expect(scotlandLink).toBeVisible();
    await scotlandLink.click();

    // 2. Scotland specialties list page
    await expect(page).toHaveURL(/\/scotland$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Scotland');

    // If JavaScript is enabled, test search filter input
    const filterInput = page.getByRole('searchbox');
    if (await filterInput.isVisible()) {
      await filterInput.fill('orthopaedic');
    }

    const tAndOLink = page.getByRole('link', {
      name: /Trauma and Orthopaedic Surgery/i,
    });
    await expect(tAndOLink).toBeVisible();
    await tAndOLink.click();

    // 3. Scotland specialty page (/scotland/trauma-and-orthopaedics)
    await expect(page).toHaveURL(/\/scotland\/trauma-and-orthopaedics$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Trauma and Orthopaedic Surgery',
    );

    // Select Golden Jubilee National Hospital
    const goldenJubileeLink = page.getByRole('link', {
      name: /Golden Jubilee National Hospital/i,
    });
    await expect(goldenJubileeLink).toBeVisible();
    await goldenJubileeLink.click();

    // 4. Reporting Unit Detail page (/scotland/trauma-and-orthopaedics/sb0801)
    await expect(page).toHaveURL(/\/scotland\/trauma-and-orthopaedics\/sb0801$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Golden Jubilee National Hospital',
    );

    // Assert Golden Jubilee national hospital note
    await expect(page.locator('.golden-jubilee-badge')).toContainText(
      /Treats patients referred from all health boards in Scotland/i,
    );

    // Assert figures section and distinct wait stage heading
    const figuresSection = page.locator('.figures-section');
    await expect(figuresSection).toBeVisible();

    // Stage 1: New Outpatient heading
    await expect(figuresSection.getByRole('heading', { name: /New Outpatient/i })).toBeVisible();

    // Assert headline statement contains Reporting Period (31 August 2026), median weeks (18 weeks / 126 days)
    await expect(figuresSection).toContainText(/31 August 2026/);
    await expect(figuresSection).toContainText(/18 weeks \(126 days\) or less/);

    // Assert standard caption text with "not a prediction" notice
    const figCaption = figuresSection.locator('figcaption').first();
    await expect(figCaption).toBeVisible();
    await expect(figCaption).toContainText(
      /This shows people already on the list as of 31 August 2026/i,
    );
    await expect(figCaption).toContainText(/It is not a prediction of how long you will wait/i);

    // Assert published line with Publication Date and source link
    const publishedLine = figuresSection.getByText(/Published/i).first();
    await expect(publishedLine).toContainText(
      /Published 24 November 2026 by Public Health Scotland/,
    );
    const sourceLink = publishedLine.getByRole('link', { name: /Public Health Scotland/i });
    await expect(sourceLink).toBeVisible();
    await expect(sourceLink).toHaveAttribute('href', /publichealthscotland\.scot/);

    // 5. Navigate to "Your rights"
    const rightsLink = page.getByRole('link', { name: /^Your rights$/i });
    await expect(rightsLink).toBeVisible();
    await rightsLink.click();

    // Assert your-rights page and mandatory closing "not medical advice" notice
    await expect(page).toHaveURL(/\/scotland\/your-rights$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your rights: Scotland');
    await expect(
      page.getByText(
        'This is not medical advice. Speak to your GP or care team about your own care.',
      ),
    ).toBeVisible();
  });

  test('displays inpatient / day-case stage for general surgery unit', async ({ page }) => {
    // Navigate to NHS Ayrshire & Arran General Surgery
    await page.goto('/scotland/general-surgery/s08000015');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('NHS Ayrshire and Arran');

    const figuresSection = page.locator('.figures-section');
    await expect(figuresSection).toBeVisible();

    // Stage 2: Inpatient/Day case heading
    await expect(
      figuresSection.getByRole('heading', { name: /Inpatient\/Day case/i }),
    ).toBeVisible();

    // Assert median statement (14 weeks / 98 days)
    await expect(figuresSection).toContainText(/14 weeks \(98 days\) or less/);
  });
});

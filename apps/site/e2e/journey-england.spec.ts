import { test, expect } from '@playwright/test';

test.describe('England user journey ("Done means")', () => {
  test('navigates from home to specialty, reporting unit details, and your rights', async ({
    page,
  }) => {
    // 1. Home page -> choose England
    await page.goto('/');
    await expect(page).toHaveTitle(/Know Your Wait/i);

    const englandLink = page.getByRole('link', { name: 'England', exact: true });
    await expect(englandLink).toBeVisible();
    await englandLink.click();

    // 2. England specialties list page
    await expect(page).toHaveURL(/\/england$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('England');

    // If JavaScript is enabled, test search filter input
    const filterInput = page.getByRole('searchbox');
    if (await filterInput.isVisible()) {
      await filterInput.fill('orthopaedic');
    }

    const tAndOLink = page.getByRole('link', {
      name: /Trauma and Orthopaedic Service/i,
    });
    await expect(tAndOLink).toBeVisible();
    await tAndOLink.click();

    // 3. England specialty page (/england/trauma-and-orthopaedics)
    await expect(page).toHaveURL(/\/england\/trauma-and-orthopaedics$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Trauma and Orthopaedic Service',
    );

    // Assert NHS Region headings exist
    await expect(page.getByRole('heading', { name: 'London' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'South East' })).toBeVisible();

    // Assert ISP badge appears for Independent Sector Providers in the list
    const ispItem = page.locator('li', { hasText: 'Practice Plus Group Hospitals' });
    await expect(ispItem).toBeVisible();
    await expect(ispItem.getByText('Independent Sector Provider')).toBeVisible();

    // Select NHS Trust reporting unit: University Hospitals Birmingham
    const uhbLink = page.getByRole('link', {
      name: /University Hospitals Birmingham NHS Foundation Trust/i,
    });
    await expect(uhbLink).toBeVisible();
    await uhbLink.click();

    // 4. Reporting Unit Detail page (/england/trauma-and-orthopaedics/rrk)
    await expect(page).toHaveURL(/\/england\/trauma-and-orthopaedics\/rrk$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'University Hospitals Birmingham NHS Foundation Trust',
    );

    // Assert figures section and headline statements with Reporting Period
    const figuresSection = page.locator('.figures-section');
    await expect(figuresSection).toBeVisible();

    // Assert headline statement contains Reporting Period and median wait
    await expect(figuresSection).toContainText(/31 July 2026/);
    await expect(figuresSection).toContainText(/12\.5 weeks or less/);

    // Assert standard caption text with "not a prediction" notice
    const figCaption = figuresSection.locator('figcaption').first();
    await expect(figCaption).toBeVisible();
    await expect(figCaption).toContainText(
      /This shows people already on the list as of 31 July 2026/i,
    );
    await expect(figCaption).toContainText(/It is not a prediction of how long you will wait/i);

    // Assert published line with Publication Date and source link
    const publishedLine = figuresSection.getByText(/Published/i).first();
    await expect(publishedLine).toContainText(/Published 10 September 2026 by NHS England/);
    const sourceLink = publishedLine.getByRole('link', { name: /NHS England/i });
    await expect(sourceLink).toBeVisible();
    await expect(sourceLink).toHaveAttribute('href', /rtt-waiting-times/);

    // 5. Navigate to "Your rights"
    const rightsLink = page.getByRole('link', {
      name: /Your rights to choose where you are treated/i,
    });
    await expect(rightsLink).toBeVisible();
    await rightsLink.click();

    // Assert your-rights page and mandatory closing "not medical advice" notice
    await expect(page).toHaveURL(/\/england\/your-rights$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your rights: England');
    await expect(
      page.getByText(
        'This is not medical advice. Speak to your GP or care team about your own care.',
      ),
    ).toBeVisible();
  });

  test('displays ISP badge and notice for independent sector provider', async ({ page }) => {
    await page.goto('/england/trauma-and-orthopaedics/nt3');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Practice Plus Group Hospitals',
    );

    // Assert ISP badge in header
    await expect(page.locator('.unit-header .isp-badge')).toBeVisible();

    // Assert ISP informational note
    await expect(page.locator('.isp-notice')).toContainText(
      /This is an independent provider treating NHS-funded patients, free to the patient/i,
    );
  });
});

import { test, expect } from '@playwright/test';

test('google maps directions from LA to SF', async ({ page }) => {
  // Navigate to Google Maps
  await page.goto('https://www.google.com/maps?hl=en');

  // Click the Directions button
  await page.getByRole('button', { name: 'Directions' }).click();

  // Fill in the starting point - use the full label text
  await page.getByLabel('Choose starting point, or click on the map...').fill('Los Angeles, CA, USA');
  await page.keyboard.press('Enter');

  // Fill in the destination
  await page.getByLabel('Choose destination, or click on the map...').fill('San Francisco, CA, USA');
  await page.keyboard.press('Enter');

  // Wait for routes to load and verify I-5 N appears in at least one route
  await expect(page.getByText('I-5 N').first()).toBeVisible({ timeout: 10000 });
});

import { test, expect } from '@playwright/test';


// This is an example when we specify the instanceId, and therefore practitest-reporter.ts is using the
// "regular" create a run: https://www.practitest.com/api-v2/#create-a-run
test('google maps directions from LA to SF', { annotation: { type: 'instanceId', description: '1877220' } }, async ({ page }) => {
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


// In this example when we don't specify the instanceId, and therefore practitest-reporter.ts is using the
// https://www.practitest.com/api-v2/#auto-create-a-run
// The auto-create finds or creates the necessary test and instance, then executes a run.
test('google maps directions from NYC to Atlanta', async ({ page }) => {
  // Navigate to Google Maps
  await page.goto('https://www.google.com/maps?hl=en');

  // Click the Directions button
  await page.getByRole('button', { name: 'Directions' }).click();

  // Fill in the starting point
  await page.getByLabel('Choose starting point, or click on the map...').fill('New York, NY, USA');
  await page.keyboard.press('Enter');

  // Fill in the destination
  await page.getByLabel('Choose destination, or click on the map...').fill('Atlanta, GA, USA');
  await page.keyboard.press('Enter');

  // Wait for routes to load and verify I-85 S appears in at least one route
  await expect(page.getByText('I-85 S').first()).toBeVisible({ timeout: 10000 });
});

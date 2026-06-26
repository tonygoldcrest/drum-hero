import { test, expect, Page } from '@playwright/test';
import { launchApp, Harness } from './support';

let harness: Harness;
let page: Page;

// eslint-disable-next-line no-empty-pattern
test.afterEach(async ({}, testInfo) => {
  if (page && testInfo.status !== testInfo.expectedStatus) {
    await testInfo.attach('screenshot', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  }

  await harness?.app.close();
});

test.describe('first run', () => {
  test('guides the user to select a library folder', async () => {
    harness = await launchApp({ seedLibrary: false });
    page = await harness.app.firstWindow();

    await expect(page.getByText('No songs found.')).toBeVisible();
    await expect(page.getByText('Select a different folder')).toBeVisible();
  });
});

test.describe('seeded library', () => {
  test('scans the folder, lists the song, and renders real sheet music', async () => {
    harness = await launchApp({ seedLibrary: true });
    page = await harness.app.firstWindow();

    await expect(page.getByText('No songs found.')).toBeVisible();

    await page.getByTestId('settings-trigger').click();
    await page.getByTestId('rescan-folder').click();

    const song = page.getByText('Master of Puppets').first();

    await expect(song).toBeVisible({ timeout: 30_000 });

    await song.click();

    const sheet = page.locator('svg').first();

    await expect(sheet).toBeVisible();
    await expect
      .poll(async () => page.locator('svg path').count(), { timeout: 30_000 })
      .toBeGreaterThan(0);
  });
});

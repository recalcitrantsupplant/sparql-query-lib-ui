import { test, expect } from '@playwright/test'

test.describe('Queries page', () => {
  test('loads queries list after selecting a library', async ({ page }) => {
    await page.goto('/queries')

    // Open library manager and select first library
    await page.getByRole('button', { name: /Manage|Collapse/ }).click()
    const items = page.locator('.libraries-panel ul li').filter({ hasNotText: 'Create new library' })
    const count = await items.count()
    expect(count).toBeGreaterThan(0)
    await items.nth(0).click()

    // Queries resource list should show and fetch items
    await expect(page.getByRole('heading', { name: 'Queries' })).toBeVisible()
    // It is acceptable for there to be zero items; just ensure no error state
    await expect(page.getByText(/Loading queries/).first()).toBeHidden({ timeout: 10_000 })
  })
})


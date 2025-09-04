import { test, expect } from '@playwright/test'

test.describe('Admin page', () => {
  test('shows Test Mode and can set mock API URL', async ({ page, baseURL }) => {
    await page.goto('/admin')

    await expect(page.getByRole('heading', { name: 'Admin / Configuration' })).toBeVisible()
    await expect(page.getByText('Test Mode')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Use Mock API (this site)' })).toBeVisible()

    await page.getByRole('button', { name: 'Use Mock API (this site)' }).click()

    // Saved message appears
    await expect(page.getByText(/API URL set to mock:/)).toBeVisible()
  })
})


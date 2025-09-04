import { test, expect } from '@playwright/test'

test.describe('Tests page', () => {
  test('renders component sandboxes and loads mock data', async ({ page }) => {
    await page.goto('/tests')

    await expect(page.getByRole('heading', { name: 'Component Tests' })).toBeVisible()
    await expect(page.getByText('Mock API enabled:')).toBeVisible()

    // Libraries panel should render
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()

    // Resource lists should render titles
    await expect(page.getByRole('heading', { name: 'Resource Lists' })).toBeVisible()

    // Expect counts line to be visible (values can vary based on seed)
    await expect(page.getByText(/Loaded: \d+ queries, \d+ groups/)).toBeVisible()
  })
})


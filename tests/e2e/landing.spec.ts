import { expect, test } from '@playwright/test'

test('landing page carrega com título principal', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Fundação pronta para uma plataforma Kanban completa')).toBeVisible()
})

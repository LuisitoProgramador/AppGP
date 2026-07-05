import { expect, test } from '@playwright/test'
import {
  irATab,
  leerSaldoCuenta,
  obtenerCuentaId,
  parseCurrencyText,
} from './helpers'

test.describe('Flujo gasto MSI → dashboard', () => {
  test('registra un gasto MSI y refleja saldo en el dashboard', async ({ page }) => {
    await page.goto('/?tab=resumen')
    await expect(page.getByTestId('dashboard-hero')).toBeVisible({ timeout: 30_000 })

    const creditoId = await obtenerCuentaId(page, 'credito')
    const saldoAntes = await leerSaldoCuenta(page, creditoId)

    await irATab(page, 'registro')
    await expect(page.getByTestId('gasto-form')).toBeVisible()

    const monto = '1500'
    const descripcion = `E2E MSI ${Date.now()}`

    await page.getByTestId('gasto-monto').fill(monto)
    await page.getByTestId(`cuenta-${creditoId}`).click()
    await page.getByTestId('gasto-msi-toggle').click()
    await page.getByLabel('Descripción (opcional)').fill(descripcion)
    await page.getByTestId('gasto-submit').click()

    await expect(page.getByText('Compra MSI registrada', { exact: false })).toBeVisible({
      timeout: 15_000,
    })

    await irATab(page, 'resumen')
    await expect(page.getByTestId('dashboard-hero')).toBeVisible({ timeout: 15_000 })

    const disponible = page.getByTestId('dashboard-disponible')
    await expect(disponible).toBeVisible()
    await expect(disponible).not.toHaveText('...')

    const saldoDespues = parseCurrencyText(
      await page.getByTestId(`cuenta-saldo-${creditoId}`).textContent(),
    )
    expect(Number.isFinite(saldoDespues)).toBe(true)
    // MSI en crédito: la deuda sube por el total de la compra, no por la mensualidad.
    expect(saldoDespues - saldoAntes).toBeCloseTo(Number(monto), 2)
  })
})

import { expect, test } from '@playwright/test'
import {
  irATab,
  leerSaldoCuenta,
  obtenerCuentaId,
  setOffline,
} from './helpers'

test.describe('Sincronización offline', () => {
  test('guarda un gasto sin conexión y lo sincroniza sin duplicar saldo', async ({
    page,
    context,
  }) => {
    await page.goto('/?tab=resumen')
    await expect(page.getByTestId('dashboard-hero')).toBeVisible({ timeout: 30_000 })

    const efectivoId = await obtenerCuentaId(page, 'efectivo')
    const saldoInicial = await leerSaldoCuenta(page, efectivoId)

    const monto = 75
    const descripcion = `E2E Offline ${Date.now()}`

    await setOffline(context, true)
    await irATab(page, 'registro')
    await expect(page.getByTestId('gasto-form')).toBeVisible()

    await page.getByTestId('gasto-monto').fill(String(monto))
    await page.getByTestId(`cuenta-${efectivoId}`).click()
    await page.getByLabel('Descripción (opcional)').fill(descripcion)
    await page.getByTestId('gasto-submit').click()

    await expect(page.getByText('guardado localmente', { exact: false })).toBeVisible({
      timeout: 15_000,
    })

    await irATab(page, 'resumen')
    const saldoOffline = await leerSaldoCuenta(page, efectivoId)
    expect(saldoInicial - saldoOffline).toBeCloseTo(monto, 2)

    await expect(page.getByTestId('offline-sync-status')).toContainText(
      'pendiente(s) de sincronizar',
      { timeout: 10_000 },
    )

    await setOffline(context, false)

    await expect(page.getByText('sincronizado(s) desde modo offline', { exact: false })).toBeVisible({
      timeout: 20_000,
    })

    const saldoTrasSync = await leerSaldoCuenta(page, efectivoId)
    expect(saldoInicial - saldoTrasSync).toBeCloseTo(monto, 2)

    await expect(page.getByTestId('offline-sync-status')).not.toBeVisible({ timeout: 10_000 })

    await page.reload()
    await expect(page.getByTestId('dashboard-hero')).toBeVisible({ timeout: 30_000 })

    const saldoTrasReload = await leerSaldoCuenta(page, efectivoId)
    expect(saldoInicial - saldoTrasReload).toBeCloseTo(monto, 2)
  })
})

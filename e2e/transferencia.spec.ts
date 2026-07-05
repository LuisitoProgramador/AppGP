import { expect, test } from '@playwright/test'
import {
  esperarSaldoCuenta,
  irATab,
  leerSaldoCuenta,
  obtenerCuentaId,
  seleccionarCuentaTransferencia,
} from './helpers'

test.describe('Transferencia interna', () => {
  test('mueve saldo entre cuentas de forma atómica', async ({ page }) => {
    await page.goto('/?tab=resumen')
    await expect(page.getByTestId('dashboard-hero')).toBeVisible({ timeout: 30_000 })

    const efectivoId = await obtenerCuentaId(page, 'efectivo')
    const debitoId = await obtenerCuentaId(page, 'debito')

    const saldoEfectivoAntes = await leerSaldoCuenta(page, efectivoId)
    const saldoDebitoAntes = await leerSaldoCuenta(page, debitoId)

    const monto = 200

    await page.getByTestId('cuentas-transferir').click()
    await expect(page.getByTestId('transferencia-form')).toBeVisible()

    await seleccionarCuentaTransferencia(page, 'origen', 'E2E Efectivo')
    await seleccionarCuentaTransferencia(page, 'destino', 'E2E Débito')
    await page.getByTestId('transferencia-monto').fill(String(monto))
    await page.getByTestId('transferencia-submit').click()

    await expect(page.getByText('Transferencia', { exact: false })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByTestId('transferencia-form')).not.toBeVisible()

    await esperarSaldoCuenta(page, efectivoId, saldoEfectivoAntes - monto)
    await esperarSaldoCuenta(page, debitoId, saldoDebitoAntes + monto)

    const saldoEfectivoDespues = await leerSaldoCuenta(page, efectivoId)
    const saldoDebitoDespues = await leerSaldoCuenta(page, debitoId)

    expect(saldoEfectivoDespues - saldoEfectivoAntes).toBeCloseTo(-monto, 2)
    expect(saldoDebitoDespues - saldoDebitoAntes).toBeCloseTo(monto, 2)
  })

  test('abona a la deuda de tarjeta desde efectivo', async ({ page }) => {
    await page.goto('/?tab=resumen')
    await expect(page.getByTestId('dashboard-hero')).toBeVisible({ timeout: 30_000 })

    const creditoId = await obtenerCuentaId(page, 'credito')
    const deudaInicial = await leerSaldoCuenta(page, creditoId)

    const deudaAgregada = 400
    await irATab(page, 'registro')
    await expect(page.getByTestId('gasto-form')).toBeVisible()

    await page.getByTestId('gasto-monto').fill(String(deudaAgregada))
    await page.getByTestId(`cuenta-${creditoId}`).click()
    await page.getByLabel('Descripción (opcional)').fill(`E2E Deuda ${Date.now()}`)
    await page.getByTestId('gasto-submit').click()

    await expect(page.getByText(/\$400/, { exact: false })).toBeVisible({ timeout: 15_000 })

    await irATab(page, 'resumen')
    await expect(page.getByTestId('dashboard-hero')).toBeVisible({ timeout: 15_000 })

    const efectivoId = await obtenerCuentaId(page, 'efectivo')
    const deudaAntes = await leerSaldoCuenta(page, creditoId)
    expect(deudaAntes - deudaInicial).toBeCloseTo(deudaAgregada, 2)

    const saldoEfectivoAntes = await leerSaldoCuenta(page, efectivoId)
    const monto = 250

    await page.getByTestId('cuentas-transferir').click()
    await expect(page.getByTestId('transferencia-form')).toBeVisible()

    await seleccionarCuentaTransferencia(page, 'origen', 'E2E Efectivo')
    await seleccionarCuentaTransferencia(page, 'destino', 'E2E Tarjeta')
    await page.getByTestId('transferencia-monto').fill(String(monto))
    await page.getByTestId('transferencia-submit').click()

    await expect(page.getByText('Pago a tarjeta', { exact: false })).toBeVisible({
      timeout: 15_000,
    })

    await esperarSaldoCuenta(page, efectivoId, saldoEfectivoAntes - monto)
    await esperarSaldoCuenta(page, creditoId, deudaAntes - monto)

    const saldoEfectivoDespues = await leerSaldoCuenta(page, efectivoId)
    const deudaDespues = await leerSaldoCuenta(page, creditoId)

    expect(saldoEfectivoDespues - saldoEfectivoAntes).toBeCloseTo(-monto, 2)
    expect(deudaAntes - deudaDespues).toBeCloseTo(monto, 2)
  })
})

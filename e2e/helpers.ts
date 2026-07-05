import { expect, type BrowserContext, type Page } from '@playwright/test'

/** Parsea texto de moneda es-MX (p. ej. "$1,500.00") a número. */
export function parseCurrencyText(text: string | null): number {
  if (!text) return Number.NaN
  const cleaned = text.replace(/[^\d.,-]/g, '').replace(/,/g, '')
  return Number.parseFloat(cleaned)
}

export async function irATab(page: Page, tab: 'registro' | 'resumen' | 'historial') {
  const desktop = page.locator(`#tab-${tab}`)
  if (await desktop.isVisible()) {
    await desktop.click()
    return
  }

  const labels: Record<typeof tab, string> = {
    registro: 'Registro',
    resumen: 'Resumen',
    historial: 'Historial',
  }
  await page.getByLabel(labels[tab]).click()
}

const CUENTA_TIPO_LABEL: Record<'efectivo' | 'credito' | 'debito', string> = {
  efectivo: 'Efectivo',
  credito: 'Crédito',
  debito: 'Débito',
}

/** Devuelve el id de la primera cuenta cuyo card coincide con el tipo (E2E seed). */
export async function obtenerCuentaId(
  page: Page,
  tipo: 'efectivo' | 'credito' | 'debito',
): Promise<string> {
  const card = page.locator('[data-testid^="cuenta-card-"]').filter({
    hasText: CUENTA_TIPO_LABEL[tipo],
  })
  await expect(card.first()).toBeVisible()
  const testId = await card.first().getAttribute('data-testid')
  expect(testId).toBeTruthy()
  return testId!.replace('cuenta-card-', '')
}

export async function leerSaldoCuenta(page: Page, cuentaId: string): Promise<number> {
  const locator = page.getByTestId(`cuenta-saldo-${cuentaId}`)
  await expect(locator).toBeVisible()
  const saldo = parseCurrencyText(await locator.textContent())
  expect(Number.isFinite(saldo)).toBe(true)
  return saldo
}

/** Espera a que el saldo mostrado converja (p. ej. tras invalidar queries). */
export async function esperarSaldoCuenta(
  page: Page,
  cuentaId: string,
  saldoEsperado: number,
  timeout = 15_000,
) {
  await expect
    .poll(async () => parseCurrencyText(await page.getByTestId(`cuenta-saldo-${cuentaId}`).textContent()), {
      timeout,
    })
    .toBeCloseTo(saldoEsperado, 2)
}

export async function seleccionarCuentaTransferencia(
  page: Page,
  campo: 'origen' | 'destino',
  nombreCuenta: string,
) {
  const trigger = page.locator(`#transferencia-${campo}`)
  const currentLabel = (await trigger.textContent()) ?? ''
  if (new RegExp(nombreCuenta).test(currentLabel)) return

  await trigger.click()
  await page.getByRole('option', { name: new RegExp(nombreCuenta) }).click()
}

export async function setOffline(context: BrowserContext, offline: boolean) {
  await context.setOffline(offline)
}

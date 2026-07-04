export interface GastoDiaRow {
  descripcion: string
  monto: number
}

function normalizeDescripcion(value: string): string {
  return value.trim().toLowerCase()
}

function montosSimilares(a: number, b: number, tolerancia = 0.05): boolean {
  if (a === b) return true
  const base = Math.max(a, b, 1)
  return Math.abs(a - b) / base <= tolerancia
}

export function findDuplicadoHoy(
  descripcion: string,
  monto: number,
  gastosHoy: GastoDiaRow[],
): GastoDiaRow | null {
  const normalizada = normalizeDescripcion(descripcion)
  if (!normalizada) return null

  return (
    gastosHoy.find(
      (gasto) =>
        normalizeDescripcion(gasto.descripcion) === normalizada &&
        montosSimilares(gasto.monto, monto),
    ) ?? null
  )
}

export function isToday(isoFecha: string, hoy = new Date()): boolean {
  const hoyCal = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(hoy)
  const fechaCal = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoFecha))
  return fechaCal === hoyCal
}

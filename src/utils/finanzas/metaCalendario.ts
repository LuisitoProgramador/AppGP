import type { MetaAhorro } from '../../types/metaAhorro'

const MS_POR_DIA = 24 * 60 * 60 * 1000

/** Semanas restantes hasta el 31 dic (incluye el día actual, mínimo 1). */
export function semanasRestantesHastaFinDeAno(fecha: Date): number {
  const year = fecha.getFullYear()
  const inicio = new Date(year, fecha.getMonth(), fecha.getDate())
  const fin = new Date(year, 11, 31)
  const dias = Math.floor((fin.getTime() - inicio.getTime()) / MS_POR_DIA) + 1
  return Math.max(1, Math.ceil(dias / 7))
}

export function finDeAnoCalendarioIso(fecha: Date): string {
  return `${fecha.getFullYear()}-12-31`
}

export function anioCalendarioFromFechaLimite(fechaLimite: string | null): number | null {
  if (!fechaLimite) return null
  const year = fechaLimite.slice(0, 4)
  if (!/^\d{4}$/.test(year)) return null
  return Number(year)
}

export function nombreMetaAhorroAnual(year: number): string {
  return `Mi ahorro ${year}`
}

const META_ANUAL_LEGACY = 'Mi ahorro semanal'
const META_ANUAL_PATTERN = /^Mi ahorro \d{4}$/

export function esMetaAhorroAnual(meta: MetaAhorro): boolean {
  return meta.nombre === META_ANUAL_LEGACY || META_ANUAL_PATTERN.test(meta.nombre)
}

export function metaAnualExpirada(meta: MetaAhorro, hoy = new Date()): boolean {
  if (!meta.fecha_limite) return false
  const limite = new Date(`${meta.fecha_limite}T23:59:59`)
  return limite < hoy
}

export function metaAnualDelAnio(meta: MetaAhorro, year: number): boolean {
  if (meta.nombre === nombreMetaAhorroAnual(year)) return true
  const limiteYear = anioCalendarioFromFechaLimite(meta.fecha_limite)
  return limiteYear === year && esMetaAhorroAnual(meta)
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function periodoMetaLabel(meta: MetaAhorro): string | null {
  const year = anioCalendarioFromFechaLimite(meta.fecha_limite)
  if (!year) return null

  if (meta.created_at) {
    const inicio = new Date(meta.created_at)
    if (inicio.getFullYear() === year) {
      const empiezaEnEnero = inicio.getMonth() === 0 && inicio.getDate() <= 7
      if (!empiezaEnEnero) {
        return `${inicio.getDate()} ${MESES_CORTOS[inicio.getMonth()]}–31 dic ${year}`
      }
    }
  }

  return `ene–dic ${year}`
}

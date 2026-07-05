import {
  BUCKET_LABELS,
  CATEGORIA_BUCKET,
  CATEGORIA_PESO_EN_BUCKET,
  REGLA_503020,
  type Bucket503020,
} from '../../constants/regla503020'
import { PORCENTAJE_AHORRO_DEFAULT } from '../../constants/porcentajeAhorro'
import type { Categoria } from '../../types/gasto'
import type { LimitesPorCategoria } from '../../services/presupuestoCategorias'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

const GASTO_BUCKET_SHARE = REGLA_503020.necesidades + REGLA_503020.caprichos

export interface PorcentajesRegla503020 {
  necesidades: number
  caprichos: number
  ahorro: number
}

/** Porcentajes sobre el ingreso total que suman 100% con el ahorro del usuario. */
export function calcPorcentajesRegla503020(
  porcentajeAhorro: number = PORCENTAJE_AHORRO_DEFAULT,
): PorcentajesRegla503020 {
  const disponiblePct = 100 - porcentajeAhorro
  return {
    necesidades: round2((disponiblePct * REGLA_503020.necesidades) / GASTO_BUCKET_SHARE),
    caprichos: round2((disponiblePct * REGLA_503020.caprichos) / GASTO_BUCKET_SHARE),
    ahorro: porcentajeAhorro,
  }
}

export function calcDisponibleGasto503020(
  ingresoMensual: number,
  porcentajeAhorro: number = PORCENTAJE_AHORRO_DEFAULT,
): number {
  if (ingresoMensual <= 0) return 0
  return round2(ingresoMensual * (1 - porcentajeAhorro / 100))
}

function bucketShareOfDisponible(bucket: Bucket503020): number {
  return bucket === 'necesidades'
    ? REGLA_503020.necesidades / GASTO_BUCKET_SHARE
    : REGLA_503020.caprichos / GASTO_BUCKET_SHARE
}

export function getBucketLabel503020(
  bucket: Bucket503020,
  porcentajeAhorro: number = PORCENTAJE_AHORRO_DEFAULT,
): string {
  const pct = calcPorcentajesRegla503020(porcentajeAhorro)[bucket]
  return `${BUCKET_LABELS[bucket]} (${pct}%)`
}

export function getBucketCategoria(categoria: string): Bucket503020 | null {
  return (CATEGORIA_BUCKET as Record<string, Bucket503020 | undefined>)[categoria] ?? null
}

export function calcLimiteCategoria503020(
  ingresoMensual: number,
  categoria: string,
  porcentajeAhorro: number = PORCENTAJE_AHORRO_DEFAULT,
): number | null {
  if (ingresoMensual <= 0) return null

  const bucket = getBucketCategoria(categoria)
  const peso = (CATEGORIA_PESO_EN_BUCKET as Record<string, number | undefined>)[categoria]
  if (!bucket || peso == null) return null

  const bucketTotal = calcTotalBucket503020(ingresoMensual, bucket, porcentajeAhorro)
  return round2(bucketTotal * peso)
}

export function calcLimitesRegla503020(
  ingresoMensual: number,
  categorias: readonly Categoria[],
  porcentajeAhorro: number = PORCENTAJE_AHORRO_DEFAULT,
): LimitesPorCategoria {
  const limites: LimitesPorCategoria = {}

  for (const categoria of categorias) {
    const limite = calcLimiteCategoria503020(ingresoMensual, categoria, porcentajeAhorro)
    if (limite != null && limite > 0) {
      limites[categoria] = limite
    }
  }

  return limites
}

export function calcTotalBucket503020(
  ingresoMensual: number,
  bucket: Bucket503020,
  porcentajeAhorro: number = PORCENTAJE_AHORRO_DEFAULT,
): number {
  if (ingresoMensual <= 0) return 0
  const disponible = calcDisponibleGasto503020(ingresoMensual, porcentajeAhorro)
  return round2(disponible * bucketShareOfDisponible(bucket))
}

export function calcAhorroMensual503020(
  ingresoMensual: number,
  porcentajeAhorro: number = PORCENTAJE_AHORRO_DEFAULT,
): number {
  if (ingresoMensual <= 0) return 0
  return round2(ingresoMensual * (porcentajeAhorro / 100))
}

export function sumarGastosPorBucket(
  gastosPorCategoria: Record<string, number>,
): Record<Bucket503020, number> {
  const totales: Record<Bucket503020, number> = {
    necesidades: 0,
    caprichos: 0,
  }

  for (const [categoria, monto] of Object.entries(gastosPorCategoria)) {
    const bucket = getBucketCategoria(categoria)
    if (bucket) {
      totales[bucket] = round2(totales[bucket] + monto)
    }
  }

  return totales
}

export interface ResumenBucket503020 {
  bucket: Bucket503020
  label: string
  limite: number
  gastado: number
  porcentaje: number
}

export function calcResumenBuckets503020(
  ingresoMensual: number,
  gastosPorCategoria: Record<string, number>,
  porcentajeAhorro: number = PORCENTAJE_AHORRO_DEFAULT,
): ResumenBucket503020[] {
  if (ingresoMensual <= 0) return []

  const gastosBucket = sumarGastosPorBucket(gastosPorCategoria)

  return (['necesidades', 'caprichos'] as const).map((bucket) => {
    const limite = calcTotalBucket503020(ingresoMensual, bucket, porcentajeAhorro)
    const gastado = gastosBucket[bucket]
    return {
      bucket,
      label: getBucketLabel503020(bucket, porcentajeAhorro),
      limite,
      gastado,
      porcentaje: limite > 0 ? gastado / limite : 0,
    }
  })
}

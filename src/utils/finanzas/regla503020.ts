import {
  BUCKET_LABELS,
  CATEGORIA_BUCKET,
  CATEGORIA_PESO_EN_BUCKET,
  REGLA_503020,
  type Bucket503020,
} from '../../constants/regla503020'
import type { Categoria } from '../../types/gasto'
import type { LimitesPorCategoria } from '../../services/presupuestoCategorias'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function getBucketCategoria(categoria: string): Bucket503020 | null {
  return (CATEGORIA_BUCKET as Record<string, Bucket503020 | undefined>)[categoria] ?? null
}

export function calcLimiteCategoria503020(ingresoMensual: number, categoria: string): number | null {
  if (ingresoMensual <= 0) return null

  const bucket = getBucketCategoria(categoria)
  const peso = (CATEGORIA_PESO_EN_BUCKET as Record<string, number | undefined>)[categoria]
  if (!bucket || peso == null) return null

  const bucketShare =
    bucket === 'necesidades' ? REGLA_503020.necesidades : REGLA_503020.caprichos

  return round2(ingresoMensual * bucketShare * peso)
}

export function calcLimitesRegla503020(
  ingresoMensual: number,
  categorias: readonly Categoria[],
): LimitesPorCategoria {
  const limites: LimitesPorCategoria = {}

  for (const categoria of categorias) {
    const limite = calcLimiteCategoria503020(ingresoMensual, categoria)
    if (limite != null && limite > 0) {
      limites[categoria] = limite
    }
  }

  return limites
}

export function calcTotalBucket503020(ingresoMensual: number, bucket: Bucket503020): number {
  if (ingresoMensual <= 0) return 0
  const share =
    bucket === 'necesidades' ? REGLA_503020.necesidades : REGLA_503020.caprichos
  return round2(ingresoMensual * share)
}

export function calcAhorroMensual503020(ingresoMensual: number): number {
  if (ingresoMensual <= 0) return 0
  return round2(ingresoMensual * REGLA_503020.ahorro)
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
): ResumenBucket503020[] {
  if (ingresoMensual <= 0) return []

  const gastosBucket = sumarGastosPorBucket(gastosPorCategoria)

  return (['necesidades', 'caprichos'] as const).map((bucket) => {
    const limite = calcTotalBucket503020(ingresoMensual, bucket)
    const gastado = gastosBucket[bucket]
    return {
      bucket,
      label: BUCKET_LABELS[bucket],
      limite,
      gastado,
      porcentaje: limite > 0 ? gastado / limite : 0,
    }
  })
}

import { describe, expect, it } from 'vitest'
import type { OptimisticGasto } from '../types/gasto'
import { filterOptimisticGastos, mergeResumenWithOptimistic } from './optimisticGastos'

const mes = new Date(2026, 2, 15)

describe('optimisticGastos utils', () => {
  it('combina resumen mensual con gastos optimistas del mes', () => {
    const optimistic: OptimisticGasto[] = [
      {
        tempId: '1',
        monto: 50,
        categoria: 'Comida',
        descripcion: 'Cafe',
        fecha: new Date(2026, 2, 20).toISOString(),
      },
    ]

    const resultado = mergeResumenWithOptimistic(
      [{ categoria: 'Comida', total: 100 }],
      optimistic,
      mes,
    )

    expect(resultado).toEqual([
      { monto: 100, categoria: 'Comida' },
      { monto: 50, categoria: 'Comida' },
    ])
  })

  it('filtra gastos optimistas por categoría y búsqueda', () => {
    const optimistic: OptimisticGasto[] = [
      {
        tempId: '1',
        monto: 50,
        categoria: 'Comida',
        descripcion: 'Supermercado',
        fecha: new Date(2026, 2, 10).toISOString(),
      },
      {
        tempId: '2',
        monto: 80,
        categoria: 'Transporte',
        descripcion: 'Uber',
        fecha: new Date(2026, 2, 12).toISOString(),
      },
    ]

    const filtrados = filterOptimisticGastos(optimistic, mes, 'Comida', 'super')
    expect(filtrados).toHaveLength(1)
    expect(filtrados[0]?.tempId).toBe('1')
  })
})

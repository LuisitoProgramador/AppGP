import { describe, expect, it } from 'vitest'
import {
  finDeAnoCalendarioIso,
  metaAnualDelAnio,
  nombreMetaAhorroAnual,
  periodoMetaLabel,
  semanasRestantesHastaFinDeAno,
} from '../finanzas/metaCalendario'

describe('metaCalendario', () => {
  it('cuenta semanas restantes hasta 31 dic (incluye el día actual)', () => {
    expect(semanasRestantesHastaFinDeAno(new Date(2026, 0, 1))).toBe(53)
    expect(semanasRestantesHastaFinDeAno(new Date(2026, 2, 23))).toBe(41)
    expect(semanasRestantesHastaFinDeAno(new Date(2026, 6, 4))).toBe(26)
    expect(semanasRestantesHastaFinDeAno(new Date(2026, 11, 31))).toBe(1)
  })

  it('genera fin de año calendario', () => {
    expect(finDeAnoCalendarioIso(new Date(2026, 6, 4))).toBe('2026-12-31')
  })

  it('identifica meta anual del año', () => {
    const meta = {
      id: 1,
      nombre: nombreMetaAhorroAnual(2026),
      monto_objetivo: 1000,
      monto_actual: 0,
      fecha_limite: '2026-12-31',
    }
    expect(metaAnualDelAnio(meta, 2026)).toBe(true)
    expect(metaAnualDelAnio(meta, 2027)).toBe(false)
  })

  it('muestra periodo parcial con día de inicio', () => {
    const meta = {
      id: 1,
      nombre: nombreMetaAhorroAnual(2026),
      monto_objetivo: 1000,
      monto_actual: 0,
      fecha_limite: '2026-12-31',
      created_at: '2026-03-23T12:00:00.000Z',
    }
    expect(periodoMetaLabel(meta)).toMatch(/mar–31 dic 2026/)
  })
})

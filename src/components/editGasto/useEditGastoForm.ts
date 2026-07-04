import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { formatMontoFromNumber, parseMontoValue } from '../../utils/format/montoInput'
import { sumMsiGrupoMontos } from '../../utils/gastos/gastoSaldo'
import { buildMsiGastos, parseMsiDescripcion } from '../../utils/gastos/msi'
import { isGastoFechaPasada } from '../../utils/date'
import { showError } from '../../utils/core/toast'
import {
  validateCuentaId,
  validateMsiMeses,
  validateMonto,
} from '../../utils/core/validation'
import { isOnline } from '../../utils/core/network'
import type { EditGastoModalProps, GrupoMsiRow } from './types'
import { OFFLINE_CUENTA_MSG } from './types'

export function useEditGastoForm({
  gasto,
  modoInicial = 'cuota',
}: Pick<EditGastoModalProps, 'gasto' | 'modoInicial'>) {
  const [monto, setMonto] = useState(formatMontoFromNumber(gasto.monto))
  const [categoria, setCategoria] = useState(gasto.categoria)
  const [descripcion, setDescripcion] = useState(gasto.descripcion ?? '')
  const [cuentaId, setCuentaId] = useState(gasto.cuenta_id ?? '')
  const [grupoRows, setGrupoRows] = useState<GrupoMsiRow[]>([])
  const [cargandoGrupo, setCargandoGrupo] = useState(false)
  const [corregirTotal, setCorregirTotal] = useState(modoInicial === 'compra')
  const [totalCompra, setTotalCompra] = useState('')
  const [mesesMsi, setMesesMsi] = useState('3')
  const [descripcionBase, setDescripcionBase] = useState('')

  const esMsi = Boolean(gasto.es_msi && gasto.grupo_msi_id)
  const gastoPasado = useMemo(() => isGastoFechaPasada(gasto.fecha), [gasto.fecha])
  const edicionBloqueada = useMemo(
    () => gastoPasado && (!esMsi || !corregirTotal),
    [gastoPasado, esMsi, corregirTotal],
  )
  const msiInfo = useMemo(
    () => parseMsiDescripcion(gasto.descripcion ?? ''),
    [gasto.descripcion],
  )
  const totalGrupo = useMemo(
    () => sumMsiGrupoMontos(grupoRows.length > 0 ? grupoRows : [{ monto: gasto.monto }]),
    [grupoRows, gasto.monto],
  )

  const cuentaOriginal = gasto.cuenta_id ?? ''
  const cuentaCambio = cuentaId !== cuentaOriginal

  const previewCuotas = useMemo(() => {
    if (!corregirTotal || !esMsi || !cuentaId || grupoRows.length === 0) return []

    const totalError = validateMonto(totalCompra)
    const mesesError = validateMsiMeses(mesesMsi)
    if (totalError || mesesError) return []

    const total = parseMontoValue(totalCompra)
    const meses = Number(mesesMsi)
    const base =
      descripcionBase.trim() ||
      parseMsiDescripcion(grupoRows[0]?.descripcion ?? '')?.base ||
      'Compra MSI'

    return buildMsiGastos({
      totalMonto: total,
      months: meses,
      categoria,
      descripcion: base,
      cuentaId,
      startDate: new Date(grupoRows[0].fecha),
      grupoMsiId: gasto.grupo_msi_id!,
    })
  }, [
    corregirTotal,
    esMsi,
    cuentaId,
    gasto.grupo_msi_id,
    grupoRows,
    totalCompra,
    mesesMsi,
    descripcionBase,
    categoria,
  ])

  useEffect(() => {
    if (!esMsi || !gasto.grupo_msi_id) return

    async function cargarGrupo() {
      setCargandoGrupo(true)
      const { data, error } = await supabase
        .from('gastos')
        .select('id, monto, descripcion, fecha, categoria')
        .eq('grupo_msi_id', gasto.grupo_msi_id)
        .order('fecha', { ascending: true })

      setCargandoGrupo(false)

      if (error) {
        showError(`No se pudo cargar el grupo MSI: ${error.message}`)
        return
      }

      const rows = (data ?? []) as GrupoMsiRow[]
      setGrupoRows(rows)
      setTotalCompra(formatMontoFromNumber(sumMsiGrupoMontos(rows)))
      setMesesMsi(String(rows.length))

      const parsed = parseMsiDescripcion(rows[0]?.descripcion ?? gasto.descripcion ?? '')
      setDescripcionBase(parsed?.base ?? gasto.descripcion ?? '')
    }

    cargarGrupo()
  }, [esMsi, gasto.grupo_msi_id, gasto.descripcion])

  function buildInstallmentsFromGrupo(
    patchCuota?: { monto: number; descripcion: string },
  ) {
    return grupoRows.map((row) => {
      if (patchCuota && row.id === gasto.id) {
        return {
          monto: patchCuota.monto,
          descripcion: patchCuota.descripcion,
          fecha: row.fecha,
        }
      }

      return {
        monto: Number(row.monto),
        descripcion: row.descripcion ?? '',
        fecha: row.fecha,
      }
    })
  }

  function validarCambioCuenta(): string | null {
    if (!cuentaCambio) return null
    if (!isOnline()) return OFFLINE_CUENTA_MSG
    return validateCuentaId(cuentaId)
  }

  return {
    monto,
    setMonto,
    categoria,
    setCategoria,
    descripcion,
    setDescripcion,
    cuentaId,
    setCuentaId,
    cargandoGrupo,
    corregirTotal,
    setCorregirTotal,
    totalCompra,
    setTotalCompra,
    mesesMsi,
    setMesesMsi,
    descripcionBase,
    setDescripcionBase,
    esMsi,
    gastoPasado,
    edicionBloqueada,
    msiInfo,
    totalGrupo,
    cuentaCambio,
    previewCuotas,
    grupoRows,
    buildInstallmentsFromGrupo,
    validarCambioCuenta,
  }
}

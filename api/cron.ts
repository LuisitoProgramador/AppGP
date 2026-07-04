import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseAdmin } from '../server/supabaseAdmin'
import { formatMonto, sendTelegram } from '../server/telegram'

interface VercelRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  status: (code: number) => { json: (body: unknown) => void }
}

const TZ = 'America/Mexico_City'
const UMBRAL_ALERTA = 0.8
const DIAS_AVISO_TARJETA = 3

interface FechaLocal {
  year: number
  month: number
  day: number
  diasEnMes: number
}

function fechaLocal(now = new Date()): FechaLocal {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const year = get('year')
  const month = get('month')
  const day = get('day')
  const diasEnMes = new Date(year, month, 0).getDate()
  return { year, month, day, diasEnMes }
}

function mesKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function mesAnterior(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

function nombreMes(year: number, month: number): string {
  return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  )
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface PresupuestoRow {
  limite_mensual: number | string
  limite_es_manual: boolean | null
  sueldo_mensual: number | string | null
  ingresos_extras: number | string | null
  porcentaje_ahorro: number | string | null
}

function resolveLimite(p: PresupuestoRow): number {
  if (p.limite_es_manual) return Number(p.limite_mensual)
  if (p.sueldo_mensual != null && p.porcentaje_ahorro != null) {
    const total = Number(p.sueldo_mensual) + Number(p.ingresos_extras ?? 0)
    const ahorro = total * (Number(p.porcentaje_ahorro) / 100)
    return Math.round((total - ahorro) * 100) / 100
  }
  return Number(p.limite_mensual)
}

async function yaEnviada(
  admin: SupabaseClient,
  userId: string,
  clave: string,
): Promise<boolean> {
  const { data } = await admin
    .from('notificaciones_enviadas')
    .select('id')
    .eq('user_id', userId)
    .eq('clave', clave)
    .maybeSingle()
  return Boolean(data)
}

async function marcarEnviada(admin: SupabaseClient, userId: string, clave: string) {
  await admin.from('notificaciones_enviadas').insert({ user_id: userId, clave })
}

async function targetUserIds(admin: SupabaseClient): Promise<string[]> {
  const envUser = process.env.NOTIFY_USER_ID
  if (envUser) return [envUser]

  const ids = new Set<string>()
  const { data: presupuestos } = await admin.from('presupuestos').select('user_id')
  presupuestos?.forEach((r) => r.user_id && ids.add(String(r.user_id)))
  const { data: cuentas } = await admin.from('cuentas').select('user_id')
  cuentas?.forEach((r) => r.user_id && ids.add(String(r.user_id)))
  return [...ids]
}

interface ResumenRow {
  mes: string
  categoria: string
  total: number | string
}

async function resumenMensual(admin: SupabaseClient, userId: string): Promise<ResumenRow[]> {
  const { data } = await admin
    .from('gastos_resumen_mensual')
    .select('mes, categoria, total')
    .eq('user_id', userId)
  return (data as ResumenRow[]) ?? []
}

function totalDelMes(rows: ResumenRow[], clave: string): number {
  return rows
    .filter((r) => typeof r.mes === 'string' && r.mes.slice(0, 7) === clave)
    .reduce((acc, r) => acc + Number(r.total), 0)
}

/** Alerta de presupuesto: 80% y 100% del límite del mes en curso, una vez cada umbral. */
async function revisarPresupuesto(
  admin: SupabaseClient,
  userId: string,
  hoy: FechaLocal,
  resumen: ResumenRow[],
): Promise<boolean> {
  const { data: presupuesto } = await admin
    .from('presupuestos')
    .select('limite_mensual, limite_es_manual, sueldo_mensual, ingresos_extras, porcentaje_ahorro')
    .eq('user_id', userId)
    .maybeSingle()

  if (!presupuesto) return false

  const limite = resolveLimite(presupuesto as PresupuestoRow)
  if (!Number.isFinite(limite) || limite <= 0) return false

  const claveMes = mesKey(hoy.year, hoy.month)
  const total = totalDelMes(resumen, claveMes)
  const pct = total / limite
  const pctTexto = Math.round(pct * 100)

  if (pct >= 1) {
    const clave = `presupuesto:${claveMes}:100`
    if (await yaEnviada(admin, userId, clave)) return false
    await sendTelegram(
      `⚠️ <b>Presupuesto superado</b>\n` +
        `Llevas ${formatMonto(total)} de ${formatMonto(limite)} este mes (${pctTexto}%).`,
    )
    await marcarEnviada(admin, userId, clave)
    return true
  }

  if (pct >= UMBRAL_ALERTA) {
    const clave = `presupuesto:${claveMes}:80`
    if (await yaEnviada(admin, userId, clave)) return false
    await sendTelegram(
      `🟡 <b>Vas al ${pctTexto}% de tu presupuesto</b>\n` +
        `${formatMonto(total)} de ${formatMonto(limite)} este mes. ` +
        `Te quedan ${formatMonto(limite - total)}.`,
    )
    await marcarEnviada(admin, userId, clave)
    return true
  }

  return false
}

interface CuentaRow {
  id: string
  nombre: string
  tipo: string
  saldo_actual: number | string
  dia_pago: number | string | null
}

/** Recordatorio de pago de tarjetas: cuando faltan <= 3 días para el día de pago, una vez al mes. */
async function revisarTarjetas(
  admin: SupabaseClient,
  userId: string,
  hoy: FechaLocal,
): Promise<number> {
  const { data } = await admin
    .from('cuentas')
    .select('id, nombre, tipo, saldo_actual, dia_pago')
    .eq('user_id', userId)
    .eq('tipo', 'credito')

  const tarjetas = ((data as CuentaRow[]) ?? []).filter(
    (c) => c.dia_pago != null && Number(c.saldo_actual) > 0,
  )

  let enviadas = 0
  for (const tarjeta of tarjetas) {
    const diaPago = Number(tarjeta.dia_pago)
    const diaEfectivo = Math.min(diaPago, hoy.diasEnMes)
    const diasParaPago = diaEfectivo - hoy.day

    if (diasParaPago < 0 || diasParaPago > DIAS_AVISO_TARJETA) continue

    const clave = `tarjeta:${tarjeta.id}:${mesKey(hoy.year, hoy.month)}`
    if (await yaEnviada(admin, userId, clave)) continue

    const cuando =
      diasParaPago === 0
        ? 'Vence <b>hoy</b>'
        : `Vence en <b>${diasParaPago} día${diasParaPago === 1 ? '' : 's'}</b> (día ${diaEfectivo})`

    await sendTelegram(
      `💳 <b>Pago de tarjeta ${esc(tarjeta.nombre)}</b>\n` +
        `${cuando}. Saldo a pagar: ${formatMonto(Number(tarjeta.saldo_actual))}.`,
    )
    await marcarEnviada(admin, userId, clave)
    enviadas += 1
  }

  return enviadas
}

/** Resumen del mes cerrado: solo el día 1, por categoría vs presupuesto. */
async function revisarResumenMensual(
  admin: SupabaseClient,
  userId: string,
  hoy: FechaLocal,
  resumen: ResumenRow[],
): Promise<boolean> {
  if (hoy.day !== 1) return false

  const { year: yPrev, month: mPrev } = mesAnterior(hoy.year, hoy.month)
  const clavePrev = mesKey(yPrev, mPrev)
  const clave = `resumen:${clavePrev}`
  if (await yaEnviada(admin, userId, clave)) return false

  const filas = resumen
    .filter((r) => typeof r.mes === 'string' && r.mes.slice(0, 7) === clavePrev)
    .map((r) => ({ categoria: r.categoria, total: Number(r.total) }))
    .sort((a, b) => b.total - a.total)

  if (filas.length === 0) return false

  const total = filas.reduce((acc, r) => acc + r.total, 0)

  const { data: presupuesto } = await admin
    .from('presupuestos')
    .select('limite_mensual, limite_es_manual, sueldo_mensual, ingresos_extras, porcentaje_ahorro')
    .eq('user_id', userId)
    .maybeSingle()

  const lineas = filas
    .slice(0, 6)
    .map((r) => `• ${esc(r.categoria)}: ${formatMonto(r.total)}`)
    .join('\n')

  let cabecera = `📊 <b>Resumen de ${nombreMes(yPrev, mPrev)}</b>\n`
  if (presupuesto) {
    const limite = resolveLimite(presupuesto as PresupuestoRow)
    if (Number.isFinite(limite) && limite > 0) {
      const pct = Math.round((total / limite) * 100)
      cabecera += `Gastaste ${formatMonto(total)} de ${formatMonto(limite)} (${pct}%).\n\n`
    } else {
      cabecera += `Gastaste ${formatMonto(total)}.\n\n`
    }
  } else {
    cabecera += `Gastaste ${formatMonto(total)}.\n\n`
  }

  await sendTelegram(cabecera + lineas)
  await marcarEnviada(admin, userId, clave)
  return true
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method && req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers['authorization']
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'No autorizado' })
    }
  }

  let admin: SupabaseClient
  try {
    admin = createSupabaseAdmin()
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message })
  }

  const hoy = fechaLocal()
  const resultado = { presupuesto: 0, tarjetas: 0, resumen: 0, errores: [] as string[] }

  const usuarios = await targetUserIds(admin)

  for (const userId of usuarios) {
    try {
      const resumen = await resumenMensual(admin, userId)

      if (await revisarPresupuesto(admin, userId, hoy, resumen)) resultado.presupuesto += 1
      resultado.tarjetas += await revisarTarjetas(admin, userId, hoy)
      if (await revisarResumenMensual(admin, userId, hoy, resumen)) resultado.resumen += 1
    } catch (error) {
      resultado.errores.push(`${userId}: ${(error as Error).message}`)
    }
  }

  return res.status(200).json({ ok: true, ...resultado })
}

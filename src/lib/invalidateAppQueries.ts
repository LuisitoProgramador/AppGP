import { queryClient } from './queryClient'
import { queryKeyPrefixes, type AppQueryScope } from './queryKeys'

/** Alcances invalidados al registrar o editar gastos (sin metas ni recurrentes). */
export const GASTO_QUERY_SCOPES: AppQueryScope[] = [
  'cuentas',
  'dashboard',
  'historial',
  'presupuesto',
]

export const CUENTA_QUERY_SCOPES: AppQueryScope[] = ['cuentas', 'dashboard']

export const INGRESO_QUERY_SCOPES: AppQueryScope[] = ['cuentas', 'dashboard', 'historial']

export const TRANSFERENCIA_QUERY_SCOPES: AppQueryScope[] = ['cuentas', 'dashboard']

export const RECURRENTE_QUERY_SCOPES: AppQueryScope[] = [
  'recurrentes',
  'dashboard',
  'historial',
]

export const PRESUPUESTO_QUERY_SCOPES: AppQueryScope[] = ['presupuesto', 'dashboard']

export function invalidateAppQueries(
  scopes: AppQueryScope[] = GASTO_QUERY_SCOPES,
): void {
  for (const scope of scopes) {
    void queryClient.invalidateQueries({ queryKey: queryKeyPrefixes[scope] })
  }
}

export const queryKeys = {
  all: ['app'] as const,
  cuentas: (userId: string | undefined) => ['app', 'cuentas', userId] as const,
  metas: (userId: string | undefined) => ['app', 'metas', userId] as const,
  dashboard: (userId: string | undefined, monthKey: string, lite: boolean) =>
    ['app', 'dashboard', userId, monthKey, lite] as const,
}

export function monthQueryKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`
}

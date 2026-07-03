import { isOnline } from '../utils/network'

interface NotifyPayload {
  monto: number
  categoria: string
  descripcion: string
}

export async function notifyTelegram(payload: NotifyPayload): Promise<void> {
  if (!isOnline()) return

  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // La notificación es opcional
  }
}

interface NotifyPayload {
  monto: number
  categoria: string
  descripcion: string
}

export async function notifyTelegram(payload: NotifyPayload): Promise<void> {
  if (!navigator.onLine) return

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

import axios from 'axios'

interface NotifyBody {
  monto: number
  categoria: string
  descripcion: string
}

interface VercelRequest {
  method?: string
  body?: Partial<NotifyBody>
}

interface VercelResponse {
  status: (code: number) => { json: (body: unknown) => void }
}

function formatMonto(monto: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(monto)
}

function buildMessage({ monto, categoria, descripcion }: NotifyBody): string {
  return [
    '💰 Nuevo Gasto Registrado',
    '',
    `💵 Monto: ${formatMonto(monto)}`,
    `📂 Categoría: ${categoria}`,
    `📝 Descripción: ${descripcion}`,
  ].join('\n')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(500).json({ error: 'Método no permitido' })
  }

  const { monto, categoria, descripcion } = req.body ?? {}

  if (monto == null || !categoria?.trim() || !descripcion?.trim()) {
    return res.status(500).json({ error: 'Faltan monto, categoria o descripcion' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    return res.status(500).json({ error: 'Variables de Telegram no configuradas' })
  }

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: buildMessage({
        monto: Number(monto),
        categoria: categoria.trim(),
        descripcion: descripcion.trim(),
      }),
    })

    return res.status(200).json({ ok: true })
  } catch {
    return res.status(500).json({ error: 'Error al enviar notificación a Telegram' })
  }
}

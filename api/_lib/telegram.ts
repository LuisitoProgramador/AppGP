import axios from 'axios'

/**
 * Envía un mensaje de texto al chat de Telegram configurado.
 * Personal: un solo TELEGRAM_CHAT_ID para toda la app.
 * Lanza si faltan variables o si la API de Telegram falla.
 */
export async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    throw new Error('Variables de Telegram no configuradas (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)')
  }

  await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  })
}

export function formatMonto(monto: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(monto)
}

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const REPORT_TOPIC_ID = parseInt(process.env.REPORT_TOPIC_ID || '0')

async function sendMessage(chatId: number, text: string, replyTo?: number, threadId?: number) {
  const body: any = { chat_id: chatId, text, parse_mode: 'HTML' }
  if (replyTo) body.reply_to_message_id = replyTo
  if (threadId) body.message_thread_id = threadId
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function getMember(telegramId: number) {
  const { data } = await supabase.from('members').select('*').eq('telegram_id', telegramId).single()
  return data
}

// Слово "отчёт"/"отчет" должно быть в первых 30 символах сообщения
// Также принимаем хэштег #отчет/#отчёт в начале
function isReport(text: string): boolean {
  if (!text) return false
  const first30 = text.toLowerCase().slice(0, 30)
  return first30.includes('отчёт') || first30.includes('отчет')
}

// Минимальная проверка что текст — настоящий отчёт (не команда)
function isValidReport(text: string): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return lower.includes('отчёт') || lower.includes('отчет')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body.message || body.edited_message
    if (!message) return NextResponse.json({ ok: true })

    // Текст сообщения — берём text или caption (для фото/медиа с подписью)
    const messageText: string = message.text || message.caption || ''

    const chatId: number = message.chat.id
    const threadId: number | undefined = message.message_thread_id
    const messageId: number = message.message_id
    const fromId: number = message.from?.id

    if (!fromId) return NextResponse.json({ ok: true })

    // Обрабатываем только отчёты в нужном топике
    if (REPORT_TOPIC_ID && threadId !== REPORT_TOPIC_ID) {
      return NextResponse.json({ ok: true })
    }

    if (!isReport(messageText)) return NextResponse.json({ ok: true })

    const member = await getMember(fromId)
    if (!member) return NextResponse.json({ ok: true })

    // Московское время UTC+3. До 06:00 МСК отчёт засчитывается за предыдущий день
    const mskDate = new Date(Date.now() + 3 * 60 * 60 * 1000)
    const mskHour = mskDate.getUTCHours()
    if (mskHour < 6) mskDate.setDate(mskDate.getDate() - 1)
    const today = mskDate.toISOString().split('T')[0]

    // Проверяем, не сдан ли уже отчёт за этот день
    const { data: existing } = await supabase
      .from('daily_reports')
      .select('id, status')
      .eq('member_id', member.id)
      .eq('date', today)
      .single()

    if (existing?.status === 'submitted') {
      await sendMessage(chatId, `✅ ${member.name}, отчёт за ${today} уже засчитан!`, messageId, threadId)
      return NextResponse.json({ ok: true })
    }

    // Сохраняем или обновляем отчёт
    const { error } = await supabase
      .from('daily_reports')
      .upsert({
        member_id: member.id,
        date: today,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        content: messageText,
      }, { onConflict: 'member_id,date' })

    if (error) {
      console.error('Report save error:', error)
      return NextResponse.json({ ok: true })
    }

    await sendMessage(chatId, `✅ ${member.name}, отчёт за ${today} принят!`, messageId, threadId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    return NextResponse.json({ ok: true })
  }
}

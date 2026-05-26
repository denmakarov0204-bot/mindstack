import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const REPORT_TOPIC_ID = parseInt(process.env.REPORT_TOPIC_ID || '0')

async function sendMessage(chatId: number, text: string, threadId?: number) {
  const body: any = { chat_id: chatId, text, parse_mode: 'HTML' }
  if (threadId) body.message_thread_id = threadId
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Вчерашняя дата по МСК (UTC+3)
  const mskNow = new Date(Date.now() + 3*60*60*1000)
  const yesterday = new Date(mskNow)
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().split('T')[0]
  const dateFormatted = yesterday.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

  // Получаем статус отчётов за вчера
  const { data: members } = await supabase
    .from('members')
    .select('id, name, telegram_id')
    .eq('is_active', true)

  if (!members?.length) return NextResponse.json({ ok: true })

  const { data: reports } = await supabase
    .from('daily_reports')
    .select('member_id')
    .eq('date', dateStr)
    .eq('status', 'submitted')

  const submittedIds = new Set(reports?.map(r => r.member_id) || [])
  const missing = members.filter(m => !submittedIds.has(m.id))
  const submitted = members.filter(m => submittedIds.has(m.id))

  let text = ''

  if (missing.length === 0) {
    // Все сдали — отправляем в общий чат/тему
    text = `🌅 <b>Доброе утро! Итоги ${dateFormatted}</b>\n\n✅ Все сдали отчёт! Молодцы! 💪\n\n${submitted.map(m => `✓ ${m.name.split(' ')[0]}`).join('\n')}`
    
    // Отправляем в тему (если есть)
    const { data: chats } = await supabase.from('members').select('telegram_id').eq('is_active', true).limit(1)
    
    // Ищем chat_id группы из переменных окружения или отправляем всем лично
    // Отправляем каждому участнику лично
    for (const m of members) {
      if (m.telegram_id) {
        await sendMessage(m.telegram_id, text)
      }
    }
  } else {
    // Есть должники — отправляем сводку каждому
    const missingNames = missing.map(m => `❌ ${m.name}`).join('\n')
    const submittedNames = submitted.length > 0 ? submitted.map(m => `✅ ${m.name.split(' ')[0]}`).join('  ') : '—'

    text = `🌅 <b>Доброе утро! Итоги ${dateFormatted}</b>\n\n${missingNames}\n\n<i>не сдали отчёт вчера</i>\n\nСдали: ${submittedNames}`

    for (const m of members) {
      if (m.telegram_id) {
        await sendMessage(m.telegram_id, text)
      }
    }
  }

  return NextResponse.json({ ok: true, date: dateStr, missing: missing.length, submitted: submitted.length })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const REPORT_TOPIC_ID = parseInt(process.env.REPORT_TOPIC_ID || '0')
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID ? parseInt(process.env.GROUP_CHAT_ID) : null

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

async function setReaction(chatId: number, messageId: number, emoji: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMessageReaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reaction: [{ type: 'emoji', emoji }],
    }),
  })
}

async function getMember(telegramId: number) {
  const { data } = await supabase
    .from('members')
    .select('id, name, telegram_id')
    .eq('telegram_id', telegramId)
    .maybeSingle()
  return data
}

function isReport(text: string): boolean {
  return text.length > 20
}

function isValidReport(text: string): boolean {
  const lower = text.toLowerCase()
  if (lower.startsWith('#отчет') || lower.startsWith('#отчёт')) return true
  const hasResult = lower.includes('сделал') || lower.includes('выполнил') || lower.includes('завершил') ||
    lower.includes('результат') || lower.includes('итог') || lower.includes('готово') ||
    lower.includes('сдал') || lower.includes('работал') || lower.includes('занимался') ||
    lower.includes('провел') || lower.includes('провёл') || lower.includes('написал') ||
    lower.includes('разработал') || lower.includes('создал') || lower.includes('добавил') ||
    lower.includes('изучил') || lower.includes('прочитал') || lower.includes('встреча') ||
    lower.includes('запустил') || lower.includes('настроил') || lower.includes('исправил')
  return hasResult && text.length > 50
}

async function getStats(memberId: string, memberName: string): Promise<string> {
  const mskNow = new Date(Date.now() + 3 * 60 * 60 * 1000)
  const today = mskNow.toISOString().split('T')[0]
  const firstOfMonth = today.slice(0, 8) + '01'
  const daysElapsed = mskNow.getUTCDate()
  const monthNames = ['января','февраля','марта','апреля','мая','июня',
    'июля','августа','сентября','октября','ноября','декабря']
  const monthName = monthNames[mskNow.getUTCMonth()]

  const { data: reports } = await supabase.from('daily_reports').select('status')
    .eq('member_id', memberId).gte('date', firstOfMonth).lte('date', today)

  const submitted = (reports || []).filter((r: any) => r.status === 'submitted' || r.status === 'late').length
  const late = (reports || []).filter((r: any) => r.status === 'late').length
  const missed = Math.max(0, daysElapsed - submitted)
  const pct = daysElapsed > 0 ? Math.round((submitted / daysElapsed) * 100) : 100
  const disc = pct >= 90 ? '🟢' : pct >= 70 ? '🟡' : '🔴'

  const { data: balance } = await supabase.from('member_fine_balance')
    .select('total_charged, total_paid, debt').eq('id', memberId).maybeSingle()

  const charged = (balance as any)?.total_charged ?? 0
  const paid = (balance as any)?.total_paid ?? 0
  const debt = (balance as any)?.debt ?? 0

  const { count: openTasks } = await supabase.from('action_items')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', memberId).neq('status', 'done')

  return `📊 <b>Статистика — ${memberName}</b>\n\n📝 <b>Отчёты (${monthName}):</b>\n${disc} Сдано: ${submitted}/${daysElapsed} дней (${pct}%)${late > 0 ? `\n⏰ Опоздавших: ${late}` : ''}\n❌ Пропущено: ${missed}\n\n💰 <b>Штрафы:</b>\n• Начислено: ${charged}₽\n• Оплачено: ${paid}₽\n• Долг: <b>${debt}₽</b>\n\n✅ <b>Задачи в работе:</b> ${openTasks ?? 0}`
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const message = body.message || body.edited_message
  if (!message) return NextResponse.json({ ok: true })

  const chatId: number = message.chat.id
  const fromId: number = message.from?.id
  const messageId: number = message.message_id
  const threadId: number | undefined = message.message_thread_id
  const messageText: string = message.text || ''

  // /статистика command — works from any chat
  if (messageText.startsWith('/статистика') || messageText.startsWith('/stats')) {
    const member = await getMember(fromId)
    if (!member) {
      await sendMessage(chatId, '❓ Не нашёл тебя в базе мастермайнда. Обратись к администратору.', messageId, threadId)
      return NextResponse.json({ ok: true })
    }
    const stats = await getStats(member.id, member.name)
    await sendMessage(chatId, stats, messageId, threadId)
    return NextResponse.json({ ok: true })
  }

  // Only process reports from the designated topic
  if (GROUP_CHAT_ID && chatId !== GROUP_CHAT_ID) return NextResponse.json({ ok: true })
  if (REPORT_TOPIC_ID && threadId !== REPORT_TOPIC_ID) return NextResponse.json({ ok: true })

  if (!messageText || !isReport(messageText)) return NextResponse.json({ ok: true })

  const member = await getMember(fromId)
  if (!member) return NextResponse.json({ ok: true })

  // Determine report date (before 6am MSK counts as yesterday)
  const mskNow = new Date(Date.now() + 3 * 60 * 60 * 1000)
  const mskHour = mskNow.getUTCHours()
  const reportDate = mskHour < 6
    ? new Date(mskNow.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : mskNow.toISOString().split('T')[0]

  const isLate = mskHour < 6

  const { data: existing } = await supabase
    .from('daily_reports')
    .select('id, status')
    .eq('member_id', member.id)
    .eq('date', reportDate)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'submitted') {
      await setReaction(chatId, messageId, '✅')
      return NextResponse.json({ ok: true })
    }
    await supabase.from('daily_reports').update({
      content: messageText,
      status: isLate ? 'late' : 'submitted',
      submitted_at: new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await supabase.from('daily_reports').insert({
      member_id: member.id,
      date: reportDate,
      content: messageText,
      status: isLate ? 'late' : 'submitted',
      submitted_at: new Date().toISOString(),
    })
  }

  await setReaction(chatId, messageId, '✅')

  return NextResponse.json({ ok: true })
}

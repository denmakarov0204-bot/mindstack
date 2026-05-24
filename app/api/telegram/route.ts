import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

async function getMemberByTelegram(telegramId: number) {
  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('telegram_id', telegramId)
    .single()
  return data
}

function isValidReport(content: string): boolean {
  const normalized = content.toLowerCase()
  const keywords = [
    'отчёт','отчет','отчёта','отчета','отчёту','отчету',
    'отчётом','отчетом','отчёте','отчете','отчёты','отчеты',
  ]
  return keywords.some(kw => normalized.includes(kw))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const msg = body.message
  if (!msg) return NextResponse.json({ ok: true })

  const chatId = msg.chat.id
  const text = (msg.text?.trim() || '')
  const telegramId = msg.from.id

  const member = await getMemberByTelegram(telegramId)

  if (!member) {
    await sendMessage(chatId,
      `👋 Привет! Ты не найден в базе MindStack.\n\n` +
      `Обратись к Даниилу чтобы тебя добавили.\n` +
      `Твой Telegram ID: <code>${telegramId}</code>`
    )
    return NextResponse.json({ ok: true })
  }

  const today = new Date().toISOString().split('T')[0]

  if (text === '/start' || text === '/help') {
    await sendMessage(chatId,
      `⚡ <b>MindStack Bot</b>\n\n` +
      `Привет, ${member.name.split(' ')[0]}!\n\n` +
      `<b>Как сдать отчёт:</b>\n` +
      `Напиши сообщение со словом <b>"отчёт"</b>, например:\n` +
      `<i>"Отчёт за день: сделал X, Y, Z"</i>\n\n` +
      `<b>Команды:</b>\n` +
      `/status — твоя статистика\n` +
      `/today — кто сдал сегодня\n` +
      `/fines — твои штрафы\n\n` +
      `⏰ <i>Штраф ${100}₽ если нет отчёта до 23:59</i>`
    )
    return NextResponse.json({ ok: true })
  }

  if (text === '/status') {
    const { data: score } = await supabase.from('discipline_scores').select('*').eq('member_id', member.id).single()
    const { data: balance } = await supabase.from('member_fine_balance').select('*').eq('id', member.id).single()
    await sendMessage(chatId,
      `📊 <b>${member.name}</b>\n\n` +
      `⭐ Дисциплина: <b>${score?.score ?? 0}</b>/100\n` +
      `💸 Начислено: <b>${balance?.total_charged ?? 0}₽</b>\n` +
      `✅ Оплачено: <b>${balance?.total_paid ?? 0}₽</b>\n` +
      `🔴 Долг: <b>${balance?.debt ?? 0}₽</b>`
    )
    return NextResponse.json({ ok: true })
  }

  if (text === '/today') {
    const { data: reports } = await supabase.from('today_report_status').select('*')
    const lines = (reports || []).map(r =>
      r.report_status === 'submitted' ? `✅ ${r.name}` : `❌ ${r.name}`
    ).join('\n')
    const submitted = (reports || []).filter(r => r.report_status === 'submitted').length
    await sendMessage(chatId,
      `📋 <b>Отчёты сегодня</b>\n\n${lines || 'Нет данных'}\n\n<i>${submitted}/${(reports||[]).length} сдали</i>`
    )
    return NextResponse.json({ ok: true })
  }

  if (text === '/fines') {
    const { data: fines } = await supabase.from('fines').select('*').eq('member_id', member.id).order('created_at', { ascending: false }).limit(10)
    if (!fines?.length) {
      await sendMessage(chatId, '✨ У тебя нет штрафов!')
    } else {
      const lines = fines.map(f =>
        `• ${f.reason} — <b>${f.amount}₽</b> (${new Date(f.created_at).toLocaleDateString('ru-RU')})`
      ).join('\n')
      await sendMessage(chatId, `💸 <b>Твои штрафы</b>\n\n${lines}`)
    }
    return NextResponse.json({ ok: true })
  }

  if (text.startsWith('/')) {
    await sendMessage(chatId, '❓ Неизвестная команда. Напиши /help')
    return NextResponse.json({ ok: true })
  }

  if (!isValidReport(text)) {
    await sendMessage(chatId,
      `📝 Чтобы сдать отчёт, напиши сообщение со словом <b>"отчёт"</b>.\n\n` +
      `Например: <i>"Отчёт за день: сегодня сделал..."</i>\n\n` +
      `Если нужна помощь — /help`
    )
    return NextResponse.json({ ok: true })
  }

  const { data: existing } = await supabase
    .from('daily_reports').select('id').eq('member_id', member.id).eq('date', today).eq('status', 'submitted').single()

  if (existing) {
    await sendMessage(chatId, `✅ Ты уже сдал отчёт сегодня!`)
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase.from('daily_reports').upsert({
    member_id: member.id,
    date: today,
    content: text,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  }, { onConflict: 'member_id,date' })

  if (error) {
    await sendMessage(chatId, '❌ Ошибка при сохранении. Попробуй ещё раз.')
    return NextResponse.json({ ok: true })
  }

  await sendMessage(chatId,
    `✅ <b>Отчёт принят!</b>\n\n` +
    `📅 ${new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}\n` +
    `👤 ${member.name}\n\n` +
    `<i>Молодец! 💪</i>`
  )

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'MindStack Telegram Bot' })
}

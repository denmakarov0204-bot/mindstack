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

// Слово "отчёт" должно быть в первых 20 символах сообщения
function isReport(text: string): boolean {
  if (!text) return false
  const first20 = text.toLowerCase().slice(0, 20)
  return ['отчёт','отчет','отчёта','отчета','отчёту','отчету','отчётом','отчетом','отчёте','отчете','отчёты','отчеты'].some(k => first20.includes(k))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const msg = body.message
  if (!msg) return NextResponse.json({ ok: true })

  const chatId = msg.chat.id
  const text = (msg.text?.trim() || '')
  const tgId = msg.from.id
  const msgId = msg.message_id
  const threadId = msg.message_thread_id
  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup'
  // Московское время UTC+3. До 08:00 MSK отчёт засчитывается за предыдущий день
  const mskDate = new Date(Date.now() + 3*60*60*1000)
  const mskHour = mskDate.getUTCHours()
  if (mskHour < 8) mskDate.setDate(mskDate.getDate() - 1)
  const today = mskDate.toISOString().split('T')[0]

  // /setreporttopic — admin устанавливает тему для отчётов
  if (text === '/setreporttopic' || text.startsWith('/setreporttopic@')) {
    const m = await getMember(tgId)
    if (m?.role === 'admin' && isGroup) {
      const topicId = threadId || 0
      await sendMessage(chatId,
        `✅ <b>Тема для отчётов установлена!</b>\n\nID темы: <code>${topicId}</code>\n\nДобавь в Vercel Environment Variables:\n<code>REPORT_TOPIC_ID=${topicId}</code>\n\nПосле редеплоя бот будет принимать отчёты только здесь.`,
        undefined, threadId
      )
    }
    return NextResponse.json({ ok: true })
  }

  // /chatid — узнать ID чата (для настройки)
  if (text === '/chatid' || text.startsWith('/chatid@')) {
    await sendMessage(chatId, `🆔 Chat ID: <code>${chatId}</code>\nThread ID: <code>${threadId || 0}</code>`, isGroup ? msgId : undefined, threadId)
    return NextResponse.json({ ok: true })
  }

  // /start /help
  if (text === '/start' || text.startsWith('/start@') || text === '/help' || text.startsWith('/help@')) {
    if (!isGroup) {
      const m = await getMember(tgId)
      if (!m) {
        await sendMessage(chatId, `👋 Привет! Ты не найден в базе MindStack.\n\nТвой Telegram ID: <code>${tgId}</code>\n\nСкинь этот ID Даниилу.`)
      } else {
        await sendMessage(chatId, `⚡ <b>MindStack Bot</b>\n\nПривет, ${m.name.split(' ')[0]}!\n\n<b>Как сдать отчёт:</b>\nНапиши сообщение начиная со слова <b>"отчёт"</b> в специальной теме беседы.\n\n<b>Команды:</b>\n/status — статистика\n/today — кто сдал сегодня\n/fines — штрафы\n\n⏰ <i>Штраф 100₽ если нет отчёта до 23:59</i>`)
      }
    }
    return NextResponse.json({ ok: true })
  }

  // /status
  if (text === '/status' || text.startsWith('/status@')) {
    const m = await getMember(tgId)
    if (!m) return NextResponse.json({ ok: true })
    const { data: sc } = await supabase.from('discipline_scores').select('*').eq('member_id', m.id).single()
    const { data: bal } = await supabase.from('member_fine_balance').select('*').eq('id', m.id).single()
    await sendMessage(chatId,
      `📊 <b>${m.name}</b>\n\n⭐ Дисциплина: <b>${sc?.score ?? 0}</b>/100\n💸 Начислено: <b>${bal?.total_charged ?? 0}₽</b>\n✅ Оплачено: <b>${bal?.total_paid ?? 0}₽</b>\n🔴 Долг: <b>${bal?.debt ?? 0}₽</b>`,
      isGroup ? msgId : undefined, threadId
    )
    return NextResponse.json({ ok: true })
  }

  // /today
  if (text === '/today' || text.startsWith('/today@')) {
    const { data: reps } = await supabase.from('today_report_status').select('*')
    const lines = (reps || []).map((r: any) => r.report_status === 'submitted' ? `✅ ${r.name}` : `❌ ${r.name}`).join('\n')
    const cnt = (reps || []).filter((r: any) => r.report_status === 'submitted').length
    await sendMessage(chatId, `📋 <b>Отчёты сегодня</b>\n\n${lines || 'Нет данных'}\n\n<i>${cnt}/${(reps||[]).length} сдали</i>`, isGroup ? msgId : undefined, threadId)
    return NextResponse.json({ ok: true })
  }

  // /fines
  if (text === '/fines' || text.startsWith('/fines@')) {
    const m = await getMember(tgId)
    if (!m) return NextResponse.json({ ok: true })
    const { data: fines } = await supabase.from('fines').select('*').eq('member_id', m.id).order('created_at', { ascending: false }).limit(10)
    if (!fines?.length) {
      await sendMessage(chatId, '✨ У тебя нет штрафов!', isGroup ? msgId : undefined, threadId)
    } else {
      const lines = fines.map((f: any) => `• ${f.reason} — <b>${f.amount}₽</b>`).join('\n')
      await sendMessage(chatId, `💸 <b>Твои штрафы</b>\n\n${lines}`, isGroup ? msgId : undefined, threadId)
    }
    return NextResponse.json({ ok: true })
  }

  if (text.startsWith('/')) return NextResponse.json({ ok: true })

  // В группе — только нужная тема
  if (isGroup && REPORT_TOPIC_ID !== 0 && threadId !== REPORT_TOPIC_ID) {
    return NextResponse.json({ ok: true })
  }

  // Слово "отчёт" в первых 20 символах
  if (!isReport(text)) {
    if (!isGroup) await sendMessage(chatId, `📝 Начни сообщение со слова <b>"отчёт"</b>.\n\nПример: <i>"Отчёт за день: сделал X, Y, Z"</i>`)
    return NextResponse.json({ ok: true })
  }

  const m = await getMember(tgId)
  if (!m) {
    if (!isGroup) await sendMessage(chatId, `👋 Ты не найден в базе.\nID: <code>${tgId}</code>\nСкинь Даниилу.`)
    return NextResponse.json({ ok: true })
  }

  const { data: ex } = await supabase.from('daily_reports').select('id').eq('member_id', m.id).eq('date', today).eq('status', 'submitted').single()
  if (ex) {
    if (!isGroup) await sendMessage(chatId, '✅ Ты уже сдал отчёт сегодня!')
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase.from('daily_reports').upsert({
    member_id: m.id, date: today, content: text, status: 'submitted', submitted_at: new Date().toISOString(),
  }, { onConflict: 'member_id,date' })

  if (error) {
    await sendMessage(chatId, '❌ Ошибка. Попробуй ещё раз.', isGroup ? msgId : undefined, threadId)
    return NextResponse.json({ ok: true })
  }

  if (isGroup) {
    await sendMessage(chatId, `✅ ${m.name.split(' ')[0]} сдал отчёт!`, msgId, threadId)
  } else {
    await sendMessage(chatId, `✅ <b>Отчёт принят!</b>\n\n📅 ${new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}\n👤 ${m.name}\n\n<i>Молодец! 💪</i>`)
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'MindStack Bot' })
}

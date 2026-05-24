import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const FINE_AMOUNT = 100

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

function isValidReport(content: string): boolean {
  if (!content) return false
  const normalized = content.toLowerCase()
  const keywords = [
    'отчёт', 'отчет','отчёта','отчета','отчёту','отчету',
    'отчётом','отчетом','отчёте','отчете','отчёты','отчеты',
  ]
  return keywords.some(kw => normalized.includes(kw))
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().split('T')[0]

  const { data: members } = await supabase
    .from('members')
    .select('*')
    .eq('is_active', true)

  if (!members?.length) return NextResponse.json({ ok: true, message: 'No members' })

  let finesAdded = 0
  const results: string[] = []

  for (const member of members) {
    const { data: report } = await supabase
      .from('daily_reports')
      .select('id, status, content')
      .eq('member_id', member.id)
      .eq('date', dateStr)
      .single()

    const hasValidReport = report?.status === 'submitted' && isValidReport(report?.content || '')

    if (!hasValidReport) {
      await supabase.from('daily_reports').upsert({
        member_id: member.id,
        date: dateStr,
        status: 'missing',
      }, { onConflict: 'member_id,date' })

      await supabase.from('fines').insert({
        member_id: member.id,
        amount: FINE_AMOUNT,
        reason: `Пропуск отчёта ${dateStr}`,
        is_auto: true,
      })

      finesAdded++
      results.push(`❌  ${member.name} — штраф ${FINE_AMOUNT}₽`)

      if (member.telegram_id) {
        const reason = !report
          ? 'Отчёт не был отправлен'
          : 'Отчёт не содержит слова "отчёт"'

        await sendMessage(member.telegram_id,
          `⚠️ <b>Штраф ${FINE_AMOUNT}₽</b>\n\n` +
          `За ${new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} ` +
          `начислен штраф.\n\n` +
          `Причина: ${reason}\n\n` +
          `<i>Отчёт должен содержать слово "отчёт" и быть отправлен  до 23:59 📋<i>`
        )
      }
    } else {
      results.push(`✅ ${member.name} — отчёт принят`)
    }
  }

  return NextResponse.json({ ok: true, date: dateStr, finesAdded, results })
}

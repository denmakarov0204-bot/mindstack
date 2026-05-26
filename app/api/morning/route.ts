import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const REPORT_TOPIC_ID = parseInt(process.env.REPORT_TOPIC_ID || '2')
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID ? parseInt(process.env.GROUP_CHAT_ID) : null

async function sendToGroup(text: string) {
  if (!GROUP_CHAT_ID) return
  const body: any = { chat_id: GROUP_CHAT_ID, text, parse_mode: 'HTML' }
  if (REPORT_TOPIC_ID) body.message_thread_id = REPORT_TOPIC_ID
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
    text = `🌅 <b>Итоги ${dateFormatted}</b>\n\n🏆 Все сдали отчёт! Молодцы! 💪\n\n${submitted.map(m => `✅ ${m.name}`).join('\n')}`
  } else {
    const missingLines = missing.map(m => `❌ ${m.name}`).join('\n')
    const submittedLine = submitted.length > 0
      ? '\n\n' + submitted.map(m => `✅ ${m.name}`).join('\n')
      : ''
    text = `🌅 <b>Итоги ${dateFormatted}</b>\n\n${missingLines}\n<i>— не сдали отчёт</i>${submittedLine}`
  }

  await sendToGroup(text)

  return NextResponse.json({ ok: true, date: dateStr, missing: missing.length, submitted: submitted.length })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
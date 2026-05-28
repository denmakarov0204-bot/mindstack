import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID ? parseInt(process.env.GROUP_CHAT_ID) : null
const REPORT_TOPIC_ID = parseInt(process.env.REPORT_TOPIC_ID || '2')
const FINE_AMOUNT = 100

async function sendToGroup(text: string) {
  if (!GROUP_CHAT_ID || !BOT_TOKEN) return
  const body: any = { chat_id: GROUP_CHAT_ID, text, parse_mode: 'HTML' }
  if (REPORT_TOPIC_ID) body.message_thread_id = REPORT_TOPIC_ID
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// GET /api/auto-fine
// Runs at 3:05 UTC (6:05 MSK) every day via Vercel cron
// Finds members who did not submit a report for yesterday (MSK) and charges 100r fine
// Idempotent: will not double-charge the same member for the same date
export async function GET(req: NextRequest) {
  // Auth: Vercel cron sends Authorization: Bearer <CRON_SECRET>
  // Also allow manual trigger with ?secret=... query param
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const querySecret = req.nextUrl.searchParams.get('secret')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // "Yesterday" in MSK time (UTC+3)
  // Cron runs at 3:05 UTC = 6:05 MSK, so "yesterday MSK" = the date we want to check
  const now = new Date()
  const mskYesterdayMs = now.getTime() + 3 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000
  const dateStr = new Date(mskYesterdayMs).toISOString().split('T')[0] // e.g. "2026-05-27"

  // All active members
  const { data: members, error: membersErr } = await supabase
    .from('members')
    .select('id, name')
    .eq('is_active', true)

  if (membersErr || !members?.length) {
    return NextResponse.json({ ok: true, fined: 0, date: dateStr, note: 'no members' })
  }

  // Members who DID submit (status submitted or late)
  const { data: reports } = await supabase
    .from('daily_reports')
    .select('member_id')
    .eq('date', dateStr)
    .in('status', ['submitted', 'late'])

  const submittedIds = new Set((reports || []).map((r: any) => r.member_id))
  const missed = members.filter((m: any) => !submittedIds.has(m.id))

  if (!missed.length) {
    return NextResponse.json({ ok: true, fined: 0, date: dateStr, note: 'all submitted' })
  }

  // Avoid duplicate fines: check if fine already exists for this date+member
  const reason = `Не сдан отчёт за ${dateStr}`
  const { data: existing } = await supabase
    .from('fines')
    .select('member_id')
    .eq('reason', reason)
    .eq('is_auto', true)

  const alreadyFinedIds = new Set((existing || []).map((f: any) => f.member_id))
  const toFine = missed.filter((m: any) => !alreadyFinedIds.has(m.id))

  if (!toFine.length) {
    return NextResponse.json({ ok: true, fined: 0, date: dateStr, note: 'already fined' })
  }

  // Insert fines (one per missed member, cumulative across days)
  const { data: newFines, error: fineErr } = await supabase
    .from('fines')
    .insert(
      toFine.map((m: any) => ({
        member_id: m.id,
        amount: FINE_AMOUNT,
        reason,
        reason_type: 'missed_report',
        is_auto: true,
      }))
    )
    .select()

  if (fineErr) {
    return NextResponse.json({ error: fineErr.message }, { status: 500 })
  }

  // Mark as missing in daily_reports if not already recorded
  for (const m of toFine) {
    const { data: existingReport } = await supabase
      .from('daily_reports')
      .select('id')
      .eq('member_id', m.id)
      .eq('date', dateStr)
      .maybeSingle()

    if (!existingReport) {
      await supabase.from('daily_reports').insert({
        member_id: m.id,
        date: dateStr,
        status: 'missing',
        submitted_at: null,
        content: null,
      })
    }
  }

  // Notify group in Telegram
  const lines = toFine.map((m: any) => `• ${m.name} — ${FINE_AMOUNT}₽`).join('\n')
  await sendToGroup(
    `🔴 <b>Авто-штраф за ${dateStr}</b>\n\nОтчёт не сдан:\n${lines}\n\n💰 Итого: ${toFine.length} × ${FINE_AMOUNT}₽ = ${toFine.length * FINE_AMOUNT}₽`
  )

  return NextResponse.json({
    ok: true,
    date: dateStr,
    fined: toFine.length,
    members: toFine.map((m: any) => m.name),
  })
}

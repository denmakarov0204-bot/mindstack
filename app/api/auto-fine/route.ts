import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID ? parseInt(process.env.GROUP_CHAT_ID) : null
const REPORT_TOPIC_ID = parseInt(process.env.REPORT_TOPIC_ID || '2')
const FINE_AMOUNT = 100

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const querySecret = req.nextUrl.searchParams.get('secret')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const mskNow = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  const mskYesterdayMs = mskNow.getTime() - 24 * 60 * 60 * 1000
  const dateStr = new Date(mskYesterdayMs).toISOString().split('T')[0]

  const { data: members } = await supabase.from('members').select('id, name').eq('is_active', true)
  if (!members?.length) return NextResponse.json({ ok: true, fined: 0, date: dateStr })

  const { data: reports } = await supabase.from('daily_reports').select('member_id')
    .eq('date', dateStr).in('status', ['submitted', 'late'])

  const submittedIds = new Set((reports || []).map((r: any) => r.member_id))
  const missed = members.filter((m: any) => !submittedIds.has(m.id))
  const submitted = members.filter((m: any) => submittedIds.has(m.id))

  let finedCount = 0
  let finedNames: string[] = []

  if (missed.length > 0) {
    const reason = `Не сдан отчёт за ${dateStr}`
    const { data: existing } = await supabase.from('fines').select('member_id')
      .eq('reason', reason).eq('is_auto', true)
    const alreadyFinedIds = new Set((existing || []).map((f: any) => f.member_id))
    const toFine = missed.filter((m: any) => !alreadyFinedIds.has(m.id))

    if (toFine.length > 0) {
      await supabase.from('fines').insert(
        toFine.map((m: any) => ({
          member_id: m.id, amount: FINE_AMOUNT, reason,
          reason_type: 'missed_report', is_auto: true,
        }))
      )
      for (const m of toFine) {
        const { data: existingReport } = await supabase.from('daily_reports').select('id')
          .eq('member_id', m.id).eq('date', dateStr).maybeSingle()
        if (!existingReport) {
          await supabase.from('daily_reports').insert({
            member_id: m.id, date: dateStr, status: 'missing',
            submitted_at: null, content: null,
          })
        }
      }
      finedCount = toFine.length
      finedNames = toFine.map((m: any) => m.name)
    }
  }

  // Ежедневный дайджест — всегда
  const submittedLine = submitted.length > 0
    ? '✅ Сдали: ' + submitted.map((m: any) => m.name.split(' ')[0]).join(', ')
    : '✅ Сдали: —'
  const missedLine = missed.length > 0
    ? '❌ Не сдали: ' + missed.map((m: any) => m.name.split(' ')[0]).join(', ')
    : '❌ Не сдали: —'
  const fineNote = finedCount > 0
    ? `\n\n💸 Штраф: ${finedCount} × ${FINE_AMOUNT}₽ = ${finedCount * FINE_AMOUNT}₽`
    : ''

  await sendToGroup(
    `📋 <b>Отчёты за ${dateStr}</b>\n\n${submittedLine}\n${missedLine}${fineNote}`
  )

  await recalcDisciplineScores(members)

  return NextResponse.json({ ok: true, date: dateStr, fined: finedCount, members: finedNames })
}

async function sendToGroup(text: string) {
  if (!BOT_TOKEN || !GROUP_CHAT_ID) return
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: GROUP_CHAT_ID,
      message_thread_id: REPORT_TOPIC_ID,
      text, parse_mode: 'HTML',
    }),
  })
}

async function recalcDisciplineScores(members: { id: string; name: string }[]) {
  const mskNow = new Date(Date.now() + 3 * 60 * 60 * 1000)
  const today = mskNow.toISOString().split('T')[0]
  const days30ago = new Date(mskNow.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: reports30 } = await supabase.from('daily_reports')
    .select('member_id, status, date')
    .gte('date', days30ago).lte('date', today)

  const totalDays = Math.min(30,
    Math.round((mskNow.getTime() - new Date(days30ago + 'T00:00:00Z').getTime()) / 86400000) + 1
  )

  const { data: completedMeetings } = await supabase.from('meetings')
    .select('id').eq('status', 'completed')
  const totalMeetings = (completedMeetings || []).length

  const { data: attendance } = await supabase.from('meeting_attendees')
    .select('member_id, meeting_id, attended')

  const upserts = members.map((m) => {
    const myReports = (reports30 || []).filter((r: any) => r.member_id === m.id)
    const submittedR = myReports.filter((r: any) => r.status === 'submitted').length
    const late = myReports.filter((r: any) => r.status === 'late').length
    const reportsScore = totalDays > 0
      ? Math.round(Math.min(100, ((submittedR + late * 0.7) / totalDays) * 100))
      : 100
    let meetingsScore = 100
    if (totalMeetings > 0) {
      const missedM = (attendance || []).filter((a: any) => a.member_id === m.id && !a.attended).length
      meetingsScore = Math.round(Math.min(100, ((totalMeetings - missedM) / totalMeetings) * 100))
    }
    return {
      member_id: m.id, name: m.name,
      score: Math.round(reportsScore * 0.5 + meetingsScore * 0.5),
      reports_score: reportsScore, meetings_score: meetingsScore,
      updated_at: new Date().toISOString(),
    }
  })

  if (upserts.length > 0) {
    await supabase.from('discipline_scores').upsert(upserts, { onConflict: 'member_id' })
  }
}

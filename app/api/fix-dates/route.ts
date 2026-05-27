import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Временный endpoint: исправляет даты отчётов, сохранённых как сегодня
// но отправленных до 06:00 МСК (до 03:00 UTC) — меняет на вчера
export async function GET() {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  // До 06:00 МСК = до 03:00 UTC сегодня
  const cutoff = todayStr + 'T03:00:00.000Z'

  const { data: toFix, error: fetchError } = await supabase
    .from('daily_reports')
    .select('id, member_id, submitted_at, date')
    .eq('date', todayStr)
    .lt('submitted_at', cutoff)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!toFix || toFix.length === 0) {
    return NextResponse.json({ ok: true, message: 'Нет записей для исправления', cutoff })
  }

  const ids = toFix.map((r: any) => r.id)
  const { error: updateError } = await supabase
    .from('daily_reports')
    .update({ date: yesterdayStr })
    .in('id', ids)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    fixed: toFix.length,
    from: todayStr,
    to: yesterdayStr,
    records: toFix.map((r: any) => ({ id: r.id, member_id: r.member_id, submitted_at: r.submitted_at })),
  })
}

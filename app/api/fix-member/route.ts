import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// One-time fix: set telegram_id for Семёнов Александр
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const telegramId = 697051704

  // Find member by name containing Семён
  const { data: members } = await supabase
    .from('members')
    .select('id, name, telegram_id')
    .ilike('name', '%Семён%')

  if (!members?.length) {
    return NextResponse.json({ error: 'Member not found', searched: 'Семён' })
  }

  // Update the first match
  const member = members[0]
  const { error } = await supabase
    .from('members')
    .update({ telegram_id: telegramId })
    .eq('id', member.id)

  if (error) {
    return NextResponse.json({ error: error.message, member })
  }

  return NextResponse.json({ ok: true, updated: member.name, telegram_id: telegramId })
}

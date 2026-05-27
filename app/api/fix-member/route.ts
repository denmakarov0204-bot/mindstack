import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const telegramId = 697051704

  const { data: members, error: fetchErr } = await supabase
    .from('members')
    .select('id, name, telegram_id')

  if (fetchErr) return NextResponse.json({ error: fetchErr.message })
  if (!members?.length) return NextResponse.json({ error: 'No members found' })

  // Find Семёнов Александр
  const member = members.find(m =>
    m.name?.toLowerCase().includes('семён') || m.name?.toLowerCase().includes('семен')
  )

  if (!member) {
    return NextResponse.json({ error: 'Member not found', all: members.map(m => m.name) })
  }

  const { error } = await supabase
    .from('members')
    .update({ telegram_id: telegramId })
    .eq('id', member.id)

  if (error) return NextResponse.json({ error: error.message })

  return NextResponse.json({ ok: true, updated: member.name, telegram_id: telegramId })
}

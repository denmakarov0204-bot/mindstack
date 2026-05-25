import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { memberId, amount } = await req.json()
  if (!memberId || !amount) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  // Добавляем запись оплаты
  const { error } = await supabase.from('fine_payments').insert({
    member_id: memberId,
    amount: amount,
    paid_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { member_id, amount, note } = await req.json()
  if (!member_id || !amount) {
    return NextResponse.json({ error: 'member_id and amount required' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('fine_payments')
    .insert({ member_id, amount: Number(amount), note: note || 'Оплата долга' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

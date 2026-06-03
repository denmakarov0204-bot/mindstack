import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { member_id, amount, reason, reason_type } = await req.json()
  if (!member_id || !amount || !reason) {
    return NextResponse.json({ error: 'member_id, amount and reason are required' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('fines')
    .insert({
      member_id,
      amount: Number(amount),
      reason,
      reason_type: reason_type || 'other',
      is_auto: false,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

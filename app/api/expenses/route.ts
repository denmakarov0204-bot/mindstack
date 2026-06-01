import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('bank_expenses')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { amount, description, category, created_by } = await req.json()
  if (!amount || !description) {
    return NextResponse.json({ error: 'amount and description are required' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('bank_expenses')
    .insert({ amount: Number(amount), description, category: category || 'other', created_by })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

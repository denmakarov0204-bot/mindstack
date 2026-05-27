import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
export async function GET() {
  const { data, error } = await supabase.from('action_items').select('*').limit(1)
  if (error) return NextResponse.json({ error: error.message, code: error.code })
  const cols = data && data.length > 0 ? Object.keys(data[0]) : []
  return NextResponse.json({ columns: cols, sample: data })
}

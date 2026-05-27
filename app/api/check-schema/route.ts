import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Fetch OpenAPI spec from PostgREST - contains all table/column definitions
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    }
  })
  const spec = await res.json()

  // Extract action_items definition
  const paths = spec.definitions?.action_items || spec.paths?.['/action_items'] || null
  const allDefs = Object.keys(spec.definitions || {})

  return NextResponse.json({
    action_items: paths,
    allTables: allDefs,
  })
}

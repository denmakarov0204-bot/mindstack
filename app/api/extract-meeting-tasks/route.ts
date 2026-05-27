import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const { meeting_id, summary, members } = await req.json()

  if (!summary?.trim()) {
    return NextResponse.json({ error: 'Нет текста встречи' }, { status: 400 })
  }

  const memberList = (members || []).map((m: any) => m.name).join(', ')

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Ты анализируешь конспект деловой встречи и извлекаешь из него конкретные задачи и поручения.

Участники группы: ${memberList || 'неизвестны'}

Текст встречи:
"""
${summary}
"""

Извлеки все задачи, поручения и action items из текста. Для каждой задачи определи:
- text: чёткая формулировка задачи (на русском)
- member_name: имя ответственного из списка участников (или null если не указан)
- due_date: срок выполнения в формате YYYY-MM-DD (или null если не указан)

Верни ТОЛЬКО JSON массив без пояснений:
[{"text": "...", "member_name": "...", "due_date": "..."}]

Если задач нет — верни пустой массив: []`
    }]
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'

  let extracted: { text: string; member_name: string | null; due_date: string | null }[] = []
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : []
  } catch {
    return NextResponse.json({ error: 'Не удалось разобрать ответ ИИ', raw }, { status: 500 })
  }

  if (extracted.length === 0) {
    return NextResponse.json({ tasks: [], count: 0, message: 'ИИ не нашёл задач в тексте встречи' })
  }

  const memberMap: Record<string, string> = {}
  ;(members || []).forEach((m: any) => {
    memberMap[m.name.toLowerCase()] = m.id
    const parts = m.name.split(' ')
    parts.forEach((p: string) => { memberMap[p.toLowerCase()] = m.id })
  })

  const toInsert = extracted.map(t => ({
    text: t.text,
    member_id: t.member_name ? (memberMap[t.member_name.toLowerCase()] || null) : null,
    due_date: t.due_date || null,
    status: 'todo',
    meeting_id: meeting_id || null,
  }))

  const { data, error } = await supabase
    .from('action_items')
    .insert(toInsert)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tasks: data, count: data?.length || 0 })
}

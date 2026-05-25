import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60 // увеличиваем таймаут для больших файлов

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
  }

  // Проверяем размер (Groq лимит 25MB)
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Файл слишком большой. Максимум 25MB' }, { status: 400 })
  }

  const groqFormData = new FormData()
  groqFormData.append('file', file)
  groqFormData.append('model', 'whisper-large-v3')
  groqFormData.append('language', 'ru')
  groqFormData.append('response_format', 'text')

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: groqFormData,
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: 'Ошибка Groq: ' + err }, { status: 500 })
  }

  const transcript = await response.text()
  return NextResponse.json({ transcript })
}
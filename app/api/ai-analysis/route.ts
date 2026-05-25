import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { transcript, meetingNumber, date, members } = await req.json()

  if (!transcript || transcript.trim().length < 50) {
    return NextResponse.json({ error: 'Слишком короткий текст' }, { status: 400 })
  }

  const membersList = members?.join(', ') || 'участники группы'

  const prompt = `Ты аналитик мастермайнд группы. Проанализируй запись встречи и составь структурированный отчёт.

Участники группы: ${membersList}
Встреча №${meetingNumber} от ${date}

ЗАПИСЬ ВСТРЕЧИ:
${transcript}

Составь отчёт строго в следующем формате (используй эти заголовки):

## 📌 Ключевые решения
(перечисли конкретные решения принятые на встрече, каждое с новой строки через •)

## ✅ Задачи по участникам
(для каждого участника у кого есть задачи напиши:
**Имя:**
• задача 1
• задача 2)

## ⚠️ Проблемы и риски
(что требует внимания, что может пойти не так)

## 📈 Прогресс и достижения
(что уже сделано, что идёт хорошо)

## 💡 Фокус на следующий период
(2-3 главных приоритета до следующей встречи)

Будь конкретным и лаконичным. Используй только информацию из записи.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: 'Ошибка API: ' + err }, { status: 500 })
  }

  const data = await response.json()
  const analysis = data.content[0].text

  return NextResponse.json({ analysis })
}
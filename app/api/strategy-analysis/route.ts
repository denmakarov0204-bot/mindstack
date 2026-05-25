import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { transcript, meetingNumber, date, members, goals } = await req.json()

  const goalsText = goals?.length
    ? goals.map((g: any, i: number) => `${i+1}. ${g.title}${g.description ? ': ' + g.description : ''}${g.deadline ? ' (дедлайн: ' + g.deadline + ')' : ''}`).join('\n')
    : 'Глобальные цели ещё не заданы'

  const prompt = `Ты стратегический коуч мастермайнд группы. Твоя задача — анализировать встречи относительно глобальных целей группы.

Участники: ${members?.join(', ') || 'группа'}
Встреча №${meetingNumber} от ${date}

ГЛОБАЛЬНЫЕ ЦЕЛИ ГРУППЫ:
${goalsText}

ЗАПИСЬ ВСТРЕЧИ:
${transcript}

Дай анализ строго в формате:

## 🎯 Соответствие целям
(для каждой цели укажи статус: ✅ движемся / ⚠️ отклоняемся / 😴 не упомянули, и кратко почему)

## 📌 Ключевые решения встречи
(что решили, кратко)

## ✅ Задачи по участникам
(кто что берёт на себя)

## 🔄 Предложения по целям
(если видишь что цели надо обновить, добавить новые или скорректировать — предложи конкретно, в формате JSON-массива в блоке \`\`\`json ... \`\`\` со структурой: [{action: "add"|"update"|"remove", title, description, deadline?}])

## ⚡ Главный фокус до следующей встречи
(1-2 конкретных приоритета)

Будь конкретным, опирайся только на факты из записи.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20251001',
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

  // Извлекаем предложения по целям из JSON блока
  let goalSuggestions = null
  const jsonMatch = analysis.match(/```json([\s\S]*?)```/)
  if (jsonMatch) {
    try { goalSuggestions = JSON.parse(jsonMatch[1].trim()) } catch(e) {}
  }

  return NextResponse.json({ analysis, goalSuggestions })
}
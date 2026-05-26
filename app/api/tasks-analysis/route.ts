import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  try {
    const { tasks, meetings, goals } = await req.json()

    const todoTasks = tasks.filter((t: any) => t.status === 'todo')
    const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress')
    const doneTasks = tasks.filter((t: any) => t.status === 'done')
    const overdueTasks = todoTasks.filter((t: any) => t.due_date && new Date(t.due_date) < new Date())

    const completionRate = tasks.length > 0
      ? Math.round((doneTasks.length / tasks.length) * 100)
      : 0

    const prompt = `Ты ИИ-коуч мастермайнд-группы из 5 человек. Проанализируй текущее состояние задач и дай честную, конкретную обратную связь.

ТЕКУЩИЕ ЗАДАЧИ:
- Всего: ${tasks.length}
- К выполнению: ${todoTasks.length}
- В процессе: ${inProgressTasks.length}
- Выполнено: ${doneTasks.length}
- Просрочено: ${overdueTasks.length}
- Процент выполнения: ${completionRate}%

ЗАДАЧИ В ПРОЦЕССЕ:
${inProgressTasks.map((t: any) => `• ${t.title}${t.due_date ? ` (дедлайн: ${t.due_date})` : ''}${t.member_name ? ` — ${t.member_name}` : ''}`).join('\n') || '— нет'}

ПРОСРОЧЕННЫЕ ЗАДАЧИ:
${overdueTasks.map((t: any) => `• ${t.title} (просрочена с ${t.due_date})${t.member_name ? ` — ${t.member_name}` : ''}`).join('\n') || '— нет'}

ЗАДАЧИ К ВЫПОЛНЕНИЮ:
${todoTasks.slice(0, 10).map((t: any) => `• ${t.title}${t.due_date ? ` (дедлайн: ${t.due_date})` : ''}${t.member_name ? ` — ${t.member_name}` : ''}`).join('\n') || '— нет'}

ПОСЛЕДНИЕ ВСТРЕЧИ (саммари):
${meetings.filter((m: any) => m.ai_summary).slice(0, 3).map((m: any) =>
  `Встреча #${m.meeting_number} (${m.date}):\n${m.ai_summary?.slice(0, 400)}...`
).join('\n\n') || '— нет данных'}

${goals?.length > 0 ? `СТРАТЕГИЧЕСКИЕ ЦЕЛИ:\n${goals.map((g: any) => `• ${g.title} [${g.status}]`).join('\n')}` : ''}

Дай анализ в следующем формате (используй эти заголовки):

📊 ПРОГРЕСС
Коротко оцени общий прогресс группы. Выполняете ли вы задачи в срок?

⚠️ ОТКЛОНЕНИЯ ОТ ПЛАНА
Что идёт не так? Какие задачи тормозят? Есть ли паттерны?

✅ ЧТО ХОРОШО
Что удаётся, какие задачи закрываются стабильно.

🎯 РЕКОМЕНДАЦИИ
2-3 конкретных действия, которые помогут группе ускориться.

💡 ПРЕДЛАГАЮ ДОБАВИТЬ
2-3 конкретные новые задачи, которые стоит создать исходя из встреч и текущей ситуации. Формат: "Задача: [название] — [для кого/зачем]"

Отвечай по-русски, конкретно, без воды. Максимум 400 слов.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const analysis = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Tasks analysis error:', error)
    return NextResponse.json({ error: 'Ошибка анализа' }, { status: 500 })
  }
}

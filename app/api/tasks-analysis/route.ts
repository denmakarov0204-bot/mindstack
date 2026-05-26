import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { tasks, meetings, goals } = await req.json()

    const todoTasks = tasks.filter((t: any) => t.status === 'todo')
    const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress')
    const doneTasks = tasks.filter((t: any) => t.status === 'done')
    const overdueTasks = todoTasks.filter((t: any) => t.due_date && new Date(t.due_date) < new Date())
    const completionRate = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0

    const prompt = `Ты ИИ-коуч мастермайнд-группы из 5 человек. Проанализируй текущее состояние задач и дай честную, конкретную обратную связь.

ТЕКУЩИЕ ЗАДАЧИ:
- Всего: ${tasks.length}
- К выполнению: ${todoTasks.length}
- В процессе: ${inProgressTasks.length}
- Выполнено: ${doneTasks.length}
- Просрочено: ${overdueTasks.length}
- Процент выполнения: ${completionRate}%

ЗАДАЧИ В ПРОЦЕССЕ:
${inProgressTasks.map((t: any) => '• ' + t.title + (t.due_date ? ' (дедлайн: ' + t.due_date + ')' : '') + (t.member_name ? ' — ' + t.member_name : '')).join('\n') || '— нет'}

ПРОСРОЧЕННЫЕ ЗАДАЧИ:
${overdueTasks.map((t: any) => '• ' + t.title + ' (просрочена с ' + t.due_date + ')' + (t.member_name ? ' — ' + t.member_name : '')).join('\n') || '— нет'}

ЗАДАЧИ К ВЫПОЛНЕНИЮ:
${todoTasks.slice(0, 10).map((t: any) => '• ' + t.title + (t.due_date ? ' (дедлайн: ' + t.due_date + ')' : '') + (t.member_name ? ' — ' + t.member_name : '')).join('\n') || '— нет'}

ПОСЛЕДНИЕ ВСТРЕЧИ (саммари):
${meetings.filter((m: any) => m.ai_summary).slice(0, 3).map((m: any) => 'Встреча #' + m.meeting_number + ' (' + m.date + '):\n' + (m.ai_summary || '').slice(0, 400)).join('\n\n') || '— нет данных'}

${goals && goals.length > 0 ? 'СТРАТЕГИЧЕСКИЕ ЦЕЛИ:\n' + goals.map((g: any) => '• ' + g.title + ' [' + g.status + ']').join('\n') : ''}

Дай анализ в следующем формате:

📊 ПРОГРЕСС
Коротко оцени общий прогресс группы.

⚠️ ОТКЛОНЕНИЯ ОТ ПЛАНА
Что идёт не так? Какие задачи тормозят?

✅ ЧТО ХОРОШО
Что удаётся, какие задачи закрываются стабильно.

🎯 РЕКОМЕНДАЦИИ
2-3 конкретных действия для ускорения.

💡 ПРЕДЛАГАЮ ДОБАВИТЬ
2-3 новые задачи на основе встреч. Формат: "Задача: [название] — [для кого/зачем]"

Отвечай по-русски, конкретно, без воды. Максимум 400 слов.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1500,
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
  } catch (error) {
    console.error('Tasks analysis error:', error)
    return NextResponse.json({ error: 'Ошибка анализа' }, { status: 500 })
  }
}

export default function StatsRow({ submittedToday, totalMembers, totalFines, totalDebt, completedMeetings, bestScore, bestName }: {
  submittedToday: number; totalMembers: number; totalFines: number; totalDebt: number
  completedMeetings: number; bestScore: number; bestName: string
}) {
  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      <StatCard color="green" label="Отчётов сегодня" value={`${submittedToday}/${totalMembers}`}
        sub={`${totalMembers - submittedToday} не сдан · штраф начислен`} />
      <StatCard color="red" label="Штрафов всего" value={`${totalFines.toLocaleString('ru')}₽`}
        sub={`${totalDebt.toLocaleString('ru')}₽ не оплачено`} />
      <StatCard color="purple" label="Встреч проведено" value={String(completedMeetings)}
        sub="Явка 94% в среднем" />
      <StatCard color="blue" label="Лучший скор" value={String(bestScore)}
        sub={`${bestName} · дисциплина`} />
    </div>
  )
}

const colors: Record<string, { bar: string; val: string }> = {
  green:  { bar: 'bg-c-green',  val: 'text-c-green' },
  red:    { bar: 'bg-c-red',    val: 'text-c-red' },
  purple: { bar: 'bg-accent2',  val: 'text-accent2' },
  blue:   { bar: 'bg-c-blue',   val: 'text-c-blue' },
}

function StatCard({ color, label, value, sub }: { color: string; label: string; value: string; sub: string }) {
  const c = colors[color]
  return (
    <div className="bg-surface border border-border rounded-xl p-5 relative overflow-hidden hover:border-border2 transition-colors">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.bar}`} />
      <div className="text-[11px] text-muted font-mono uppercase tracking-wider">{label}</div>
      <div className={`text-3xl font-extrabold tracking-tighter mt-1.5 ${c.val}`}>{value}</div>
      <div className="text-[11px] text-muted mt-1">{sub}</div>
    </div>
  )
}

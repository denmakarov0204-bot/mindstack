import { supabase } from '@/lib/supabase'

export const revalidate = 60

async function getData() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const [{ data: reports }, { data: members }] = await Promise.all([
    supabase.from('daily_reports')
      .select('*, members(name, telegram_username)')
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false })
      .order('submitted_at', { ascending: false }),
    supabase.from('members').select('id, name').order('name'),
  ])
  return { reports: reports || [], members: members || [] }
}

const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export default async function ReportsPage() {
  const { reports, members } = await getData()

  // Группируем по датам
  const byDate: Record<string, any[]> = {}
  reports.forEach((r: any) => {
    if (!byDate[r.date]) byDate[r.date] = []
    byDate[r.date].push(r)
  })
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  const submitted7 = reports.filter((r: any) => r.status === 'submitted').length
  const total7 = members.length * 7
  const rate = Math.round((submitted7 / total7) * 100)

  return (
    <div className="p-8 animate-fade-in max-w-[900px]">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Отчёты</h1>
          <p className="text-[13px] text-muted mt-1">Ежедневные отчёты за последние 7 дней</p>
        </div>
        <div className="bg-surface border border-border rounded-xl px-5 py-3 text-center">
          <div className="text-[11px] text-muted font-mono uppercase">Заполняемость</div>
          <div className={`text-3xl font-extrabold mt-1 ${rate >= 80 ? 'text-c-green' : 'text-c-red'}`}>{rate}%</div>
          <div className="text-[11px] text-muted">{submitted7} из {total7}</div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {dates.map(date => {
          const d = new Date(date)
          const dayReports = byDate[date]
          const submittedCount = dayReports.filter((r: any) => r.status === 'submitted').length

          return (
            <div key={date} className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[11px] text-muted font-mono uppercase tracking-wider">
                    {days[d.getDay()]}
                  </span>
                  <div className="text-[15px] font-bold mt-0.5">
                    {d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                  </div>
                </div>
                <div className={`text-[13px] font-bold font-mono ${submittedCount === members.length ? 'text-c-green' : submittedCount === 0 ? 'text-c-red' : 'text-c-orange'}`}>
                  {submittedCount}/{members.length}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {dayReports.map((r: any) => (
                  <div key={r.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(124,106,255,0.15)', color: '#a78bfa' }}>
                      {r.members?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-semibold">{r.members?.name}</span>
                        {r.submitted_at && (
                          <span className="text-[11px] text-muted font-mono">
                            {new Date(r.submitted_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      {r.content && (
                        <div className="text-[12px] text-muted leading-relaxed line-clamp-2">{r.content}</div>
                      )}
                    </div>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full flex-shrink-0 ${
                      r.status === 'submitted' ? 'bg-c-green/10 text-c-green' : 'bg-c-red/10 text-c-red'
                    }`}>
                      {r.status === 'submitted' ? 'сдал' : 'не сдал'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { supabase } from '@/lib/supabase'

export const revalidate = 60

async function getData() {
  const ago7 = new Date(Date.now()-7*24*60*60*1000).toISOString().split('T')[0]
  const ago30 = new Date(Date.now()-30*24*60*60*1000).toISOString().split('T')[0]

  const [
    { data: todayReports },
    { data: members },
    { data: scores },
    { data: balances },
    { data: meetings },
    { data: week },
    { data: fines },
  ] = await Promise.all([
    supabase.from('today_report_status').select('*'),
    supabase.from('members').select('*').eq('is_active', true).order('name'),
    supabase.from('discipline_scores').select('*').order('score', { ascending: false }),
    supabase.from('member_fine_balance').select('*'),
    supabase.from('meetings').select('*').order('date', { ascending: false }).limit(5),
    supabase.from('daily_reports').select('date,status,member_id').gte('date', ago7),
    supabase.from('fines').select('*').gte('created_at', ago30+'T00:00:00').order('created_at', { ascending: false }),
  ])

  return {
    todayReports: todayReports||[],
    members: members||[],
    scores: scores||[],
    balances: balances||[],
    meetings: meetings||[],
    week: week||[],
    fines: fines||[]
  }
}

export default async function DashboardPage() {
  const { todayReports, members, scores, balances, meetings, week, fines } = await getData()

  const submittedToday = todayReports.filter((r:any) => r.report_status === 'submitted').length
  const totalToday = members.length
  const allGood = submittedToday === totalToday && totalToday > 0

  const totalDebt = balances.reduce((s:number, b:any) => s + b.debt, 0)
  const totalBank = balances.reduce((s:number, b:any) => s + b.total_paid, 0)
  const avgScore = scores.length ? Math.round(scores.reduce((s:any, sc:any) => s + sc.score, 0) / scores.length) : 0
  const week7rate = (members.length && week.length) ? Math.round((week.filter((r:any)=>r.status==='submitted').length / (members.length * 7)) * 100) : 0

  const nextMeeting = meetings.find((m:any) => m.status === 'planned')
  const lastMeeting = meetings.find((m:any) => m.status === 'completed') || meetings[0]

  const dayNames = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
  const days7 = Array.from({length:7}, (_,i) => {
    const d = new Date()
    d.setDate(d.getDate()-6+i)
    const dateStr = d.toISOString().split('T')[0]
    const dayReports = week.filter((r:any) => r.date === dateStr)
    const submitted = dayReports.filter((r:any) => r.status === 'submitted').length
    return {
      dateStr,
      day: dayNames[d.getDay()],
      submitted,
      total: members.length,
      pct: members.length ? Math.round((submitted/members.length)*100) : 0,
      isToday: dateStr === new Date().toISOString().split('T')[0]
    }
  })

  return (
    <div className="p-6 md:p-8 max-w-[1200px] animate-fade-in">

      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Дашборд</h1>
        <p className="text-[13px] text-muted mt-1">
          {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* KPI строка */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1">Отчёты сегодня</div>
          <div className={`text-3xl font-extrabold tracking-tighter ${allGood ? 'text-c-green' : submittedToday === 0 ? 'text-c-red' : 'text-c-orange'}`}>
            {submittedToday}/{totalToday}
          </div>
          <div className="text-[11px] text-muted mt-1">
            {allGood ? '✅ Все сдали!' : `осталось ${totalToday - submittedToday}`}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1">Дисциплина</div>
          <div className={`text-3xl font-extrabold tracking-tighter ${avgScore>=80?'text-c-green':avgScore>=60?'text-c-orange':'text-c-red'}`}>
            {avgScore}
          </div>
          <div className="text-[11px] text-muted mt-1">средний балл группы</div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1">Банк штрафов</div>
          <div className="text-3xl font-extrabold tracking-tighter text-c-green">{totalBank.toLocaleString('ru')}₽</div>
          <div className={`text-[11px] mt-1 ${totalDebt>0?'text-c-red':'text-muted'}`}>
            {totalDebt > 0 ? `долг ${totalDebt}₽` : 'долгов нет ✓'}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1">Заполняемость</div>
          <div className={`text-3xl font-extrabold tracking-tighter ${week7rate>=80?'text-c-green':week7rate>=60?'text-c-orange':'text-c-red'}`}>
            {week7rate}%
          </div>
          <div className="text-[11px] text-muted mt-1">за 7 дней</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

        {/* Отчёты сегодня */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[14px] font-bold">📋 Отчёты сегодня</div>
            <div className={`text-[12px] font-semibold ${allGood?'text-c-green':'text-muted'}`}>
              {submittedToday}/{totalToday}
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {todayReports.map((r:any) => (
              <div key={r.member_id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                  style={{background:'rgba(124,106,255,0.15)',color:'#a78bfa'}}>{r.name.charAt(0)}</div>
                <div className="flex-1 text-[13px] font-medium">{r.name}</div>
                {r.report_status === 'submitted' ? (
                  <span className="text-[11px] font-bold text-c-green bg-c-green/10 px-2.5 py-1 rounded-full">✓ сдал</span>
                ) : (
                  <span className="text-[11px] font-bold text-c-red bg-c-red/10 px-2.5 py-1 rounded-full">✗ нет</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Рейтинг дисциплины */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[14px] font-bold mb-4">🏆 Рейтинг дисциплины</div>
          <div className="flex flex-col gap-3">
            {scores.map((s:any, i:number) => (
              <div key={s.member_id} className="flex items-center gap-3">
                <div className="text-[13px] w-5 text-center">
                  {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                  style={{background:'rgba(124,106,255,0.15)',color:'#a78bfa'}}>{s.name.charAt(0)}</div>
                <div className="text-[13px] font-medium flex-1">{s.name.split(' ')[0]}</div>
                <div className="w-20 h-1.5 bg-surface2 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width:`${s.score}%`,
                    background: s.score>=80 ? 'linear-gradient(90deg,#7c6aff,#a78bfa)' : s.score>=60 ? 'linear-gradient(90deg,#ff8c00,#ffb347)' : 'linear-gradient(90deg,#ff5566,#ff8866)'
                  }}/>
                </div>
                <div className={`text-[14px] font-extrabold font-mono min-w-[32px] text-right ${s.score>=80?'text-c-green':s.score>=60?'text-c-orange':'text-c-red'}`}>
                  {s.score}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

        {/* График активности за 7 дней */}
        <div className="md:col-span-2 bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[14px] font-bold">📈 Активность за 7 дней</div>
            <div className={`text-[12px] font-semibold ${week7rate>=80?'text-c-green':week7rate>=60?'text-c-orange':'text-c-red'}`}>
              {week7rate}% заполняемость
            </div>
          </div>
          <div className="flex items-end gap-2" style={{height:'88px'}}>
            {days7.map(d => (
              <div key={d.dateStr} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                <div className="w-full flex items-end justify-center" style={{height:'64px'}}>
                  <div className="w-full rounded-t-lg" style={{
                    height: `${Math.max(d.pct, 6)}%`,
                    background: d.pct===100 ? 'linear-gradient(180deg,#7c6aff,#a78bfa)' :
                      d.pct>=60 ? 'linear-gradient(180deg,#ff8c00,#ffb347)' :
                      d.pct===0 ? 'rgba(255,85,102,0.25)' : 'linear-gradient(180deg,#ff5566,#ff8866)',
                    minHeight: '4px',
                    opacity: d.isToday ? 1 : 0.75
                  }}/>
                </div>
                <div className={`text-[10px] font-mono font-bold ${d.isToday?'text-accent2':'text-muted'}`}>{d.day}</div>
                <div className="text-[9px] font-mono text-muted">{d.submitted}/{d.total}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Правая колонка */}
        <div className="flex flex-col gap-4">

          {/* Долги */}
          <div className="bg-surface border border-border rounded-2xl p-5 flex-1">
            <div className="text-[14px] font-bold mb-3">💸 Долги</div>
            {balances.filter((b:any)=>b.debt>0).length === 0 ? (
              <div className="text-[13px] text-c-green font-semibold">✅ Долгов нет!</div>
            ) : (
              <div className="flex flex-col gap-2">
                {balances.filter((b:any)=>b.debt>0).map((b:any) => (
                  <div key={b.id} className="flex items-center justify-between">
                    <div className="text-[13px]">{b.name.split(' ')[0]}</div>
                    <div className="text-[13px] font-bold font-mono text-c-red">{b.debt}₽</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Встреча */}
          <div className="bg-surface border border-border rounded-2xl p-5 flex-1">
            <div className="text-[14px] font-bold mb-2">🗓 Встреча</div>
            {nextMeeting ? (
              <div>
                <div className="text-[11px] text-accent2 font-semibold mb-1 uppercase tracking-wide">Запланирована</div>
                <div className="text-[15px] font-extrabold">
                  {new Date(nextMeeting.date).toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}
                </div>
                <div className="text-[11px] text-muted mt-1">Встреча #{nextMeeting.meeting_number}</div>
              </div>
            ) : lastMeeting ? (
              <div>
                <div className="text-[11px] text-muted font-semibold mb-1 uppercase tracking-wide">Последняя</div>
                <div className="text-[15px] font-extrabold">
                  {new Date(lastMeeting.date).toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}
                </div>
                <div className="text-[11px] text-muted mt-1">Встреча #{lastMeeting.meeting_number}</div>
              </div>
            ) : (
              <div className="text-[12px] text-muted">Встреч пока нет</div>
            )}
          </div>

        </div>
      </div>

      {/* Последние штрафы */}
      {fines.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[14px] font-bold mb-3">⚡ Последние штрафы</div>
          <div className="flex flex-wrap gap-2">
            {fines.slice(0, 8).map((f:any) => (
              <div key={f.id} className="flex items-center gap-2 bg-surface2 border border-border rounded-xl px-3 py-1.5">
                <span className="text-[12px] text-muted">{new Date(f.created_at).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}</span>
                <span className="text-[12px] font-semibold">{f.reason?.replace('Пропуск отчёта ','')?.slice(0,10)}</span>
                <span className="text-[12px] font-bold text-c-red">{f.amount}₽</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

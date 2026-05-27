import { supabase } from '@/lib/supabase'
import type { MemberFineBalance, DisciplineScore, Meeting } from '@/lib/supabase'
import MembersCard from '@/components/dashboard/MembersCard'
import BankCard from '@/components/dashboard/BankCard'
import DisciplineCard from '@/components/dashboard/DisciplineCard'
import ActivityCard from '@/components/dashboard/ActivityCard'
import AIInsightsCard from '@/components/dashboard/AIInsightsCard'
import MeetingCard from '@/components/dashboard/MeetingCard'
import StatsRow from '@/components/dashboard/StatsRow'

export const dynamic = 'force-dynamic' // always fetch fresh data

async function getData() {
  // Московское время UTC+3
  const mskNow = new Date(Date.now() + 3 * 60 * 60 * 1000)

  // Вчерашняя дата по МСК
  const mskYesterday = new Date(mskNow)
  mskYesterday.setDate(mskYesterday.getDate() - 1)
  const yesterdayStr = mskYesterday.toISOString().split('T')[0]
  const todayStr = mskNow.toISOString().split('T')[0]

  const [
    { data: allMembers },
    { data: yesterdayReports },
    { data: todayDbReports },
    { data: fineBalances },
    { data: disciplineScores },
    { data: meetings },
    { data: reportsWeek },
  ] = await Promise.all([
    supabase.from('members').select('id, name, telegram_username').eq('is_active', true),
    supabase.from('daily_reports').select('member_id, status, submitted_at').eq('date', yesterdayStr),
    supabase.from('daily_reports').select('member_id, status, submitted_at').eq('date', todayStr),
    supabase.from('member_fine_balance').select('*').order('debt', { ascending: false }),
    supabase.from('discipline_scores').select('*').order('score', { ascending: false }),
    supabase.from('meetings').select('*').order('date', { ascending: false }).limit(5),
    supabase.from('daily_reports')
      .select('date, status')
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
  ])

  // Выбираем дату: вчера если есть сданные отчёты, иначе сегодня
  // (фоллбэк на случай если отчёты сохранились под сегодняшней датой из-за старой логики бота)
  const yesterdaySubmitted = (yesterdayReports || []).filter((r: any) => r.status === 'submitted').length

  const activeReports = yesterdaySubmitted > 0 ? (yesterdayReports || []) : (todayDbReports || [])
  const activeDate = yesterdaySubmitted > 0 ? yesterdayStr : todayStr

  // Строим статус каждого участника
  const reportsMap = new Map(activeReports.map((r: any) => [r.member_id, r]))
  const todayReports = (allMembers || []).map((m: any) => ({
    id: m.id,
    name: m.name,
    telegram_username: m.telegram_username,
    report_status: (reportsMap.get(m.id) as any)?.status || 'missing',
    submitted_at: (reportsMap.get(m.id) as any)?.submitted_at || null,
  }))

  return {
    todayReports,
    activeDate,
    fineBalances: (fineBalances as MemberFineBalance[]) || [],
    disciplineScores: (disciplineScores as DisciplineScore[]) || [],
    meetings: (meetings as Meeting[]) || [],
    reportsWeek: reportsWeek || [],
  }
}

export default async function DashboardPage() {
  const { todayReports, activeDate, fineBalances, disciplineScores, meetings, reportsWeek } = await getData()

  const submittedToday = todayReports.filter(r => r.report_status === 'submitted').length
  const totalFines = fineBalances.reduce((sum, m) => sum + m.total_charged, 0)
  const totalDebt = fineBalances.reduce((sum, m) => sum + m.debt, 0)
  const completedMeetings = meetings.filter(m => m.status === 'completed').length
  const nextMeeting = meetings.find(m => m.status === 'planned')
  const bestStreak = disciplineScores[0]

  // Форматируем дату для заголовка
  const reportDateLabel = new Date(activeDate + 'T12:00:00Z').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })

  // Weekly activity по дням
  const days = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
  const weekActivity = days.map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const dayReports = reportsWeek.filter((r: any) => r.date === dateStr)
    const submitted = dayReports.filter((r: any) => r.status === 'submitted').length
    return { day: days[i], submitted, total: 5 }
  })

  const totalWeekReports = reportsWeek.filter((r: any) => r.status === 'submitted').length
  const missedWeek = reportsWeek.filter((r: any) => r.status === 'missing').length

  return (
    <div className="p-4 md:p-8 animate-fade-in max-w-[1100px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 md:mb-7">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-[12px] md:text-[13px] text-muted mt-1">
            {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            {` · Отчёты за ${reportDateLabel}`}
          </p>
        </div>
        <button className="px-3 py-1.5 md:px-4 md:py-2 bg-accent hover:bg-accent2 text-white text-[12px] md:text-[13px] font-semibold rounded-lg transition-colors">
          + Встреча
        </button>
      </div>

      {/* Stats */}
      <StatsRow
        submittedToday={submittedToday}
        totalMembers={todayReports.length}
        totalFines={totalFines}
        totalDebt={totalDebt}
        completedMeetings={completedMeetings}
        bestScore={bestStreak?.score || 0}
        bestName={bestStreak?.name || ''}
      />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 mb-4">
        <MembersCard todayReports={todayReports} />
        <div className="flex flex-col gap-4">
          <BankCard fineBalances={fineBalances} />
          <MeetingCard nextMeeting={nextMeeting} />
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DisciplineCard scores={disciplineScores} />
        <ActivityCard weekActivity={weekActivity} totalWeek={totalWeekReports} missed={missedWeek} />
        <AIInsightsCard scores={disciplineScores} todayReports={todayReports} />
      </div>
    </div>
  )
}

import { supabase } from '@/lib/supabase'
import type { TodayReportStatus, MemberFineBalance, DisciplineScore, Meeting } from '@/lib/supabase'
import MembersCard from '@/components/dashboard/MembersCard'
import BankCard from '@/components/dashboard/BankCard'
import DisciplineCard from '@/components/dashboard/DisciplineCard'
import ActivityCard from '@/components/dashboard/ActivityCard'
import AIInsightsCard from '@/components/dashboard/AIInsightsCard'
import MeetingCard from '@/components/dashboard/MeetingCard'
import StatsRow from '@/components/dashboard/StatsRow'

export const revalidate = 60

async function getData() {
  const [
    { data: todayReports },
    { data: fineBalances },
    { data: disciplineScores },
    { data: meetings },
    { data: reportsWeek },
  ] = await Promise.all([
    supabase.from('today_report_status').select('*'),
    supabase.from('member_fine_balance').select('*').order('debt', { ascending: false }),
    supabase.from('discipline_scores').select('*').order('score', { ascending: false }),
    supabase.from('meetings').select('*').order('date', { ascending: false }).limit(5),
    supabase.from('daily_reports').select('date, status').gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
  ])
  return {
    todayReports: (todayReports as TodayReportStatus[]) || [],
    fineBalances: (fineBalances as MemberFineBalance[]) || [],
    disciplineScores: (disciplineScores as DisciplineScore[]) || [],
    meetings: (meetings as Meeting[]) || [],
    reportsWeek: reportsWeek || [],
  }
}

export default async function DashboardPage() {
  const { todayReports, fineBalances, disciplineScores, meetings, reportsWeek } = await getData()
  const submittedToday = todayReports.filter(r => r.report_status === 'submitted').length
  const totalFines = fineBalances.reduce((sum, m) => sum + m.total_charged, 0)
  const totalDebt = fineBalances.reduce((sum, m) => sum + m.debt, 0)
  const completedMeetings = meetings.filter(m => m.status === 'completed').length
  const nextMeeting = meetings.find(m => m.status === 'planned')
  const bestStreak = disciplineScores[0]
  const days = ['Чн','Вт','Ср','Чт','Пт','Св','Вс']
  const weekActivity = days.map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const dayReports = reportsWeek.filter((r: any) => r.date === dateStr)
    return { day: days[i], submitted: dayReports.filter((r: any) => r.status === 'submitted').length, total: 5 }
  })
  const totalWeekReports = reportsWeek.filter((r: any) => r.status === 'submitted').length
  const missedWeek = reportsWeek.filter((r: any) => r.status === 'missing').length
  return (
    <div className="p-8 animate-fade-in max-w-[1100px]">
      <div className="flex items-start justify-between mb-7">
        <div><h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1></div>
      </div>
      <StatsRow submittedToday={submittedToday} totalMembers={todayReports.length} totalFines={totalFines} totalDebt={totalDebt} completedMeetings={completedMeetings} bestScore={bestStreak?.score||0} bestName={bestStreak?.name||''} />
      <div className="grid grid-cols-[1fr_380px] gap-4 mb-4">
        <MembersCard todayReports={todayReports} />
        <div className="flex flex-col gap-4"><BankCard fineBalances={fineBalances} /><MeetingCard nextMeeting={nextMeeting} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <DisciplineCard scores={disciplineScores} />
        <ActivityCard weekActivity={weekActivity} totalWeek={totalWeekReports} missed={missedWeek} />
        <AIInsightsCard scores={disciplineScores} todayReports={todayReports} />
      </div>
    </div>
  )
}

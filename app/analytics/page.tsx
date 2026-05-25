import { supabase } from '@/lib/supabase'

export const revalidate = 60

async function getData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const [{ data: scores }, { data: reports }, { data: balances }, { data: meetings }] = await Promise.all([
    supabase.from('discipline_scores').select('*').order('score', { ascending: false }),
    supabase.from('daily_reports').select('date, status, member_id, members(name)').gte('date', thirtyDaysAgo),
    supabase.from('member_fine_balance').select('*').order('debt', { ascending: false }),
    supabase.from('meetings').select('*').order('date', { ascending: false }).limit(10),
  ])
  return {
    scores: scores || [],
    reports: reports || [],
    balances: balances || [],
    meetings: meetings || [],
  }
}

export default async function AnalyticsPage() {
  const { scores, reports, balances, meetings } = await getData()

  const totalFines = balances.reduce((s: number, m: any) => s + m.total_charged, 0)
  const totalBank = balances.reduce((s: number, m: any) => s + m.total_paid, 0)
  const totalDebt = balances.reduce((s: number, m: any) => s + m.debt, 0)
  const avgScore = scores.length ? Math.round(scores.reduce((s: any, m: any) => s + m.score, 0) / scores.length) : 0
  const completedMeetings = meetings.filter((m: any) => m.status === 'completed').length
  const submittedReports = reports.filter((r: any) => r.status === 'submitted').length
  const totalReports = reports.length
  const reportRate = totalReports ? Math.round((submittedReports / totalReports) * 100) : 0

  // Ð¢Ð¾Ð¿ Ð¿Ð¾ Ð´Ð¸ÑÑÐ¸Ð¿Ð»Ð¸Ð½Ðµ
  const top = scores[0]
  const bottom = scores[scores.length - 1]

  return (
    <div className="p-8 animate-fade-in max-w-[1100px]">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold tracking-tight">ÐÐ½Ð°Ð»Ð¸ÑÐ¸ÐºÐ°</h1>
        <p className="text-[13px] text-muted mt-1">Ð¡ÑÐ°ÑÐ¸ÑÑÐ¸ÐºÐ° Ð³ÑÑÐ¿Ð¿Ñ Ð·Ð° Ð¿Ð¾ÑÐ»ÐµÐ´Ð½Ð¸Ðµ 30 Ð´Ð½ÐµÐ¹</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Ð¡ÑÐµÐ´Ð½Ð¸Ð¹ Ð±Ð°Ð»Ð»', value: `${avgScore}`, color: 'text-accent2', sub: 'Ð´Ð¸ÑÑÐ¸Ð¿Ð»Ð¸Ð½Ð°' },
          { label: 'ÐÐ°Ð¿Ð¾Ð»Ð½ÑÐµÐ¼Ð¾ÑÑÑ', value: `${reportRate}%`, color: reportRate >= 80 ? 'text-c-green' : 'text-c-red', sub: `${submittedReports}/${totalReports} Ð¾ÑÑÑÑÐ¾Ð²` },
          { label: 'ÐÐ°ÑÑÐ° ÑÑÑÐ°ÑÐ¾Ð²', value: `${totalBank.toLocaleString('ru')}â½`, color: 'text-c-orange', sub: `Ð´Ð¾Ð»Ð³ ${totalDebt.toLocaleString('ru')}â½` },
          { label: 'ÐÑÑÑÐµÑ Ð¿ÑÐ¾Ð²ÐµÐ´ÐµÐ½Ð¾', value: String(completedMeetings), color: 'text-c-blue', sub: `Ð¸Ð· ${meetings.length} Ð²ÑÐµÐ³Ð¾` },
        ].map(kpi => (
          <div key={kpi.label} className="bg-surface border border-border rounded-xl p-5">
            <div className="text-[11px] text-muted font-mono uppercase tracking-wider">{kpi.label}</div>
            <div className={`text-3xl font-extrabold tracking-tighter mt-1.5 ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[11px] text-muted mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Ð ÐµÐ¹ÑÐ¸Ð½Ð³ Ð´Ð¸ÑÑÐ¸Ð¿Ð»Ð¸Ð½Ñ */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[14px] font-bold mb-4">ð Ð ÐµÐ¹ÑÐ¸Ð½Ð³ Ð´Ð¸ÑÑÐ¸Ð¿Ð»Ð¸Ð½Ñ</div>
          {scores.map((s: any, i: number) => (
            <div key={s.member_id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
              <div className={`text-[13px] font-mono w-5 text-center font-bold ${i === 0 ? 'text-c-orange' : 'text-muted'}`}>
                {i === 0 ? 'ð¥' : i === 1 ? 'ð¥' : i === 2 ? 'ð¥' : `#${i+1}`}
              </div>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold"
                style={{ background: 'rgba(124,106,255,0.15)', color: '#a78bfa' }}>
                {s.name.charAt(0)}
              </div>
              <div className="text-[13px] font-semibold flex-1">{s.name.split(' ')[0]}</div>
              <div className="flex-1 mx-2 h-1.5 bg-surface2 rounded-full overflow-hidden">
                <div style={{
                  width: `${s.score}%`,
                  background: s.score >= 80 ? 'linear-gradient(90deg,#7c6aff,#a78bfa)' : 'linear-gradient(90deg,#ff5566,#ff8866)'
                }} />
              </div>
              <div className={`text-[14px] font-bold font-mono min-w-[40px] text-right ${s.score >= 80 ? 'text-c-green' : 'text-c-red'}`}>
                {s.score}
              </div>
            </div>
          ))}
        </div>

        {/* Ð¨ÑÑÐ°ÑÑ Ð¿Ð¾ ÑÑÐ°ÑÑÐ½Ð¸ÐºÐ°Ð¼ */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[14px] font-bold mb-4">ð¸ Ð¨ÑÑÐ°ÑÑ Ð¿Ð¾ ÑÑÐ°ÑÑÐ½Ð¸ÐºÐ°Ð¼</div>
          {balances.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold"
                style={{ background: 'rgba(124,106,255,0.15)', color: '#a78bfa' }}>
                {m.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold">{m.name.split(' ')[0]}</div>
                <div className="text-[11px] text-muted">Ð½Ð°ÑÐ¸ÑÐ»ÐµÐ½Ð¾ {m.total_charged}â½ Â· Ð¾Ð¿Ð»Ð°ÑÐµÐ½Ð¾ {m.total_paid}â½</div>
              </div>
              <div className={`text-[14px] font-bold font-mono ${m.debt === 0 ? 'text-muted' : m.debt > 500 ? 'text-c-red' : 'text-c-orange'}`}>
                {m.debt === 0 ? 'â 0â½' : `${m.debt}â½`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ÐÐ½ÑÐ°Ð¹ÑÑ */}
      {(top || bottom) && (
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[14px] font-bold mb-3">â¡ ÐÑÐ²Ð¾Ð´Ñ</div>
          <div className="grid grid-cols-3 gap-3">
            {top && (
              <div className="bg-surface2 rounded-xl p-3 border-l-2 border-c-green">
                <div className="text-[11px] text-c-green font-bold uppercase mb-1">ÐÐ¸Ð´ÐµÑ Ð³ÑÑÐ¿Ð¿Ñ</div>
                <div className="text-[13px]">{top.name} Ð´ÐµÑÐ¶Ð¸Ñ Ð²ÑÑÑÐ¸Ð¹ Ð±Ð°Ð»Ð» Ð´Ð¸ÑÑÐ¸Ð¿Ð»Ð¸Ð½Ñ â {top.score}.</div>
              </div>
            )}
            {bottom && bottom.score < 80 && (
              <div className="bg-surface2 rounded-xl p-3 border-l-2 border-c-red">
                <div className="text-[11px] text-c-red font-bold uppercase mb-1">ÐÐ¾Ð½Ð° ÑÐ¸ÑÐºÐ°</div>
                <div className="text-[13px]">{bottom.name.split(' ')[0]} â Ð±Ð°Ð»Ð» {bottom.score}. ÐÑÐ¶Ð½Ð¾ Ð¿Ð¾Ð´ÑÑÐ½ÑÑÑ.</div>
              </div>
            )}
            <div className="bg-surface2 rounded-xl p-3 border-l-2 border-accent">
              <div className="text-[11px] text-accent2 font-bold uppercase mb-1">ÐÐ°Ð¿Ð¾Ð»Ð½ÑÐµÐ¼Ð¾ÑÑÑ</div>
              <div className="text-[13px]">
                {reportRate >= 80 ? `ÐÑÑÐ¿Ð¿Ð° Ð² ÑÐ¾ÑÐ¾ÑÐµÐ¼ ÑÐ¸ÑÐ¼Ðµ â ${reportRate}% Ð¾ÑÑÑÑÐ¾Ð² ÑÐ´Ð°Ð½Ñ.` : `ÐÐ°Ð¿Ð¾Ð»Ð½ÑÐµÐ¼Ð¾ÑÑÑ ${reportRate}% â Ð½Ð¸Ð¶Ðµ Ð½Ð¾ÑÐ¼Ñ 80%.`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import type { TodayReportStatus } from '@/lib/supabase'
export default function MembersCard({ todayReports }: { todayReports: TodayReportStatus[] }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div>Участники</div>
        <div className="text-[12px] text-accent2 cursor-pointer">Все ₒ</div>
      </div>
      <div className="bg-surface2 rounded-xl px-3.5 py-3 mb-4">
        <div className="text-[10px] text-muted font-mono uppercase mb-2.5">Отчёт сегодня</div>
        <div className="flex flex-wrap gap-1.5">
          {todayReports.map(r => (
            <span key={r.id} className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border ${r.report_status==='submitted'?'bg-c-green/10 text-c-green border-c-green/20':'bg-c-red/10 text-c-red border-c-red/20'}`}>
              {r.report_status === 'submitted' ? '✓' : '✗'} {r.name.split(' ')[0]}
            </span>
          ))}
        </div>
      </div>
      {todayReports.map(r => (
        <div key={r.id} className="flex items-center gap-3.5 py-3 border-b border-border last:border-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0 relative" style={{background:'rgba(124,106,255,0.15)',color:'#a78bfa'}}>
            {r.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold">{r.name}</div>
            <div className="text-[11px] text-muted mt-0.5">@{r.telegram_username}</div>
          </div>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${r.report_status==='submitted'?'bg-c-green/10 text-c-green':'bg-c-red/10 text-c-red'}`}>
            {r.report_status === 'submitted' ? 'сдал': 'не сдал'}
          </span>
        </div>
      ))}
    </div>
  )
}

import type { DisciplineScore } from '@/lib/supabase'

export default function DisciplineCard({ scores }: { scores: DisciplineScore[] }) {
  const mskNow = new Date(Date.now() + 3 * 60 * 60 * 1000)
  const monthName = mskNow.toLocaleDateString('ru-RU', { month: 'long' })

  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[14px] font-bold">🏆 Дисциплина</div>
        <span className="text-[10px] bg-accent/10 text-accent2 px-2 py-0.5 rounded-full font-mono font-semibold capitalize">
          {monthName}
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
        <div className="flex items-center gap-1.5 text-[10px] text-muted">
          <div className="w-2 h-2 rounded-sm" style={{ background: 'rgba(124,106,255,0.7)' }} />
          Отчёты 50%
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted">
          <div className="w-2 h-2 rounded-sm" style={{ background: 'rgba(74,222,128,0.65)' }} />
          Встречи 50%
        </div>
      </div>

      {scores.map((s, i) => {
        const reportsScore = s.reports_score ?? s.score
        const meetingsScore = s.meetings_score ?? s.score
        const scoreColor = s.score >= 80 ? '#4ade80' : s.score >= 60 ? '#facc15' : '#f87171'

        return (
          <div key={s.member_id} className="py-2.5 border-b border-border last:border-0">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="text-[11px] font-mono text-muted w-4 text-center">#{i + 1}</div>
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{ background: 'rgba(124,106,255,0.15)', color: '#a78bfa' }}>
                {s.name.charAt(0)}
              </div>
              <div className="text-[13px] font-semibold flex-1 truncate">{s.name.split(' ')[0]}</div>
              <div className="text-[14px] font-bold font-mono min-w-[32px] text-right"
                style={{ color: scoreColor }}>
                {s.score}
              </div>
            </div>
            <div className="pl-[28px] flex items-center gap-1.5 mb-1">
              <span className="text-[9px] text-muted font-mono w-[42px]">отчёты</span>
              <div className="flex-1 h-1 bg-surface2 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${reportsScore}%`, background: 'rgba(124,106,255,0.65)' }} />
              </div>
              <span className="text-[9px] font-mono text-muted w-[24px] text-right">{reportsScore}</span>
            </div>
            <div className="pl-[28px] flex items-center gap-1.5">
              <span className="text-[9px] text-muted font-mono w-[42px]">встречи</span>
              <div className="flex-1 h-1 bg-surface2 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${meetingsScore}%`,
                    background: meetingsScore >= 80 ? 'rgba(74,222,128,0.65)' : 'rgba(248,113,113,0.65)',
                  }} />
              </div>
              <span className="text-[9px] font-mono text-muted w-[24px] text-right">{meetingsScore}</span>
            </div>
          </div>
        )
      })}

      {scores.length === 0 && (
        <div className="text-[13px] text-muted text-center py-4">
          Данные появятся после первого запуска крона
        </div>
      )}
    </div>
  )
}

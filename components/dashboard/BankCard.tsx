import type { MemberFineBalance } from '@/lib/supabase'

export default function BankCard({ fineBalances }: { fineBalances: MemberFineBalance[] }) {
  const totalBank = fineBalances.reduce((s, m) => s + m.total_charged, 0)
  const totalPaid = fineBalances.reduce((s, m) => s + m.total_paid, 0)
  const totalDebt = fineBalances.reduce((s, m) => s + m.debt, 0)
  const maxDebt = Math.max(...fineBalances.map(m => m.debt), 1)

  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="text-[14px] font-bold">💰 Банк штрафов</div>
        <div className="text-[12px] text-accent2 cursor-pointer font-medium">История →</div>
      </div>
      <div className="text-center py-4 border-b border-border mb-3.5">
        <div className="text-[11px] text-muted font-mono uppercase">
          Общий банк {totalBank.toLocaleString('ru')}₽
        </div>
        <div className="text-[12px] text-muted mt-1">
          Оплачено {totalPaid.toLocaleString('ru')}₽ · Долг {totalDebt.toLocaleString('ru')}₽
        </div>
      </div>
      {fineBalances.map(m => (
        <div key={m.id} className="flex items-center py-2 border-b border-border last:border-0">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold"
            style={{ background: 'rgba(124,106,255,0.15)', color: '#a78bfa' }}>
            {m.name.charAt(0)}
          </div>
          <div className="text-[13px] ml-2 w-20 truncate">{m.name.split(' ')[0]}</div>
          <div className="flex-1 mx-3 h-1 bg-surface2 rounded-full overflow-hidden">
            <div style={{
              width: `${(m.debt / maxDebt) * 100}%`,
              background: m.debt === 0 ? 'transparent' : m.debt > 500 ? '#ff5566' : '#f59e0b'
            }} />
          </div>
          <div className={`text-[12px] font-mono font-semibold min-w-[60px] text-right ${
            m.debt === 0 ? 'text-muted' : m.debt > 500 ? 'text-c-red' : 'text-c-orange'
          }`}>
            {m.debt === 0 ? '0₽ ✓' : `${m.debt.toLocaleString('ru')}₽`}
          </div>
        </div>
      ))}
    </div>
  )
}

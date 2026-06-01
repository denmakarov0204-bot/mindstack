import { supabase } from '@/lib/supabase'
import AddExpenseModal from '@/components/AddExpenseModal'
import FinesHistory from '@/components/FinesHistory'
import MarkAsPaidButton from '@/components/MarkAsPaidButton'

export const revalidate = 60

async function getData() {
  const [{ data: balances }, { data: fines }, { data: expenses }] = await Promise.all([
    supabase.from('member_fine_balance').select('*').order('debt', { ascending: false }),
    supabase.from('fines').select('*, members(name)').order('created_at', { ascending: false }).limit(50),
    supabase.from('bank_expenses').select('*').order('created_at', { ascending: false }),
  ])
  return { balances: balances || [], fines: fines || [], expenses: expenses || [] }
}

export default async function FinesPage() {
  const { balances, fines, expenses } = await getData()
  const totalCharged = balances.reduce((s: number, m: any) => s + m.total_charged, 0)
  const totalDebt = balances.reduce((s: number, m: any) => s + m.debt, 0)
  const totalPaid = totalCharged - totalDebt
  const totalExpenses = expenses.reduce((s: number, e: any) => s + e.amount, 0)
  const bankBalance = totalPaid - totalExpenses

  const timeline = [
    ...fines.map((f: any) => ({
      id: f.id, type: 'fine' as const,
      date: f.created_at, amount: f.amount,
      label: `${f.members?.name} — ${f.reason}`,
      tag: f.reason_type, isAuto: f.is_auto,
    })),
    ...expenses.map((e: any) => ({
      id: e.id, type: 'expense' as const,
      date: e.created_at, amount: e.amount,
      label: e.description,
      tag: e.category, isAuto: false,
      createdBy: e.created_by,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-[900px]">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Банк штрафов</h1>
          <AddExpenseModal />
        </div>
        <p className="text-[13px] text-muted mb-7">Учёт начислений, оплат и расходов</p>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="text-[11px] text-muted font-mono uppercase tracking-wider">Всего начислено</div>
            <div className="text-3xl font-extrabold text-accent2 tracking-tight mt-1">{totalCharged.toLocaleString('ru')}₽</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="text-[11px] text-muted font-mono uppercase tracking-wider">Оплачено</div>
            <div className="text-3xl font-extrabold text-c-green tracking-tight mt-1">{totalPaid.toLocaleString('ru')}₽</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="text-[11px] text-muted font-mono uppercase tracking-wider">Долг</div>
            <div className={`text-3xl font-extrabold tracking-tight mt-1 ${totalDebt > 0 ? 'text-c-red' : 'text-muted'}`}>
              {totalDebt.toLocaleString('ru')}₽
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-7">
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="text-[11px] text-muted font-mono uppercase tracking-wider">Расходы кассы</div>
            <div className="text-3xl font-extrabold text-c-orange tracking-tight mt-1">{totalExpenses.toLocaleString('ru')}₽</div>
          </div>
          <div className={`border rounded-xl p-5 ${bankBalance >= 0 ? 'bg-surface border-border' : 'bg-surface border-c-red'}`}>
            <div className="text-[11px] text-muted font-mono uppercase tracking-wider">Баланс кассы</div>
            <div className={`text-3xl font-extrabold tracking-tight mt-1 ${bankBalance >= 0 ? 'text-c-green' : 'text-c-red'}`}>
              {bankBalance >= 0 ? '' : '−'}{Math.abs(bankBalance).toLocaleString('ru')}₽
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 mb-5">
          <div className="text-[14px] font-bold mb-4">По участникам</div>
          {balances.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold"
                style={{ background: 'rgba(124,106,255,0.15)', color: '#a78bfa' }}>
                {m.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold">{m.name}</div>
                <div className="text-[11px] text-muted">Начислено {m.total_charged}₽ · Оплачено {m.total_paid}₽</div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-[14px] font-bold font-mono ${m.debt === 0 ? 'text-muted' : 'text-c-red'}`}>
                  {m.debt === 0 ? '✓ Оплачено' : `${m.debt}₽ долг`}
                </div>
                {m.debt > 0 && (
                  <MarkAsPaidButton memberId={m.id} memberName={m.name} debt={m.debt} />
                )}
              </div>
            </div>
          ))}
        </div>

        <FinesHistory items={timeline} />
      </div>
    </div>
  )
}

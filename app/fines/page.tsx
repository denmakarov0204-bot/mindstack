import { supabase } from '@/lib/supabase'
import AddExpenseModal from '@/components/AddExpenseModal'

export const revalidate = 60

const CATEGORY_LABELS: Record<string, string> = {
  food: '🍕 Еда / встречи',
  rent: '🏢 Аренда / место',
  equipment: '💻 Оборудование',
  transport: '🚗 Транспорт',
  other: '📦 Другое',
}

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
      label: e.description, tag: e.category,
      isAuto: false, createdBy: e.created_by,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <main className="flex-1 p-8 animate-fade-in">
      <div className="max-w-[900px]">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Банк штрафов</h1>
          <AddExpenseModal />
        </div>
        <p className="text-[13px] text-muted mb-7">Учёт начислений, оплат и расходов</p>

        <div className="grid grid-cols-4 gap-4 mb-7">
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="text-[11px] text-muted font-mono uppercase tracking-wider">Всего начислено</div>
            <div className="text-3xl font-extrabold text-accent2 tracking-tight mt-1">{totalCharged.toLocaleString('ru')}₽</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="text-[11px] text-muted font-mono uppercase tracking-wider">Оплачено</div>
            <div className="text-3xl font-extrabold text-c-green tracking-tight mt-1">{totalPaid.toLocaleString('ru')}₽</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="text-[11px] text-muted font-mono uppercase tracking-wider">Расходы кассы</div>
            <div className="text-3xl font-extrabold text-c-orange tracking-tight mt-1">{totalExpenses.toLocaleString('ru')}₽</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
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
              <div className={`text-[14px] font-bold font-mono ${m.debt === 0 ? 'text-muted' : 'text-c-red'}`}>
                {m.debt === 0 ? '✓ Оплачено' : `${m.debt}₽ долг`}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[14px] font-bold mb-4">История операций</div>
          {timeline.map((item) => (
            <div key={item.id + item.type} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                item.type === 'expense' ? 'bg-c-green' :
                item.tag === 'missed_report' ? 'bg-c-orange' :
                item.tag === 'missed_meeting' ? 'bg-c-red' : 'bg-c-blue'
              }`} />
              <div className="flex-1">
                <div className="text-[13px]">{item.label}</div>
                <div className="text-[11px] text-muted mt-0.5 flex gap-2">
                  <span>{new Date(item.date).toLocaleDateString('ru-RU')}</span>
                  {item.type === 'fine' && item.isAuto && <span>· авто</span>}
                  {item.type === 'expense' && <span>· {CATEGORY_LABELS[item.tag] || item.tag}</span>}
                  {item.type === 'expense' && (item as any).createdBy && <span>· {(item as any).createdBy}</span>}
                </div>
              </div>
              <div className={`text-[13px] font-bold font-mono ${item.type === 'fine' ? 'text-c-red' : 'text-c-green'}`}>
                {item.type === 'fine' ? '+' : '−'}{item.amount.toLocaleString('ru')}₽
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

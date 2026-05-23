import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export const revalidate = 60

async function getData() {
  const [{ data: balances }, { data: fines }] = await Promise.all([
    supabase.from('member_fine_balance').select('*').order('debt', { ascending: false }),
    supabase.from('fines').select('*, members(name)').order('created_at', { ascending: false }).limit(30),
  ])
  return { balances: balances || [], fines: fines || [] }
}

export default async function FinesPage() {
  const { balances, fines } = await getData()
  const totalBank = balances.reduce((s: number, m: any) => s + m.total_charged, 0)
  const totalDebt = balances.reduce((s: number, m: any) => s + m.debt, 0)

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-8 animate-fade-in">
        <div className="max-w-[900px]">
          <h1 className="text-2xl font-extrabold tracking-tight mb-1">Банк штрафов</h1>
          <p className="text-[13px] text-muted mb-7">Учёт начислений и оплат</p>

          <div className="grid grid-cols-3 gap-4 mb-7">
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="text-[11px] text-muted font-mono uppercase tracking-wider">Начислено</div>
              <div className="text-3xl font-extrabold text-accent2 tracking-tight mt-1">{totalBank.toLocaleString('ru')}₽</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="text-[11px] text-muted font-mono uppercase tracking-wider">Оплачено</div>
              <div className="text-3xl font-extrabold text-c-green tracking-tight mt-1">{(totalBank - totalDebt).toLocaleString('ru')}₽</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="text-[11px] text-muted font-mono uppercase tracking-wider">Долг</div>
              <div className="text-3xl font-extrabold text-c-red tracking-tight mt-1">{totalDebt.toLocaleString('ru')}₽</div>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-5 mb-5">
            <div className="text-[14px] font-bold mb-4">По участникам</div>
            {balances.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold" style={{background:'rgba(124,106,255,0.15)',color:'#a78bfa'}}>{m.name.charAt(0)}</div>
                <div className="flex-1"><div className="text-[13px] font-semibold">{m.name}</div><div className="text-[11px] text-muted">{m.total_charged}₽ · {m.total_paid}₽</div></div>
                <div className={`text-[14px] font-bold font-mono ${m.debt===0?'text-muted':'text-c-red'}`}>{m.debt===0?'☓Оплачено':`${m.debt}₽ сдал`}</div>
              </div>
            ))}
          </div>
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="text-[14px] font-bold mb-4">История начислений</div>
            {fines.map((f: any) => (
              <div key={f.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                <div className="flex-1">
                  <div className="text-[13px]">{f.members?.name} — {f.reason}</div>
                  <div className="text-[11px] text-muted mt-0.5">{new Date(f.created_at).toLocaleDateString('ru-RU')}{f.is_auto && ' · авто'}</div>
                </div>
                <div className="text-[13px] font-bold font-mono text-c-red">+{f.amount}₽</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

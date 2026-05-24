import { supabase } from '@/lib/supabase'

export const revalidate = 60

async function getData() {
  const [{ data: members }, { data: scores }, { data: balances }] = await Promise.all([
    supabase.from('members').select('*').order('joined_at'),
    supabase.from('discipline_scores').select('*'),
    supabase.from('member_fine_balance').select('*'),
  ])
  return {
    members: members || [],
    scores: scores || [],
    balances: balances || [],
  }
}

export default async function MembersPage() {
  const { members, scores, balances } = await getData()

  return (
    <div className="p-8 animate-fade-in max-w-[1100px]">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold tracking-tight">Участники</h1>
        <p className="text-[13px] text-muted mt-1">Мастер-майнд группа · {members.length} человек</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {members.map((m: any) => {
          const score = scores.find((s: any) => s.member_id === m.id)
          const balance = balances.find((b: any) => b.id === m.id)
          return (
            <div key={m.id} className="bg-surface border border-border rounded-2xl p-6 flex items-center gap-6 hover:border-border2 transition-colors">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-extrabold flex-shrink-0"
                style={{ background: 'rgba(124,106,255,0.15)', color: '#a78bfa' }}>
                {m.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-[16px] font-bold">{m.name}</div>
                  {m.role === 'admin' && (
                    <span className="text-[10px] bg-accent/15 text-accent2 rounded-full px-2 py-0.5 font-bold uppercase">Admin</span>
                  )}
                </div>
                <div className="text-[13px] text-muted">@{m.telegram_username}</div>
                {m.business_niche && (
                  <div className="text-[12px] text-muted mt-1 truncate">{m.business_niche}</div>
                )}
              </div>
              <div className="flex items-center gap-8 flex-shrink-0">
                <div className="text-center">
                  <div className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1">Дисциплина</div>
                  <div className={`text-2xl font-extrabold font-mono ${score?.score >= 80 ? 'text-c-green' : 'text-c-red'}`}>
                    {score?.score ?? '—'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1">Штрафы</div>
                  <div className={`text-2xl font-extrabold font-mono ${(balance?.debt ?? 0) > 0 ? 'text-c-red' : 'text-muted'}`}>
                    {balance?.debt ? `${balance.debt}₽` : '0₽'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1">В группе</div>
                  <div className="text-[13px] font-semibold">
                    {new Date(m.joined_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

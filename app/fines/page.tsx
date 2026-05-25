'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Member = {
  id: string
  name: string
  telegram_username: string
  debt: number
  total_charged: number
  total_paid: number
}

type Fine = {
  id: string
  member_id: string
  amount: number
  reason: string
  is_paid: boolean
  created_at: string
  members?: { name: string }
}

export default function FinesPage() {
  const [balances, setBalances] = useState<Member[]>([])
  const [fines, setFines] = useState<Fine[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState<Record<string, string>>({})

  async function load() {
    const [{ data: b }, { data: f }] = await Promise.all([
      supabase.from('member_fine_balance').select('*').order('debt', { ascending: false }),
      supabase.from('fines').select('*, members(name)').order('created_at', { ascending: false }).limit(50),
    ])
    setBalances(b || [])
    setFines(f || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handlePay(memberId: string) {
    const amount = parseInt(payAmount[memberId] || '0')
    if (!amount || amount <= 0) return
    setPaying(memberId)
    await fetch('/api/pay-fine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, amount }),
    })
    setPayAmount(p => ({ ...p, [memberId]: '' }))
    setPaying(null)
    load()
  }

  const totalDebt = balances.reduce((s, m) => s + m.debt, 0)
  const totalBank = balances.reduce((s, m) => s + m.total_paid, 0)

  if (loading) return <div className="p-8 text-muted text-[14px]">Загрузка...</div>

  return (
    <div className="p-8 animate-fade-in max-w-[1000px]">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold tracking-tight">Штрафы</h1>
        <p className="text-[13px] text-muted mt-1">Банк дисциплины группы</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-[11px] text-muted font-mono uppercase tracking-wider">Банк группы</div>
          <div className="text-3xl font-extrabold text-c-green mt-1">{totalBank.toLocaleString('ru')}₽</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-[11px] text-muted font-mono uppercase tracking-wider">Общий долг</div>
          <div className={`text-3xl font-extrabold mt-1 ${totalDebt > 0 ? 'text-c-red' : 'text-muted'}`}>{totalDebt.toLocaleString('ru')}₽</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-[11px] text-muted font-mono uppercase tracking-wider">Начислено всего</div>
          <div className="text-3xl font-extrabold text-c-orange mt-1">{balances.reduce((s,m)=>s+m.total_charged,0).toLocaleString('ru')}₽</div>
        </div>
      </div>

      {/* Участники с долгами */}
      <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
        <div className="text-[14px] font-bold mb-4">💸 Долги участников</div>
        <div className="flex flex-col gap-3">
          {balances.map(m => (
            <div key={m.id} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[14px] font-bold flex-shrink-0"
                style={{background:'rgba(124,106,255,0.15)',color:'#a78bfa'}}>{m.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold">{m.name}</div>
                <div className="text-[11px] text-muted">начислено {m.total_charged}₽ · оплачено {m.total_paid}₽</div>
              </div>
              <div className={`text-[18px] font-extrabold font-mono min-w-[70px] text-right ${m.debt > 0 ? 'text-c-red' : 'text-c-green'}`}>
                {m.debt > 0 ? `${m.debt}₽` : '✓ 0₽'}
              </div>
              {m.debt > 0 && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number"
                    value={payAmount[m.id] || ''}
                    onChange={e => setPayAmount(p => ({...p, [m.id]: e.target.value}))}
                    placeholder={`до ${m.debt}₽`}
                    className="w-[90px] bg-surface2 border border-border rounded-lg px-2 py-1.5 text-[12px] font-mono text-center focus:outline-none focus:border-accent"
                    min="1" max={m.debt}
                  />
                  <button
                    onClick={() => handlePay(m.id)}
                    disabled={paying === m.id || !payAmount[m.id]}
                    className="px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent2 text-[12px] font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {paying === m.id ? '...' : '✓ Оплатил'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* История штрафов */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <div className="text-[14px] font-bold mb-4">📋 История штрафов</div>
        <div className="flex flex-col gap-1">
          {fines.map(f => (
            <div key={f.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{background:'rgba(124,106,255,0.15)',color:'#a78bfa'}}>{f.members?.name?.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold">{f.members?.name}</div>
                <div className="text-[11px] text-muted truncate">{f.reason}</div>
              </div>
              <div className="text-[11px] text-muted font-mono">
                {new Date(f.created_at).toLocaleDateString('ru-RU', {day:'numeric',month:'short'})}
              </div>
              <div className="text-[13px] font-bold font-mono text-c-red">{f.amount}₽</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
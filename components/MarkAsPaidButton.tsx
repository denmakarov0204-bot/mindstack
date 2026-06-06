'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarkAsPaidButton({
  memberId,
  memberName,
  debt,
}: {
  memberId: string
  memberName: string
  debt: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(debt))
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handlePay() {
    const num = Number(amount)
    if (!num || num <= 0 || loading || done) return
    setLoading(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, amount: num }),
      })
      if (res.ok) {
        setDone(true)
        setOpen(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (done) return null

  return (
    <>
      <button
        onClick={() => { setAmount(String(debt)); setOpen(true) }}
        className="text-[11px] px-2.5 py-1 rounded-lg bg-c-green/10 text-c-green font-semibold hover:bg-c-green/20 transition ml-2"
      >
        ✓ Оплачено
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-xs mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold mb-1">Внести оплату</h2>
            <p className="text-[12px] text-muted mb-4">{memberName} · долг {debt}₽</p>
            <label className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5 block">Сумма ₽</label>
            <input
              type="number"
              min="1"
              max={debt}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-[13px] font-semibold hover:bg-bg transition"
              >
                Отмена
              </button>
              <button
                onClick={handlePay}
                disabled={loading || done || !amount || Number(amount) <= 0}
                className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-white text-[13px] font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Сохраняю...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

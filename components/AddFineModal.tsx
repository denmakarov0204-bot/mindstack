'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const REASON_TYPES = [
  { value: 'missed_report', label: '📋 Не сдан отчёт' },
  { value: 'missed_meeting', label: '🚫 Пропущена встреча' },
  { value: 'late_to_meeting', label: '⏰ Опоздание на встречу' },
  { value: 'other', label: '📦 Другое' },
]

type Member = { id: string; name: string }

export default function AddFineModal({ members }: { members: Member[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    member_id: '',
    amount: '100',
    reason: '',
    reason_type: 'other',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.member_id || !form.amount || !form.reason) return
    setLoading(true)
    try {
      const res = await fetch('/api/fines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setOpen(false)
        setForm({ member_id: '', amount: '100', reason: '', reason_type: 'other' })
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-c-red/10 text-c-red text-[13px] font-semibold hover:bg-c-red/20 transition"
      >
        + Штраф
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[16px] font-bold mb-5">Добавить штраф</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5 block">Участник</label>
                <select
                  required
                  value={form.member_id}
                  onChange={e => setForm(f => ({ ...f, member_id: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent"
                >
                  <option value="">Выберите участника</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5 block">Сумма ₽</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5 block">Причина</label>
                <input
                  type="text"
                  required
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Опоздал на встречу на 15 минут"
                  className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5 block">Тип</label>
                <select
                  value={form.reason_type}
                  onChange={e => setForm(f => ({ ...f, reason_type: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent"
                >
                  {REASON_TYPES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-[13px] font-semibold hover:bg-bg transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-c-red text-white text-[13px] font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? 'Сохраняю...' : 'Выписать штраф'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

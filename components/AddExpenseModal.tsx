'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { value: 'food', label: '🍕 Еда / встречи' },
  { value: 'rent', label: '🏢 Аренда / место' },
  { value: 'equipment', label: '💻 Оборудование' },
  { value: 'transport', label: '🚗 Транспорт' },
  { value: 'other', label: '📦 Другое' },
]

export default function AddExpenseModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ amount: '', description: '', category: 'other', created_by: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || !form.description) return
    setLoading(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setOpen(false)
        setForm({ amount: '', description: '', category: 'other', created_by: '' })
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
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-[13px] font-semibold hover:opacity-90 transition"
      >
        − Списать из кассы
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[16px] font-bold mb-5">Списание из кассы</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5 block">Сумма ₽</label>
                <input type="number" min="1" required value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="500"
                  className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5 block">Описание</label>
                <input type="text" required value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Аренда переговорки"
                  className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5 block">Категория</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5 block">Кто списывает</label>
                <input type="text" value={form.created_by}
                  onChange={e => setForm(f => ({ ...f, created_by: e.target.value }))}
                  placeholder="Имя"
                  className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent" />
              </div>
              <div className="flex gap-3 mt-1">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-[13px] font-semibold hover:bg-bg transition">
                  Отмена
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-white text-[13px] font-semibold hover:opacity-90 transition disabled:opacity-50">
                  {loading ? 'Сохраняю...' : 'Списать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

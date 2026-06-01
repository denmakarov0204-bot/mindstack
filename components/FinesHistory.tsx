'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CATEGORY_LABELS: Record<string, string> = {
  food: '🍕 Еда / встречи',
  rent: '🏢 Аренда / место',
  equipment: '💻 Оборудование',
  transport: '🚗 Транспорт',
  other: '📦 Другое',
}

type TimelineItem = {
  id: string
  type: 'fine' | 'expense'
  date: string
  amount: number
  label: string
  tag: string
  isAuto: boolean
  createdBy?: string
}

export default function FinesHistory({ items }: { items: TimelineItem[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function deleteFine(id: string) {
    if (!confirm('Удалить этот штраф?')) return
    setDeleting(id)
    await supabase.from('fines').delete().eq('id', id)
    setDeleting(null)
    router.refresh()
  }

  async function deleteExpense(id: string) {
    if (!confirm('Удалить эту операцию?')) return
    setDeleting(id)
    await supabase.from('bank_expenses').delete().eq('id', id)
    setDeleting(null)
    router.refresh()
  }

  if (items.length === 0) {
    return <div className="text-[13px] text-muted py-4 text-center">Нет операций</div>
  }

  return (
    <>
      {items.map((item) => (
        <div key={item.id + item.type} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 group">
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
              {item.type === 'expense' && item.createdBy && <span>· {item.createdBy}</span>}
            </div>
          </div>
          <div className={`text-[13px] font-bold font-mono ${item.type === 'fine' ? 'text-c-red' : 'text-c-green'}`}>
            {item.type === 'fine' ? '+' : '−'}{item.amount.toLocaleString('ru')}₽
          </div>
          <button
            onClick={() => item.type === 'fine' ? deleteFine(item.id) : deleteExpense(item.id)}
            disabled={deleting === item.id}
            className="opacity-0 group-hover:opacity-100 transition text-muted hover:text-c-red text-[16px] px-1 disabled:opacity-30"
            title="Удалить"
          >
            ×
          </button>
        </div>
      ))}
    </>
  )
}

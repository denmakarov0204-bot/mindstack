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
  const [loading, setLoading] = useState(false)

  async function handlePay() {
    if (!confirm(`Отметить ${memberName} как оплатившего ${debt}₽?`)) return
    setLoading(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, amount: debt }),
      })
      if (res.ok) router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="text-[11px] px-2.5 py-1 rounded-lg bg-c-green/10 text-c-green font-semibold hover:bg-c-green/20 transition disabled:opacity-50 ml-2"
    >
      {loading ? '...' : '✓ Оплачено'}
    </button>
  )
}

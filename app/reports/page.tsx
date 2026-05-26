'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Member = { id: string; name: string }
type Report = { id: string; member_id: string; date: string; status: string; submitted_at: string | null; content: string | null }

export default function ReportsPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)  // memberId_date

  // Форма ручного добавления
  const [showManual, setShowManual] = useState(false)
  const [manualMember, setManualMember] = useState('')
  const [manualDate, setManualDate] = useState(new Date(Date.now() + 3*60*60*1000).toISOString().split('T')[0])
  const [manualContent, setManualContent] = useState('')
  const [adding, setAdding] = useState(false)

  async function load() {
    const ago7 = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0]
    const [{ data: r }, { data: m }] = await Promise.all([
      supabase.from('daily_reports').select('*').gte('date', ago7).order('date', { ascending: false }),
      supabase.from('members').select('id, name').eq('is_active', true).order('name'),
    ])
    setReports(r || [])
    setMembers(m || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Дни за последние 7 дней
  const days = Array.from({length: 7}, (_, i) => {
    const d = new Date(Date.now() + 3*60*60*1000)
    d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  })

  function getReport(memberId: string, date: string) {
    return reports.find(r => r.member_id === memberId && r.date === date)
  }

  // Отметить отчёт вручную
  async function markSubmitted(memberId: string, date: string) {
    const key = memberId + '_' + date
    setSaving(key)
    const existing = getReport(memberId, date)
    if (existing) {
      // Обновляем статус
      await supabase.from('daily_reports').update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        content: existing.content || 'Отмечено вручную'
      }).eq('id', existing.id)
    } else {
      // Создаём новую запись
      await supabase.from('daily_reports').insert({
        member_id: memberId,
        date,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        content: 'Отмечено вручную'
      })
    }
    setSaving(null)
    load()
  }

  // Убрать отметку
  async function markMissing(memberId: string, date: string) {
    const key = memberId + '_' + date
    setSaving(key)
    const existing = getReport(memberId, date)
    if (existing) {
      await supabase.from('daily_reports').delete().eq('id', existing.id)
    }
    setSaving(null)
    load()
  }

  // Добавить с контентом
  async function addManual() {
    if (!manualMember || !manualDate) return
    setAdding(true)
    const existing = getReport(manualMember, manualDate)
    if (existing) {
      await supabase.from('daily_reports').update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        content: manualContent || 'Отмечено вручную'
      }).eq('id', existing.id)
    } else {
      await supabase.from('daily_reports').insert({
        member_id: manualMember,
        date: manualDate,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        content: manualContent || 'Отмечено вручную'
      })
    }
    setShowManual(false)
    setManualContent('')
    setAdding(false)
    load()
  }

  const dayNames: Record<string, string> = { '0': 'Вс', '1': 'Пн', '2': 'Вт', '3': 'Ср', '4': 'Чт', '5': 'Пт', '6': 'Сб' }

  if (loading) return <div className="p-8 text-muted text-[14px]">Загрузка...</div>

  return (
    <div className="p-6 md:p-8 max-w-[1100px] animate-fade-in">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Отчёты</h1>
          <p className="text-[13px] text-muted mt-1">Последние 7 дней</p>
        </div>
        <button
          onClick={() => setShowManual(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent2 text-[13px] font-bold rounded-xl transition-colors"
        >
          ✏️ Отметить вручную
        </button>
      </div>

      {/* Форма ручного добавления */}
      {showManual && (
        <div className="bg-surface border border-accent/30 rounded-2xl p-5 mb-6">
          <div className="text-[14px] font-bold mb-4">✏️ Ручная отметка отчёта</div>
          <div className="flex flex-wrap gap-3 mb-3">
            <select
              value={manualMember}
              onChange={e => setManualMember(e.target.value)}
              className="flex-1 min-w-[160px] bg-surface2 border border-border rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-accent"
            >
              <option value="">Выбери участника...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input
              type="date"
              value={manualDate}
              onChange={e => setManualDate(e.target.value)}
              className="bg-surface2 border border-border rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-accent"
            />
          </div>
          <textarea
            value={manualContent}
            onChange={e => setManualContent(e.target.value)}
            placeholder="Содержание отчёта (необязательно)"
            rows={2}
            className="w-full bg-surface2 border border-border rounded-xl px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-accent resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={addManual}
              disabled={!manualMember || !manualDate || adding}
              className="px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent2 text-[13px] font-bold rounded-xl disabled:opacity-40"
            >
              {adding ? 'Добавляю...' : '✓ Отметить сданным'}
            </button>
            <button onClick={() => setShowManual(false)} className="text-muted text-[13px] hover:text-foreground">
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Таблица отчётов */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-[11px] text-muted font-mono uppercase tracking-wider w-[160px]">
                  Участник
                </th>
                {days.map(d => {
                  const date = new Date(d)
                  const dow = dayNames[String(date.getUTCDay())]
                  const isToday = d === new Date(Date.now() + 3*60*60*1000).toISOString().split('T')[0]
                  return (
                    <th key={d} className="px-2 py-3 text-center min-w-[80px]">
                      <div className={`text-[11px] font-mono ${isToday ? 'text-accent2 font-bold' : 'text-muted'}`}>{dow}</div>
                      <div className={`text-[10px] ${isToday ? 'text-accent2' : 'text-muted'}`}>
                        {date.getUTCDate()}.{String(date.getUTCMonth()+1).padStart(2,'0')}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {members.map((m, idx) => (
                <tr key={m.id} className={`border-b border-border last:border-0 ${idx % 2 === 0 ? '' : 'bg-surface2/30'}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                        style={{background:'rgba(124,106,255,0.15)',color:'#a78bfa'}}>{m.name.charAt(0)}</div>
                      <span className="text-[13px] font-medium">{m.name.split(' ')[0]}</span>
                    </div>
                  </td>
                  {days.map(d => {
                    const report = getReport(m.id, d)
                    const submitted = report?.status === 'submitted'
                    const key = m.id + '_' + d
                    const isSaving = saving === key
                    const isManual = report?.content === 'Отмечено вручную' || report?.content === 'Отчёт добавлен вручную администратором'

                    return (
                      <td key={d} className="px-2 py-3 text-center">
                        <button
                          onClick={() => submitted ? markMissing(m.id, d) : markSubmitted(m.id, d)}
                          disabled={isSaving}
                          title={submitted ? 'Нажми чтобы убрать отметку' : 'Нажми чтобы отметить сданным'}
                          className="group relative inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all disabled:opacity-40"
                        >
                          {isSaving ? (
                            <span className="text-[14px] animate-spin inline-block">⟳</span>
                          ) : submitted ? (
                            <span className={`text-[16px] ${isManual ? 'opacity-60' : ''}`} title={isManual ? 'Отмечено вручную' : ''}>
                              ✅
                            </span>
                          ) : (
                            <span className="text-[16px] opacity-30 group-hover:opacity-70 transition-opacity">○</span>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex gap-4 text-[11px] text-muted">
        <span>✅ — сдал</span>
        <span className="opacity-60">✅ — отмечено вручную</span>
        <span>○ — не сдал (нажми чтобы отметить)</span>
      </div>
    </div>
  )
}
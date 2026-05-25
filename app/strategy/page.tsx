'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Goal = {
  id: string
  title: string
  description: string | null
  deadline: string | null
  status: 'active' | 'completed' | 'paused'
  priority: number
  ai_suggested: boolean
  created_at: string
}

type Suggestion = {
  action: 'add' | 'update' | 'remove'
  title: string
  description?: string
  deadline?: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: 'Активна', color: 'text-c-green bg-c-green/10' },
  paused:    { label: 'На паузе', color: 'text-c-orange bg-c-orange/10' },
  completed: { label: 'Выполнена', color: 'text-accent2 bg-accent/10' },
}

export default function StrategyPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState<{id:string;name:string}[]>([])

  // Форма новой цели
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newDeadline, setNewDeadline] = useState('')

  // Редактирование
  const [editId, setEditId] = useState<string|null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editDeadline, setEditDeadline] = useState('')

  // Стратегический анализ
  const [transcript, setTranscript] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [meetingNum, setMeetingNum] = useState('')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0])
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [{ data: g }, { data: m }] = await Promise.all([
      supabase.from('goals').select('*').order('priority').order('created_at'),
      supabase.from('members').select('id, name').eq('is_active', true),
    ])
    setGoals(g || [])
    setMembers(m || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addGoal() {
    if (!newTitle.trim()) return
    setSaving(true)
    await supabase.from('goals').insert({
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      deadline: newDeadline || null,
      priority: goals.length + 1,
    })
    setNewTitle(''); setNewDesc(''); setNewDeadline('')
    setShowAdd(false); setSaving(false); load()
  }

  async function saveEdit(id: string) {
    await supabase.from('goals').update({
      title: editTitle, description: editDesc || null, deadline: editDeadline || null, updated_at: new Date().toISOString()
    }).eq('id', id)
    setEditId(null); load()
  }

  async function setStatus(id: string, status: string) {
    await supabase.from('goals').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  async function deleteGoal(id: string) {
    if (!confirm('Удалить цель?')) return
    await supabase.from('goals').delete().eq('id', id)
    load()
  }

  // Загрузка аудио
  async function handleAudio(file: File) {
    setTranscribing(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.transcript) setTranscript(data.transcript)
      else alert('Ошибка: ' + data.error)
    } catch(e) { alert('Ошибка транскрибации') }
    setTranscribing(false)
  }

  // Стратегический ИИ анализ
  async function runAnalysis() {
    if (!transcript.trim() || transcript.length < 50) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/strategy-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          meetingNumber: meetingNum || '?',
          date: new Date(meetingDate).toLocaleDateString('ru-RU'),
          members: members.map(m => m.name),
          goals: goals.filter(g => g.status === 'active'),
        }),
      })
      const data = await res.json()
      if (data.analysis) {
        setAnalysis(data.analysis)
        if (data.goalSuggestions?.length) setSuggestions(data.goalSuggestions)
      } else alert('Ошибка: ' + data.error)
    } catch(e) { alert('Ошибка ИИ') }
    setAnalyzing(false)
  }

  // Принять предложение ИИ
  async function acceptSuggestion(s: Suggestion, idx: number) {
    if (s.action === 'add') {
      await supabase.from('goals').insert({
        title: s.title, description: s.description || null,
        deadline: s.deadline || null, ai_suggested: true, priority: goals.length + 1,
      })
    }
    setSuggestions(prev => prev.filter((_,i) => i !== idx))
    load()
  }

  if (loading) return <div className="p-8 text-muted text-[14px]">Загрузка...</div>

  const activeGoals = goals.filter(g => g.status === 'active')
  const otherGoals = goals.filter(g => g.status !== 'active')

  return (
    <div className="p-6 md:p-8 max-w-[1100px] animate-fade-in">
      <input type="file" ref={fileInputRef} className="hidden"
        accept="audio/*,video/*,.mp3,.mp4,.wav,.m4a"
        onChange={e => { const f=e.target.files?.[0]; if(f) handleAudio(f); e.target.value='' }} />

      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Стратегия</h1>
        <p className="text-[13px] text-muted mt-1">Глобальные цели группы · ИИ-коуч</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Левая колонка — цели */}
        <div>
          {/* Активные цели */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-[14px] font-bold">🎯 Активные цели</div>
            <button onClick={() => setShowAdd(v=>!v)}
              className="px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent2 text-[12px] font-bold rounded-lg transition-colors">
              + Добавить цель
            </button>
          </div>

          {/* Форма добавления */}
          {showAdd && (
            <div className="bg-surface border border-accent/30 rounded-2xl p-4 mb-4">
              <input value={newTitle} onChange={e=>setNewTitle(e.target.value)}
                placeholder="Название цели *" autoFocus
                className="w-full bg-surface2 border border-border rounded-xl px-3 py-2 text-[13px] mb-2 focus:outline-none focus:border-accent" />
              <textarea value={newDesc} onChange={e=>setNewDesc(e.target.value)}
                placeholder="Описание (необязательно)"
                rows={2}
                className="w-full bg-surface2 border border-border rounded-xl px-3 py-2 text-[12px] mb-2 focus:outline-none focus:border-accent resize-none" />
              <div className="flex items-center gap-2">
                <input type="date" value={newDeadline} onChange={e=>setNewDeadline(e.target.value)}
                  className="bg-surface2 border border-border rounded-xl px-3 py-1.5 text-[12px] focus:outline-none focus:border-accent" />
                <button onClick={addGoal} disabled={!newTitle.trim()||saving}
                  className="px-4 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent2 text-[12px] font-bold rounded-lg disabled:opacity-40">
                  Добавить
                </button>
                <button onClick={() => setShowAdd(false)} className="text-muted text-[12px]">Отмена</button>
              </div>
            </div>
          )}

          {/* Список активных целей */}
          <div className="flex flex-col gap-3 mb-6">
            {activeGoals.length === 0 ? (
              <div className="bg-surface border border-border rounded-2xl p-5 text-[13px] text-muted text-center">
                Целей пока нет — добавь первую!
              </div>
            ) : activeGoals.map((g, i) => (
              <div key={g.id} className="bg-surface border border-border rounded-2xl p-4">
                {editId === g.id ? (
                  <div>
                    <input value={editTitle} onChange={e=>setEditTitle(e.target.value)}
                      className="w-full bg-surface2 border border-border rounded-xl px-3 py-2 text-[13px] mb-2 focus:outline-none focus:border-accent" />
                    <textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)}
                      rows={2} className="w-full bg-surface2 border border-border rounded-xl px-3 py-2 text-[12px] mb-2 focus:outline-none focus:border-accent resize-none" />
                    <div className="flex items-center gap-2">
                      <input type="date" value={editDeadline} onChange={e=>setEditDeadline(e.target.value)}
                        className="bg-surface2 border border-border rounded-xl px-3 py-1.5 text-[12px] focus:outline-none focus:border-accent" />
                      <button onClick={() => saveEdit(g.id)}
                        className="px-3 py-1.5 bg-accent/20 text-accent2 text-[11px] font-bold rounded-lg">Сохранить</button>
                      <button onClick={() => setEditId(null)} className="text-muted text-[11px]">Отмена</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted font-mono">#{i+1}</span>
                        {g.ai_suggested && <span className="text-[9px] bg-accent/15 text-accent2 px-1.5 py-0.5 rounded-full font-bold">🤖 ИИ</span>}
                        <span className="text-[13px] font-semibold">{g.title}</span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => { setEditId(g.id); setEditTitle(g.title); setEditDesc(g.description||''); setEditDeadline(g.deadline||'') }}
                          className="text-[11px] text-muted hover:text-foreground px-1.5 py-0.5 rounded">✏️</button>
                        <button onClick={() => setStatus(g.id, 'completed')}
                          className="text-[11px] text-muted hover:text-c-green px-1.5 py-0.5 rounded">✓</button>
                        <button onClick={() => setStatus(g.id, 'paused')}
                          className="text-[11px] text-muted hover:text-c-orange px-1.5 py-0.5 rounded">⏸</button>
                        <button onClick={() => deleteGoal(g.id)}
                          className="text-[11px] text-muted hover:text-c-red px-1.5 py-0.5 rounded">🗑</button>
                      </div>
                    </div>
                    {g.description && <div className="text-[12px] text-muted mt-1">{g.description}</div>}
                    {g.deadline && (
                      <div className="text-[11px] text-accent2 mt-1.5 font-mono">
                        📅 до {new Date(g.deadline).toLocaleDateString('ru-RU', {day:'numeric',month:'long',year:'numeric'})}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Остальные цели */}
          {otherGoals.length > 0 && (
            <div>
              <div className="text-[12px] text-muted font-mono uppercase tracking-wider mb-2">Завершённые / На паузе</div>
              <div className="flex flex-col gap-2">
                {otherGoals.map(g => (
                  <div key={g.id} className="bg-surface border border-border rounded-xl px-4 py-2.5 flex items-center justify-between opacity-60">
                    <span className="text-[12px]">{g.title}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_LABELS[g.status]?.color}`}>
                        {STATUS_LABELS[g.status]?.label}
                      </span>
                      <button onClick={() => setStatus(g.id, 'active')} className="text-[10px] text-muted hover:text-foreground">↩ Вернуть</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Правая колонка — ИИ анализ */}
        <div>
          <div className="text-[14px] font-bold mb-3">🤖 Стратегический анализ встречи</div>

          <div className="bg-surface border border-border rounded-2xl p-5">
            {/* Параметры */}
            <div className="flex gap-2 mb-3">
              <input value={meetingNum} onChange={e=>setMeetingNum(e.target.value)}
                placeholder="№ встречи" className="w-[80px] bg-surface2 border border-border rounded-lg px-2 py-1.5 text-[12px] font-mono focus:outline-none focus:border-accent" />
              <input type="date" value={meetingDate} onChange={e=>setMeetingDate(e.target.value)}
                className="bg-surface2 border border-border rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:border-accent" />
            </div>

            {/* Загрузка аудио */}
            <div className="flex gap-2 mb-3">
              <button onClick={() => fileInputRef.current?.click()} disabled={transcribing}
                className="flex items-center gap-2 px-3 py-2 bg-surface2 hover:bg-surface border border-border text-[12px] font-semibold rounded-xl transition-colors disabled:opacity-40">
                {transcribing ? <><span className="animate-spin inline-block">⟳</span> Транскрибирую...</> : <>🎙 Загрузить аудио</>}
              </button>
            </div>

            {/* Поле транскрипта */}
            <textarea value={transcript} onChange={e=>setTranscript(e.target.value)}
              placeholder="Или вставь текст записи встречи..."
              rows={5}
              className="w-full bg-surface2 border border-border rounded-xl px-3 py-2.5 text-[12px] leading-relaxed focus:outline-none focus:border-accent resize-none mb-3" />

            {/* Кнопка анализа */}
            <button onClick={runAnalysis} disabled={analyzing || transcript.length < 50}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent/20 hover:bg-accent/30 text-accent2 text-[13px] font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {analyzing ? <><span className="animate-spin inline-block">⟳</span> Claude анализирует...</> : <>🤖 Проанализировать относительно целей</>}
            </button>
          </div>

          {/* Предложения ИИ по целям */}
          {suggestions.length > 0 && (
            <div className="mt-4 bg-surface border border-accent/25 rounded-2xl p-5">
              <div className="text-[13px] font-bold mb-3">💡 ИИ предлагает обновить цели</div>
              <div className="flex flex-col gap-2">
                {suggestions.map((s, i) => (
                  <div key={i} className="bg-surface2 border border-border rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.action==='add'?'bg-c-green/15 text-c-green':s.action==='remove'?'bg-c-red/15 text-c-red':'bg-c-orange/15 text-c-orange'}`}>
                            {s.action==='add'?'+ Добавить':s.action==='remove'?'− Удалить':'↻ Обновить'}
                          </span>
                          <span className="text-[12px] font-semibold">{s.title}</span>
                        </div>
                        {s.description && <div className="text-[11px] text-muted">{s.description}</div>}
                        {s.deadline && <div className="text-[11px] text-accent2 mt-0.5">до {s.deadline}</div>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => acceptSuggestion(s, i)}
                          className="px-2.5 py-1 bg-c-green/15 hover:bg-c-green/25 text-c-green text-[11px] font-bold rounded-lg">✓ Принять</button>
                        <button onClick={() => setSuggestions(p=>p.filter((_,j)=>j!==i))}
                          className="px-2.5 py-1 bg-surface border border-border text-muted hover:text-foreground text-[11px] rounded-lg">✗</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Результат анализа */}
          {analysis && (
            <div className="mt-4 bg-surface border border-border rounded-2xl p-5">
              <div className="text-[13px] font-bold mb-3">📊 Анализ</div>
              <div className="text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">{analysis}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
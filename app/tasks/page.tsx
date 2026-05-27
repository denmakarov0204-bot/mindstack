'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Task {
  id: string
  meeting_id: string | null
  member_id: string | null
  text: string
  status: 'todo' | 'in_progress' | 'done'
  due_date: string | null
  created_at: string
  member_name?: string
  meeting_number?: number
}

interface Meeting {
  id: string
  meeting_number: number
  date: string
  ai_summary: string | null
  status: string
}

interface Member {
  id: string
  name: string
  is_active: boolean
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'К выполнению',
  in_progress: 'В процессе',
  done: 'Выполнено',
}

const STATUS_COLORS: Record<string, string> = {
  todo: 'text-c-orange',
  in_progress: 'text-c-blue',
  done: 'text-c-green',
}

const STATUS_BG: Record<string, string> = {
  todo: 'bg-c-orange/10 border-c-orange/20',
  in_progress: 'bg-c-blue/10 border-c-blue/20',
  done: 'bg-c-green/10 border-c-green/20',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState({
    text: '',
    member_id: '',
    due_date: '',
    status: 'todo',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [
      { data: tasksRaw },
      { data: meetingsData },
      { data: membersData },
      { data: goalsData },
    ] = await Promise.all([
      supabase.from('action_items').select('*').order('created_at', { ascending: false }),
      supabase.from('meetings').select('*').order('date', { ascending: false }).limit(10),
      supabase.from('members').select('*').eq('is_active', true),
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
    ])

    const membersMap: Record<string, string> = {}
    ;(membersData || []).forEach((m: Member) => { membersMap[m.id] = m.name })
    const meetingsMap: Record<string, number> = {}
    ;(meetingsData || []).forEach((m: Meeting) => { meetingsMap[m.id] = m.meeting_number })

    const enriched = (tasksRaw || []).map((t: any) => ({
      ...t,
      member_name: t.member_id ? membersMap[t.member_id] : null,
      meeting_number: t.meeting_id ? meetingsMap[t.meeting_id] : null,
    }))

    setTasks(enriched)
    setMeetings(meetingsData || [])
    setMembers(membersData || [])
    setGoals(goalsData || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('action_items').update({ status }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: status as any } : t))
  }

  async function deleteTask(id: string) {
    await supabase.from('action_items').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function addTask() {
    if (!newTask.text.trim()) return
    const { data, error } = await supabase.from('action_items').insert({
      text: newTask.text.trim(),
      member_id: newTask.member_id || null,
      due_date: newTask.due_date || null,
      status: newTask.status,
    }).select().single()

    if (!error && data) {
      const membersMap: Record<string, string> = {}
      members.forEach(m => { membersMap[m.id] = m.name })
      setTasks(prev => [{ ...data, member_name: data.member_id ? membersMap[data.member_id] : null }, ...prev])
      setNewTask({ text: '', member_id: '', due_date: '', status: 'todo' })
      setShowAddForm(false)
    }
  }

  async function runAnalysis() {
    setAnalyzing(true)
    setAnalysis(null)
    try {
      const res = await fetch('/api/tasks-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, meetings, goals }),
      })
      const data = await res.json()
      setAnalysis(data.analysis || data.error || 'Нет ответа')
    } catch {
      setAnalysis('Ошибка при анализе. Попробуй ещё раз.')
    }
    setAnalyzing(false)
  }

  const todo = tasks.filter(t => t.status === 'todo')
  const inProgress = tasks.filter(t => t.status === 'in_progress')
  const done = tasks.filter(t => t.status === 'done')
  const overdue = todo.filter(t => t.due_date && new Date(t.due_date) < new Date())
  const completionRate = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0

  return (
    <div className="p-4 md:p-8 animate-fade-in max-w-[1100px]">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Задачи</h1>
          <p className="text-[13px] text-muted mt-1">
            {tasks.length} задач · {done.length} выполнено · {completionRate}%
            {overdue.length > 0 && <span className="text-c-red"> · {overdue.length} просрочено</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="px-3 py-1.5 md:px-4 md:py-2 bg-surface2 border border-border2 hover:border-accent/50 text-white text-[12px] md:text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>{analyzing ? '⏳' : '✦'}</span>
            <span className="hidden sm:inline">{analyzing ? 'Анализирую...' : 'ИИ Анализ'}</span>
          </button>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="px-3 py-1.5 md:px-4 md:py-2 bg-accent hover:bg-accent2 text-white text-[12px] md:text-[13px] font-semibold rounded-lg transition-colors"
          >
            + Задача
          </button>
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="mb-6 bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-muted">Общий прогресс</span>
            <span className="text-[12px] font-semibold text-c-green">{completionRate}%</span>
          </div>
          <div className="h-2 bg-surface2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-c-green rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="flex gap-4 mt-3">
            {[
              { label: 'К выполн.', count: todo.length, color: 'text-c-orange' },
              { label: 'В процессе', count: inProgress.length, color: 'text-c-blue' },
              { label: 'Выполнено', count: done.length, color: 'text-c-green' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className={`text-[13px] font-bold ${s.color}`}>{s.count}</span>
                <span className="text-[11px] text-muted">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(analysis || analyzing) && (
        <div className="mb-6 bg-surface border border-accent/20 rounded-xl p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent2 text-lg">✦</span>
            <span className="text-[13px] font-semibold text-accent2">ИИ Анализ задач</span>
            <button onClick={() => setAnalysis(null)} className="ml-auto text-muted hover:text-white text-[13px] transition-colors">✕</button>
          </div>
          {analyzing ? (
            <div className="text-[13px] text-muted animate-pulse">Анализирую задачи и встречи...</div>
          ) : (
            <div className="text-[13px] text-[#d0d0d8] leading-relaxed whitespace-pre-wrap">{analysis}</div>
          )}
        </div>
      )}

      {showAddForm && (
        <div className="mb-6 bg-surface border border-border2 rounded-xl p-5 animate-fade-in">
          <div className="text-[13px] font-semibold mb-4 text-white">Новая задача</div>
          <div className="flex flex-col gap-3">
            <input
              className="bg-surface2 border border-border2 rounded-lg px-3 py-2 text-[13px] text-white placeholder-muted outline-none focus:border-accent transition-colors"
              placeholder="Название задачи..."
              value={newTask.text}
              onChange={e => setNewTask({ ...newTask, text: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && addTask()}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                className="bg-surface2 border border-border2 rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-accent transition-colors"
                value={newTask.member_id}
                onChange={e => setNewTask({ ...newTask, member_id: e.target.value })}
              >
                <option value="">Без ответственного</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input
                type="date"
                className="bg-surface2 border border-border2 rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-accent transition-colors"
                value={newTask.due_date}
                onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
              />
              <select
                className="bg-surface2 border border-border2 rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-accent transition-colors"
                value={newTask.status}
                onChange={e => setNewTask({ ...newTask, status: e.target.value })}
              >
                <option value="todo">К выполнению</option>
                <option value="in_progress">В процессе</option>
                <option value="done">Выполнено</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end mt-1">
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-[13px] text-muted hover:text-white transition-colors">Отмена</button>
              <button onClick={addTask} className="px-4 py-2 bg-accent hover:bg-accent2 text-white text-[13px] font-semibold rounded-lg transition-colors">Добавить</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-muted text-[13px] py-8 text-center">Загрузка задач...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">◈</div>
          <div className="text-[14px] text-muted">Задач пока нет</div>
          <button onClick={() => setShowAddForm(true)} className="mt-4 px-4 py-2 bg-accent hover:bg-accent2 text-white text-[13px] font-semibold rounded-lg transition-colors">
            + Добавить первую задачу
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['todo', 'in_progress', 'done'] as const).map(status => {
            const cols = { todo, in_progress: inProgress, done }
            const colTasks = cols[status]
            return (
              <div key={status} className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className={`px-4 py-3 border-b border-border flex items-center gap-2`}>
                  <span className={`text-[12px] font-bold uppercase tracking-widest ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
                  <span className="ml-auto bg-surface2 text-muted text-[11px] font-mono px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <div className="p-2 flex flex-col gap-2 min-h-[100px]">
                  {colTasks.length === 0 ? (
                    <div className="text-[12px] text-muted px-2 py-4 text-center">—</div>
                  ) : (
                    colTasks.map(task => (
                      <TaskCard key={task.id} task={task} onStatusChange={updateStatus} onDelete={deleteTask} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TaskCard({
  task,
  onStatusChange,
  onDelete,
}: {
  task: Task
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isOverdue = task.status !== 'done' && task.due_date && new Date(task.due_date) < new Date()

  return (
    <div className="bg-surface2 border border-border rounded-lg p-3 group relative">
      <div className="text-[13px] text-white font-medium leading-snug mb-2 pr-5">{task.text}</div>
      <div className="flex flex-wrap gap-1.5">
        {task.member_name && (
          <span className="text-[10px] bg-accent/10 text-accent2 border border-accent/20 rounded px-1.5 py-0.5">{task.member_name}</span>
        )}
        {task.meeting_number && (
          <span className="text-[10px] bg-surface text-muted border border-border rounded px-1.5 py-0.5">Встреча #{task.meeting_number}</span>
        )}
        {task.due_date && (
          <span className={`text-[10px] rounded px-1.5 py-0.5 border ${isOverdue ? 'bg-c-red/10 text-c-red border-c-red/20' : 'bg-surface text-muted border-border'}`}>
            {isOverdue ? '⚠ ' : ''}{new Date(task.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
      <button onClick={() => setMenuOpen(v => !v)} className="absolute top-2.5 right-2.5 text-muted hover:text-white text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">···</button>
      {menuOpen && (
        <div className="absolute right-2 top-8 z-20 bg-surface2 border border-border2 rounded-lg py-1 shadow-xl min-w-[150px]" onMouseLeave={() => setMenuOpen(false)}>
          {task.status !== 'todo' && <button onClick={() => { onStatusChange(task.id, 'todo'); setMenuOpen(false) }} className="w-full text-left px-3 py-1.5 text-[12px] text-c-orange hover:bg-surface transition-colors">К выполнению</button>}
          {task.status !== 'in_progress' && <button onClick={() => { onStatusChange(task.id, 'in_progress'); setMenuOpen(false) }} className="w-full text-left px-3 py-1.5 text-[12px] text-c-blue hover:bg-surface transition-colors">В процессе</button>}
          {task.status !== 'done' && <button onClick={() => { onStatusChange(task.id, 'done'); setMenuOpen(false) }} className="w-full text-left px-3 py-1.5 text-[12px] text-c-green hover:bg-surface transition-colors">✓ Выполнено</button>}
          <div className="border-t border-border my-1" />
          <button onClick={() => { onDelete(task.id); setMenuOpen(false) }} className="w-full text-left px-3 py-1.5 text-[12px] text-c-red hover:bg-surface transition-colors">Удалить</button>
        </div>
      )}
    </div>
  )
}

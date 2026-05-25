'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Meeting = { id: string; meeting_number: number; date: string; status: string; ai_summary: string | null }
type Attendee = { id: string; meeting_id: string; member_id: string; attended: boolean; members?: { name: string } }
type Member = { id: string; name: string }

const STATUS: Record<string, { label: string; color: string }> = {
  completed: { label: 'Проведена', color: 'text-c-green bg-c-green/10' },
  planned:   { label: 'Запланирована', color: 'text-accent2 bg-accent/10' },
  active:    { label: 'Идёт сейчас', color: 'text-c-orange bg-c-orange/10' },
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState<Record<string, string>>({})
  const [savingNotes, setSavingNotes] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ИИ анализ
  const [showAI, setShowAI] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<Record<string, string>>({})
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeFileUpload, setActiveFileUpload] = useState<string | null>(null)

  async function load() {
    const [{ data: m }, { data: a }, { data: mb }] = await Promise.all([
      supabase.from('meetings').select('*').order('date', { ascending: false }),
      supabase.from('meeting_attendees').select('*, members(name)'),
      supabase.from('members').select('id, name').eq('is_active', true),
    ])
    setMeetings(m || [])
    setAttendees(a || [])
    setMembers(mb || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createMeeting() {
    if (!newDate) return
    setSaving(true)
    const maxNum = meetings.reduce((mx, m) => Math.max(mx, m.meeting_number || 0), 0)
    const { data: meet, error } = await supabase.from('meetings').insert({
      date: newDate, meeting_number: maxNum + 1, status: 'planned',
    }).select().single()
    if (!error && meet) {
      await supabase.from('meeting_attendees').insert(
        members.map(mb => ({ meeting_id: meet.id, member_id: mb.id, attended: false }))
      )
      setShowCreate(false)
      setNewDate('')
      load()
    }
    setSaving(false)
  }

  async function toggleAttendance(meetingId: string, memberId: string, attended: boolean) {
    const existing = attendees.find(a => a.meeting_id === meetingId && a.member_id === memberId)
    if (existing) {
      await supabase.from('meeting_attendees').update({ attended }).eq('id', existing.id)
    } else {
      await supabase.from('meeting_attendees').insert({ meeting_id: meetingId, member_id: memberId, attended })
    }
    load()
  }

  async function changeStatus(meetingId: string, status: string) {
    await supabase.from('meetings').update({ status }).eq('id', meetingId)
    load()
  }

  async function saveNotes(meetingId: string) {
    setSavingNotes(meetingId)
    await supabase.from('meetings').update({ ai_summary: editNotes[meetingId] }).eq('id', meetingId)
    setSavingNotes(null)
    load()
  }

  async function deleteMeeting(meetingId: string) {
    setDeleting(true)
    await supabase.from('meeting_attendees').delete().eq('meeting_id', meetingId)
    await supabase.from('meetings').delete().eq('id', meetingId)
    setConfirmDelete(null)
    setExpanded(null)
    setDeleting(false)
    load()
  }

  // Загрузка аудио и транскрибация через Groq Whisper
  async function handleAudioUpload(meetingId: string, file: File) {
    setTranscribing(meetingId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.transcript) {
        setTranscript(t => ({ ...t, [meetingId]: data.transcript }))
        if (!showAI) setShowAI(meetingId)
      } else {
        alert('Ошибка транскрибации: ' + (data.error || 'неизвестная ошибка'))
      }
    } catch(e) {
      alert('Ошибка подключения к сервису транскрибации')
    }
    setTranscribing(null)
  }

  // ИИ анализ через Claude
  async function analyzeWithAI(meetingId: string, meeting: Meeting) {
    const text = transcript[meetingId]
    if (!text || text.trim().length < 50) return
    setAnalyzing(meetingId)
    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          meetingNumber: meeting.meeting_number,
          date: new Date(meeting.date).toLocaleDateString('ru-RU'),
          members: members.map(m => m.name),
        }),
      })
      const data = await res.json()
      if (data.analysis) {
        setAiResult(r => ({ ...r, [meetingId]: data.analysis }))
        await supabase.from('meetings').update({ ai_summary: data.analysis }).eq('id', meetingId)
        setEditNotes(n => ({ ...n, [meetingId]: data.analysis }))
        load()
      } else {
        alert('Ошибка ИИ: ' + (data.error || 'неизвестная ошибка'))
      }
    } catch(e) {
      alert('Ошибка подключения к ИИ')
    }
    setAnalyzing(null)
    setShowAI(null)
  }

  if (loading) return <div className="p-8 text-muted text-[14px]">Загрузка...</div>

  return (
    <div className="p-8 animate-fade-in max-w-[900px]">
      {/* Скрытый input для файлов */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="audio/*,video/*,.mp3,.mp4,.wav,.m4a,.ogg,.webm"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file && activeFileUpload) handleAudioUpload(activeFileUpload, file)
          e.target.value = ''
        }}
      />

      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Встречи</h1>
          <p className="text-[13px] text-muted mt-1">Еженедельно · {meetings.length} встреч</p>
        </div>
        <button onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent2 text-[13px] font-bold rounded-xl transition-colors">
          + Новая встреча
        </button>
      </div>

      {showCreate && (
        <div className="bg-surface border border-accent/30 rounded-2xl p-5 mb-5">
          <div className="text-[14px] font-bold mb-4">📅 Новая встреча</div>
          <div className="flex items-center gap-3">
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="bg-surface2 border border-border rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-accent" />
            <button onClick={createMeeting} disabled={!newDate || saving}
              className="px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent2 text-[13px] font-bold rounded-xl disabled:opacity-40">
              {saving ? 'Создаю...' : 'Создать'}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-muted text-[13px]">Отмена</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {meetings.map(m => {
          const ma = attendees.filter(a => a.meeting_id === m.id)
          const present = ma.filter(a => a.attended).length
          const st = STATUS[m.status] || { label: m.status, color: 'text-muted' }
          const isExpanded = expanded === m.id

          return (
            <div key={m.id} className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="flex items-start justify-between p-5 cursor-pointer"
                onClick={() => {
                  setExpanded(isExpanded ? null : m.id)
                  setConfirmDelete(null)
                  if (!editNotes[m.id]) setEditNotes(n => ({ ...n, [m.id]: m.ai_summary || '' }))
                }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] text-muted font-mono">#{m.meeting_number}</span>
                    <span className={`text-[11px] rounded-full px-2 py-0.5 font-bold ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="text-[16px] font-bold">
                    {new Date(m.date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {ma.length > 0 && (
                    <div className="text-right">
                      <div className="text-[11px] text-muted font-mono uppercase">Явка</div>
                      <div className={`text-xl font-extrabold ${present === members.length ? 'text-c-green' : 'text-c-orange'}`}>{present}/{members.length}</div>
                    </div>
                  )}
                  <span className="text-muted text-[18px]">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border p-5 flex flex-col gap-5">

                  {/* Статус */}
                  <div>
                    <div className="text-[11px] text-muted font-mono uppercase tracking-wider mb-2">Статус</div>
                    <div className="flex gap-2">
                      {Object.entries(STATUS).map(([key, val]) => (
                        <button key={key} onClick={() => changeStatus(m.id, key)}
                          className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors ${m.status === key ? val.color + ' ring-1 ring-current' : 'bg-surface2 text-muted hover:text-foreground'}`}>
                          {val.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Явка */}
                  <div>
                    <div className="text-[11px] text-muted font-mono uppercase tracking-wider mb-2">Явка</div>
                    <div className="flex flex-wrap gap-2">
                      {members.map(mb => {
                        const att = ma.find(a => a.member_id === mb.id)
                        const isPresent = att?.attended ?? false
                        return (
                          <button key={mb.id} onClick={() => toggleAttendance(m.id, mb.id, !isPresent)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold border transition-colors ${isPresent ? 'text-c-green bg-c-green/10 border-c-green/30' : 'text-muted bg-surface2 border-border'}`}>
                            <span>{isPresent ? '✓' : '○'}</span>{mb.name.split(' ')[0]}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* ИИ Анализ */}
                  <div>
                    <div className="text-[11px] text-muted font-mono uppercase tracking-wider mb-2">🤖 ИИ Анализ встречи</div>

                    {/* Кнопки загрузки */}
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {/* Загрузка аудио */}
                      <button
                        onClick={() => { setActiveFileUpload(m.id); fileInputRef.current?.click() }}
                        disabled={transcribing === m.id}
                        className="flex items-center gap-2 px-3 py-2 bg-surface2 hover:bg-surface border border-border text-[12px] font-semibold rounded-xl transition-colors disabled:opacity-40"
                      >
                        {transcribing === m.id ? (
                          <><span className="animate-spin inline-block">⟳</span> Транскрибирую...</>
                        ) : (
                          <>🎙 Загрузить аудио</>
                        )}
                      </button>

                      {/* Вставить текст */}
                      <button
                        onClick={() => setShowAI(showAI === m.id ? null : m.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-surface2 hover:bg-surface border border-border text-[12px] font-semibold rounded-xl transition-colors"
                      >
                        {showAI === m.id ? '✕ Скрыть' : '📝 Вставить текст'}
                      </button>
                    </div>

                    {/* Статус транскрибации */}
                    {transcribing === m.id && (
                      <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-[12px] text-accent2 mb-3">
                        ⟳ Groq Whisper транскрибирует аудио... (~30 сек)
                      </div>
                    )}

                    {/* Текст транскрипта */}
                    {transcript[m.id] && !showAI && (
                      <div className="bg-surface2 border border-c-green/20 rounded-xl px-4 py-2 text-[11px] text-c-green font-semibold mb-3">
                        ✓ Транскрипт готов — {transcript[m.id].length} символов
                      </div>
                    )}

                    {/* Поле ввода текста */}
                    {showAI === m.id && (
                      <div className="bg-surface2 border border-accent/20 rounded-xl p-4 mb-3">
                        <div className="text-[12px] text-muted mb-2">Транскрипт или текст записи встречи:</div>
                        <textarea
                          value={transcript[m.id] || ''}
                          onChange={e => setTranscript(t => ({ ...t, [m.id]: e.target.value }))}
                          placeholder="Вставь сюда текст записи встречи или транскрипт..."
                          rows={6}
                          className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-[12px] leading-relaxed focus:outline-none focus:border-accent resize-none"
                        />
                      </div>
                    )}

                    {/* Кнопка анализа */}
                    {(transcript[m.id] || showAI === m.id) && (
                      <button
                        onClick={() => analyzeWithAI(m.id, m)}
                        disabled={analyzing === m.id || !transcript[m.id] || transcript[m.id].trim().length < 50}
                        className="flex items-center gap-2 px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent2 text-[12px] font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-3"
                      >
                        {analyzing === m.id ? (
                          <><span className="animate-spin inline-block">⟳</span> Claude анализирует...</>
                        ) : (
                          <>🤖 Анализировать с Claude</>
                        )}
                      </button>
                    )}

                    {/* Результат */}
                    {(aiResult[m.id] || m.ai_summary) && (
                      <div className="bg-surface2 border border-border rounded-xl p-4 text-[12px] leading-relaxed whitespace-pre-wrap">
                        {aiResult[m.id] || m.ai_summary}
                      </div>
                    )}
                  </div>

                  {/* Заметки */}
                  <div>
                    <div className="text-[11px] text-muted font-mono uppercase tracking-wider mb-2">Заметки / Итоги</div>
                    <textarea
                      value={editNotes[m.id] ?? m.ai_summary ?? ''}
                      onChange={e => setEditNotes(n => ({ ...n, [m.id]: e.target.value }))}
                      placeholder="Что обсудили, договорились, решили..."
                      rows={3}
                      className="w-full bg-surface2 border border-border rounded-xl px-3 py-2.5 text-[13px] leading-relaxed focus:outline-none focus:border-accent resize-none"
                    />
                    <button onClick={() => saveNotes(m.id)} disabled={savingNotes === m.id}
                      className="mt-2 px-4 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent2 text-[12px] font-bold rounded-lg disabled:opacity-40">
                      {savingNotes === m.id ? 'Сохраняю...' : '💾 Сохранить'}
                    </button>
                  </div>

                  {/* Удаление */}
                  <div className="border-t border-border pt-4">
                    {confirmDelete !== m.id ? (
                      <button onClick={() => setConfirmDelete(m.id)}
                        className="flex items-center gap-2 px-3 py-1.5 text-c-red/70 hover:text-c-red hover:bg-c-red/10 text-[12px] font-semibold rounded-lg transition-colors">
                        🗑 Удалить встречу
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-c-red font-semibold">Точно удалить?</span>
                        <button onClick={() => deleteMeeting(m.id)} disabled={deleting}
                          className="px-3 py-1.5 bg-c-red/15 hover:bg-c-red/25 text-c-red text-[12px] font-bold rounded-lg disabled:opacity-40">
                          {deleting ? 'Удаляю...' : 'Да, удалить'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="text-muted text-[12px]">Отмена</button>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
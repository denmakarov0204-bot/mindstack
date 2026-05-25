'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'

const nav = [
  { href: '/dashboard', label: 'Главная', icon: '⚡' },
  { href: '/members',   label: 'Участники', icon: '👥' },
  { href: '/reports',   label: 'Отчёты', icon: '📋' },
  { href: '/meetings',  label: 'Встречи', icon: '🗓' },
  { href: '/fines',     label: 'Штрафы', icon: '💸' },
  { href: '/analytics', label: 'Аналитика', icon: '📈' },
]

const STORAGE_KEY = 'mindstack_app_name'

export default function Sidebar() {
  const path = usePathname()
  const [name, setName] = useState('MindStack')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('MindStack')
  const inputRef = useRef<HTMLInputElement>(null)

  // Загружаем сохранённое название
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) { setName(saved); setDraft(saved) }
  }, [])

  function startEdit() {
    setDraft(name)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 10)
  }

  function saveName() {
    const trimmed = draft.trim() || 'MindStack'
    setName(trimmed)
    localStorage.setItem(STORAGE_KEY, trimmed)
    setEditing(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') saveName()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] min-h-screen bg-surface border-r border-border flex-shrink-0 py-6 px-3">
        <div className="px-3 mb-8 group">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={handleKey}
              autoFocus
              className="text-[15px] font-extrabold tracking-tight text-accent2 bg-transparent border-b border-accent2 outline-none w-full"
            />
          ) : (
            <div
              className="text-[15px] font-extrabold tracking-tight text-accent2 cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-1.5"
              onClick={startEdit}
              title="Нажми чтобы переименовать"
            >
              {name}
              <span className="opacity-0 group-hover:opacity-40 text-[10px] transition-opacity">✏️</span>
            </div>
          )}
          <div className="text-[11px] text-muted mt-0.5">Mastermind OS</div>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map(item => (
            <Link key={item.href} href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors',
                path === item.href
                  ? 'bg-accent/15 text-accent2 font-semibold'
                  : 'text-muted hover:text-foreground hover:bg-surface2'
              )}>
              <span className="text-[16px]">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border flex items-center justify-around px-2 py-2">
        {nav.map(item => (
          <Link key={item.href} href={item.href}
            className={clsx(
              'flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-[48px]',
              path === item.href ? 'text-accent2' : 'text-muted'
            )}>
            <span className="text-[20px] leading-none">{item.icon}</span>
            <span className={clsx('text-[9px] font-medium', path === item.href ? 'text-accent2' : 'text-muted')}>
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
    </>
  )
}
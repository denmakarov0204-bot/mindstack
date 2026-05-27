'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { supabase } from '@/lib/supabase'

const nav = [
  { label: 'Dashboard', href: '/dashboard', icon: '◈' },
  { label: 'Участники', href: '/members', icon: '◎' },
  { label: 'Отчёты', href: '/reports', icon: '◇', dot: true },
]

const navMeetings = [
  { label: 'Встречи', href: '/meetings', icon: '▷' },
  { label: 'Задачи', href: '/tasks', icon: '◈' },
]

const navFinance = [
  { label: 'Штрафы', href: '/fines', icon: '◆', dot: true },
]

const navAI = [
  { label: 'Аналитика', href: '/analytics', icon: '✦' },
]

const mobileNav = [
  { label: 'Dashboard', href: '/dashboard', icon: '◈' },
  { label: 'Отчёты', href: '/reports', icon: '◇', dot: true },
  { label: 'Встречи', href: '/meetings', icon: '▷' },
  { label: 'Штрафы', href: '/fines', icon: '◆', dot: true },
  { label: 'Аналитика', href: '/analytics', icon: '✦' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [nextMeeting, setNextMeeting] = useState<{ date: string; daysLeft: number } | null>(null)

  useEffect(() => {
    supabase
      .from('meetings')
      .select('date')
      .eq('status', 'planned')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const [y, m, d] = data[0].date.split('-').map(Number)
          const meetingDate = new Date(y, m - 1, d)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const daysLeft = Math.round((meetingDate.getTime() - today.getTime()) / 86400000)
          setNextMeeting({ date: data[0].date, daysLeft })
        }
      })
  }, [])

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="font-sidebar hidden md:flex w-[220px] flex-shrink-0 bg-surface border-r border-border flex-col sticky top-0 h-screen">
        {/* Logo */}
        <div className="px-5 pb-6 pt-6 border-b border-border mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
              style={{ background: 'linear-gradient(135deg, #7c6aff, #a78bfa)' }}>
              ⚡
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-tight">MindStack</div>
              <div className="text-[10px] text-muted font-mono tracking-widest">MASTERMIND OS</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 flex-1 overflow-y-auto">
          {nav.map(item => (
            <NavItem key={item.href} item={item} active={pathname === item.href} />
          ))}

          <div className="text-[10px] font-mono text-muted tracking-widest px-3 pt-3 pb-1.5 uppercase">Встречи</div>
          {navMeetings.map(item => (
            <NavItem key={item.href} item={item} active={pathname === item.href} />
          ))}

          <div className="text-[10px] font-mono text-muted tracking-widest px-3 pt-3 pb-1.5 uppercase">Финансы</div>
          {navFinance.map(item => (
            <NavItem key={item.href} item={item} active={pathname === item.href} />
          ))}

          <div className="text-[10px] font-mono text-muted tracking-widest px-3 pt-3 pb-1.5 uppercase">AI</div>
          {navAI.map(item => (
            <NavItem key={item.href} item={item} active={pathname === item.href} />
          ))}
        </nav>

        {/* Next meeting badge */}
        {nextMeeting && (
          <div className="px-3 pb-5 pt-4 border-t border-border">
            <div className="bg-surface2 border border-border2 rounded-lg p-3">
              <div className="text-[10px] text-muted font-mono tracking-widest uppercase">Следующая встреча</div>
              <div className="text-[13px] font-semibold mt-0.5">
                {(() => {
                  const [y, m, d] = nextMeeting.date.split('-').map(Number)
                  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
                })()}
              </div>
              <div className="text-[11px] text-c-green mt-0.5">
                {nextMeeting.daysLeft === 0 ? '⚡ сегодня' : nextMeeting.daysLeft === 1 ? '⚡ завтра' : `⏱ через ${nextMeeting.daysLeft} дн.`}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="font-sidebar md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {mobileNav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative transition-colors',
              pathname === item.href ? 'text-accent2' : 'text-muted'
            )}
          >
            <span className="text-[18px] leading-none">{item.icon}</span>
            <span className="text-[9px] tracking-wide">{item.label}</span>
            {item.dot && (
              <span className="absolute top-2 right-[calc(50%-10px)] w-1.5 h-1.5 rounded-full bg-c-red animate-pulse-dot" />
            )}
          </Link>
        ))}
      </nav>
    </>
  )
}

function NavItem({ item, active }: { item: any; active: boolean }) {
  return (
    <Link href={item.href}
      className={clsx(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium mb-0.5 transition-all',
        active ? 'bg-accent/15 text-accent2' : 'text-muted hover:bg-surface2 hover:text-white'
      )}>
      <span className="w-5 text-center text-[15px]">{item.icon}</span>
      {item.label}
      {item.dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-c-red ml-auto animate-pulse-dot" />
      )}
    </Link>
  )
}

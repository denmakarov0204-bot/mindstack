'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const nav = [
  { href: '/dashboard', label: 'Главная', icon: '⚡' },
  { href: '/members',   label: 'Участники', icon: '👥' },
  { href: '/reports',   label: 'Отчёты', icon: '📋' },
  { href: '/meetings',  label: 'Встречи', icon: '🗓' },
  { href: '/fines',     label: 'Штрафы', icon: '💸' },
  { href: '/analytics', label: 'Аналитика', icon: '📈' },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] min-h-screen bg-surface border-r border-border flex-shrink-0 py-6 px-3">
        <div className="px-3 mb-8">
          <div className="text-[15px] font-extrabold tracking-tight text-accent2">MindStack</div>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border flex items-center justify-around px-2 py-2 safe-area-pb">
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

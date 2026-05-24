'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const nav = [
  { label: 'Dashboard', href: '/dashboard', icon: 'â' },
  { label: 'Ð£ÑÐ°ÑÑÐ½Ð¸ÐºÐ¸', href: '/members', icon: 'â' },
  { label: 'ÐÑÑÑÑÑ', href: '/reports', icon: 'â', dot: true },
]

const navMeetings = [
  { label: 'ÐÑÑÑÐµÑÐ¸', href: '/meetings', icon: 'â·' },
  ]

const navFinance = [
  { label: 'Ð¨ÑÑÐ°ÑÑ', href: '/fines', icon: 'â', dot: true },
  ]

const navAI = [
  { label: 'ÐÐ½Ð°Ð»Ð¸ÑÐ¸ÐºÐ°', href: '/analytics', icon: 'â¦' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-[220px] flex-shrink-0 bg-surface border-r border-border flex flex-col sticky top-0 h-screen">
      <div className="px-5 pb-6 pt-6 border-b border-border mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{background:'linear-gradient(135deg,#7c6aff,#a78bfa)'}}>â¡</div>
          <div><div className="text-[15px] font-bold tracking-tight">MindStack</div><div className="text-[10px] text-muted font-mono tracking-widest">MASTERMIND OS</div></div>
        </div>
      </div>
      <nav className="px-3 flex-1 overflow-y-auto">
        {nav.map(item=>(<NavItem key={item.href} item={item} active={pathname===item.href}/>))}
        <div className="text-[10px] font-mono text-muted tracking-widest px-3 pt-3 pb-1.5 uppercase">ÐÑÑÑÐµÑÐ¸</div>
        {navMeetings.map(item=>(<NavItem key={item.href} item={item} active={pathname===item.href}/>))}
        <div className="text-[10px] font-mono text-muted tracking-widest px-3 pt-3 pb-1.5 uppercase">Ð¤Ð¸Ð½Ð°Ð½ÑÑ</div>
        {navFinance.map(item=>(<NavItem key={item.href} item={item} active={pathname===item.href}/>))}
        <div className="text-[10px] font-mono text-muted tracking-widest px-3 pt-3 pb-1.5 uppercase">AI</div>
        {navAI.map(item=>( <NavItem key={item.href} item={item} active={pathname===item.href}/>))}
      </nav>
      <div className="px-3 pb-5 pt-4 border-t border-border">
        <div className="bg-surface2 border border-border2 rounded-lg p-3">
          <div className="text-[10px] text-muted font-mono tracking-widest uppercase">Ð¡Ð»ÐµÐ´ÑÑÑÐ°Ñ Ð²ÑÑÑÐµÑÐ°</div>
          <div className="text-[13px] font-semibold mt-0.5">Ð¡Ð±, 31 Ð¼Ð°Ñ</div>
          <div className="text-[11px] text-c-green mt-0.5">â± ÑÐµÑÐµÐ· Ð¸Ð´Ð½ÐµÐ¹</div>
        </div>
      </div>
    </aside>
  )
}
function NavItem({item,active}:{item:any;active:boolean}){return(<Link href={item.href} className={clsx('flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium mb-0.5 transition-all',active?'bg-accent/15 text-accent2':'text-muted hover:bg-surface2 hover:text-white')}><span className="w-5 text-center text-[15px]">{item.icon}</span>{item.label}{item.dot&&(<span className="w-1.5 h-1.5 rounded-full bg-c-red ml-auto animate-pulse-dot"/>)}</Link>)}

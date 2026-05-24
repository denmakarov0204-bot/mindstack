import { supabase } from '@/lib/supabase'
export const revalidate = 60
async function getData() {
  const [{ data: meetings }, { data: attendees }] = await Promise.all([
    supabase.from('meetings').select('*').order('date', { ascending: false }),
    supabase.from('meeting_attendees').select('*, members(name)'),
  ])
  return { meetings: meetings||[], attendees: attendees||[] }
}
const STATUS: Record<string,{label:string;color:string}> = {
  completed:{label:'Проведена',color:'text-c-green bg-c-green/10'},
  planned:{label:'Запланирована',color:'text-accent2 bg-accent/10'},
  active:{label:'Идёт сейчас',color:'text-c-orange bg-c-orange/10'},
}
export default async function MeetingsPage() {
  const { meetings, attendees } = await getData()
  return (
    <div className="p-8 animate-fade-in max-w-[900px]">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold tracking-tight">Встречи</h1>
        <p className="text-[13px] text-muted mt-1">Еженедельно по субботам · 11:00</p>
      </div>
      <div className="flex flex-col gap-4">
        {meetings.map((m: any) => {
          const ma = attendees.filter((a: any) => a.meeting_id === m.id)
          const present = ma.filter((a: any) => a.attended).length
          const st = STATUS[m.status] || {label:m.status,color:'text-muted'}
          return (
            <div key={m.id} className="bg-surface border border-border rounded-2xl p-5 hover:border-border2 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] text-muted font-mono">#{m.meeting_number}</span>
                    <span className={`text-[11px] rounded-full px-2 py-0.5 font-bold ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="text-[16px] font-bold">{new Date(m.date).toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
                </div>
                {m.status==='completed'&&<div className="text-right"><div className="text-[11px] text-muted font-mono uppercase">Явка</div><div className="text-xl font-extrabold text-c-green">{present}/5</div></div>}
              </div>
              {m.ai_summary&&<div className="bg-surface2 rounded-xl p-3 border-l-2 border-accent mb-3"><div className="text-[11px] text-accent2 font-bold uppercase mb-1">⚡ AI Summary</div><div className="text-[12px] leading-relaxed opacity-85">{m.ai_summary}</div></div>}
              {ma.length>0&&<div className="flex flex-wrap gap-2 mt-2">{ma.map((a: any)=>(<span key={a.id} className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${a.attended?'text-c-green bg-c-green/10 border-c-green/20':'text-c-red bg-c-red/10 border-c-red/20'}`}>{a.attended?'✓':'✗'} {a.members?.name?.split(' ')[0]}</span>))}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
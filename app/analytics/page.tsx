import { supabase } from '@/lib/supabase'
export const revalidate = 60
async function getData() {
  const ago30 = new Date(Date.now()-30*24*60*60*1000).toISOString().split('T')[0]
  const [{data:scores},{data:reports},{data:balances},{data:meetings}] = await Promise.all([
    supabase.from('discipline_scores').select('*').order('score',{ascending:false}),
    supabase.from('daily_reports').select('date,status,member_id,members(name)').gte('date',ago30),
    supabase.from('member_fine_balance').select('*').order('debt',{ascending:false}),
    supabase.from('meetings').select('*').order('date',{ascending:false}).limit(10),
  ])
  return { scores:scores||[], reports:reports||[], balances:balances||[], meetings:meetings||[] }
}
export default async function AnalyticsPage() {
  const { scores, reports, balances, meetings } = await getData()
  const totalFines = balances.reduce((s:number,m:any)=>s+m.total_charged,0)
  const totalDebt = balances.reduce((s:number,m:any)=>s+m.debt,0)
  const avgScore = scores.length?Math.round(scores.reduce((s:any,m:any)=>s+m.score,0)/scores.length):0
  const completed = meetings.filter((m:any)=>m.status==='completed').length
  const subR = reports.filter((r:any)=>r.status==='submitted').length
  const rate = reports.length?Math.round((subR/reports.length)*100):0
  const top = scores[0], bottom = scores[scores.length-1]
  return (
    <div className="p-8 animate-fade-in max-w-[1100px]">
      <div className="mb-7"><h1 className="text-2xl font-extrabold tracking-tight">Аналитика</h1><p className="text-[13px] text-muted mt-1">За последние 30 дней</p></div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          {label:'Средний балл',value:`${avgScore}`,color:'text-accent2',sub:'дисциплина'},
          {label:'Заполняемость',value:`${rate}%`,color:rate>=80?'text-c-green':'text-c-red',sub:`${subR}/${reports.length} отчётов`},
          {label:'Касса штрафов',value:`${totalFines.toLocaleString('ru')}₽`,color:'text-c-orange',sub:`долг ${totalDebt.toLocaleString('ru')}₽`},
          {label:'Встреч проведено',value:String(completed),color:'text-c-blue',sub:`из ${meetings.length} всего`},
        ].map(k=>(
          <div key={k.label} className="bg-surface border border-border rounded-xl p-5">
            <div className="text-[11px] text-muted font-mono uppercase tracking-wider">{k.label}</div>
            <div className={`text-3xl font-extrabold tracking-tighter mt-1.5 ${k.color}`}>{k.value}</div>
            <div className="text-[11px] text-muted mt-1">{k.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[14px] font-bold mb-4">🏆 Рейтинг дисциплины</div>
          {scores.map((s:any,i:number)=>(
            <div key={s.member_id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
              <div className={`text-[13px] font-mono w-5 text-center font-bold ${i===0?'text-c-orange':'text-muted'}`}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</div>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold" style={{background:'rgba(124,106,255,0.15)',color:'#a78bfa'}}>{s.name.charAt(0)}</div>
              <div className="text-[13px] font-semibold flex-1">{s.name.split(' ')[0]}</div>
              <div className="flex-1 mx-2 h-1.5 bg-surface2 rounded-full overflow-hidden"><div style={{width:`${s.score}%`,background:s.score>=80?'linear-gradient(90deg,#7c6aff,#a78bfa)':'linear-gradient(90deg,#ff5566,#ff8866)'}}/></div>
              <div className={`text-[14px] font-bold font-mono min-w-[40px] text-right ${s.score>=80?'text-c-green':'text-c-red'}`}>{s.score}</div>
            </div>
          ))}
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[14px] font-bold mb-4">💸 Штрафы</div>
          {balances.map((m:any)=>(
            <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold" style={{background:'rgba(124,106,255,0.15)',color:'#a78bfa'}}>{m.name.charAt(0)}</div>
              <div className="flex-1"><div className="text-[13px] font-semibold">{m.name.split(' ')[0]}</div><div className="text-[11px] text-muted">начислено {m.total_charged}₽ · оплачено {m.total_paid}₽</div></div>
              <div className={`text-[14px] font-bold font-mono ${m.debt===0?'text-muted':m.debt>500?'text-c-red':'text-c-orange'}`}>{m.debt===0?'✓ 0₽':`${m.debt}₽`}</div>
            </div>
          ))}
        </div>
      </div>
      {(top||bottom)&&(
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[14px] font-bold mb-3">⚡ Выводы</div>
          <div className="grid grid-cols-3 gap-3">
            {top&&<div className="bg-surface2 rounded-xl p-3 border-l-2 border-c-green"><div className="text-[11px] text-c-green font-bold uppercase mb-1">Лидер</div><div className="text-[13px]">{top.name} — {top.score} баллов.</div></div>}
            {bottom&&bottom.score<80&&<div className="bg-surface2 rounded-xl p-3 border-l-2 border-c-red"><div className="text-[11px] text-c-red font-bold uppercase mb-1">Зона риска</div><div className="text-[13px]">{bottom.name.split(' ')[0]} — {bottom.score}.</div></div>}
            <div className="bg-surface2 rounded-xl p-3 border-l-2 border-accent"><div className="text-[11px] text-accent2 font-bold uppercase mb-1">Заполняемость</div><div className="text-[13px]">{rate>=80?`В норме — ${rate}%.`:`Ниже нормы — ${rate}%.`}</div></div>
          </div>
        </div>
      )}
    </div>
  )
}
import {BCATS,LIMIT,STRETCH} from './config.js';
import {ic} from './icons.js';
import {renderWave} from './insights.js';
import {currentCycle,cycleAlerts,cycleSpent} from './cycle.js';
import {renderAll} from './main.js';
import {$,budgets,dm,entries,esc,fmt,inM,iso,mkey,sb,setBudgets,sum} from './state.js';

// ---------- budgets & alerts ----------
export function bstat(b,extra=0){
  const spent=sum(inM(mkey(0),['expense','saving']).filter(e=>e.category===b.category))+extra;
  const pct=Math.round(spent/b.monthly_limit*100),left=b.monthly_limit-spent;
  return {spent,pct,left,st:spent>b.monthly_limit?'over':pct>=80?'warn':'ok'};
}
export function alertsHTML(){
  const a=budgets.map(b=>({b,...bstat(b)})).filter(x=>x.st!=='ok').sort((x,y)=>y.pct-x.pct);
  return a.map(x=>`<div class="alert ${x.st}"><span>${ic('alert')}</span><span>${esc(x.b.category)}: ${x.st==='over'?`over budget by ${fmt(-x.left)}`:`${x.pct}% used · ${fmt(x.left)} left`}</span></div>`)+cycleAlerts();
}
export function renderBudgets(){
  $('budList').innerHTML=budgets.length?budgets.map(b=>{const s=bstat(b);
    return `<div class="bud"><div class="t"><span>${esc(b.category)}</span><span><b>${fmt(s.spent)}</b> <span style="color:var(--mu)">/ ${fmt(b.monthly_limit)}</span> <button class="del" data-bd="${b.id}">✕</button></span></div>
    <div class="track"><div class="fill ${s.st}" style="width:${Math.min(100,s.pct)}%"></div></div>
    <div class="r"><span>${s.pct}% used</span><span style="color:${s.st==='over'?'var(--exp)':s.st==='warn'?'var(--warn)':'var(--inc)'}">${s.left>=0?fmt(s.left)+' left':fmt(-s.left)+' over'}</span></div></div>`}).join('')
    :'<div class="empty">No budgets yet. Tap “+ Set budget” to add one per category.</div>';
  $('alertsHome').innerHTML=$('alertsBud').innerHTML=alertsHTML();$('bell').classList.toggle('dot',!!alertsHTML());
}
export const capSp=m=>sum(inM(m,['expense']).filter(e=>e.category!=='Zerodha Investment'));
export function renderBanner(){
  const c=currentCycle(),lim=c?c.budget:LIMIT;   // with a cycle: its budget. Without: old monthly limit.
  $('mTitle').textContent=c?'Cycle from '+dm(c.start_date):new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'});
  $('mOf').textContent='of '+fmt(lim);
  const sp=c?cycleSpent(c):capSp(mkey(0)),left=lim-sp,pct=lim>0?Math.max(0,Math.round(left/lim*100)):0,n=new Date(),dl=new Date(n.getFullYear(),n.getMonth()+1,0).getDate()-n.getDate()+1;
  $('mBig').textContent=fmt(sp);
  const y=new Date(n);y.setDate(y.getDate()-1);const dS=k=>sum(entries.filter(e=>e.date===k&&e.type==='expense')),a=dS(iso(n)),d=a-dS(iso(y));
  $('mDelta').innerHTML=`<span class="${d>0?'up':'dn2'}">${d>0?'▲':'▼'}</span> ${fmt(Math.abs(d))} ${d>0?'more':'less'} than yesterday · today ${fmt(a)}`;
  $('mPct').textContent=sp>lim?'Over':pct+'%';
  $('mBar').style.width=Math.min(100,pct)+'%';$('mBar').className='fill'+(sp>lim?' over':pct<=20?' warn':'');
  $('mSpent').textContent=sp>lim?(c?'Over budget by '+fmt(sp-lim):sp<=STRETCH?'Emergency stretch · '+fmt(STRETCH-sp)+' left':'Over stretch by '+fmt(sp-STRETCH)):fmt(left)+' left of '+fmt(lim);
  $('mBud').textContent=sp<lim?'Safe to spend about '+fmt(left/dl)+' a day for '+dl+' days':c?'Budget crossed. The extra is cut from your next budget.':'Limit crossed. Try not to spend more this month.';
  renderWave();
}
$('bCat').innerHTML=BCATS.map(c=>`<option>${c}</option>`).join('');
export function hint(){const c=$('bCat').value,a=sum(inM(mkey(1),['expense','saving']).filter(e=>e.category===c)),b=sum(inM(mkey(0),['expense','saving']).filter(e=>e.category===c));$('bHint').textContent=`Last month ${fmt(a)} · this month so far ${fmt(b)}`}
$('bCat').onchange=hint;
$('togBud').onclick=()=>{$('budForm').classList.toggle('hidden');hint()};
$('bSave').onclick=async()=>{
  const category=$('bCat').value,monthly_limit=parseFloat($('bLim').value);
  if(!monthly_limit||monthly_limit<=0)return;
  const ex=budgets.find(b=>b.category===category);
  if(ex){const {error}=await sb.from('budgets').update({monthly_limit}).eq('id',ex.id);if(!error)ex.monthly_limit=monthly_limit}
  else{const nb={id:'b'+Date.now(),category,monthly_limit};const {error}=await sb.from('budgets').insert(nb);if(!error)budgets.push(nb)}
  $('bLim').value='';$('budForm').classList.add('hidden');renderAll();
};
$('budList').onclick=async e=>{const b=e.target.closest('[data-bd]');if(!b)return;
  const {error}=await sb.from('budgets').delete().eq('id',b.dataset.bd);if(!error){setBudgets(budgets.filter(x=>x.id!==b.dataset.bd));renderAll()}};

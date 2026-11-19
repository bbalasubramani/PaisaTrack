import {renderBanner,renderBudgets} from './budget.js';
import {CI,CK} from './config.js';
import {cfg,loadBudgets,loadCycles,loadEntries} from './db.js';
import {ic} from './icons.js';
import {renderInsights} from './insights.js';
import {$,entries,esc,fmt,iso,periodF,sb,setEntries,setPeriodF,setSb,setTypeF,sum,toGetBack,typeF} from './state.js';
import {renderCycle} from './cycle.js';
import './sheet.js';
import './voice.js';

// ---------- theme ----------
export function applyTheme(t){document.documentElement.dataset.theme=t;localStorage.setItem('paisatrack_theme',t);
  $('themeMeta').content=t==='dark'?'#0c0d07':'#f4f1e3';}
$('themeBtn').onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
applyTheme(document.documentElement.dataset.theme);
export function initApp(){
  const c=cfg();
  if(!c||!c.url||!c.key){$('setup').classList.remove('hidden');$('app').classList.add('hidden');return}
  $('setup').classList.add('hidden');$('app').classList.remove('hidden');
  setSb(window.supabase.createClient(c.url,c.key));
  Promise.all([loadEntries(),loadBudgets(),loadCycles()]).then(()=>renderAll());
}
export async function saveCfg(){
  const url=$('supaUrl').value.trim(),key=$('supaKey').value.trim(),s=$('setupStatus');
  if(!url||!key){s.textContent='Fill both fields.';return}
  s.textContent='Connecting…';
  try{const {error}=await window.supabase.createClient(url,key).from('entries').select('id').limit(1);if(error)throw error;
    localStorage.setItem(CK,JSON.stringify({url,key}));setTimeout(initApp,300)}
  catch(e){s.textContent='Could not connect — check URL, key and tables. ('+(e.message||'error')+')'}
}
$('connectBtn').onclick=saveCfg;
$('disc').onclick=()=>{if(confirm('Disconnect? Your data stays safe in Supabase.')){localStorage.removeItem(CK);initApp()}};
// ---------- home ----------
export function rangeStart(p){const n=new Date(),s=new Date(n);s.setHours(0,0,0,0);
  if(p==='weekly')s.setDate(n.getDate()-(n.getDay()===0?6:n.getDay()-1));else if(p==='monthly')s.setDate(1);else if(p!=='daily')return null;return s}
export function renderHome(){
  const rs=rangeStart(periodF),pe=rs?entries.filter(e=>new Date(e.date+'T00:00:00')>=rs):entries;
  const t=ty=>sum(pe.filter(e=>e.type===ty)),inc=t('income'),exp=t('expense'),sv=t('saving'),lent=t('lent'),ret=t('returned');
  $('tInc').textContent=fmt(inc);$('tOut').textContent=fmt(exp);$('tSav').textContent=fmt(sv);$('tBal').textContent=fmt(inc-exp-sv-lent+ret);
  $('lentTile').classList.toggle('hidden',!entries.some(e=>e.type==='lent'));$('tLent').textContent=fmt(toGetBack());
  const l=typeF==='all'?pe:typeF==='lent'?pe.filter(e=>e.type==='lent'||e.type==='returned'):pe.filter(e=>e.type===typeF),g={};
  l.forEach(e=>(g[e.date]=g[e.date]||[]).push(e));
  const row=e=>`<div class="entry"><div style="display:flex;align-items:center;gap:12px"><span class="eb">${ic(CI[e.category]||'other')}</span><div><div class="c">${esc(e.type==='lent'?'Lent':e.type==='returned'?'Returned':e.category)}</div>${e.note?`<div class="n">${esc(e.note)}</div>`:''}</div></div>
    <div style="display:flex;align-items:center;gap:6px"><div class="a" style="color:${{income:'var(--inc)',returned:'var(--inc)',saving:'var(--ac)',lent:'var(--warn)'}[e.type]||'var(--exp)'}">${e.type==='income'||e.type==='returned'?'+':'-'}${fmt(e.amount)}</div><button class="del" data-del="${e.id}">✕</button></div></div>`;
  $('list').innerHTML=l.length?Object.keys(g).sort().reverse().map(d=>{const sp=sum(g[d].filter(e=>e.type==='expense'));
    return `<div class="dayh"><span>${new Date(d+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</span><span>${sp?fmt(sp)+' spent':''}</span></div>`+g[d].map(row).join('')}).join('')
    :'<div class="empty">No entries in this period. Tap + to add one.</div>';
}
$('list').onclick=async e=>{const b=e.target.closest('[data-del]');if(!b)return;
  const {error}=await sb.from('entries').delete().eq('id',b.dataset.del);if(!error){setEntries(entries.filter(x=>x.id!==b.dataset.del));renderAll()}};
$('filters').onclick=e=>{const b=e.target.closest('button');if(!b)return;[...$('filters').children].forEach(x=>x.classList.remove('on'));b.classList.add('on');setTypeF(b.dataset.f);renderHome()};
$('period').onclick=e=>{const b=e.target.closest('button');if(!b)return;[...$('period').children].forEach(x=>x.classList.remove('on'));b.classList.add('on');setPeriodF(b.dataset.p);renderHome()};
// ---------- navigation ----------
document.querySelectorAll('nav .tb').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav .tb').forEach(x=>x.classList.toggle('on',x===b));
  ['home','ins','bud','set'].forEach(t=>$('t-'+t).classList.toggle('hidden',t!==b.dataset.t));window.scrollTo(0,0)});
export function renderAll(){renderHome();renderCycle();renderBudgets();renderBanner();renderInsights()}
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
$('bell').onclick=()=>document.querySelector('nav [data-t=bud]').click();
$('exportBtn').onclick=()=>{const q=v=>'"'+String(v).replace(/"/g,'""')+'"',r=entries.map(e=>[e.id,e.type,e.amount,e.category,e.date,e.note||''].map(q).join(','));
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([['id,type,amount,category,date,note',...r].join('\n')],{type:'text/csv'}));a.download='paisatrack-'+iso(new Date())+'.csv';a.click()};
initApp();

import {renderBanner,renderBudgets} from './budget.js';
import {CATS,CI,CK} from './config.js';
import {cfg,loadBudgets,loadCycles,loadEntries} from './db.js';
import {ic} from './icons.js';
import {renderInsights} from './insights.js';
import {$,borrowersList,catF,entries,esc,fmt,iso,periodF,sb,searchQ,setCatF,setEntries,setPeriodF,setSb,setSearchQ,setTypeF,sum,toGetBack,typeF} from './state.js';
import {currentCycle,expectedBalance,renderCycle} from './cycle.js';
import {openSheet} from './sheet.js';
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
export function rangeStart(p){
  const n=new Date(),s=new Date(n);s.setHours(0,0,0,0);
  const c=currentCycle();
  // When a salary cycle is active and monthly view is selected, count from cycle start date
  if(p==='monthly'&&c)return new Date(c.start_date+'T00:00:00');
  if(p==='weekly')s.setDate(n.getDate()-(n.getDay()===0?6:n.getDay()-1));
  else if(p==='monthly')s.setDate(1);
  else if(p!=='daily')return null;
  return s;
}

export function renderHome(){
  const rs=rangeStart(periodF),pe=rs?entries.filter(e=>new Date(e.date+'T00:00:00')>=rs):entries;
  const t=ty=>sum(pe.filter(e=>e.type===ty)),inc=t('income'),exp=t('expense'),sv=t('saving'),lent=t('lent'),ret=t('returned');
  $('tInc').textContent=fmt(inc);
  $('tOut').textContent=fmt(exp);
  $('tSav').textContent=fmt(sv);

  // If viewing monthly/cycle and a cycle exists, display Spend Bank Balance (expectedBalance)
  const c=currentCycle();
  if(c&&periodF==='monthly'){
    $('tBal').textContent=fmt(expectedBalance(c));
    $('lblBal').textContent='Spend Bal';
    $('balSub').textContent='In bank Spend';
  }else{
    $('tBal').textContent=fmt(inc-exp-sv-lent+ret);
    $('lblBal').textContent='Balance';
    $('balSub').textContent='Cash flow surplus';
  }

  // Lent tile and Borrowers Ledger Hub
  const hasLent=entries.some(e=>e.type==='lent');
  $('lentTile').classList.toggle('hidden',!hasLent);
  $('tLent').textContent=fmt(toGetBack());
  const bList=borrowersList().filter(b=>b.net>0);
  $('borrowersLedger').innerHTML=bList.length?bList.map(b=>`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:6px;border-top:1px solid rgba(0,0,0,.07)">
      <span><b>${esc(b.name)}</b>: ${fmt(b.net)}</span>
      <button class="pill" data-ret-name="${esc(b.name)}" data-ret-amt="${b.net}" style="padding:4px 10px;font-size:11px">Record Return</button>
    </div>
  `).join(''):'';

  // 1-Tap Quick Action pills
  const quickItems=[
    {amt:12,cat:'Food',note:'Tea'},
    {amt:15,cat:'Food',note:'Tea'},
    {amt:60,cat:'Food',note:'Food'},
    {amt:111,cat:'Transport',note:'Office commute'}
  ];
  $('quickPills').innerHTML=quickItems.map(q=>`
    <button type="button" class="qpill" data-qa="${q.amt}" data-qc="${esc(q.cat)}" data-qn="${esc(q.note)}">+ ${fmt(q.amt)} ${esc(q.note)}</button>
  `).join('');

  // Category filter chips
  $('catFilters').innerHTML=['all',...CATS].map(cat=>`
    <button data-cat="${esc(cat)}" class="${catF===cat?'on':''}">${esc(cat==='all'?'All Cats':cat)}</button>
  `).join('');

  // Filtering entries by Type, Category, and Search query
  let l=typeF==='all'?pe:typeF==='lent'?pe.filter(e=>e.type==='lent'||e.type==='returned'):pe.filter(e=>e.type===typeF);
  if(catF&&catF!=='all')l=l.filter(e=>e.category===catF);
  if(searchQ){
    const q=searchQ.toLowerCase();
    l=l.filter(e=>(e.note&&e.note.toLowerCase().includes(q))||(e.category&&e.category.toLowerCase().includes(q))||String(e.amount).includes(q));
  }

  const g={};
  l.forEach(e=>(g[e.date]=g[e.date]||[]).push(e));
  const row=e=>`<div class="entry"><div style="display:flex;align-items:center;gap:12px"><span class="eb">${ic(CI[e.category]||'other')}</span><div><div class="c">${esc(e.type==='lent'?'Lent':e.type==='returned'?'Returned':e.category)}</div>${e.note?`<div class="n">${esc(e.note)}</div>`:''}</div></div>
    <div style="display:flex;align-items:center;gap:6px"><div class="a" style="color:${{income:'var(--inc)',returned:'var(--inc)',saving:'var(--ac)',lent:'var(--warn)'}[e.type]||'var(--exp)'}">${e.type==='income'||e.type==='returned'?'+':'-'}${fmt(e.amount)}</div><button class="del" data-del="${e.id}">✕</button></div></div>`;
  $('list').innerHTML=l.length?Object.keys(g).sort().reverse().map(d=>{const sp=sum(g[d].filter(e=>e.type==='expense'));
    return `<div class="dayh"><span>${new Date(d+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</span><span>${sp?fmt(sp)+' spent':''}</span></div>`+g[d].map(row).join('')}).join('')
    :'<div class="empty">No matching entries found. Tap + to add one.</div>';
}

// 1-Tap Quick Log action
export async function quickLog(amount,category,note){
  const ne={id:Date.now().toString(),type:'expense',amount,category,date:iso(new Date()),note};
  const {error}=await sb.from('entries').insert(ne);
  if(error)return toast('Could not log: '+error.message);
  entries.unshift(ne);renderAll();toast(`Added ${fmt(amount)} ${note || category} ✓`);
}

$('quickPills').onclick=e=>{
  const b=e.target.closest('[data-qa]');if(!b)return;
  quickLog(parseFloat(b.dataset.qa),b.dataset.qc,b.dataset.qn);
};

// Clipboard / UPI detection
export async function checkClipboard(){
  try{
    if(!navigator.clipboard||!navigator.clipboard.readText)return toast('Clipboard access not supported');
    const text=await navigator.clipboard.readText();
    if(!text)return toast('Clipboard is empty');
    const m=text.match(/(?:debited|spent|paid|sent|vpa|txn)\s*(?:by|inr|rs\.?)?\s*([\d,]+(?:\.\d+)?)\s*(?:to|at|for)?\s*([a-zA-Z0-9\s]+)?/i) || text.match(/(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d+)?)/i);
    if(m){
      const amount=parseFloat(m[1].replace(/,/g,''));
      const merchant=(m[2]||'').trim().slice(0,25);
      if(amount>0){
        openSheet({amount,note:merchant,type:'expense',status:`Detected from UPI SMS: ${fmt(amount)}`});
        toast(`📋 Found UPI SMS: ${fmt(amount)}`);
        return;
      }
    }
    toast('No UPI payment amount found in clipboard');
  }catch(_){toast('Allow clipboard permission to auto-detect UPI')}
}
$('clipBtn').onclick=checkClipboard;

// Borrowers Ledger click handler (1-Tap Record Return)
$('borrowersLedger').onclick=e=>{
  const b=e.target.closest('[data-ret-name]');if(!b)return;
  openSheet({
    type:'returned',
    amount:parseFloat(b.dataset.retAmt)||'',
    note:`${b.dataset.retName} returned`,
    category:'Other',
    status:`Record return from ${b.dataset.retName}`
  });
};

// Search & Category Filters
$('searchIn').oninput=e=>{setSearchQ(e.target.value.trim());renderHome()};
$('catFilters').onclick=e=>{
  const b=e.target.closest('[data-cat]');if(!b)return;
  setCatF(b.dataset.cat);renderHome();
};

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

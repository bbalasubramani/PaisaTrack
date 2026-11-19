import {bstat} from './budget.js';
import {CATS,CI,SIP_CAT} from './config.js';
import {ic} from './icons.js';
import {currentCycle,openCycle} from './cycle.js';
import {renderAll} from './main.js';
import {$,budgets,entries,esc,fmt,iso,sb,selCat,selType,setSelCat,setSelType,setSug,isLoan,sug,toast} from './state.js';
import {listening,rec} from './voice.js';

$('dt').value=iso(new Date());
// ---------- add sheet: voice + quick add + manual ----------
export let hist={};
export function buildHist(){
  const c={};entries.filter(e=>e.note).forEach(e=>{const k=e.note.trim().toLowerCase();(c[k]=c[k]||{})[e.category]=(c[k][e.category]||0)+1});
  hist={};Object.entries(c).forEach(([k,v])=>hist[k]=Object.entries(v).sort((a,b)=>b[1]-a[1])[0][0]);
}
export function drawQuick(){
  const q={};entries.filter(e=>e.note&&e.type!=='income').forEach(e=>{const k=e.note.trim().toLowerCase()+'|'+e.category;(q[k]=q[k]||{n:0,e}).n++});
  const top=Object.values(q).sort((a,b)=>b.n-a.n).slice(0,6);
  $('quick').innerHTML=top.length?top.map(x=>`<button type="button" data-q="${x.e.id}">${esc(x.e.note)} ${fmt(x.e.amount)}</button>`).join(''):'<span class="sm">Your most used entries show here.</span>';
}
$('quick').onclick=e=>{const b=e.target.closest('[data-q]');if(!b)return;const x=entries.find(y=>y.id===b.dataset.q);if(!x)return;
  setType(x.type);$('amt').value=x.amount;$('note').value=x.note;setSelCat(x.category);drawCats()};
export function drawCats(){$('cats').innerHTML=CATS.map(c=>`<button type="button" class="cat ${c===selCat?'on':''} ${c===sug&&!selCat?'sug':''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');$('save').disabled=!selCat;drawRadial()}
export function topCats(){const c={};entries.forEach(e=>{if(e.type!=='income')c[e.category]=(c[e.category]||0)+1});const t=Object.entries(c).sort((a,b)=>b[1]-a[1]).map(x=>x[0]).slice(0,4);['Food','Transport','PG / Rent','Recharge'].forEach(x=>{if(t.length<4&&!t.includes(x))t.push(x)});return t}
export function drawRadial(){
  const t=topCats();if(selCat&&!t.includes(selCat))t[3]=selCat;const L=[...t,'More'],R=124,r=54,c=130,n=5,g=.04;let p='',b='';
  const P=(q,a)=>(c+q*Math.cos(a)).toFixed(1)+','+(c+q*Math.sin(a)).toFixed(1);
  L.forEach((k,i)=>{const a0=-Math.PI/2+i*2*Math.PI/n+g,a1=-Math.PI/2+(i+1)*2*Math.PI/n-g,am=(a0+a1)/2,m=(r+R)/2;
    p+=`<path class="w ${k===selCat?'on':''}" data-w="${esc(k)}" d="M${P(r,a0)}L${P(R,a0)}A${R},${R} 0 0 1 ${P(R,a1)}L${P(r,a1)}A${r},${r} 0 0 0 ${P(r,a0)}Z"/>`;
    b+=`<div class="wl ${k===selCat?'on':''}" style="left:${(c+m*Math.cos(am))/2.6}%;top:${(c+m*Math.sin(am))/2.6}%">${ic(k==='More'?'more':CI[k]||'other')}<span>${esc(k.replace('Zerodha Investment','Zerodha').replace('Emergency Fund','Emergency'))}</span></div>`});
  $('radial').innerHTML=`<svg viewBox="0 0 260 260">${p}</svg>${b}<div class="hub">${ic(selCat?CI[selCat]||'other':'plus')}</div>`;
}
$('radial').onclick=e=>{const w=e.target.closest('[data-w]');if(!w)return;if(w.dataset.w==='More')$('cats').classList.toggle('hidden');else{setSelCat(w.dataset.w);drawCats()}};
export function setType(t){setSelType(t);[...$('typeSeg').children].forEach(b=>b.classList.toggle('on',b.dataset.ty===t))}
export function openSheet(){buildHist();drawQuick();setSelCat(null);setSug(null);setType('expense');$('amt').value='';$('note').value='';$('dt').value=iso(new Date());
  $('st').textContent='Say: “tea 20 rupees” or “got salary 29000”';$('cats').classList.add('hidden');drawCats();$('ov').classList.remove('hidden')}
export const closeSheet=()=>{$('ov').classList.add('hidden');if(rec&&listening)rec.stop()};
$('fab').onclick=openSheet;$('close').onclick=closeSheet;$('ov').onclick=e=>{if(e.target===$('ov'))closeSheet()};
$('typeSeg').onclick=e=>{const b=e.target.closest('button');if(b)setType(b.dataset.ty)};
$('cats').onclick=e=>{const b=e.target.closest('[data-c]');if(b){setSelCat(b.dataset.c);drawCats()}};
$('note').oninput=()=>{const s=hist[$('note').value.trim().toLowerCase()];if(s&&!selCat){setSug(s);drawCats()}};
$('save').onclick=async()=>{
  const amount=parseFloat($('amt').value);const cat=selCat||(isLoan(selType)?'Other':null);
  if(!amount||amount<=0||!cat)return toast('Enter an amount and pick a category');
  const ne={id:Date.now().toString(),type:cat===SIP_CAT?'saving':selType,amount,category:cat,date:$('dt').value,note:$('note').value.trim()};
  const b=budgets.find(x=>x.category===ne.category),before=b?bstat(b).st:'ok';
  const {error}=await sb.from('entries').insert(ne);
  if(error)return toast('Could not save: '+error.message);
  entries.unshift(ne);closeSheet();renderAll();
  if(ne.type==='income'&&ne.category==='Salary'&&(!currentCycle()||ne.date>currentCycle().start_date))openCycle({date:ne.date,salary:ne.amount});
  if(b&&ne.type!=='income'&&!isLoan(ne.type)){const s=bstat(b);
    if(s.st==='over')toast(`🚨 ${b.category} is over budget by ${fmt(-s.left)}`,5000);
    else if(s.st==='warn'&&before==='ok')toast(`⚠️ ${b.category} is at ${s.pct}% · ${fmt(s.left)} left`,5000);
    else toast('Entry added')}else toast('Entry added');
};

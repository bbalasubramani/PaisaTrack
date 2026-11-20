import {LENT_FROM_SPEND,SIP_CAT,SIP_DAY} from './config.js';
import {ic} from './icons.js';
import {renderAll} from './main.js';
import {$,cycles,dm,entries,fmt,iso,sb,setCycles,sum,toast} from './state.js';

// ---------- salary cycles ----------
const num=id=>parseFloat($(id).value)||0;

// newest cycle first (db.js loads them sorted)
export const currentCycle=()=>cycles[0]||null;
// spent = expenses from the cycle start. Not lent, not SIP. 'end' (optional) = stop before this date.
export const cycleSpent=(c,end)=>sum(entries.filter(e=>e.type==='expense'&&e.category!==SIP_CAT&&e.date>=c.start_date&&(!end||e.date<end)));

// SIP paid = saving entries in the SIP category from the cycle start ('end' = stop before this date)
export const sipPaid=(c,end)=>sum(entries.filter(e=>e.type==='saving'&&e.category===SIP_CAT&&e.date>=c.start_date&&(!end||e.date<end)));
// SIP is due on the first SIP_DAY (5th) on or after the cycle start
export function sipDue(c){const s=new Date(c.start_date+'T00:00:00');let d=new Date(s.getFullYear(),s.getMonth(),SIP_DAY);if(d<s)d=new Date(s.getFullYear(),s.getMonth()+1,SIP_DAY);return iso(d)}

// What Spend should hold now: keep - spent - SIP paid (all from the cycle start).
// If LENT_FROM_SPEND is true, also - lent + returned.
export function expectedBalance(c){
  const inC=t=>sum(entries.filter(e=>e.type===t&&e.date>=c.start_date));
  return c.keep_amount-cycleSpent(c)-sipPaid(c)+(LENT_FROM_SPEND?inC('returned')-inC('lent'):0);
}

// ---------- the card on the Budgets tab ----------
export function renderCycle(){
  const c=currentCycle();
  $('balHome').classList.toggle('hidden',!c);
  if(!c){$('cycCard').innerHTML='<div class="empty">No salary cycle yet. Tap “+ New cycle” and use your last salary day.</div>';return}
  const sp=cycleSpent(c),left=c.budget-sp,p=cycles[1],paid=sipPaid(c),sm='font-size:12px;color:var(--mu);margin-top:6px';
  let h=`<div class="tile" style="margin-bottom:14px"><div class="lbl">Cycle from ${dm(c.start_date)}</div>
    <div class="mid">${fmt(sp)} <span style="font-size:13px;color:var(--mu)">of ${fmt(c.budget)} budget</span></div>
    <div style="${sm}">${left>=0?fmt(left)+' left':fmt(-left)+' over'} · SIP ${fmt(c.sip)} · Keep in Spend ${fmt(c.keep_amount)}</div>`;
  h+=`<div style="${sm}">SIP: ${paid>=c.sip?'paid '+fmt(paid)+' ✓':paid>0?'paid '+fmt(paid)+' of '+fmt(c.sip):'due '+dm(sipDue(c))+', not logged yet'}</div>`;
  if(c.base_budget!==c.budget)h+=`<div style="${sm}">Budget was cut from ${fmt(c.base_budget)} because of overspend last cycle.</div>`;
  if(!c.moved&&c.start_spend_balance!=null){const net=c.keep_amount-c.start_spend_balance;
    h+=`<div class="alert warn" style="margin-top:12px"><span>${ic('alert')}</span><span>Leftover ${fmt(c.start_spend_balance)} back to Vault. Move ${fmt(c.keep_amount)} to Spend. ${net>=0?'(Take '+fmt(net)+' from Vault.)':'(Put '+fmt(-net)+' back in Vault.)'}</span></div><button class="go" id="cycMoved">I moved it</button>`}
  if(p&&p.closed)h+=`<div style="${sm}">Last cycle: spent ${fmt(cycleSpent(p,c.start_date))} of ${fmt(p.budget)}${p.overspend>0?' · overspent '+fmt(p.overspend):''}${p.missing>0?' · not logged '+fmt(p.missing):p.missing<0?' · '+fmt(-p.missing)+' more than expected':''}</div>`;
  $('cycCard').innerHTML=h+'<button class="go" id="balOpen" style="margin-top:12px">Check Spend balance</button><button class="pill" id="cycDel" style="margin-top:12px;color:var(--exp)">Delete this cycle</button></div>';
}
$('cycCard').onclick=async e=>{
  if(e.target.closest('#balOpen'))return openBal();
  if(e.target.closest('#cycDel'))return delCycle();
  if(!e.target.closest('#cycMoved'))return;const c=currentCycle();
  const {error}=await sb.from('cycles').update({moved:true}).eq('id',c.id);
  if(error)return toast('Could not save: '+error.message);
  setCycles(cycles.map(x=>x.id===c.id?{...x,moved:true}:x));renderAll();
};

// ---------- delete the current cycle (to enter it again) ----------
async function delCycle(){
  const c=currentCycle(),p=cycles[1];
  if(!confirm('Delete the cycle from '+dm(c.start_date)+'?'+(p&&p.closed?' The last cycle will open again.':'')+' Your entries are not deleted.'))return;
  const r=await sb.from('cycles').delete().eq('id',c.id);
  if(r.error)return toast('Could not delete: '+r.error.message,5000);
  let list=cycles.slice(1);
  if(p&&p.closed){                       // the last cycle was closed by this one: open it again
    const patch={closed:false,end_spend_balance:null,expected_balance:null,missing:null,overspend:0};
    const u=await sb.from('cycles').update(patch).eq('id',p.id);
    if(u.error)toast('Deleted, but the last cycle did not open again: '+u.error.message,5000);
    else list=list.map(x=>x.id===p.id?{...x,...patch}:x);
  }
  setCycles(list);renderAll();toast('Cycle deleted. Tap + New cycle to enter it again.');
}

// ---------- balance check ----------
const money=v=>v<0?'-'+fmt(-v):fmt(v);
function balCalc(){
  const c=currentCycle(),exp=expectedBalance(c),has=$('balIn').value!=='',real=num('balIn'),diff=Math.round(exp-real);   // paise ignored
  let h=`Should be in Spend: <b>${money(exp)}</b><br><span style="color:var(--mu)">keep ${fmt(c.keep_amount)} − spent ${fmt(cycleSpent(c))} − SIP paid ${fmt(sipPaid(c))}`
    +`${LENT_FROM_SPEND?' − lent + returned':''}</span>`;
  if(has)h+=`<br>You have: <b>${fmt(real)}</b><br>`+(diff>0?`<b style="color:var(--warn)">${fmt(diff)} less than expected.</b> Some spending is not logged.`:diff<0?`<b style="color:var(--warn)">${fmt(-diff)} more than expected.</b> Maybe one entry is logged twice, or money came in.`:'<b>It matches.</b> Good.');
  $('balOut').innerHTML=h;
}
export function openBal(){
  if(!currentCycle())return toast('Start a salary cycle first');
  $('balIn').value='';balCalc();$('balOv').classList.remove('hidden');
}
$('balIn').oninput=balCalc;
$('balClose').onclick=()=>$('balOv').classList.add('hidden');
$('balHome').onclick=openBal;

// ---------- reminders (shown with the budget alerts) ----------
export function cycleAlerts(){
  const n=new Date(),out=[],c=currentCycle();
  const prevLast=iso(new Date(n.getFullYear(),n.getMonth(),0));   // last day of last month
  const sal=entries.filter(e=>e.type==='income'&&e.category==='Salary').map(e=>e.date).sort().pop();
  if(n.getDate()>=6&&!(sal&&sal>=prevLast))out.push('Salary is not logged for this month yet.');
  if(c&&c.sip>0&&sipPaid(c)<c.sip&&iso(n)>sipDue(c))out.push(`SIP ${fmt(c.sip-sipPaid(c))} is not logged yet (due ${dm(sipDue(c))}). Add it as ${SIP_CAT}.`);
  if(sal&&c&&sal>c.start_date)out.push(`Salary logged on ${dm(sal)}, but the new cycle is not started. Budgets tab, then “+ New cycle”.`);
  return out.map(t=>`<div class="alert warn"><span>${ic('alert')}</span><span>${t}</span></div>`).join('');
}

// ---------- start a new cycle (dialog) ----------
function calc(){
  const D=$('cyDate').value,old=currentCycle(),base=num('cyBase'),sip=num('cySip'),B=num('cyBal');
  const spent=old?cycleSpent(old,D):0,over=old?Math.max(0,spent-old.budget):0;
  const paid=old?sipPaid(old,D):0,exp=old?old.keep_amount-paid-spent:null,miss=old?exp-B:null;   // miss > 0 = spending not logged
  const nb=Math.max(0,base-over);
  return {D,old,base,sip,B,spent,paid,over,exp,miss,nb,keep:nb+sip};
}
function preview(){
  const k=calc(),hasB=$('cyBal').value!=='';let h='';
  if(k.old){
    h+=`Last cycle: spent ${fmt(k.spent)} of ${fmt(k.old.budget)}. SIP paid ${fmt(k.paid)} of ${fmt(k.old.sip)}.<br>`;
    if(k.over>0)h+=`Overspent ${fmt(k.over)}. It is cut from this cycle.<br>`;
    if(hasB)h+=`Spend should hold ${k.exp<0?'-'+fmt(-k.exp):fmt(k.exp)}. You said ${fmt(k.B)}. `+(k.miss>0?`${fmt(k.miss)} of spending is not logged.`:k.miss<0?`${fmt(-k.miss)} more than expected.`:'It matches.')+'<br>';
  }
  h+=`<b>Budget ${fmt(k.nb)}</b> · SIP ${fmt(k.sip)} · <b>Keep in Spend ${fmt(k.keep)}</b>`;
  if(k.old&&hasB)h+=`<br>Leftover ${fmt(k.B)} goes back to Vault. Move ${fmt(k.keep)} to Spend.`;
  $('cyPrev').innerHTML=h;
}
export function openCycle({date,salary}={}){
  const old=currentCycle();
  $('cyDate').value=date||iso(new Date());$('cySal').value=salary||'';$('cyBal').value='';
  $('cyBalBox').classList.toggle('hidden',!old);
  $('cyBase').value=old?old.base_budget:11500;$('cySip').value=old?old.sip:3000;
  $('cycOv').classList.remove('hidden');preview();
}
const closeCycle=()=>$('cycOv').classList.add('hidden');
['cyDate','cySal','cyBal','cyBase','cySip'].forEach(id=>{$(id).oninput=preview;$(id).onchange=preview});
$('cycNew').onclick=()=>openCycle();
$('cycClose').onclick=closeCycle;
$('cySave').onclick=async()=>{
  const k=calc();
  if(!k.D)return toast('Pick the salary date');
  if(k.base<=0)return toast('Enter the base budget');
  if(k.old&&$('cyBal').value==='')return toast('Enter your Spend balance now');
  if(k.old&&k.D<=k.old.start_date)return toast('Start date must be after the last cycle start');
  const row={id:Date.now().toString(),start_date:k.D,salary:num('cySal'),base_budget:k.base,budget:k.nb,sip:k.sip,keep_amount:k.keep,
    start_spend_balance:k.old?k.B:null,moved:!k.old,closed:false,end_spend_balance:null,expected_balance:null,missing:null,overspend:0};
  const {error}=await sb.from('cycles').insert(row);          // save the new one first
  if(error)return toast('Could not save cycle: '+error.message,5000);
  let list=[row,...cycles];
  if(k.old){                                                    // then close the old one
    const patch={closed:true,end_spend_balance:k.B,expected_balance:k.exp,missing:k.miss,overspend:k.over};
    const r=await sb.from('cycles').update(patch).eq('id',k.old.id);
    if(r.error)toast('New cycle saved, but the old one was not closed: '+r.error.message,5000);
    else list=list.map(c=>c.id===k.old.id?{...c,...patch}:c);
  }
  setCycles(list);closeCycle();renderAll();toast('Cycle started');
};

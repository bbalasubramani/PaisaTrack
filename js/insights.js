import {PAL,SIP_CAT} from './config.js';
import {currentCycle} from './cycle.js';
import {$,cycles,entries,esc,fmt,hmOff,inM,iso,mkey,setHmOff,sum} from './state.js';

export function smooth(p){let d=`M${p[0][0]},${p[0][1]}`;for(let i=1;i<p.length;i++){const m=(p[i-1][0]+p[i][0])/2;d+=` C${m},${p[i-1][1]} ${m},${p[i][1]} ${p[i][0]},${p[i][1]}`}return d}
export function dayV(off,n){const a=[];for(let i=n-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i-off);const k=iso(d);a.push(sum(entries.filter(e=>e.date===k&&e.type==='expense'&&e.category!=='PG / Rent'&&e.category!=='Zerodha Investment')))}return a}
export function renderWave(){
  const N=14,A=dayV(0,N),B=dayV(N,N),mx=Math.max(1,...A,...B),X=i=>15+i*(290/(N-1)),Y=v=>104-v/mx*76,pa=A.map((v,i)=>[X(i),Y(v)]),pb=B.map((v,i)=>[X(i),Y(v)]),pk=A.indexOf(Math.max(...A)),l=pa[N-1];
  const lb=[0,4,8,13].map(i=>{const d=new Date();d.setDate(d.getDate()-(N-1-i));return `<text x="${X(i)}" y="124" text-anchor="${i===0?'start':i===13?'end':'middle'}">${d.getDate()} ${d.toLocaleDateString('en-IN',{month:'short'})}</text>`}).join('');
  $('wave').innerHTML=`<g stroke="rgba(255,255,255,.22)" stroke-dasharray="3 4"><path d="M10 26H310M10 65H310M10 104H310"/></g><path d="${smooth(pb)}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.4"/><path d="${smooth(pa)}" fill="none" stroke="#fff" stroke-width="1.8"/>${A[pk]?`<circle cx="${pa[pk][0]}" cy="${pa[pk][1]}" r="3.5" fill="#fff"/><text class="pk" x="${pa[pk][0]}" y="${pa[pk][1]-9}" text-anchor="middle">${fmt(A[pk])}</text>`:''}<path d="M${l[0]} ${l[1]}V104" stroke="#e2e639" stroke-dasharray="3 3"/><circle cx="${l[0]}" cy="${l[1]}" r="9" fill="rgba(226,230,57,.25)"/><circle cx="${l[0]}" cy="${l[1]}" r="4.5" fill="#e2e639"/>${lb}`}
// ---------- insights ----------
export function renderInsights(){
  const m0=mkey(0),m1=mkey(1);
  const inc=sum(inM(m0,['income'])),ex=sum(inM(m0,['expense'])),ex1=sum(inM(m1,['expense']));
  if(inc>0){const r=Math.round((inc-ex)/inc*100);$('sRate').textContent=r+'%';$('sRate').style.color=r>=20?'var(--inc)':r>=0?'var(--warn)':'var(--exp)';$('sNote').textContent='kept '+fmt(inc-ex)+' of '+fmt(inc)}
  else{$('sRate').textContent='–';$('sRate').style.color='';$('sNote').textContent='add income to see this'}
  if(ex1>0){const d=Math.round((ex-ex1)/ex1*100);$('sDelta').textContent=(d>0?'+':'')+d+'%';$('sDelta').style.color=d>0?'var(--exp)':'var(--inc)';$('sDeltaN').textContent=fmt(ex)+' vs '+fmt(ex1)}
  else{$('sDelta').textContent='–';$('sDelta').style.color='';$('sDeltaN').textContent='no data last month'}
  renderNotes();renderChaiMeter();renderWealth();renderRange();renderHeat();renderDonut();renderTrend();renderCmp();
}

// ---------- Chai & Munchies Micro-Spends Meter ----------
export function renderChaiMeter(){
  const c=currentCycle();
  const pool=c?entries.filter(e=>e.date>=c.start_date):inM(mkey(0),['expense']);
  const small=pool.filter(e=>e.type==='expense'&&e.amount<=100);
  const tot=sum(small);
  const days=c?Math.max(1,Math.ceil((new Date()-new Date(c.start_date+'T00:00:00'))/(1000*60*60*24))):new Date().getDate();
  const avg=Math.round(tot/days);
  
  const counts={};
  small.forEach(e=>{
    const k=(e.note||e.category).toLowerCase().trim();
    counts[k]=(counts[k]||0)+1;
  });
  const topList=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k} (${v}x)`).join(', ');

  const el=$('chaiMeter');
  if(el){
    el.innerHTML=`
      <div class="mid" style="color:var(--warn)">${fmt(tot)} <span style="font-size:13px;color:var(--mu);font-weight:400">(${small.length} small spends · ~${fmt(avg)}/day)</span></div>
      <div class="sm" style="margin-top:6px">Top snacks: ${esc(topList||'None yet')}</div>
    `;
  }
}

// ---------- Vault & Cumulative Wealth Tracker ----------
export function renderWealth(){
  // Total SIP invested over all time
  const totalSip=sum(entries.filter(e=>e.type==='saving'));
  // Total surplus retained in Vault from cycles or income
  const totalSal=sum(entries.filter(e=>e.type==='income'&&e.category==='Salary'));
  const totalSpentAll=sum(entries.filter(e=>e.type==='expense'));
  const netVault=Math.max(0,totalSal-totalSpentAll-totalSip);

  const el=$('wealthTracker');
  if(el){
    el.innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
        <div style="padding:10px;background:var(--c2);border-radius:18px">
          <div class="lbl">Total SIP Invested</div>
          <div class="mid" style="color:var(--ac)">${fmt(totalSip)}</div>
          <div class="sm">Zerodha wealth assets</div>
        </div>
        <div style="padding:10px;background:var(--c2);border-radius:18px">
          <div class="lbl">Est. Vault Reserves</div>
          <div class="mid" style="color:var(--inc)">${fmt(netVault)}</div>
          <div class="sm">Unspent salary surplus</div>
        </div>
      </div>
      <div style="margin-top:10px;font-size:13px;font-weight:700">Total Tracked Net Worth: <span style="color:var(--ac)">${fmt(totalSip+netVault)}</span></div>
    `;
  }
}
export function renderRange(){
  const o={};inM(mkey(0),['expense']).filter(e=>e.category!=='PG / Rent'&&e.category!=='Zerodha Investment').forEach(e=>o[e.date]=(o[e.date]||0)+e.amount);
  const v=Object.values(o);if(!v.length){$('ruler').innerHTML='';['rLo','rAv','rHi'].forEach(i=>$(i).textContent='–');return}
  const lo=Math.min(...v),hi=Math.max(...v),av=v.reduce((a,b)=>a+b,0)/v.length,pa=hi>lo?Math.round((av-lo)/(hi-lo)*40):20;
  $('ruler').innerHTML=Array.from({length:41},(_,i)=>`<i class="${i===0||i===40?'k':i===pa?'a':''}"></i>`).join('');
  $('rLo').textContent=fmt(lo);$('rAv').textContent=fmt(av);$('rHi').textContent=fmt(hi);
}
export function renderHeat(){
  const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+hmOff);
  const y=d.getFullYear(),m=d.getMonth(),days=new Date(y,m+1,0).getDate(),off=(d.getDay()+6)%7,key=iso(d).slice(0,7);
  const by={},cnt={};inM(key,['expense']).forEach(e=>{by[+e.date.slice(8)]=(by[+e.date.slice(8)]||0)+e.amount;cnt[+e.date.slice(8)]=(cnt[+e.date.slice(8)]||0)+1});
  const mx=Math.max(1,...Object.values(by)),td=iso(new Date());
  $('hmTitle').textContent=d.toLocaleDateString('en-IN',{month:'long',year:'numeric'})+' · spent '+fmt(Object.values(by).reduce((a,b)=>a+b,0));
  let h='MTWTFSS'.split('').map(x=>`<i class="dn">${x}</i>`).join('')+'<i class="dn"></i>'.repeat(off);
  for(let i=1;i<=days;i++){const v=by[i]||0,p=v?Math.max(18,Math.round(v/mx*100)):0,ds=key+'-'+String(i).padStart(2,'0');
    h+=`<i class="${ds===td?'today':''}" data-d="${i}" data-v="${v}" data-c="${cnt[i]||0}" style="${v?`background:color-mix(in srgb,var(--exp) ${p}%,var(--c2));color:${p>55?'#fff':'var(--tx)'}`:''}">${i}</i>`}
  $('hm').innerHTML=h;$('hmInfo').textContent='Tap a day · darker = more spent';
}
$('hm').onclick=e=>{const c=e.target.closest('[data-d]');if(c)$('hmInfo').textContent=`Day ${c.dataset.d}: ${fmt(c.dataset.v)} · ${c.dataset.c} ${c.dataset.c==1?'entry':'entries'}`};
$('hmPrev').onclick=()=>{setHmOff(hmOff-1);renderHeat()};$('hmNext').onclick=()=>{if(hmOff<0){setHmOff(hmOff+1);renderHeat()}};
export function byCat(m){const o={};inM(m,['expense']).forEach(e=>o[e.category]=(o[e.category]||0)+e.amount);return o}
export function renderDonut(){
  const o=byCat(mkey(0)),a=Object.entries(o).sort((x,y)=>y[1]-x[1]),tot=a.reduce((s,x)=>s+x[1],0);
  if(!tot){$('donut').innerHTML='<circle cx="50" cy="50" r="38" fill="none" stroke="var(--c2)" stroke-width="14"/>';$('legend').innerHTML='<span style="color:var(--mu)">No spending yet this month</span>';return}
  const C=2*Math.PI*38;let acc=0,s='';
  a.forEach(([k,v],i)=>{const l=v/tot*C;s+=`<circle cx="50" cy="50" r="38" fill="none" stroke="${PAL[i%8]}" stroke-width="14" stroke-dasharray="${l} ${C-l}" stroke-dashoffset="${-acc}" transform="rotate(-90 50 50)"/>`;acc+=l});
  $('donut').innerHTML=s+`<text x="50" y="54" text-anchor="middle" font-size="11" font-weight="800" fill="var(--tx)">${fmt(tot)}</text>`;
  $('legend').innerHTML=a.slice(0,6).map(([k,v],i)=>`<div><span><b style="background:${PAL[i%8]}"></b>${esc(k)}</span><span>${Math.round(v/tot*100)}%</span></div>`).join('');
}
export function renderTrend(){
  const ms=[5,4,3,2,1,0].map(mkey),d=ms.map(m=>({m,i:sum(inM(m,['income'])),e:sum(inM(m,['expense']))})),mx=Math.max(1,...d.flatMap(x=>[x.i,x.e]));
  $('trend').innerHTML=d.map((x,k)=>{const X=k*50+8,hi=x.i/mx*90,he=x.e/mx*90,lb=new Date(x.m+'-01T00:00:00').toLocaleDateString('en-IN',{month:'short'});
    return `<rect x="${X}" y="${105-hi}" width="16" height="${hi}" rx="5" fill="var(--inc)"/><rect x="${X+19}" y="${105-he}" width="16" height="${he}" rx="5" fill="var(--exp)"/><text x="${X+17}" y="126" text-anchor="middle" font-size="10" fill="var(--mu)">${lb}</text>`}).join('');
}
export function renderCmp(){
  const a=byCat(mkey(0)),b=byCat(mkey(1)),ks=[...new Set([...Object.keys(a),...Object.keys(b)])].sort((x,y)=>(a[y]||0)+(b[y]||0)-(a[x]||0)-(b[x]||0)).slice(0,5);
  const mx=Math.max(1,...ks.flatMap(k=>[a[k]||0,b[k]||0]));
  $('cmp').innerHTML=ks.length?'<div class="sm" style="margin-bottom:6px"><span style="color:var(--ac)">■</span> This month &nbsp; <span style="opacity:.4;color:var(--ac)">■</span> Last month</div>'+ks.map(k=>`<div class="row"><span style="width:84px">${esc(k)}</span><div class="bars"><div style="width:${(a[k]||0)/mx*100}%;background:var(--ac)"></div><div style="width:${(b[k]||0)/mx*100}%;background:var(--ac);opacity:.4"></div></div><span style="width:70px;text-align:right">${fmt(a[k]||0)}</span></div>`).join(''):'<div class="empty">Add expenses to compare months.</div>';
}

export function renderNotes(){
  const m=mkey(0),ex=inM(m,['expense']),o=[];
  if(!ex.length){$('notes').innerHTML='<p style="color:var(--mu)">Add some expenses to see notes.</p>';return}
  const tot=sum(ex),c=Object.entries(byCat(m)).sort((a,b)=>b[1]-a[1])[0];
  o.push(`${c[0]} is ${Math.round(c[1]/tot*100)}% of this month’s spending.`);
  o.push(`Without rent, you spend about ${fmt(sum(ex.filter(e=>e.category!=='PG / Rent'))/new Date().getDate())} a day.`);
  const f={};ex.filter(e=>e.note).forEach(e=>{const k=e.note.toLowerCase();f[k]=f[k]||{n:0,s:0};f[k].n++;f[k].s+=e.amount});
  const t=Object.entries(f).sort((a,b)=>b[1].n-a[1].n)[0];
  if(t&&t[1].n>=3)o.push(`Most repeated: “${t[0]}” ${t[1].n} times, ${fmt(t[1].s)} in total.`);
  const sm=ex.filter(e=>e.amount<=100);o.push(`${sm.length} small spends (₹100 or less) add up to ${fmt(sum(sm))}.`);
  $('notes').innerHTML=o.map(x=>`<p>${esc(x)}</p>`).join('');
}

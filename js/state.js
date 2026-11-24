export const $=id=>document.getElementById(id);
export const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const fmt=n=>'₹'+Number(n).toLocaleString('en-IN',{maximumFractionDigits:0});
// shared values. Other files can read these. To change one, call its set... function.
export let sb=null,entries=[],budgets=[],cycles=[],typeF='all',periodF='monthly',hmOff=0,selCat=null,selType='expense',sug=null,searchQ='',catF='all';
export const setSb=v=>{sb=v};
export const setEntries=v=>{entries=v};
export const setBudgets=v=>{budgets=v};
export const setCycles=v=>{cycles=v};
export const setTypeF=v=>{typeF=v};
export const setPeriodF=v=>{periodF=v};
export const setHmOff=v=>{hmOff=v};
export const setSelCat=v=>{selCat=v};
export const setSelType=v=>{selType=v};
export const setSug=v=>{sug=v};
export const setSearchQ=v=>{searchQ=v};
export const setCatF=v=>{catF=v};

// ---------- date helpers ----------
export const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
export const mkey=off=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-off);return iso(d).slice(0,7)};
export const inM=(m,types)=>entries.filter(e=>e.date.slice(0,7)===m&&types.includes(e.type));
export const sum=a=>a.reduce((s,e)=>s+e.amount,0);
export function toast(msg,ms=3500){const t=$('toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.add('hidden'),ms)}

export const dm=d=>new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'});

// ---------- money lent & borrowers ledger ----------
// lent = money you gave to someone. returned = money they gave back. Neither is spending.
export const isLoan=t=>t==='lent'||t==='returned';
export const toGetBack=()=>sum(entries.filter(e=>e.type==='lent'))-sum(entries.filter(e=>e.type==='returned'));

export function parseBorrower(note){
  if(!note)return 'Friend';
  const m=note.match(/(?:to\s+|from\s+|^)([a-zA-Z]+)/i);
  if(m&&!['me','friend','friends','someone','returnable'].includes(m[1].toLowerCase())){
    return m[1][0].toUpperCase()+m[1].slice(1).toLowerCase();
  }
  const clean=note.replace(/[-–,\s].*$/,'').trim();
  return clean?clean[0].toUpperCase()+clean.slice(1):'Friend';
}

export function borrowersList(){
  const map={};
  entries.forEach(e=>{
    if(e.type==='lent'||e.type==='returned'){
      const p=parseBorrower(e.note);
      if(!map[p])map[p]={name:p,lent:0,returned:0,net:0,lastDate:e.date};
      if(e.type==='lent')map[p].lent+=e.amount;
      if(e.type==='returned')map[p].returned+=e.amount;
      map[p].net=map[p].lent-map[p].returned;
      if(e.date>map[p].lastDate)map[p].lastDate=e.date;
    }
  });
  return Object.values(map).sort((a,b)=>b.net-a.net);
}

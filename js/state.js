export const $=id=>document.getElementById(id);
export const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const fmt=n=>'₹'+Number(n).toLocaleString('en-IN',{maximumFractionDigits:0});
// shared values. Other files can read these. To change one, call its set... function.
export let sb=null,entries=[],budgets=[],typeF='all',periodF='monthly',hmOff=0,selCat=null,selType='expense',sug=null;
export const setSb=v=>{sb=v};
export const setEntries=v=>{entries=v};
export const setBudgets=v=>{budgets=v};
export const setTypeF=v=>{typeF=v};
export const setPeriodF=v=>{periodF=v};
export const setHmOff=v=>{hmOff=v};
export const setSelCat=v=>{selCat=v};
export const setSelType=v=>{selType=v};
export const setSug=v=>{sug=v};

// ---------- date helpers ----------
export const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
export const mkey=off=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-off);return iso(d).slice(0,7)};
export const inM=(m,types)=>entries.filter(e=>e.date.slice(0,7)===m&&types.includes(e.type));
export const sum=a=>a.reduce((s,e)=>s+e.amount,0);
export function toast(msg,ms=3500){const t=$('toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.add('hidden'),ms)}

// ---------- money lent ----------
// lent = money you gave to someone. returned = money they gave back. Neither is spending.
export const isLoan=t=>t==='lent'||t==='returned';
export const toGetBack=()=>sum(entries.filter(e=>e.type==='lent'))-sum(entries.filter(e=>e.type==='returned'));

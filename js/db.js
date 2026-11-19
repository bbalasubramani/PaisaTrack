import {CK} from './config.js';
import {$,sb,setBudgets,setCycles,setEntries} from './state.js';

export const cfg=()=>{try{return JSON.parse(localStorage.getItem(CK))}catch{return null}};
export async function loadEntries(){
  $('sync').textContent='Syncing…';
  const {data,error}=await sb.from('entries').select('*').order('date',{ascending:false});
  if(error){$('sync').textContent='Sync failed: '+error.message;setEntries([])}
  else{setEntries(data.map(e=>({...e,amount:Number(e.amount)})));$('sync').textContent=''}
}
export async function loadCycles(){
  // if the cycles table does not exist yet, we just show no cycles
  const {data,error}=await sb.from('cycles').select('*').order('start_date',{ascending:false});
  const n=v=>v==null?null:Number(v);
  setCycles(error?[]:data.map(c=>({...c,salary:n(c.salary),base_budget:n(c.base_budget),budget:n(c.budget),sip:n(c.sip),keep_amount:n(c.keep_amount),
    start_spend_balance:n(c.start_spend_balance),end_spend_balance:n(c.end_spend_balance),expected_balance:n(c.expected_balance),missing:n(c.missing),overspend:n(c.overspend)})));
}
export async function loadBudgets(){
  const {data,error}=await sb.from('budgets').select('*').order('created_at',{ascending:true});
  if(!error)setBudgets(data.map(b=>({...b,monthly_limit:Number(b.monthly_limit)})));
}

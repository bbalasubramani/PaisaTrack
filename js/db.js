import {CK} from './config.js';
import {$,sb,setBudgets,setEntries} from './state.js';

export const cfg=()=>{try{return JSON.parse(localStorage.getItem(CK))}catch{return null}};
export async function loadEntries(){
  $('sync').textContent='Syncing…';
  const {data,error}=await sb.from('entries').select('*').order('date',{ascending:false});
  if(error){$('sync').textContent='Sync failed: '+error.message;setEntries([])}
  else{setEntries(data.map(e=>({...e,amount:Number(e.amount)})));$('sync').textContent=''}
}
export async function loadBudgets(){
  const {data,error}=await sb.from('budgets').select('*').order('created_at',{ascending:true});
  if(!error)setBudgets(data.map(b=>({...b,monthly_limit:Number(b.monthly_limit)})));
}

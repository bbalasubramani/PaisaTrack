import {drawCats,hist,setType} from './sheet.js';
import {$,iso,selCat,setSelCat,setSug} from './state.js';

// ---------- voice (Chrome speech recognition; no audio is stored by the app) ----------
export const SR=window.SpeechRecognition||window.webkitSpeechRecognition;export let rec=null,listening=false;
export const KEYS=[[/salary/,'Salary'],[/zerodha|stock|mutual fund|sip|invest/,'Zerodha Investment'],[/emergency/,'Emergency Fund'],[/phone fund/,'Phone Fund'],[/trading/,'Trading'],
  [/rent|\bpg\b/,'PG / Rent'],[/recharge|airtel|jio|data pack/,'Recharge'],[/rapido|uber|ola|auto|bus|metro|cab|petrol|commut|ticket/,'Transport'],
  [/tea|coffee|chai|snack|lunch|dinner|breakfast|food|biryani|pizza|juice|banana|ice ?cream|hotel|restaurant|fruit/,'Food'],[/mom|dad|amma|appa|sister|parents|family/,'Family']];
export function parseVoice(t){
  const low=t.toLowerCase(),r={type:'expense'},m=low.match(/(\d[\d,]*(?:\.\d+)?)\s*(k\b|thousand)?/);
  if(m)r.amount=parseFloat(m[1].replace(/,/g,''))*(m[2]?1000:1);
  if(/\blent\b|\blend\b/.test(low))r.type='lent';
  else if(/returned|paid me back|gave back|got back/.test(low))r.type='returned';
  else if(/salary|received|credited|income|refund|got paid/.test(low))r.type='income';
  else if(/invest|saved|saving|sip|zerodha|mutual fund|emergency fund|phone fund/.test(low))r.type='saving';
  const d=new Date();if(/yesterday/.test(low))d.setDate(d.getDate()-1);r.date=iso(d);
  const h=Object.keys(hist).sort((a,b)=>b.length-a.length).find(k=>low.includes(k));
  r.cat=h?hist[h]:(KEYS.find(([re])=>re.test(low))||[])[1];
  const n=low.replace(/[₹\d,.]+|\b(k|thousand|rupees?|rs|inr|spent|paid|pay|for|on|to|got|received|yesterday|today|i|a|an|the|of|in|my|add|rupee)\b/g,' ').replace(/\s+/g,' ').trim();
  r.note=n?n[0].toUpperCase()+n.slice(1):'';
  return r;
}
export function applyVoice(t){
  const r=parseVoice(t);setType(r.type);if(r.amount)$('amt').value=r.amount;$('note').value=r.note;$('dt').value=r.date;setSelCat(r.cat||null);setSug(null);drawCats();
  $('st').textContent=`Heard: “${t}”. `+(!r.amount?'Type the amount. ':'')+(selCat||r.type==='lent'||r.type==='returned'?'Check it, then save.':'Pick a category.');
}
$('mic').onclick=()=>{
  if(!SR){$('st').textContent='Voice does not work in this browser. Use Chrome, or type below.';return}
  if(listening){rec.stop();return}
  rec=new SR();rec.lang=$('vlang').value;rec.interimResults=false;rec.maxAlternatives=1;
  rec.onstart=()=>{listening=true;$('mic').classList.add('on');$('micT').textContent='Listening… tap to stop'};
  rec.onend=()=>{listening=false;$('mic').classList.remove('on');$('micT').textContent='Tap and speak'};
  rec.onerror=e=>{$('st').textContent=e.error==='not-allowed'?'Microphone is blocked. Allow it in Chrome site settings.':e.error==='no-speech'?'Did not hear anything. Try again.':'Voice error: '+e.error};
  rec.onresult=e=>applyVoice(e.results[0][0].transcript);
  try{rec.start()}catch(_){}
};

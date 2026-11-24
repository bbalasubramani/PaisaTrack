export const CK='paisatrack_config';
export const CATS=['PG / Rent','Food','Transport','Recharge','Family','Zerodha Investment','Trading','Emergency Fund','Phone Fund','Salary','Other'];
export const BCATS=CATS.filter(c=>c!=='Salary');
export const PAL=['#6c8cff','#2fb57e','#f2a93b','#ef6b6b','#a58bff','#4cc9f0','#ff8fab','#9aa3b8'];
export const LIMIT=10000,STRETCH=11000;
// SIP: saved as a saving entry in this category. Your data shows it on the 5th.
// Money you lend: came out of Spend bank account. True = Spend balance check deducts lent & adds returned.
export const LENT_FROM_SPEND=true;
export const SIP_CAT='Zerodha Investment',SIP_DAY=5,RENT_CAT='PG / Rent';
export const CI={'PG / Rent':'rent','Food':'food','Transport':'transport','Recharge':'recharge','Family':'family','Zerodha Investment':'invest','Trading':'trading','Emergency Fund':'emergency','Phone Fund':'phone','Salary':'salary','Other':'other'};

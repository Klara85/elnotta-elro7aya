export const ACTIVITIES=[
  {key:"mass",label:"القداس",emoji:"⛪",points:20},
  {key:"morning_prayer",label:"باكر",emoji:"🙏",points:10},
  {key:"night_prayer",label:"صلاة النوم",emoji:"🌙",points:10},
  {key:"bible",label:"الكتاب المقدس",emoji:"📖",points:15},
  {key:"other_prayer",label:"صلاة تانية",emoji:"🤲",points:10},
  {key:"meeting",label:"الاجتماع",emoji:"🏠",points:10},
  {key:"confession",label:"الاعتراف",emoji:"❤️",points:25},
  {key:"verse_memorized",label:"حفظ آية",emoji:"✝️",points:15}
];
export const LEVELS=[
  {name:"براعم",icon:"🌱",min:0,max:99},
  {name:"شماس صغير",icon:"🕯️",min:100,max:299},
  {name:"خادم المستقبل",icon:"⭐",min:300,max:599},
  {name:"نسر الكنيسة",icon:"🦅",min:600,max:999},
  {name:"قديس صغير",icon:"👑",min:1000,max:Infinity}
];
export const computePoints=log=>ACTIVITIES.reduce((s,a)=>s+(log?.[a.key]?a.points:0),0);
export const getLevel=points=>LEVELS.find(l=>points>=l.min&&points<=l.max)||LEVELS[0];
export function computeStreak(dates){if(!dates?.length)return 0;const sorted=[...new Set(dates)].sort();let streak=1,prev=new Date(sorted.at(-1));for(let i=sorted.length-2;i>=0;i--){const cur=new Date(sorted[i]);const diff=Math.round((prev-cur)/86400000);if(diff!==1)break;streak++;prev=cur;}return streak;}
export function achievements(student,logs){const count=k=>logs.filter(l=>!!l[k]).length,out=[];if((student.streak||0)>=7)out.push("streak7");if(count("bible")>=10)out.push("bible10");if(count("mass")>=4)out.push("mass4");if(count("confession")>=1)out.push("first_confession");if((student.points||0)>=100)out.push("points100");return out;}
export function encouragement(n){if(n>=5)return{text:"جامد يا بطل 🔥\nواضح إنك منور النهارده.",tone:"great"};if(n>=1)return{text:"شاطر ❤️\nكل خطوة صغيرة بتفرق. كمل بكرة!",tone:"ok"};return{text:"إيه يا نجم 😄\nواضح إن اليوم كان زحمة. بكرة نعوضها سوا.",tone:"low"};}
export const todayISO=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
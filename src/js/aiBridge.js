function getData(){
  try{return window.getPainelDiaFullData?.() || {tasks:[],history:[]};}
  catch{return {tasks:[],history:[]};}
}
function today(){return new Date().toISOString().slice(0,10)}
function priorityScore(t){
  const d=t.due?Math.ceil((new Date(t.due+'T12:00:00')-new Date(today()+'T12:00:00'))/864e5):99;
  return (d<0?60:d===0?50:d===1?20:5)+({high:30,medium:15,low:5}[t.priority]||5)-Math.min(10,Math.max(0,(t.estimate||25)-120)/20);
}
export async function analisarAgora(){
  const d=getData(), tasks=(d.tasks||[]).filter(t=>!t.done).sort((a,b)=>priorityScore(b)-priorityScore(a));
  const focus=d.focusByDay||{};
  const days=[]; for(let i=6;i>=0;i--){const x=new Date();x.setDate(x.getDate()-i);days.push(x.toISOString().slice(0,10));}
  const focusTotal=days.reduce((s,k)=>s+(Number(focus[k])||0),0);
  const bestHour=(d.history||[]).filter(x=>x && (x.hour!=null || x.startHour!=null)).reduce((acc,x)=>{const h=Number(x.hour??x.startHour); if(!Number.isFinite(h))return acc;acc[h]=(acc[h]||0)+Number(x.minutes||x.duration||x.focused||0);return acc;},{});
  let hour=null,max=-1; for(const [h,v] of Object.entries(bestHour)){if(v>max){max=v;hour=Number(h)}}
  const next=tasks[0]||null;
  return {
    proximaAcao: next ? {id:next.id,title:next.title,estimate:Number(next.estimate)||25,priority:next.priority,due:next.due,category:next.category||null} : null,
    melhorHorario: hour!=null ? {hour,label:`${String(hour).padStart(2,'0')}:00`,category:null} : null,
    capacidadeReal: Math.max(0, Math.round((focusTotal/7)||0)),
    precisaoEstimativas: null,
    tendencia: focusTotal>0 ? 'Histórico de foco disponível' : 'Aguardando histórico',
    focusTotal7d: focusTotal
  };
}

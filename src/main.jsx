import React,{useEffect,useMemo,useRef,useState}from"react";
import{createRoot}from"react-dom/client";
import{BrowserRouter,Routes,Route,Link,Navigate,useNavigate}from"react-router-dom";
import{BookOpen,MessageCircle,LogOut,Flame,Megaphone,Trophy,Users,BarChart3,ChevronRight,Send,Trash2,Save,Home,ArrowRight,ShieldCheck}from"lucide-react";
import{post}from"./lib/api";
import"./styles.css";

const CLASSES=["مارمينا","مارجرجس","الامير تادرس","ابو فام","ابسخيرون القلينى"];
const ACTIVITIES=[
  {key:"mass",label:"حضرت القداس؟",emoji:"⛪",points:20},
  {key:"morning_prayer",label:"صليت باكر؟",emoji:"🙏",points:10},
  {key:"night_prayer",label:"صليت النوم؟",emoji:"🌙",points:10},
  {key:"bible",label:"قريت في الكتاب المقدس؟",emoji:"📖",points:15},
  {key:"other_prayer",label:"صليت صلاة تانية؟",emoji:"🤲",points:10},
  {key:"meeting",label:"حضرت اجتماع؟",emoji:"🏠",points:10},
  {key:"confession",label:"اعترفت؟",emoji:"❤️",points:25},
  {key:"verse_memorized",label:"حفظت آية؟",emoji:"✝️",points:15}
];
const LEVELS=[
  {name:"براعم",icon:"🌱",min:0,max:99,next:100},
  {name:"شماس صغير",icon:"🕯️",min:100,max:299,next:300},
  {name:"خادم المستقبل",icon:"⭐",min:300,max:599,next:600},
  {name:"نسر الكنيسة",icon:"🦅",min:600,max:999,next:1000},
  {name:"قديس صغير",icon:"👑",min:1000,max:Infinity,next:1000}
];
const ACH={
  streak7:["🔥","7 أيام ورا بعض"],
  bible10:["📖","قريت الكتاب 10 مرات"],
  mass4:["⛪","حضرت 4 قداسات"],
  first_confession:["❤️","أول اعتراف"],
  points100:["🏆","وصلت 100 نقطة"]
};
const emptyLog=()=>Object.fromEntries(ACTIVITIES.map(a=>[a.key,false]));
const getLevel=p=>LEVELS.find(l=>p>=l.min&&p<=l.max)||LEVELS[0];
const dailyPhrase=()=>["ربنا فرحان بيك النهارده ❤️","كل يوم خطوة صغيرة تقرّبك أكتر ✨","ابدأ يومك مع ربنا وهو يكمل معاك 🙏","إنت تقدر تعمل فرق حلو النهارده 🌟"][new Date().getDate()%4];

function AdminRoute({children}){return localStorage.getItem("admin_code")?children:<Navigate to="/admin-login" replace/>}
function StudentRoute({children}){return localStorage.getItem("student_session")?children:<Navigate to="/student-login" replace/>}

function App(){
 return <BrowserRouter><Routes>
  <Route path="/admin-login" element={<AdminLogin/>}/>
  <Route path="/" element={<AdminRoute><AdminHome/></AdminRoute>}/>
  <Route path="/student-login" element={<StudentLogin/>}/>
  <Route path="/student" element={<StudentRoute><StudentHome/></StudentRoute>}/>
  <Route path="/student/chat" element={<StudentRoute><Chat/></StudentRoute>}/>
  <Route path="/student/bible" element={<StudentRoute><Bible/></StudentRoute>}/>
  <Route path="*" element={<Navigate to="/student-login" replace/>}/>
 </Routes></BrowserRouter>
}

function AdminLogin(){
 const[code,setCode]=useState(""),[loading,setLoading]=useState(false),[error,setError]=useState("");const nav=useNavigate();
 async function submit(e){e.preventDefault();setLoading(true);setError("");try{await post("/admin/login",{code});localStorage.setItem("admin_code",code);nav("/")}catch(e){setError(e.message)}finally{setLoading(false)}}
 return <AuthShell tone="violet" title="دخول الخادم" subtitle="اكتب كود الخادم للدخول">
   <form className="auth-card" onSubmit={submit}>
    <input className="big-input center" type="password" placeholder="كود الخادم" value={code} onChange={e=>setCode(e.target.value)} autoFocus required/>
    {error&&<p className="error">{error}</p>}
    <button className="primary big" disabled={loading}>{loading?"مستني شوية...":"ادخل"}</button>
   </form>
   <Link className="switch-link" to="/student-login">أنت مخدوم؟ ادخل من هنا <ChevronRight size={16}/></Link>
 </AuthShell>
}

function StudentLogin(){
 const[name,setName]=useState(""),[className,setClassName]=useState(""),[loading,setLoading]=useState(false),[error,setError]=useState("");const nav=useNavigate();
 async function submit(e){e.preventDefault();if(!className)return;setLoading(true);setError("");try{const d=await post("/student/login",{name,class:className});localStorage.setItem("student_session",JSON.stringify(d.student));nav("/student")}catch(e){setError(e.message)}finally{setLoading(false)}}
 return <AuthShell tone="warm" title="النوتة الروحية" subtitle="أسرة جنود أبي سيفين — خامسة وسادسة">
   <p className="auth-note">اكتب اسمك واختار فصلك ❤️</p>
   <form className="auth-card" onSubmit={submit}>
    <label>اسمك</label><input className="big-input center" placeholder="اكتب اسمك" value={name} onChange={e=>setName(e.target.value)} autoFocus required/>
    <label>فصلك</label><div className="class-picker">{CLASSES.map(c=><button type="button" className={className===c?"selected":""} key={c} onClick={()=>setClassName(c)}>{c}</button>)}</div>
    {error&&<p className="error">{error}</p>}
    <button className="primary big" disabled={loading||!name||!className}>{loading?"مستني شوية...":"يلا بينا"}</button>
   </form>
   <Link className="switch-link" to="/admin-login">أنت خادم؟ ادخل من هنا <ChevronRight size={16}/></Link>
 </AuthShell>
}
function AuthShell({title,subtitle,children,tone}){return <main className={"auth-page "+tone}><div className="auth-wrap"><div className="auth-head"><div className="cross">✝️</div><h1>{title}</h1><p>{subtitle}</p></div>{children}</div></main>}

function StudentHome(){
 const nav=useNavigate(),seen=useRef(new Set());const[student,setStudent]=useState(null),[logs,setLogs]=useState([]),[values,setValues]=useState(emptyLog()),[saving,setSaving]=useState(false),[enc,setEnc]=useState(null),[loading,setLoading]=useState(true),[ann,setAnn]=useState([]),[justSaved,setJustSaved]=useState(false),[toast,setToast]=useState(null);
 const session=()=>JSON.parse(localStorage.getItem("student_session")||"null");
 async function load(){
  const s=session();if(!s){nav("/student-login");return}
  try{const d=await post("/student/dashboard",{student_id:s.id});setStudent(d.student);setLogs(d.logs||[]);localStorage.setItem("student_session",JSON.stringify(d.student));const today=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);const l=(d.logs||[]).find(x=>x.date===today);if(l){const v=emptyLog();ACTIVITIES.forEach(a=>v[a.key]=!!l[a.key]);v.notes=l.notes||"";v.verse_text=l.verse_text||"";v.mass_date=l.mass_date||"";v.confession_date=l.confession_date||"";setValues(v)}}finally{setLoading(false)}
 }
 async function loadAnn(){
   try{const r=await fetch("/api/announcements");const d=await r.json();const list=d.announcements||[];if(seen.current.size){const fresh=list.filter(x=>!seen.current.has(x.id));if(fresh[0]){setToast(fresh[0]);setTimeout(()=>setToast(null),5000)}}list.forEach(x=>seen.current.add(x.id));setAnn(list)}catch{}
 }
 useEffect(()=>{load();loadAnn();const t=setInterval(loadAnn,20000);return()=>clearInterval(t)},[]);
 async function save(){setSaving(true);setJustSaved(false);try{const s=session();const d=await post("/student/save",{student_id:s.id,log:values});setStudent(d.student);setLogs(d.logs||[]);setEnc(d.encouragement);setJustSaved(true);localStorage.setItem("student_session",JSON.stringify(d.student))}catch(e){setEnc({text:e.message,tone:"low"})}finally{setSaving(false)}}
 function logout(){localStorage.removeItem("student_session");nav("/student-login")}
 if(loading||!student)return <div className="loading"><div className="spinner"/></div>;
 const level=getLevel(student.points||0);
 return <div className="student-bg">
  {toast&&<div className="toast-pop"><Megaphone size={18}/><div><b>{toast.title}</b><span>{toast.message}</span></div></div>}
  <header className="topbar"><div className="top-inner"><div className="brand"><span>✝️</span><b>النوتة الروحية</b></div><button className="ghost" onClick={logout}><LogOut size={20}/></button></div></header>
  <main className="student-main">
   <section className="hero-banner"><div className="level-icon">{level.icon}</div><div><h1>أهلاً يا {student.name} ❤️</h1><p>{dailyPhrase()}</p></div></section>
   <div className="feature-grid">
    <Link className="feature bible" to="/student/bible"><BookOpen/><div><b>الكتاب المقدس 📖</b><span>الأسفار والأصحاحات</span></div></Link>
    <Link className="feature chat" to="/student/chat"><span className="mina">😊</span><div><b>صاحبي مينا</b><span>اسأله أي حاجة</span></div></Link>
   </div>
   <LevelProgress points={student.points||0}/>
   <section className="streak-card"><div className="streak-icon"><Flame/></div><div><b>{student.streak||0} يوم ورا بعض 🔥</b><span>كمل، ربنا معاك!</span></div></section>
   {ann.length>0&&<section className="ann-list">{ann.slice(0,3).map((a,i)=><article className={"ann-card "+(i===0?"latest":"")} key={a.id}><Megaphone/><div><b>{a.title}</b><p>{a.message}</p><small>{a.created_date?new Date(a.created_date+"Z").toLocaleString("ar-EG"):""}</small></div></article>)}</section>}
   {enc&&<section className={"enc "+enc.tone}>{enc.text}</section>}
   <section><h2 className="section-title">تسجيل اليوم 📝</h2><DailyCheckin values={values} setValues={setValues} save={save} saving={saving}/>{justSaved&&<div className="saved">✅ سجّلت النهارده — تقدر تعدّل وتحفظ تاني</div>}</section>
   <section><h2 className="section-title">إنجازاتك 🏅</h2><Achievements unlocked={student.achievements||[]}/></section>
  </main>
 </div>
}

function LevelProgress({points}){
 const l=getLevel(points),done=l.name==="قديس صغير";const pct=done?100:Math.max(0,Math.min(100,((points-l.min)/(l.next-l.min))*100));
 return <section className="level-card"><div className="level-line"><div><span className="lvl-emoji">{l.icon}</span><div><small>مستواك الحالي</small><b>{l.name}</b></div></div><strong>{points} نقطة</strong></div><div className="progress"><span style={{width:pct+"%"}}/></div><small>{done?"وصلت لأعلى مستوى 👑":`فاضلك ${l.next-points} نقطة للمستوى الجاي`}</small></section>
}
function DailyCheckin({values,setValues,save,saving}){
 const change=(k,v)=>setValues(x=>({...x,[k]:v,...(!v&&k==="mass"?{mass_date:""}:{}),...(!v&&k==="confession"?{confession_date:""}:{})}));
 return <section className="checkin-card">{ACTIVITIES.map(a=><div className="activity-row" key={a.key}><div className="activity-title"><span>{a.emoji}</span><div><b>{a.label}</b><small>+{a.points} نقطة</small></div></div><div className="yesno"><button className={values[a.key]?"yes active":"yes"} onClick={()=>change(a.key,true)}>أيوه</button><button className={!values[a.key]?"no active":"no"} onClick={()=>change(a.key,false)}>لأ</button></div>{a.key==="mass"&&values.mass&&<div className="extra"><label>تاريخ القداس</label><input type="date" value={values.mass_date||""} onChange={e=>setValues(x=>({...x,mass_date:e.target.value}))}/></div>}{a.key==="confession"&&values.confession&&<div className="extra"><label>تاريخ الاعتراف</label><input type="date" value={values.confession_date||""} onChange={e=>setValues(x=>({...x,confession_date:e.target.value}))}/></div>}{a.key==="verse_memorized"&&values.verse_memorized&&<div className="extra"><textarea placeholder="اكتب الآية اللي حفظتها ❤️" value={values.verse_text||""} onChange={e=>setValues(x=>({...x,verse_text:e.target.value}))}/></div>}</div>)}<div className="extra"><label>ملاحظات</label><textarea placeholder="أي ملاحظة تحب تكتبها..." value={values.notes||""} onChange={e=>setValues(x=>({...x,notes:e.target.value}))}/></div><button className="primary big" onClick={save} disabled={saving||(values.mass&&!values.mass_date)||(values.confession&&!values.confession_date)}><Save size={18}/>{saving?"بنحفظ...":"حفظ اليوم"}</button></section>
}
function Achievements({unlocked}){return <div className="ach-grid">{Object.entries(ACH).map(([id,[em,name]])=><div className={"ach "+(unlocked.includes(id)?"open":"locked")} key={id}><span>{em}</span><b>{name}</b><small>{unlocked.includes(id)?"اتفتح ✅":"لسه 🔒"}</small></div>)}</div>}

function Chat(){
 const nav=useNavigate(),student=JSON.parse(localStorage.getItem("student_session")||"null"),[messages,setMessages]=useState([{role:"assistant",content:"إيه يا بطل 😄 عامل إيه؟ أنا مينا، قولي اللي في بالك ❤️"}]),[input,setInput]=useState(""),[busy,setBusy]=useState(false),box=useRef();
 useEffect(()=>{box.current?.scrollTo({top:box.current.scrollHeight,behavior:"smooth"})},[messages,busy]);
 async function send(){const q=input.trim();if(!q||busy)return;setInput("");setMessages(m=>[...m,{role:"user",content:q}]);setBusy(true);try{const d=await post("/chat",{message:q,student_name:student?.name,student_level:student?.level,history:messages});setMessages(m=>[...m,{role:"assistant",content:d.reply}])}catch{setMessages(m=>[...m,{role:"assistant",content:"حصلت مشكلة بسيطة 😅 جرّب تاني بعد شوية."}])}finally{setBusy(false)}}
 return <SubPage title="صاحبي مينا 😊" back={()=>nav("/student")}><div className="chat-shell"><div className="chat-box" ref={box}>{messages.map((m,i)=><div className={"bubble "+m.role} key={i}>{m.content}</div>)}{busy&&<div className="bubble assistant typing">مينا بيكتب...</div>}</div><div className="chat-input"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="اكتب لمينا..."/><button onClick={send}><Send size={20}/></button></div></div></SubPage>
}

function Bible(){
 const nav=useNavigate(),[books,setBooks]=useState([]),[book,setBook]=useState(""),[chapter,setChapter]=useState(1),[data,setData]=useState(null),[loading,setLoading]=useState(false);
 useEffect(()=>{post("/bible",{action:"books"}).then(d=>{setBooks(d.books||[]);if(d.books?.[0])setBook(d.books[0].id)}).catch(()=>{})},[]);
 useEffect(()=>{if(!book)return;setLoading(true);post("/bible",{action:"chapter",book,chapter}).then(setData).catch(()=>setData(null)).finally(()=>setLoading(false))},[book,chapter]);
 const current=books.find(b=>b.id===book);const text=extractBible(data);
 return <SubPage title="الكتاب المقدس 📖" back={()=>nav("/student")}><section className="bible-controls"><select value={book} onChange={e=>{setBook(e.target.value);setChapter(1)}}>{books.map(b=><option key={b.id} value={b.id}>{b.name||b.commonName}</option>)}</select><select value={chapter} onChange={e=>setChapter(Number(e.target.value))}>{Array.from({length:current?.numberOfChapters||1},(_,i)=><option key={i+1} value={i+1}>أصحاح {i+1}</option>)}</select></section><article className="bible-card"><h2>{current?.name||current?.commonName||""} {chapter}</h2>{loading?<div className="spinner small"/>:text.length?text.map((v,i)=><p key={i}><sup>{i+1}</sup> {v}</p>):<p className="muted">مقدرناش نحمل الأصحاح دلوقتي.</p>}</article></SubPage>
}
function extractBible(data){
 const src=data?.chapter?.content||data?.content||[];const out=[];
 const walk=x=>{if(typeof x==="string"){if(x.trim())out.push(x.trim());return}if(Array.isArray(x)){x.forEach(walk);return}if(x&&typeof x==="object"){if(typeof x.text==="string"&&x.text.trim())out.push(x.text.trim());else Object.values(x).forEach(walk)}};
 walk(src);return out;
}
function SubPage({title,back,children}){return <div className="student-bg"><header className="topbar"><div className="top-inner"><button className="ghost back-btn" onClick={back}><ArrowRight size={20}/> رجوع</button><b>{title}</b><span/></div></header><main className="student-main">{children}</main></div>}

function AdminHome(){
 const nav=useNavigate(),code=localStorage.getItem("admin_code"),[data,setData]=useState({students:[],logs:[],announcements:[],notifications:[]}),[tab,setTab]=useState("students"),[classFilter,setClassFilter]=useState("الكل"),[selected,setSelected]=useState(null),[form,setForm]=useState({title:"",message:"",type:"عام"}),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function load(){try{const d=await post("/admin/data",{code});setData(d)}catch{localStorage.removeItem("admin_code");nav("/admin-login")}}
 useEffect(()=>{load()},[]);
 function logout(){localStorage.removeItem("admin_code");nav("/admin-login")}
 const students=classFilter==="الكل"?data.students:data.students.filter(s=>s.class===classFilter);
 async function announce(){if(!form.title.trim()||!form.message.trim())return;setBusy(true);try{await post("/admin/announcement",{code,...form});setForm({title:"",message:"",type:"عام"});await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function delAnnouncement(id){await post("/admin/announcement/delete",{code,id});load()}
 async function delStudent(id){if(!confirm("متأكد إنك عايز تمسح المخدوم وكل سجلاته؟"))return;await post("/admin/student/delete",{code,id});setSelected(null);load()}
 return <div className="admin-bg"><header className="admin-head"><div><small>لوحة الخادم</small><h1>النوتة الروحية ✝️</h1></div><button className="ghost light" onClick={logout}><LogOut size={20}/></button></header>
 <main className="admin-main"><nav className="admin-tabs"><button className={tab==="students"?"active":""} onClick={()=>setTab("students")}><Users/>المخدومين</button><button className={tab==="stats"?"active":""} onClick={()=>setTab("stats")}><BarChart3/>الإحصائيات</button><button className={tab==="ann"?"active":""} onClick={()=>setTab("ann")}><Megaphone/>الإعلانات</button></nav>
 {tab==="students"&&(!selected?<><div className="filter-row"><button className={classFilter==="الكل"?"active":""} onClick={()=>setClassFilter("الكل")}>الكل</button>{CLASSES.map(c=><button className={classFilter===c?"active":""} key={c} onClick={()=>setClassFilter(c)}>{c}</button>)}</div><div className="admin-grid">{students.map(s=><button className="student-tile" key={s.id} onClick={()=>setSelected(s)}><div className="avatar">{getLevel(s.points||0).icon}</div><div><b>{s.name}</b><span>{s.class||"بدون فصل"}</span></div><strong>{s.points||0} نقطة</strong></button>)}</div></>:<StudentDetail student={selected} logs={data.logs.filter(l=>l.student_id===selected.id)} back={()=>setSelected(null)} del={()=>delStudent(selected.id)}/>)}
 {tab==="stats"&&<AdminStats data={data}/>}
 {tab==="ann"&&<div className="admin-two"><section className="admin-card"><h2>إعلان جديد 📢</h2><label>النوع</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{["عام","اجتماع","رحلة","تذكير","إلغاء"].map(x=><option key={x}>{x}</option>)}</select><label>العنوان</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><label>النص</label><textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/>{error&&<p className="error">{error}</p>}<button className="primary" onClick={announce} disabled={busy}>{busy?"بنرسل...":"إرسال للمخدومين"}</button></section><section className="admin-card"><h2>آخر الإعلانات</h2>{data.announcements.length?data.announcements.map(a=><div className="admin-ann" key={a.id}><div><b>{a.title}</b><p>{a.message}</p><small>{a.type}</small></div><button onClick={()=>delAnnouncement(a.id)}><Trash2 size={18}/></button></div>):<p className="muted">مفيش إعلانات لسه.</p>}</section></div>}
 </main></div>
}
function StudentDetail({student,logs,back,del}){return <div><button className="back-admin" onClick={back}><ArrowRight/>رجوع للمخدومين</button><section className="admin-card student-profile"><div className="profile-head"><div className="avatar large">{getLevel(student.points||0).icon}</div><div><h2>{student.name}</h2><p>{student.class} • {student.level} • {student.points} نقطة</p></div><button className="danger" onClick={del}><Trash2 size={18}/> حذف</button></div><h3>السجلات اليومية</h3>{logs.length?logs.map(l=><div className="log-card" key={l.id}><b>{l.date}</b><div>{ACTIVITIES.filter(a=>l[a.key]).map(a=><span key={a.key}>{a.emoji} {a.label.replace("؟","")}</span>)}</div>{l.mass_date&&<small>القداس: {l.mass_date}</small>}{l.confession_date&&<small>الاعتراف: {l.confession_date}</small>}{l.verse_text&&<blockquote>✝️ {l.verse_text}</blockquote>}{l.notes&&<p>📝 {l.notes}</p>}</div>):<p className="muted">لسه مفيش تسجيلات.</p>}</section></div>}
function AdminStats({data}){const ranked=[...data.students].sort((a,b)=>b.points-a.points);return <div className="admin-two"><section className="admin-card"><h2>🏆 ترتيب النقاط</h2>{ranked.map((s,i)=><div className="rank" key={s.id}><strong>#{i+1}</strong><span>{s.name}</span><b>{s.points}</b></div>)}</section><section className="admin-card"><h2>الأنشطة 📋</h2>{ACTIVITIES.map(a=>{const logs=data.logs.filter(l=>l[a.key]);const ids=[...new Set(logs.map(l=>l.student_id))];return <details key={a.key}><summary><span>{a.emoji} {a.label.replace("؟","")}</span><b>{logs.length}</b></summary>{ids.map(id=><p key={id}>{data.students.find(s=>s.id===id)?.name||"—"}</p>)}</details>})}</section></div>}

createRoot(document.getElementById("root")).render(<App/>);
import "dotenv/config";
import express from "express";
import path from "path";
import db from "./db.js";
import { ACTIVITIES, computePoints, computeStreak, getLevel, achievements, encouragement, todayISO } from "./spiritual.js";

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_CODE = process.env.ADMIN_CODE;

app.use(express.json({ limit: "2mb" }));

const normalizeName = (raw="") => raw.trim().replace(/\s+/g," ").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,"").trim();
const unifyArabic = (s="") => s
  .replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/[ىي]/g,"ى")
  .replace(/چ/g,"ج").replace(/[گڪ]/g,"ك").replace(/ـ/g,"")
  .replace(/[ً-ْ]/g,"").replace(/ٰ/g,"");
const compactName = raw => unifyArabic((raw||"").replace(/[^\p{L}\p{N}]/gu,""));
const parseStudent = s => s ? ({...s, achievements: JSON.parse(s.achievements || "[]")}) : s;
const mapAnnouncement = a => a ? ({...a, created_date:a.created_at}) : a;
const isAdmin = code => !!ADMIN_CODE && typeof code==="string" && code.trim()===ADMIN_CODE;
const requireAdmin = (req,res) => {
  if(!isAdmin(req.body?.code ?? req.query?.code)){ res.status(401).json({error:"الكود غلط"}); return false; }
  return true;
};

app.get("/api/health",(_req,res)=>res.json({ok:true}));

app.post("/api/admin/login",(req,res)=>{
  if(!isAdmin(req.body?.code)) return res.status(401).json({error:"الكود غلط"});
  res.json({ok:true});
});

app.post("/api/student/login",(req,res)=>{
  const name=normalizeName(req.body?.name||"");
  const className=(req.body?.class||"").trim();
  if(!name) return res.status(400).json({error:"اكتب اسمك"});
  let rows=className ? db.prepare("SELECT * FROM students WHERE class=?").all(className) : db.prepare("SELECT * FROM students").all();
  let student=rows.find(s=>compactName(s.name)===compactName(name));
  if(student){
    if(student.name!==name || (className && student.class!==className)){
      db.prepare("UPDATE students SET name=?, class=? WHERE id=?").run(name,className||student.class,student.id);
      student=db.prepare("SELECT * FROM students WHERE id=?").get(student.id);
    }
  } else {
    const info=db.prepare("INSERT INTO students(name,class,points,level,streak,achievements) VALUES(?,?,?,?,?,?)")
      .run(name,className||null,0,"براعم",0,"[]");
    student=db.prepare("SELECT * FROM students WHERE id=?").get(info.lastInsertRowid);
  }
  res.json({student:parseStudent(student)});
});

app.post("/api/student/dashboard",(req,res)=>{
  const student=db.prepare("SELECT * FROM students WHERE id=?").get(req.body?.student_id);
  if(!student) return res.status(404).json({error:"المخدوم مش موجود"});
  const logs=db.prepare("SELECT * FROM logs WHERE student_id=? ORDER BY date DESC").all(student.id);
  res.json({student:parseStudent(student),logs});
});

app.post("/api/student/save",(req,res)=>{
  const id=req.body?.student_id;
  const log=req.body?.log||{};
  const date=todayISO();
  const studentBefore=db.prepare("SELECT * FROM students WHERE id=?").get(id);
  if(!studentBefore) return res.status(404).json({error:"المخدوم مش موجود"});
  if(log.mass && !log.mass_date) return res.status(400).json({error:"اختار تاريخ القداس"});
  if(log.confession && !log.confession_date) return res.status(400).json({error:"اختار تاريخ الاعتراف"});

  const keys=ACTIVITIES.map(a=>a.key);
  const flags=Object.fromEntries(keys.map(k=>[k,log[k]?1:0]));
  const earned=computePoints(log);
  const existing=db.prepare("SELECT id FROM logs WHERE student_id=? AND date=?").get(id,date);
  const args={...flags,mass_date:log.mass_date||null,confession_date:log.confession_date||null,verse_text:log.verse_text||"",notes:log.notes||"",earned};

  if(existing){
    db.prepare(`UPDATE logs SET ${keys.map(k=>k+"=@"+k).join(",")},mass_date=@mass_date,confession_date=@confession_date,verse_text=@verse_text,notes=@notes,points_earned=@earned WHERE id=@id`)
      .run({...args,id:existing.id});
  } else {
    db.prepare(`INSERT INTO logs(date,student_id,${keys.join(",")},mass_date,confession_date,verse_text,notes,points_earned) VALUES(@date,@student_id,${keys.map(k=>"@"+k).join(",")},@mass_date,@confession_date,@verse_text,@notes,@earned)`)
      .run({...args,date,student_id:id});
  }

  const logs=db.prepare("SELECT * FROM logs WHERE student_id=? ORDER BY date DESC").all(id);
  const total=logs.reduce((sum,l)=>sum+(l.points_earned||0),0);
  const streak=computeStreak(logs.map(l=>l.date));
  const level=getLevel(total).name;
  const ach=achievements({points:total,streak},logs);
  db.prepare("UPDATE students SET points=?,streak=?,level=?,achievements=?,last_checkin_date=? WHERE id=?")
    .run(total,streak,level,JSON.stringify(ach),date,id);

  const student=parseStudent(db.prepare("SELECT * FROM students WHERE id=?").get(id));
  if(!existing){
    const done=ACTIVITIES.filter(a=>log[a.key]);
    const message=done.length ? `${done.length} نشاط • ${done.map(a=>a.emoji).join(" ")} • ${earned} نقطة` : "سجّل دخوله من غير أنشطة";
    db.prepare("INSERT INTO notifications(title,message,student_id,student_name,type,read) VALUES(?,?,?,?,?,0)")
      .run(`${student.name} سجّل اليوم 📝`,message,id,student.name,"log");
  }
  res.json({student,logs,encouragement:encouragement(ACTIVITIES.filter(a=>log[a.key]).length)});
});

app.get("/api/announcements",(_req,res)=>{
  const announcements=db.prepare("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 20").all().map(mapAnnouncement);
  res.json({announcements});
});

app.post("/api/admin/data",(req,res)=>{
  if(!requireAdmin(req,res)) return;
  const students=db.prepare("SELECT * FROM students ORDER BY points DESC").all().map(parseStudent);
  const logs=db.prepare("SELECT * FROM logs ORDER BY date DESC LIMIT 1000").all();
  const announcements=db.prepare("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 100").all().map(mapAnnouncement);
  const notifications=db.prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100").all();
  res.json({students,logs,announcements,notifications});
});

app.post("/api/admin/announcement",(req,res)=>{
  if(!requireAdmin(req,res)) return;
  const {title,message,type="عام",image_url=""}=req.body||{};
  if(!title?.trim()||!message?.trim()) return res.status(400).json({error:"العنوان والنص مطلوبان"});
  const info=db.prepare("INSERT INTO announcements(title,message,type,image_url) VALUES(?,?,?,?)").run(title.trim(),message.trim(),type,image_url);
  res.json({announcement:mapAnnouncement(db.prepare("SELECT * FROM announcements WHERE id=?").get(info.lastInsertRowid))});
});

app.post("/api/admin/announcement/delete",(req,res)=>{
  if(!requireAdmin(req,res)) return;
  db.prepare("DELETE FROM announcements WHERE id=?").run(req.body?.id);
  res.json({ok:true});
});

app.post("/api/admin/student/update",(req,res)=>{
  if(!requireAdmin(req,res)) return;
  const {id,data={}}=req.body;
  if(!id) return res.status(400).json({error:"id مطلوب"});
  const allowed=["name","class","points","level","streak"];
  const entries=Object.entries(data).filter(([k])=>allowed.includes(k));
  if(entries.length){
    const sql="UPDATE students SET "+entries.map(([k])=>k+"=?").join(",")+" WHERE id=?";
    db.prepare(sql).run(...entries.map(([,v])=>v),id);
  }
  res.json({student:parseStudent(db.prepare("SELECT * FROM students WHERE id=?").get(id))});
});

app.post("/api/admin/student/delete",(req,res)=>{
  if(!requireAdmin(req,res)) return;
  const id=req.body?.id;
  db.prepare("DELETE FROM logs WHERE student_id=?").run(id);
  db.prepare("DELETE FROM notifications WHERE student_id=?").run(id);
  db.prepare("DELETE FROM students WHERE id=?").run(id);
  res.json({ok:true});
});

app.post("/api/bible",async(req,res)=>{
  try{
    const BASE="https://bible.helloao.org/api", TRANSLATION="ARBNAV";
    if(req.body?.action==="books"){
      const r=await fetch(`${BASE}/${TRANSLATION}/books.json`);
      if(!r.ok) throw new Error("books");
      const d=await r.json();
      return res.json({books:(d.books||[]).map(b=>({id:b.id,name:b.name,commonName:b.commonName,numberOfChapters:b.numberOfChapters}))});
    }
    if(req.body?.action==="chapter"){
      const {book,chapter}=req.body;
      if(!book||!chapter) return res.status(400).json({error:"اختار السفر والأصحاح"});
      const r=await fetch(`${BASE}/${TRANSLATION}/${book}/${Number(chapter)}.json`);
      if(!r.ok) throw new Error("chapter");
      return res.json(await r.json());
    }
    res.status(400).json({error:"طلب غير معروف"});
  }catch{
    res.status(502).json({error:"تعذر تحميل الكتاب المقدس دلوقتي"});
  }
});

app.post("/api/chat",async(req,res)=>{
  const message=(req.body?.message||"").trim();
  const studentName=req.body?.student_name||"يا بطل";
  if(!message) return res.status(400).json({error:"اكتب رسالة لمينا"});
  const lower=message.toLowerCase();
  let reply;
  if(lower.includes("صلاة")||lower.includes("اصلي")||lower.includes("أصلي")) reply=`${studentName} ❤️ جرّب تقول لربنا في دقيقة واحدة: شكراً على حاجة، سامحني على حاجة، وساعدني في حاجة. البساطة دي صلاة حقيقية 🙏`;
  else if(lower.includes("خايف")||lower.includes("خوف")) reply=`أنا معاك يا ${studentName} ❤️ افتكر: ربنا قريب منك. خد نفس هادي وقوله: «يا رب يسوع خليك معايا واديني سلام» 🙏`;
  else if(lower.includes("آية")||lower.includes("ايه")||lower.includes("كتاب")) reply=`تحدي النهارده 📖 اقرأ 5 آيات من الإنجيل واختار آية عجبتك. اكتبها في النوتة وخليها معاك طول اليوم 😄`;
  else if(lower.includes("قديس")||lower.includes("مارمينا")) reply=`ممكن نحكي عن قديس 😊 أهم حاجة نفتكر إن القديسين كانوا بيحبوا ربنا وبيحاولوا يعملوا الصح حتى لما كان صعب. قولي اسم القديس اللي تحب تعرف عنه.`;
  else reply=`إيه يا ${studentName} 😄 أنا مينا وصاحبك هنا. قولي اللي في بالك، ونفكر سوا بطريقة بسيطة وحلوة ❤️`;
  res.json({reply});
});

const dist=path.resolve("dist");
app.use(express.static(dist));
app.get("*",(req,res)=>{
  if(req.path.startsWith("/api/")) return res.status(404).json({error:"Not found"});
  res.sendFile(path.join(dist,"index.html"));
});

app.listen(PORT,()=>console.log(`El Notta running on ${PORT}`));
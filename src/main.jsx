import React, {useEffect, useMemo, useRef, useState} from 'react';
import { createRoot } from 'react-dom/client';
import {
  Home, BookOpen, Layers3, MessageCircle, UserRound, Volume2, Mic, Heart,
  ChevronRight, ChevronLeft, Check, Flame, Search, Shuffle, BookText, Trophy,
  Sparkles, Brain, Lock, Gauge, AudioLines, Languages, Download, SkipForward,
  Square, Trash2, RefreshCw, ShieldCheck, X, Eye, BadgeCheck, Play, GripVertical,
  Headphones, Timer, Star, RotateCcw, Medal, Zap
} from 'lucide-react';
import vocabularyRaw from './vocabulary.json';
import sentencesRaw from './sentences.json';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';
import './styles.css';

const vocabHeaders=['id','dutch','english','category','spoken','latin','script','type','confidence','status','exampleNl','exampleSpoken','notes','source'];
const sentenceHeaders=['id','dutch','spoken','latin','status','grammar','notes','source'];
const CONTENT_CACHE_KEY='afghanFluentOneDriveContentV1', CONTENT_STATUS_KEY='afghanFluentOneDriveStatusV1';
const GAME_KEY='afghanFluentGameV2';
const SUPABASE_URL=import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY;
if(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY) throw new Error('Supabase configuratie ontbreekt in Vercel.');
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const profileStorageKey=id=>`afghanFluentProgress:${id}`;
const gameStorageKey=id=>`afghanFluentGame:${id}`;

function readJsonStorage(k,f=null){try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}}
const cachedContent=typeof window!=='undefined'?readJsonStorage(CONTENT_CACHE_KEY):null;
const vocabSource=cachedContent?.vocabulary?.length?cachedContent.vocabulary:vocabularyRaw;
const sentenceSource=cachedContent?.sentences?.length?cachedContent.sentences:sentencesRaw;
const vocab=vocabSource.map(r=>Object.fromEntries(vocabHeaders.map((h,i)=>[h,r[i]??''])));
const sentences=sentenceSource.map(r=>Object.fromEntries(sentenceHeaders.map((h,i)=>[h,r[i]??''])));

async function syncOneDriveContent(){
 const response=await fetch(`/api/content?ts=${Date.now()}`,{cache:'no-store'}); const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data?.error||'OneDrive kon niet worden gelezen.');
 if(!Array.isArray(data.vocabulary)||!Array.isArray(data.sentences))throw new Error('Onverwacht gegevensformaat.');
 const previous=readJsonStorage(CONTENT_CACHE_KEY),changed=previous?.version!==data.version;
 localStorage.setItem(CONTENT_CACHE_KEY,JSON.stringify({version:data.version,vocabulary:data.vocabulary,sentences:data.sentences,syncedAt:data.syncedAt}));
 localStorage.setItem(CONTENT_STATUS_KEY,JSON.stringify({state:'ready',lastSync:data.syncedAt,version:data.version,vocabularyCount:data.vocabulary.length,sentenceCount:data.sentences.length,source:'OneDrive Excel'}));
 return {changed,data};
}
const COACH_IMAGES={welcome:'/images/coach/farangis-welcome.png',tip:'/images/coach/farangis-tip.png',fact:'/images/coach/farangis-fact.png',think:'/images/coach/farangis-think.png',listen:'/images/coach/farangis-listen.png',correct:'/images/coach/farangis-correct.png',good:'/images/coach/farangis-correct.png',almost:'/images/coach/farangis-almost.png',help:'/images/coach/farangis-help.png',explain:'/images/coach/farangis-explain.png',celebrate:'/images/coach/farangis-celebrate.png'};
function Coach({type='tip',text,compact=false,hero=false,placement='edge'}){const src=COACH_IMAGES[type]||COACH_IMAGES.tip;const fallback={welcome:'Salaam! Zullen we samen verder leren? 💛',tip:'Probeer het rustig hardop te zeggen.',good:'Super gedaan! ✨',correct:'Super gedaan! ✨',almost:'Bijna! Probeer het nog één keer.',help:'Zal ik je een handje helpen?',fact:'Wist je dat? Door hardop te oefenen onthoud je woorden beter.',think:'Denk rustig na. Je weet meer dan je denkt.',listen:'Luister goed naar het ritme en de klank.',explain:'Ik leg het stap voor stap uit.',celebrate:'Wauw! Heel goed gedaan! 🎉'};return <div className={`farangis-popout farangis-${type} ${compact?'compact':''} ${hero?'hero':''} placement-${placement}`}><img className="farangis-character" src={src} alt={`Farangis — ${type}`}/><div className="farangis-bubble"><small>FARANGIS</small><span>{text||fallback[type]||fallback.tip}</span></div></div>}

const CATEGORY={home:{label:'Thuis',emoji:'🏡'},food:{label:'Eten & drinken',emoji:'🥣'},travel:{label:'Onderweg',emoji:'🚌'},daily:{label:'Dagelijks',emoji:'☀️'},verbs:{label:'Werkwoorden',emoji:'🏃'},family:{label:'Familie',emoji:'👨‍👩‍👧‍👦'},people:{label:'Mensen',emoji:'🧑'},body:{label:'Lichaam',emoji:'🫶'},clothes:{label:'Kleding',emoji:'🧥'},nature:{label:'Natuur',emoji:'🌿'},animals:{label:'Dieren',emoji:'🐾'},school:{label:'School',emoji:'🎒'},work:{label:'Werk',emoji:'💼'},shopping:{label:'Winkelen',emoji:'🛍️'},time:{label:'Tijd',emoji:'🕰️'},feelings:{label:'Gevoelens',emoji:'💛'},colors:{label:'Kleuren',emoji:'🎨'},numbers:{label:'Getallen',emoji:'🔢'},greetings:{label:'Begroeten',emoji:'👋'},questions:{label:'Vragen',emoji:'❓'},other:{label:'Overig',emoji:'✨'}};
const iconFor=c=>(CATEGORY[c]||CATEGORY.other).emoji, labelFor=c=>(CATEGORY[c]||{label:c||'Overig'}).label;
const seeded=n=>((Number(n||1)*9301+49297)%233280)/233280;
function dayKey(d=new Date()){return d.toISOString().slice(0,10)}
function loadProgress(userId){return readJsonStorage(userId?profileStorageKey(userId):'afghanFluentProgress',{})}
function saveProgress(userId,p){localStorage.setItem(userId?profileStorageKey(userId):'afghanFluentProgress',JSON.stringify(p))}
function useAppState(userId,cloudProgress,onCloudChange){
 const[progress,setProgress]=useState(()=>loadProgress(userId));
 useEffect(()=>{if(!userId)return;const local=loadProgress(userId);setProgress(cloudProgress&&Object.keys(cloudProgress).length?{...local,...cloudProgress}:local)},[userId]);
 const update=fn=>setProgress(p=>{const n=typeof fn==='function'?fn(p):fn;saveProgress(userId,n);onCloudChange?.(n);return n});
 return{progress,update,knownIds:new Set(progress.known||[]),favorites:new Set(progress.favorites||[])};
}
function loadGame(userId){return readJsonStorage(userId?gameStorageKey(userId):GAME_KEY,{})}
function saveGame(userId,g){localStorage.setItem(userId?gameStorageKey(userId):GAME_KEY,JSON.stringify(g))}
function useGameState(userId,cloudGame,onCloudChange){
 const[game,setGame]=useState(()=>loadGame(userId));
 useEffect(()=>{if(!userId)return;const local=loadGame(userId);setGame(cloudGame&&Object.keys(cloudGame).length?{...local,...cloudGame}:local)},[userId]);
 const updateGame=fn=>setGame(g=>{const n=typeof fn==='function'?fn(g):fn;saveGame(userId,n);onCloudChange?.(n);return n});
 const xp=game.xp||0;return{game,updateGame,xp,level:Math.floor(xp/500)+1,levelXp:xp%500,daily:game.daily?.date===dayKey()?(game.daily.xp||0):0,goal:game.dailyGoal||100};
}
function awardXP(gs,n,reason){gs.updateGame(g=>{const d=g.daily?.date===dayKey()?g.daily:{date:dayKey(),xp:0};return{...g,xp:(g.xp||0)+n,daily:{date:dayKey(),xp:(d.xp||0)+n},lastActivity:{date:new Date().toISOString(),reason,amount:n}}})}
function remember(gs,k,v){gs.updateGame(g=>({...g,positions:{...(g.positions||{}),[k]:v}}))}
function practice(gs,k,ok){gs.updateGame(g=>{const p={...(g.practice||{})},o=p[k]||{right:0,wrong:0,priority:0};p[k]={right:o.right+(ok?1:0),wrong:o.wrong+(ok?0:1),priority:Math.max(0,(o.priority||0)+(ok?-1:2)),last:new Date().toISOString()};return{...g,practice:p}})}
async function speak(text,rate=.88,itemType=null,itemId=null){
 if(itemType&&itemId){
  const{data}=await supabase.from('audio_recordings').select('storage_path').eq('item_type',itemType).eq('item_id',Number(itemId)).eq('approved',true).maybeSingle();
  if(data?.storage_path){const{data:urlData}=supabase.storage.from('farangis-audio').getPublicUrl(data.storage_path);if(urlData?.publicUrl){new Audio(urlData.publicUrl).play();return}}
 }
 if(!text||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=rate;window.speechSynthesis.speak(u)
}
function shuffle(a){a=[...a];for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}


function LoginScreen({onReady}){
 const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const login=async e=>{e.preventDefault();setBusy(true);setError('');const raw=email.trim();const slug=raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'');const loginEmail=raw.includes('@')?raw:`${slug}@users.afghan-fluent.local`;const{data,error}=await supabase.auth.signInWithPassword({email:loginEmail,password});setBusy(false);if(error)return setError('Inloggen lukt niet. Controleer je naam/e-mailadres en wachtwoord.');onReady?.(data.session)};
 return <div className="auth-shell"><div className="auth-card"><Brand/><div className="auth-coach"><img src={COACH_IMAGES.welcome} alt="Farangis"/></div><small>WELKOM TERUG</small><h1>Salaam 👋</h1><p>Log in om je eigen woorden, XP en voortgang te laden.</p><form onSubmit={login}><label>Naam of e-mailadres<input type="text" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Wachtwoord<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<div className="auth-error">{error}</div>}<button className="auth-primary" disabled={busy}>{busy?'Even laden…':'Inloggen'}</button></form></div></div>
}
async function loadCloudState(userId){
 const[{data:profile},{data:progress},{data:wordRows}]=await Promise.all([
  supabase.from('profiles').select('*').eq('id',userId).maybeSingle(),
  supabase.from('user_progress').select('*').eq('user_id',userId).maybeSingle(),
  supabase.from('word_progress').select('word_id,status').eq('user_id',userId)
 ]);
 const known=(wordRows||[]).filter(x=>x.status==='mastered').map(x=>String(x.word_id));
 return{profile,progress:{known,streak:progress?.streak||0,lastOpen:progress?.last_active_date||null},game:{xp:progress?.xp||0}};
}
function AdminPanel({session,profile}){
 const[users,setUsers]=useState([]),[name,setName]=useState(''),[password,setPassword]=useState(''),[mode,setMode]=useState('adult'),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const[recordType,setRecordType]=useState('word'),[recordIndex,setRecordIndex]=useState(0),[recording,setRecording]=useState(false),[audioUrl,setAudioUrl]=useState(null);
 const mediaRef=useRef(null),chunksRef=useRef([]);
 const refresh=async()=>{const r=await fetch('/api/admin-users',{headers:{Authorization:`Bearer ${session.access_token}`}});const j=await r.json();if(r.ok)setUsers(j.users||[])};
 useEffect(()=>{refresh()},[]);
 const createUser=async e=>{e.preventDefault();setBusy(true);setMsg('');const r=await fetch('/api/admin-users',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({displayName:name,password,mode})});const j=await r.json();setBusy(false);setMsg(r.ok?'Gebruiker aangemaakt.':j.error||'Aanmaken mislukt.');if(r.ok){setName('');setPassword('');refresh()}};
 const resetUser=async id=>{if(!confirm('Alle leerprogressie van deze gebruiker resetten?'))return;const r=await fetch('/api/admin-reset',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({userId:id})});setMsg(r.ok?'Voortgang gereset.':'Resetten mislukt.')};
 const items=recordType==='word'?vocab:sentences,item=items[recordIndex%items.length],spoken=item?.spoken||item?.latin;
 const startRecording=async()=>{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const mr=new MediaRecorder(stream);chunksRef.current=[];mr.ondataavailable=e=>chunksRef.current.push(e.data);mr.onstop=()=>{const blob=new Blob(chunksRef.current,{type:mr.mimeType||'audio/webm'});setAudioUrl(URL.createObjectURL(blob));mediaRef.current={blob,mime:mr.mimeType||'audio/webm'};stream.getTracks().forEach(t=>t.stop())};mr.start();mediaRef.current=mr;setRecording(true)};
 const stopRecording=()=>{mediaRef.current?.stop();setRecording(false)};
 const saveRecording=async()=>{if(!mediaRef.current?.blob)return;setBusy(true);const ext=mediaRef.current.mime.includes('mp4')?'m4a':'webm',path=`${recordType}s/${item.id}.${ext}`;const{error:upErr}=await supabase.storage.from('farangis-audio').upload(path,mediaRef.current.blob,{upsert:true,contentType:mediaRef.current.mime});if(upErr){setMsg(upErr.message);setBusy(false);return}const{error:dbErr}=await supabase.from('audio_recordings').upsert({item_type:recordType,item_id:Number(item.id),storage_path:path,recorded_by:session.user.id,approved:true},{onConflict:'item_type,item_id'});setBusy(false);if(dbErr)return setMsg(dbErr.message);setMsg('Opname opgeslagen ✓');setAudioUrl(null);mediaRef.current=null;setRecordIndex(i=>(i+1)%items.length)};
 return <div className="admin-screen"><PageHead eyebrow="ADMIN" title="Beheer" sub="Gebruikers, voortgang en de stem van Farangis."/>
  {msg&&<div className="admin-message">{msg}</div>}
  <section className="admin-card"><h3>Gebruikers</h3><div className="admin-users">{users.map(u=><div className="admin-user" key={u.id}><div className="admin-avatar">{(u.display_name||'?')[0]}</div><div><b>{u.display_name}</b><span>{u.role==='admin'?'Administrator':u.mode==='kids'?'Kids':'Volwassen'}</span></div>{u.role!=='admin'&&<button onClick={()=>resetUser(u.id)}><RefreshCw/> Reset</button>}</div>)}</div>
   <form className="admin-create" onSubmit={createUser}><h4>Nieuw account</h4><input placeholder="Naam, bijvoorbeeld Aeden" value={name} onChange={e=>setName(e.target.value)} required/><input placeholder="Tijdelijk wachtwoord" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength="6" required/><select value={mode} onChange={e=>setMode(e.target.value)}><option value="adult">Volwassen</option><option value="kids">Kids</option></select><button disabled={busy}><UserRound/> Account aanmaken</button></form>
  </section>
  <section className="admin-card audio-admin"><div><small>STEM VAN FARANGIS</small><h3>Audio opnemen</h3><p>{recordType==='word'?'Woord':'Zin'} {recordIndex+1} van {items.length}</p></div><div className="audio-type-switch"><button className={recordType==='word'?'active':''} onClick={()=>{setRecordType('word');setRecordIndex(0)}}>Woorden</button><button className={recordType==='sentence'?'active':''} onClick={()=>{setRecordType('sentence');setRecordIndex(0)}}>Zinnen</button></div><div className="record-prompt"><small>NEDERLANDS</small><b>{item?.dutch}</b><small>FONETISCH</small><strong>{spoken}</strong></div><div className="record-actions">{!recording?<button className="record-button" onClick={startRecording}><Mic/> Opnemen</button>:<button className="record-button recording" onClick={stopRecording}><Square/> Stop</button>}{audioUrl&&<><audio controls src={audioUrl}/><button className="save-audio" onClick={saveRecording} disabled={busy}><Check/> Opslaan & volgende</button></>}</div></section>
 </div>
}

function App(){
 const[session,setSession]=useState(null),[authReady,setAuthReady]=useState(false),[profile,setProfile]=useState(null),[cloudProgress,setCloudProgress]=useState({}),[cloudGame,setCloudGame]=useState({});
 const[tab,setTab]=useState('today'),[mode,setMode]=useState('family'),[selectedLesson,setSelectedLesson]=useState(null);
 const[contentStatus,setContentStatus]=useState(()=>readJsonStorage(CONTENT_STATUS_KEY,{state:cachedContent?'cached':'bundled',lastSync:cachedContent?.syncedAt||null,vocabularyCount:vocab.length,sentenceCount:sentences.length,source:cachedContent?'OneDrive cache':'Ingebouwde reservekopie'}));
 const syncTimer=useRef(null),gameTimer=useRef(null);
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);setAuthReady(true)});return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(!session?.user?.id){setProfile(null);return}loadCloudState(session.user.id).then(s=>{setProfile(s.profile);setCloudProgress(s.progress);setCloudGame(s.game);setMode(s.profile?.mode==='kids'?'kids':'family')})},[session?.user?.id]);
 const queueProgress=p=>{if(!session?.user?.id)return;clearTimeout(syncTimer.current);syncTimer.current=setTimeout(async()=>{const known=new Set((p.known||[]).map(String));await supabase.from('user_progress').upsert({user_id:session.user.id,streak:p.streak||0,last_active_date:p.lastOpen||dayKey(),updated_at:new Date().toISOString()});if(known.size){await supabase.from('word_progress').upsert([...known].map(id=>({user_id:session.user.id,word_id:Number(id),status:'mastered',updated_at:new Date().toISOString()})),{onConflict:'user_id,word_id'})}},450)};
 const queueGame=g=>{if(!session?.user?.id)return;clearTimeout(gameTimer.current);gameTimer.current=setTimeout(()=>supabase.from('user_progress').upsert({user_id:session.user.id,xp:g.xp||0,level:Math.floor((g.xp||0)/500)+1,updated_at:new Date().toISOString()}),450)};
 const app=useAppState(session?.user?.id,cloudProgress,queueProgress),game=useGameState(session?.user?.id,cloudGame,queueGame);
 const setModePersist=async m=>{setMode(m);if(session?.user?.id){await supabase.from('profiles').update({mode:m==='kids'?'kids':'adult',updated_at:new Date().toISOString()}).eq('id',session.user.id);setProfile(p=>p?{...p,mode:m==='kids'?'kids':'adult'}:p)}};
 const refreshContent=async()=>{setContentStatus(s=>({...s,state:'syncing',error:null}));try{const{changed,data}=await syncOneDriveContent();setContentStatus({state:'ready',lastSync:data.syncedAt,version:data.version,vocabularyCount:data.vocabulary.length,sentenceCount:data.sentences.length,source:'OneDrive Excel'});if(changed)setTimeout(()=>location.reload(),450)}catch(e){setContentStatus(s=>({...s,state:'error',error:e.message}))}};
 useEffect(()=>{if(session)refreshContent()},[session?.user?.id]);
 useEffect(()=>{if(!session)return;const t=dayKey();if(app.progress.lastOpen!==t){const y=new Date();y.setDate(y.getDate()-1);app.update(p=>({...p,lastOpen:t,streak:p.lastOpen===dayKey(y)?Math.max(1,(p.streak||0)+1):1}))}},[session?.user?.id]);
 const go=n=>{setTab(n);game.updateGame(g=>({...g,lastTab:n}));window.scrollTo({top:0,behavior:'smooth'})};
 if(!authReady)return <div className="auth-loading">Afghan Fluent laden…</div>;
 if(!session)return <LoginScreen onReady={setSession}/>;
 if(!profile)return <div className="auth-loading">Profiel laden…</div>;
 const displayName=profile.display_name||'Leerling';
 return <div className={`app ${mode==='kids'?'kids-mode':''}`}><DesktopRail tab={tab} go={go} streak={app.progress.streak||0} isAdmin={profile.role==='admin'}/><div className="app-stage"><TopChrome mode={mode} setMode={setModePersist} displayName={displayName}/><main>
  {tab==='today'&&<Today app={app} game={game} go={go} displayName={displayName}/>}
  {tab==='path'&&<LearningPath app={app} openLesson={l=>{setSelectedLesson(l);go('words')}}/>}
  {tab==='games'&&<Games app={app} game={game} go={go}/>}
  {tab==='words'&&<Words app={app} game={game} go={go} selectedLesson={selectedLesson} clearSelectedLesson={()=>setSelectedLesson(null)}/>}
  {tab==='sentences'&&<Sentences/>}{tab==='grammar'&&<Grammar/>}{tab==='speak'&&<SpeakPractice/>}
  {tab==='profile'&&<Profile app={app} game={game} mode={mode} setMode={setModePersist} contentStatus={contentStatus} refreshContent={refreshContent} profile={profile} onLogout={()=>supabase.auth.signOut()}/>}
  {tab==='admin'&&profile.role==='admin'&&<AdminPanel session={session} profile={profile}/>}
 </main><BottomNav tab={tab} go={go}/></div></div>
}
function Brand(){return <div className="brand"><div className="brand-arch">A</div><div><strong>Afghan Fluent</strong><span>Leer Afghaans op jouw manier</span></div></div>}
function DesktopRail({tab,go,streak,isAdmin=false}){let items=[['today',Home,'Vandaag'],['path',BookOpen,'Leerpad'],['games',Trophy,'Spelen'],['words',Layers3,'Woorden'],['sentences',MessageCircle,'Zinnen'],['grammar',BookText,'Grammatica'],['speak',Mic,'Uitspraak']];if(isAdmin)items.push(['admin',ShieldCheck,'Beheer']);return <aside className="desktop-rail"><Brand/><div className="rail-stats"><span><Flame/> {streak} dagen</span><span><Sparkles/> 1000 woorden</span></div><nav>{items.map(([id,I,l])=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)}><I/><span>{l}</span></button>)}</nav><button className="profile-tile" onClick={()=>go('profile')}><div className="avatar">A</div><div><b>Jouw profiel</b><small>Family mode</small></div><ChevronRight/></button></aside>}
function TopChrome({mode,setMode,displayName}){return <header className="top-chrome"><div className="mobile-brand"><div className="mini-arch">A</div><span>Afghan Fluent</span></div><div className="mode-switch"><button className={mode==='family'?'active':''} onClick={()=>setMode('family')}>Volwassen</button><button className={mode==='kids'?'active':''} onClick={()=>setMode('kids')}>Kids</button></div></header>}
function PageHead({eyebrow,title,sub,badge}){return <div className="page-head"><div><span>{eyebrow}</span><h1>{title}</h1>{sub&&<p>{sub}</p>}</div>{badge&&<div className="page-badge">{badge}</div>}</div>}
function SectionTitle({title}){return <div className="section-title"><h2>{title}</h2></div>}
function GameSummary({game}){const pct=Math.min(100,Math.round(game.daily/game.goal*100));return <section className="game-summary"><div className="game-stat"><span><Trophy/></span><div><small>LEVEL</small><b>{game.level}</b></div></div><div className="game-xp"><div><b>{game.xp} XP</b><small>{500-game.levelXp} XP tot level {game.level+1}</small></div><div className="game-bar"><i style={{width:`${game.levelXp/5}%`}}/></div></div><div className="game-stat"><span><Star/></span><div><small>VANDAAG</small><b>{game.daily}/{game.goal}</b></div></div><div className="game-goal"><div className="game-bar"><i style={{width:`${pct}%`}}/></div><small>{pct}% dagdoel</small></div></section>}
function Quick({title,sub,icon,onClick}){return <button className="quick-card" onClick={onClick}><span className="quick-icon">{icon}</span><div><b>{title}</b><small>{sub}</small></div></button>}
function Today({app,game,go,displayName='Leerling'}){const known=app.knownIds.size;return <div className="screen today-screen home-v14"><section className="welcome"><div><p className="kicker">GOEDE DAG</p><h1>Salaam, {displayName}! <span>👋</span></h1><p>Vandaag is een mooie dag om te leren.</p></div><div className="streak-pill"><Flame/><b>{app.progress.streak||1}</b><span>dagen</span></div></section><div className="home-coach-stage" aria-hidden="true"><img className="home-coach-character" src={COACH_IMAGES.welcome} alt=""/></div><div className="continue-card" onClick={()=>go(game.game.lastTab&&game.game.lastTab!=='today'?game.game.lastTab:'path')}><div className="continue-copy"><small>GA VERDER WAAR JE WAS</small><h2>Verder leren</h2><div className="mini-progress"><i style={{width:`${Math.min(100,game.daily)}%`}}/></div></div><button aria-label="Verder leren"><ChevronRight/></button></div><section className="quick-grid home-actions"><Quick title="Spelen" sub="Verdien XP" icon={<Trophy/>} onClick={()=>go('games')}/><Quick title="Woorden" sub="Flashcards" icon={<Layers3/>} onClick={()=>go('words')}/><Quick title="Zinnen" sub="Oefen zinnen" icon={<MessageCircle/>} onClick={()=>go('sentences')}/><Quick title="Uitspraak" sub="Luister & spreek" icon={<Mic/>} onClick={()=>go('speak')}/></section><div className="review-banner home-review" onClick={()=>go('games')}><div className="seal"><Brain/></div><div><b>Nog oefenen</b><span>Korte challenge met wat extra aandacht nodig heeft.</span></div><ChevronRight/></div><section className="home-progress"><div className="home-progress-title"><span>JOUW VOORTGANG</span><b>Vandaag</b></div><GameSummary game={game}/><div className="profile-stats"><StatCard icon={<Layers3/>} value={known} label="Woorden"/><StatCard icon={<Trophy/>} value={game.xp} label="Totaal XP"/><StatCard icon={<Flame/>} value={app.progress.streak||1} label="Streak"/></div></section></div>}

function LearningPath({app,openLesson}){const lessons=useMemo(()=>{const a=[];for(let i=0;i<vocab.length;i+=20){const words=vocab.slice(i,i+20),counts={};words.forEach(w=>counts[w.category||'other']=(counts[w.category||'other']||0)+1);const c=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'other';a.push({id:`lesson-${a.length+1}`,number:a.length+1,category:c,title:labelFor(c),emoji:iconFor(c),words})}return a},[]);return <div className="screen"><PageHead eyebrow="JOUW ROUTE" title="Leerpad" sub={`${vocab.length} woorden verdeeld over lessen van ongeveer 20 woorden.`}/><div className="path-list">{lessons.map(l=>{const k=l.words.filter(w=>app.knownIds.has(w.id)).length,p=Math.round(k/l.words.length*100);return <div className="path-item" key={l.id}><span className={`path-node ${p===100?'complete':''}`}>{p===100?<Check/>:l.number}</span><button className="lesson-row" onClick={()=>openLesson(l)}><span className="lesson-art">{l.emoji}</span><div className="lesson-main"><b>{l.number}. {l.title}</b><small>{k} / {l.words.length} woorden</small><div className="tiny-bar"><i style={{width:`${p}%`}}/></div></div></button></div>})}</div></div>}

function SentenceBuilder({game}){
 const pool=useMemo(()=>sentences.filter(s=>(s.spoken||s.latin||'').trim().split(/\s+/).length>=3),[]),[idx,setIdx]=useState(game.game.positions?.builder||0),s=pool[idx%Math.max(1,pool.length)];
 const[bank,setBank]=useState([]),[answer,setAnswer]=useState([]),[result,setResult]=useState(null),[dragging,setDragging]=useState(null),[dragPos,setDragPos]=useState(null),[hoverSlot,setHoverSlot]=useState(null),[coachMessage,setCoachMessage]=useState(null); const drag=useRef(null);

 useEffect(()=>{if(!s)return;const words=(s.spoken||s.latin).trim().split(/\s+/).map((word,i)=>({id:`${s.id}-${i}-${word}`,word,origin:i}));setBank(shuffle(words));setAnswer(Array(words.length).fill(null));setResult(null);setDragging(null);setDragPos(null);setHoverSlot(null);setCoachMessage(null)},[s?.id]);

 const reset=()=>{const all=[...bank,...answer.filter(Boolean)];setBank(shuffle(all));setAnswer(Array(all.length).fill(null));setResult(null);setDragging(null);setDragPos(null);setHoverSlot(null);setCoachMessage(null)};
 const showHint=()=>{const first=(s.spoken||s.latin).trim().split(/\s+/)[0];setCoachMessage({type:'tip',text:`Begin eens met ‘${first}’. Daarna valt de rest vaak vanzelf op zijn plek.`})};
 const revealAnswer=()=>{const words=(s.spoken||s.latin).trim().split(/\s+/).map((word,i)=>({id:`${s.id}-${i}-${word}`,word,origin:i}));setAnswer(words);setBank([]);setResult(null);setCoachMessage({type:'help',text:'Ik heb de goede volgorde voor je klaargezet. Kijk er rustig naar.'})};

 const putInSlot=(tile,slot,source,sourceIndex)=>{setResult(null);setAnswer(a=>{const n=[...a],displaced=n[slot];n[slot]=tile;if(source==='slot'&&sourceIndex!==slot)n[sourceIndex]=displaced||null;else if(source==='bank'&&displaced)setBank(b=>[...b,displaced]);return n});if(source==='bank')setBank(b=>b.filter(x=>x.id!==tile.id))};
 const returnToBank=(slot)=>{const tile=answer[slot];if(!tile)return;setAnswer(a=>a.map((x,i)=>i===slot?null:x));setBank(b=>[...b,tile]);setResult(null)};
 const tapBank=tile=>{const slot=answer.findIndex(x=>!x);if(slot>=0)putInSlot(tile,slot,'bank',null)};
 const startDrag=(e,tile,source,sourceIndex)=>{if(result==='good')return;e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);drag.current={tile,source,sourceIndex,pointerId:e.pointerId};setDragging(tile.id);setDragPos({x:e.clientX,y:e.clientY,word:tile.word})};
 const moveDrag=e=>{if(!drag.current)return;e.preventDefault();setDragPos({x:e.clientX,y:e.clientY,word:drag.current.tile.word});const el=document.elementsFromPoint(e.clientX,e.clientY).find(n=>n?.dataset?.answerSlot!==undefined);setHoverSlot(el?Number(el.dataset.answerSlot):null)};
 const endDrag=e=>{if(!drag.current)return;const d=drag.current;const el=document.elementsFromPoint(e.clientX,e.clientY).find(n=>n?.dataset?.answerSlot!==undefined);const slot=el?Number(el.dataset.answerSlot):null;if(slot!==null)putInSlot(d.tile,slot,d.source,d.sourceIndex);drag.current=null;setDragging(null);setDragPos(null);setHoverSlot(null);try{e.currentTarget.releasePointerCapture?.(e.pointerId)}catch{}};

 const check=()=>{if(answer.some(x=>!x))return;const ok=answer.every((t,i)=>t?.origin===i);setResult(ok?'good':'bad');practice(game,`sentence:${s.id}`,ok);if(ok){awardXP(game,20,'zin gebouwd');setCoachMessage({type:'correct',text:'Perfect! Helemaal goed. +20 XP ✨'})}else{setCoachMessage({type:'almost',text:'Bijna — probeer het nog eens. Kijk nog even naar de volgorde.'})}};
 const next=()=>{const n=(idx+1)%pool.length;setIdx(n);remember(game,'builder',n)};

 if(!s)return null;
 const coachType=coachMessage?.type||'think'; const coachSrc=COACH_IMAGES[coachType]||COACH_IMAGES.think;

 const sentenceWords=(s.spoken||s.latin||'').trim().split(/\s+/).filter(Boolean);
 const sentenceChars=sentenceWords.join('').length;
 const longestWord=Math.max(1,...sentenceWords.map(w=>w.length));
 const tileFontSize=sentenceChars<=16&&longestWord<=8?18:sentenceChars<=24&&longestWord<=10?16:sentenceChars<=34&&longestWord<=12?14:12;

 return <section className={`game-card sentence-builder-v2 sentence-builder-v29 ${answer.length>3?'has-many-words':'has-three-words'}`} style={{'--word-count':Math.max(1,answer.length),'--sentence-tile-font':`${tileFontSize}px`}}>
   <div className="builder-v29-head">
     <div className="builder-v29-title">
       <small>🧩 BOUW DE ZIN <span className="builder-xp-inline">+20 XP</span></small>
       <h2>Zet de zin in<br/>goede volgorde</h2>
       <p>Sleep de woorden naar de juiste plek.</p>
     </div>
     <div className="builder-v29-tools" aria-label="Hulpmiddelen">
       <span className="spark s1">✦</span><span className="spark s2">✦</span><span className="spark s3">✦</span>
       <button onClick={showHint} aria-label="Hint" title="Hint">💡</button>
       <button onClick={()=>{speak(s.spoken||s.latin,.78,'sentence',s.id);setCoachMessage({type:'listen',text:'Luister goed naar het ritme en zeg de zin daarna rustig na.'})}} aria-label="Luister" title="Luister">🎧</button>
       <button onClick={revealAnswer} aria-label="Antwoord" title="Antwoord">👀</button>
     </div>
   </div>

   <div className="builder-v36-dutch-prompt" aria-label="Nederlandse voorbeeldzin">
     <span>{s.dutch}</span>
   </div>

   <div className={`answer-slots builder-v29-slots ${dragging?'is-dragging':''}`}>{answer.map((tile,i)=><div key={i} data-answer-slot={i} className={`answer-slot ${tile?'filled':''} ${hoverSlot===i?'hover':''} ${result==='good'?'correct-slot':''} ${result==='bad'&&tile?.origin!==i?'wrong-slot':''} ${result==='bad'&&tile?.origin===i?'right-slot':''}`}>{tile?<button className={`sentence-tile placed ${result==='bad'&&tile?.origin!==i?'is-wrong-position':''} ${result==='bad'&&tile?.origin===i?'is-right-position':''} ${dragging===tile.id?'is-held':''}`} onClick={()=>returnToBank(i)} onPointerDown={e=>startDrag(e,tile,'slot',i)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><span>{tile.word}</span></button>:<span className="slot-number">{i+1}</span>}</div>)}</div>

   <div className="builder-divider builder-v29-divider"><span>WOORDEN</span></div>
   <div className="word-bank builder-v29-bank">{bank.map(tile=><button key={tile.id} className={`sentence-tile bank-tile ${dragging===tile.id?'is-held':''}`} onClick={()=>tapBank(tile)} onPointerDown={e=>startDrag(e,tile,'bank',null)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><span>{tile.word}</span></button>)}</div>
   {dragPos&&<div className="floating-word-tile builder-v29-floating" style={{left:dragPos.x,top:dragPos.y}}>{dragPos.word}</div>}

   <div className="builder-v29-coach-zone">
     <div className="builder-v29-coach">
       <img src={coachSrc} alt="Farangis"/>
     </div>
     {coachMessage&&<div className={`builder-v29-coach-note ${coachMessage.type||''}`}><small>{coachMessage.type==='tip'?'TIP VAN FARANGIS ✨':coachMessage.type==='listen'?'LUISTER MET FARANGIS 🎧':coachMessage.type==='correct'?'GOED GEDAAN ✨':coachMessage.type==='almost'?'BIJNA!':coachMessage.type==='help'?'HULP VAN FARANGIS':'FARANGIS'}</small><span>{coachMessage.text}</span></div>}
     <div className="builder-v29-actions">
       <button className="ghost-game" onClick={reset}><RotateCcw/> Opnieuw</button>
       <button className="primary-game" disabled={answer.some(x=>!x)} onClick={result==='good'?next:check}>{result==='good'?'Volgende zin':'Controleren'}</button>
     </div>
   </div>
 </section>
}


function UnifiedGameTools({onHint,onListen,onAnswer}){
 return <div className="builder-v29-tools unified-game-tools" aria-label="Hulpmiddelen">
   <span className="spark s1">✦</span><span className="spark s2">✦</span><span className="spark s3">✦</span>
   <button onClick={onHint} aria-label="Hint" title="Hint">💡</button>
   <button onClick={onListen} aria-label="Luister" title="Luister">🎧</button>
   <button onClick={onAnswer} aria-label="Antwoord" title="Antwoord">👀</button>
 </div>
}
function UnifiedCoachZone({message,type='think',onReset,onPrimary,primaryLabel='Volgende',primaryDisabled=false}){
 const coachType=message?.type||type||'think', coachSrc=COACH_IMAGES[coachType]||COACH_IMAGES.think;
 return <div className="builder-v29-coach-zone unified-game-coach-zone">
   <div className="builder-v29-coach"><img src={coachSrc} alt="Farangis"/></div>
   {message&&<div className={`builder-v29-coach-note ${message.type||''}`}>
     <small>{message.type==='tip'?'TIP VAN FARANGIS ✨':message.type==='listen'?'LUISTER MET FARANGIS 🎧':message.type==='correct'?'GOED GEDAAN ✨':message.type==='almost'?'BIJNA!':message.type==='help'?'HULP VAN FARANGIS':message.type==='celebrate'?'TOP! 🎉':'FARANGIS'}</small>
     <span>{message.text}</span>
   </div>}
   <div className="builder-v29-actions">
     <button className="ghost-game" onClick={onReset}><RotateCcw/> Opnieuw</button>
     <button className="primary-game" disabled={primaryDisabled} onClick={onPrimary}>{primaryLabel}</button>
   </div>
 </div>
}

function ListeningQuiz({game}){
 const pool=useMemo(()=>sentences.filter(s=>(s.spoken||s.latin)&&s.dutch).slice(0,150),[]),[idx,setIdx]=useState(game.game.positions?.listen||0),[choice,setChoice]=useState(null),[coachMessage,setCoachMessage]=useState(null),s=pool[idx%Math.max(1,pool.length)];
 const opts=useMemo(()=>s?shuffle([s,...shuffle(pool.filter(x=>x.id!==s.id)).slice(0,3)]):[],[s?.id]);
 useEffect(()=>{setChoice(null);setCoachMessage(null)},[s?.id]);
 if(!s)return null;
 const play=()=>{speak(s.spoken||s.latin,.78,'sentence',s.id);setCoachMessage({type:'listen',text:'Luister goed naar de klank en het ritme. Daarna kun je kiezen.'})};
 const hint=()=>setCoachMessage({type:'tip',text:`Luister nog een keer. Denk aan de betekenis van wat je hoort.`});
 const reveal=()=>setCoachMessage({type:'help',text:`Het juiste antwoord is: “${s.dutch}”.`});
 const answer=o=>{if(choice)return;const ok=o.id===s.id;setChoice({id:o.id,ok});practice(game,`listen:${s.id}`,ok);if(ok){awardXP(game,15,'luisterquiz');setCoachMessage({type:'correct',text:'Goed gehoord! +15 XP ✨'})}else setCoachMessage({type:'almost',text:'Bijna. Luister nog eens rustig en vergelijk de antwoorden.'})};
 const reset=()=>{setChoice(null);setCoachMessage(null)};
 const next=()=>{const n=(idx+1)%pool.length;setIdx(n);setChoice(null);setCoachMessage(null);remember(game,'listen',n)};
 return <section className="game-card sentence-builder-v29 unified-game-card listening-unified">
   <div className="builder-v29-head unified-game-head">
     <div className="builder-v29-title"><small>🎧 LUISTERQUIZ <span className="builder-xp-inline">+15 XP</span></small><h2>Luister en kies<br/>het juiste antwoord</h2><p>Wat hoor je?</p></div>
     <UnifiedGameTools onHint={hint} onListen={play} onAnswer={reveal}/>
   </div>
   <button className="unified-listen-main" onClick={play}><Headphones/> Luister</button>
   <div className="quiz-options unified-choice-grid">{opts.map(o=><button key={o.id} onClick={()=>answer(o)} disabled={!!choice} className={choice?(o.id===s.id?'correct':choice.id===o.id?'wrong':'muted-answer'):''}>{o.id===s.id&&choice&&<Check/>}{choice?.id===o.id&&!choice.ok&&<X/>}{o.dutch}</button>)}</div>
   <UnifiedCoachZone message={coachMessage} onReset={reset} onPrimary={choice?next:play} primaryLabel={choice?'Volgende':'Luisteren'}/>
 </section>
}

function PictureQuiz({game}){
 const pool=useMemo(()=>vocab.filter(w=>Number(w.id)>=1).slice(0,300),[]),[idx,setIdx]=useState(game.game.positions?.picture||0),[choice,setChoice]=useState(null),[coachMessage,setCoachMessage]=useState(null),w=pool[idx%Math.max(1,pool.length)];
 const opts=useMemo(()=>w?shuffle([w,...shuffle(pool.filter(x=>x.id!==w.id)).slice(0,3)]):[],[w?.id]);
 useEffect(()=>{setChoice(null);setCoachMessage(null)},[w?.id]);
 if(!w)return null; const spoken=w.spoken||w.latin;
 const hint=()=>setCoachMessage({type:'tip',text:`Kijk goed naar de vier beelden en denk aan de betekenis van “${spoken}”.`});
 const listen=()=>{speak(spoken,.78);setCoachMessage({type:'listen',text:`Luister naar “${spoken}” en kijk daarna opnieuw naar de plaatjes.`})};
 const reveal=()=>setCoachMessage({type:'help',text:`“${spoken}” betekent “${w.dutch}”.`});
 const answer=o=>{if(choice)return;const ok=o.id===w.id;setChoice({id:o.id,ok});practice(game,`picture:${w.id}`,ok);if(ok){awardXP(game,10,'plaatjesquiz');setCoachMessage({type:'correct',text:'Precies! +10 XP ✨'})}else setCoachMessage({type:'almost',text:'Bijna. Kijk nog eens naar de betekenis en de vier beelden.'})};
 const reset=()=>{setChoice(null);setCoachMessage(null)};
 const next=()=>{const n=(idx+1)%pool.length;setIdx(n);setChoice(null);setCoachMessage(null);remember(game,'picture',n)};
 return <section className="game-card sentence-builder-v29 unified-game-card picture-unified">
   <div className="builder-v29-head unified-game-head">
     <div className="builder-v29-title"><small>🖼️ PLAATJESQUIZ <span className="builder-xp-inline">+10 XP</span></small><h2>Welke afbeelding<br/>hoort erbij?</h2><p>Kies het plaatje dat past bij het woord.</p></div>
     <UnifiedGameTools onHint={hint} onListen={listen} onAnswer={reveal}/>
   </div>
   <div className="picture-word unified-picture-word">{spoken}</div>
   <div className="picture-options unified-picture-grid">{opts.map(o=>{const correct=choice&&o.id===w.id,wrong=choice&&!choice.ok&&choice.id===o.id;return <button key={o.id} onClick={()=>answer(o)} disabled={!!choice} className={`${correct?'correct':''} ${wrong?'wrong':''} ${choice&&!correct&&!wrong?'muted-answer':''}`}><div className="picture-state">{correct?<Check/>:wrong?<X/>:null}</div><WordIllustration word={o}/><span>{o.dutch}</span></button>})}</div>
   <UnifiedCoachZone message={coachMessage} onReset={reset} onPrimary={choice?next:listen} primaryLabel={choice?'Volgende':'Luisteren'}/>
 </section>
}

function SpeedRound({game}){
 const[running,setRunning]=useState(false),[seconds,setSeconds]=useState(60),[score,setScore]=useState(0),[q,setQ]=useState(null),[opts,setOpts]=useState([]),[feedback,setFeedback]=useState(null),[coachMessage,setCoachMessage]=useState(null);const feedbackTimer=useRef(null);
 const newQ=()=>{const w=vocab[Math.floor(Math.random()*vocab.length)];setQ(w);setOpts(shuffle([w,...shuffle(vocab.filter(x=>x.id!==w.id)).slice(0,3)]));setFeedback(null);setCoachMessage(null)};
 useEffect(()=>{if(!running)return;const t=setInterval(()=>setSeconds(s=>s-1),1000);return()=>clearInterval(t)},[running]);
 useEffect(()=>{if(running&&seconds<=0){setRunning(false);clearTimeout(feedbackTimer.current);awardXP(game,score*5,'snelle ronde');setCoachMessage({type:'celebrate',text:`Ronde klaar! ${score} goed 🎉`})}},[seconds]);
 useEffect(()=>()=>clearTimeout(feedbackTimer.current),[]);
 const start=()=>{setSeconds(60);setScore(0);setRunning(true);newQ()};
 const answer=o=>{if(feedback||!running)return;const ok=o.id===q.id;if(ok)setScore(s=>s+1);practice(game,`speed:${q.id}`,ok);setFeedback({id:o.id,ok,correct:q.id,correctText:q.spoken||q.latin});setCoachMessage(ok?{type:'correct',text:'Goed! Snel én correct. ✨'}:{type:'almost',text:`Nog niet. Het juiste antwoord is “${q.spoken||q.latin}”.`});feedbackTimer.current=setTimeout(()=>{if(seconds>0)newQ()},ok?650:1050)};
 const hint=()=>q&&setCoachMessage({type:'tip',text:`Denk aan “${q.dutch}” en vergelijk de vier antwoorden.`});
 const listen=()=>{if(q){speak(q.spoken||q.latin,.78);setCoachMessage({type:'listen',text:'Luister naar het juiste Afghaanse woord.'})}};
 const reveal=()=>q&&setCoachMessage({type:'help',text:`“${q.dutch}” is “${q.spoken||q.latin}”.`});
 const reset=()=>{clearTimeout(feedbackTimer.current);setRunning(false);setSeconds(60);setScore(0);setQ(null);setOpts([]);setFeedback(null);setCoachMessage(null)};
 return <section className={`game-card sentence-builder-v29 unified-game-card speed-card speed-unified ${feedback?.ok?'speed-good':feedback&&!feedback.ok?'speed-bad':''}`}>
   <div className="builder-v29-head unified-game-head">
     <div className="builder-v29-title"><small>⚡ SNELLE RONDE <span className="builder-xp-inline">5 XP per goed</span></small><h2>Vertaal zo snel<br/>mogelijk</h2><p>{running?`${seconds} seconden over`:'60 seconden · zo veel mogelijk goed'}</p></div>
     <UnifiedGameTools onHint={hint} onListen={listen} onAnswer={reveal}/>
   </div>
   {!running&&seconds>0?<div className="unified-speed-start"><Zap/><p>Start de ronde en kies zo snel mogelijk het juiste antwoord.</p><button className="primary-game" onClick={start}>Start ronde</button></div>:running?<><div className="speed-prompt-card">
  <div className="speed-score-pill"><b>{score}</b><small>goed</small></div>
  <div className="speed-current-word"><small>VERTAAL</small><strong>{q?.dutch}</strong></div>
</div><div className="quiz-options unified-choice-grid speed-options">{opts.map(o=><button key={o.id} disabled={!!feedback} onClick={()=>answer(o)} className={feedback?(o.id===q.id?'correct':feedback.id===o.id?'wrong':'muted-answer'):''}>{feedback&&o.id===q.id&&<Check/>}{feedback&&!feedback.ok&&feedback.id===o.id&&<X/>}{o.spoken||o.latin}</button>)}</div></>:<div className="round-finish unified-round-finish"><Trophy/><h3>Ronde klaar!</h3><b>{score} goed · +{score*5} XP</b></div>}
   <UnifiedCoachZone message={coachMessage} onReset={reset} onPrimary={running?()=>{}:start} primaryLabel={running?`${seconds}s`:'Nog een ronde'} primaryDisabled={running}/>
 </section>
}

function Badges({app,game}){const a=[['Eerste stap','25 woorden',app.knownIds.size>=25,'🌱'],['Woordenkenner','100 woorden',app.knownIds.size>=100,'📚'],['Op stoom','500 XP',game.xp>=500,'⭐'],['Doorzetter','7 dagen',(app.progress.streak||0)>=7,'🔥'],['Taalheld','2500 XP',game.xp>=2500,'🏆']];return <div className="badges-grid">{a.map(([n,s,u,e])=><div key={n} className={`badge-card ${u?'unlocked':''}`}><span>{e}</span><b>{n}</b><small>{s}</small>{u&&<Medal/>}</div>)}</div>}
function Games({app,game,go}){const[type,setType]=useState(game.game.lastGame||'sentence');const choose=t=>{setType(t);game.updateGame(g=>({...g,lastGame:t}))};return <div className="screen focus-screen games-focus"><button className="focus-exit" onClick={()=>go('today')}><X/> Sluiten</button><PageHead eyebrow="SPELEN & LEREN" title="Challenges" sub="Oefen kort, verdien XP en verbeter wat nog lastig is." badge={<><Trophy/> Level {game.level}</>}/><GameSummary game={game}/><div className="games-tabs games-tabs-minimal"><button className={type==='sentence'?'active':''} onClick={()=>choose('sentence')}><BookText/><span>Bouw de zin</span></button><button className={type==='listen'?'active':''} onClick={()=>choose('listen')}><Headphones/><span>Luisteren</span></button><button className={type==='picture'?'active':''} onClick={()=>choose('picture')}><Layers3/><span>Plaatjes</span></button><button className={type==='speed'?'active':''} onClick={()=>choose('speed')}><Zap/><span>Snelle ronde</span></button></div>{type==='sentence'?<SentenceBuilder game={game}/>:type==='listen'?<ListeningQuiz game={game}/>:type==='picture'?<PictureQuiz game={game}/>:<SpeedRound game={game}/>}<SectionTitle title="Badges"/><Badges app={app} game={game}/></div>}

function Words({app,game,go,selectedLesson,clearSelectedLesson}){const[query,setQuery]=useState(''),[idx,setIdx]=useState(game.game.positions?.words||0),[revealed,setRevealed]=useState(false),[dragX,setDragX]=useState(0),[dragging,setDragging]=useState(false),start=useRef(null),[exit,setExit]=useState(null);const filtered=useMemo(()=>{const ids=selectedLesson?new Set(selectedLesson.words.map(x=>x.id)):null;return vocab.filter(v=>(!ids||ids.has(v.id))&&(!query||`${v.dutch} ${v.spoken} ${v.latin}`.toLowerCase().includes(query.toLowerCase())))},[query,selectedLesson]);const w=filtered[idx%Math.max(1,filtered.length)]||vocab[0],nextW=filtered[(idx+1)%Math.max(1,filtered.length)]||w,known=app.knownIds.has(w.id);const finish=right=>{if(exit)return;app.update(p=>{const set=new Set(p.known||[]),was=set.has(w.id);right?set.add(w.id):set.delete(w.id);return{...p,known:[...set]}});practice(game,`word:${w.id}`,right);if(right&&!known)awardXP(game,10,'woord geleerd');setExit(right?'right':'left');setDragX(right?700:-700);setTimeout(()=>{const n=(idx+1)%filtered.length;setIdx(n);remember(game,'words',n);setRevealed(false);setDragX(0);setExit(null)},270)};return <div className="screen focus-screen words-focus"><button className="focus-exit" onClick={()=>go('today')}><X/> Sluiten</button><PageHead eyebrow="1000+ WOORDEN" title="Woorden" sub="Swipe rechts: Ken ik. Links: Nog oefenen." badge={<>{idx+1} / {filtered.length}</>}/>{selectedLesson&&<div className="review-banner"><div className="seal">{selectedLesson.emoji}</div><div><b>Les {selectedLesson.number} · {selectedLesson.title}</b><span>{selectedLesson.words.length} woorden</span></div><button onClick={clearSelectedLesson}><X/></button></div>}<div className="word-toolbar"><label><Search/><input value={query} onChange={e=>{setQuery(e.target.value);setIdx(0)}} placeholder="Zoek Nederlands of fonetisch…"/></label></div><div className="swipe-stage"><article className="premium-flashcard swipe-card swipe-card-under"><WordIllustration word={nextW}/></article><article className="premium-flashcard swipe-card swipe-card-top" style={{transform:`translateX(${dragX}px) rotate(${dragX/24}deg)`,transition:dragging?'none':'transform .27s'}} onPointerDown={e=>{start.current=e.clientX;setDragging(true)}} onPointerMove={e=>{if(start.current!==null)setDragX(Math.max(-220,Math.min(220,e.clientX-start.current)))}} onPointerUp={()=>{setDragging(false);start.current=null;if(Math.abs(dragX)>85)finish(dragX>0);else setDragX(0)}} onClick={()=>Math.abs(dragX)<8&&setRevealed(r=>!r)}><div className={`swipe-stamp learn ${dragX<-25?'show':''}`}>NOG OEFENEN</div><div className={`swipe-stamp know ${dragX>25?'show':''}`}>KEN IK!</div><div className="card-top"><span>{labelFor(w.category)}</span></div><WordIllustration word={w}/><div className="word-copy"><small>NEDERLANDS</small><h2>{w.dutch}</h2>{revealed?<><small>ZO ZEG JE HET</small><h3>{w.spoken||w.latin}</h3><button className="sound-btn" onClick={e=>{e.stopPropagation();speak(w.spoken||w.latin,.88,'word',w.id)}}><Volume2/> Luister</button></>:<div className="reveal-hint"><Eye/> Tik voor vertaling</div>}</div></article></div><div className="card-nav swipe-actions-row"><button onClick={()=>finish(false)}><X/> Nog oefenen</button><button onClick={()=>finish(true)}><Check/> Ken ik! +10 XP</button></div></div>}

function WordIllustration({word}){const n=Number(word?.id),file=Number.isFinite(n)&&n>=1?String(n).padStart(3,'0'):null,[failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[n]);if(file&&!failed){const url=`/images/words/${file}.png`;return <div className="word-illustration word-illustration-image" style={{backgroundImage:`url("${url}")`,backgroundSize:'contain',backgroundPosition:'center',backgroundRepeat:'no-repeat',backgroundColor:'#f7f0e3'}}><img src={url} alt="" onError={()=>setFailed(true)} style={{display:'none'}}/></div>}return <div className="word-illustration"><span>{iconFor(word?.category)}</span></div>}
function Sentences(){const[q,setQ]=useState('');const data=sentences.filter(s=>!q||`${s.dutch} ${s.spoken}`.toLowerCase().includes(q.toLowerCase()));return <div className="screen"><PageHead eyebrow="400+ ZINNEN" title="Zinnen" sub="Leer complete zinnen."/><div className="word-toolbar"><label><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Zoek in zinnen…"/></label></div><Coach compact placement="section" type="tip" text="Tip: leer zinnen als één geheel. Zo klinkt je Afghaans sneller natuurlijk."/><div className="sentence-list">{data.slice(0,80).map((s,i)=><article className="sentence-card" key={s.id}><div className="sentence-num">{String(i+1).padStart(2,'0')}</div><div className="sentence-copy"><h3>{s.dutch}</h3><p>{s.spoken||s.latin}</p></div><button onClick={()=>speak(s.spoken||s.latin,.82)}><Volume2/></button></article>)}</div></div>}
function Grammar(){return <div className="screen"><PageHead eyebrow="PRAKTISCH" title="Grammatica" sub="Spreken vóór regels uit het hoofd leren."/><Coach compact placement="section" type="explain" text="Ik help je met de logica achter de taal. Geen lange regels — vooral voorbeelden die je meteen kunt gebruiken."/><div className="grammar-hero"><div className="grammar-mark">Aa</div><div><h2>Leer de logica door te spreken</h2><p>Korte patronen en voorbeelden uit je eigen woordenlijst.</p></div></div></div>}
function SpeakPractice(){const pool=sentences.filter(s=>s.spoken).slice(0,50),[idx,setIdx]=useState(0),s=pool[idx]||sentences[0];return <div className="screen"><PageHead eyebrow="LUISTER & SPREEK" title="Uitspraak"/><section className="speak-practice-card"><Coach hero placement="speak" type="listen" text="Luister eerst goed. Daarna doen we hem samen."/><div className="sound-orbit"><button onClick={()=>speak(s.spoken,.72)}><Volume2/></button></div><h2>{s.spoken}</h2><p>{s.dutch}</p><button className="record-main" onClick={()=>speak(s.spoken,.72)}><Headphones/> Luister opnieuw</button><div className="speak-actions"><button onClick={()=>setIdx(i=>(i-1+pool.length)%pool.length)}><ChevronLeft/></button><button onClick={()=>setIdx(i=>(i+1)%pool.length)}>Volgende <ChevronRight/></button></div></section></div>}
function StatCard({icon,value,label}){return <div className="stat-card"><span>{icon}</span><b>{value}</b><small>{label}</small></div>}
function Profile({app,game,mode,setMode,contentStatus,refreshContent,profile,onLogout}){return <div className="screen"><PageHead eyebrow="JOUW VOORTGANG" title="Profiel"/><div className="profile-hero"><div className="big-avatar">{(profile?.display_name||"A")[0]}</div><div><h2>{profile?.display_name||"Leerling"}</h2><p>{profile?.role==="admin"?"Administrator":"Afghan Fluent learner"}</p><span><Flame/> {app.progress.streak||1} dagen streak</span></div></div><GameSummary game={game}/><div className="profile-stats"><StatCard icon={<Layers3/>} value={app.knownIds.size} label="Woorden beheerst"/><StatCard icon={<Trophy/>} value={game.xp} label="XP"/><StatCard icon={<MessageCircle/>} value={contentStatus?.sentenceCount||sentences.length} label="Zinnen"/></div><SectionTitle title="Leerinstellingen"/><div className="settings-card"><div><div className="setting-icon"><UserRound/></div><div><b>Weergave</b><span>Volwassen of extra speels voor kinderen.</span></div></div><div className="segmented"><button className={mode==='family'?'active':''} onClick={()=>setMode('family')}>Volwassen</button><button className={mode==='kids'?'active':''} onClick={()=>setMode('kids')}>Kids</button></div></div><div className="settings-card"><div><div className="setting-icon"><RefreshCw/></div><div><b>OneDrive Excel</b><span>{contentStatus?.vocabularyCount||vocab.length} woorden · {contentStatus?.sentenceCount||sentences.length} zinnen</span></div></div><button className="sync-now" onClick={refreshContent}>Nu synchroniseren</button></div><div className="sync-note"><ShieldCheck/> OneDrive blijft de masterbron voor je woorden en zinnen.</div><button className="logout-button" onClick={onLogout}>Uitloggen</button></div>}
function BottomNav({tab,go}){const x=[['today',Home,'Vandaag'],['path',BookOpen,'Leerpad'],['games',Trophy,'Spelen'],['words',Layers3,'Woorden'],['profile',UserRound,'Profiel']];return <nav className="bottom-nav">{x.map(([id,I,l])=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)}><I/><span>{l}</span></button>)}</nav>}
createRoot(document.getElementById('root')).render(<App/>);

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
const MISSION_TYPES=['picture','listen','sentence','speed'];
const CURRICULUM_ORDER=['greetings','numbers','family','people','home','food','daily','questions','verbs','time','school','clothes','body','feelings','shopping','travel','work','nature','animals','colors','other'];
const LEVEL_TITLES=['Eerste woorden','Hallo & kennismaken','Tellen & kiezen','Mijn familie','Mensen om je heen','Thuis','Eten & drinken','Elke dag','Vragen stellen','Doen & bewegen','Tijd & plannen','School & leren','Kleding','Lichaam & gezondheid','Gevoelens','Winkelen','Onderweg','Werk & afspraken','Buiten & natuur','Dieren','Kleuren & beschrijven','Meer dagelijkse woorden','Korte antwoorden','Korte zinnen','Luisteren in context','Zinnen combineren','Vraag en antwoord','Dagelijkse gesprekken','Thuis praten','Samen eten','Op pad','Plannen maken','Vertellen wat je doet','Vertellen wat je wilt','Mensen beschrijven','Plaatsen beschrijven','Meer luisteren','Sneller herkennen','Langere zinnen','Gesprekken volgen','Zonder vertaling denken','Tempo maken','Combineren & reageren','Praktische gesprekken','Vrijer spreken','Natuurlijk luisteren','Snel reageren','Alles door elkaar','Eindmissie','Afghan Fluent'];
function buildCurriculum(){
 const rank=Object.fromEntries(CURRICULUM_ORDER.map((c,i)=>[c,i]));
 const ordered=[...vocab].sort((a,b)=>(rank[a.category]??999)-(rank[b.category]??999)||Number(a.id)-Number(b.id));
 const levels=[];
 for(let i=0;i<50;i++){
  const words=ordered.slice(i*20,(i+1)*20);
  const counts={}; words.forEach(w=>counts[w.category||'other']=(counts[w.category||'other']||0)+1);
  const category=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'other';
  const maxWords=i<10?4:i<25?6:i<40?9:99;
  let sentencePool=sentences.filter(x=>{const n=(x.spoken||x.latin||'').trim().split(/\s+/).filter(Boolean).length;return n>=3&&n<=maxWords});
  if(sentencePool.length<12)sentencePool=sentences.filter(x=>(x.spoken||x.latin||'').trim());
  const sentenceStart=(i*7)%Math.max(1,sentencePool.length);
  const levelSentences=Array.from({length:Math.min(12,sentencePool.length)},(_,j)=>sentencePool[(sentenceStart+j)%sentencePool.length]).filter(Boolean);
  const phase=i<10?'Herkennen & uitspreken':i<20?'Korte zinnen begrijpen':i<30?'Zelf zinnen maken':i<40?'Gesprekken volgen':'Vrij reageren'; const difficulty=i<10?'Starter':i<20?'Basis':i<30?'Actief':i<40?'Gesprek':'Vloeiender'; levels.push({id:`level-${i+1}`,number:i+1,title:LEVEL_TITLES[i]||`Level ${i+1}`,category,emoji:iconFor(category),words,sentences:levelSentences,difficulty,phase});
 }
 return levels;
}
const CURRICULUM=buildCurriculum();
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
 const xp=game.xp||0,completed=new Set(game.completedLevels||[]),level=Math.min(50,Math.max(1,completed.size+1));return{game,updateGame,xp,level,levelXp:game.levelPoints?.[level]||0,daily:game.daily?.date===dayKey()?(game.daily.xp||0):0,goal:game.dailyGoal||80,kiteTickets:game.kiteTickets||0};
}
function rewardFor(base,{hint=false,wrong=0,revealed=false}={}){let n=base;if(hint)n*=.75;if(wrong)n*=Math.max(.35,1-Math.min(3,wrong)*.15);if(revealed)n*=.5;return Math.max(1,Math.round(n))}
function awardXP(gs,n,reason,level=null){gs.updateGame(g=>{const d=g.daily?.date===dayKey()?g.daily:{date:dayKey(),xp:0},lp={...(g.levelPoints||{})},after=(g.xp||0)+n;if(level)lp[level]=(lp[level]||0)+n;return{...g,xp:after,levelPoints:lp,daily:{date:dayKey(),xp:(d.xp||0)+n},lastActivity:{date:new Date().toISOString(),reason,amount:n}}})}
function completeMission(gs,level,type){if(!level||!MISSION_TYPES.includes(type))return;gs.updateGame(g=>{const missions={...(g.levelMissions||{})},done=new Set(missions[level]||[]);done.add(type);missions[level]=[...done];const completed=new Set(g.completedLevels||[]);let tickets=g.kiteTickets||0;if(done.size===MISSION_TYPES.length&&!completed.has(level)){completed.add(level);tickets+=1}return{...g,levelMissions:missions,completedLevels:[...completed].sort((a,b)=>a-b),kiteTickets:tickets}})}
function saveMissionResult(gs,level,type,correct,total,minCorrect=0){const accuracy=total?Math.round(correct/total*100):0,passed=total>0&&correct>=minCorrect&&accuracy>80;gs.updateGame(g=>{const levelResult={...(g.levelResults?.[level]||{}),[type]:{correct,total,accuracy,passed,finishedAt:new Date().toISOString()}},levelResults={...(g.levelResults||{}),[level]:levelResult},missions={...(g.levelMissions||{})},done=new Set(missions[level]||[]);if(passed)done.add(type);else done.delete(type);missions[level]=[...done];const wordsDone=!!g.levelWordsCompleted?.[level],allPassed=MISSION_TYPES.every(m=>levelResult[m]?.passed===true),completed=new Set(g.completedLevels||[]);let tickets=g.kiteTickets||0;if(wordsDone&&allPassed&&!completed.has(level)){completed.add(level);tickets+=1}return{...g,levelResults,levelMissions:missions,completedLevels:[...completed].sort((a,b)=>a-b),kiteTickets:tickets}});return{accuracy,passed}}
function markLevelWordSeen(gs,level,wordId,totalWordIds=[]){if(!level||!wordId)return;gs.updateGame(g=>{const seenMap={...(g.levelWordSeen||{})},seen=new Set(seenMap[level]||[]);seen.add(Number(wordId));seenMap[level]=[...seen];const required=[...new Set((totalWordIds||[]).map(Number).filter(Number.isFinite))],wordsDone=required.length>0&&required.every(id=>seen.has(id)),completedMap={...(g.levelWordsCompleted||{})};if(wordsDone)completedMap[level]=true;const results=g.levelResults?.[level]||{},allPassed=MISSION_TYPES.every(m=>results[m]?.passed===true),completed=new Set(g.completedLevels||[]);let tickets=g.kiteTickets||0;if(wordsDone&&allPassed&&!completed.has(level)){completed.add(level);tickets+=1}return{...g,levelWordSeen:seenMap,levelWordsCompleted:completedMap,completedLevels:[...completed].sort((a,b)=>a-b),kiteTickets:tickets}})}
function levelWordsDone(game,level){return !!game.game.levelWordsCompleted?.[level]}
function remember(gs,k,v){gs.updateGame(g=>({...g,positions:{...(g.positions||{}),[k]:v}}))}
function practice(gs,k,ok){gs.updateGame(g=>{const p={...(g.practice||{})},o=p[k]||{right:0,wrong:0,priority:0,streak:0};const streak=ok?(o.streak||0)+1:0,days=ok?(streak>=4?14:streak>=3?7:streak>=2?3:1):0;p[k]={right:o.right+(ok?1:0),wrong:o.wrong+(ok?0:1),priority:Math.max(0,(o.priority||0)+(ok?-1:3)),streak,due:new Date(Date.now()+days*86400000).toISOString(),last:new Date().toISOString(),mastered:streak>=4};return{...g,practice:p}})}
function reviewItems(game,limit=20){const now=Date.now();return Object.entries(game.game.practice||{}).filter(([,v])=>!v.due||new Date(v.due).getTime()<=now||(v.priority||0)>0).sort((a,b)=>(b[1].priority||0)-(a[1].priority||0)).slice(0,limit)}
function masteryCount(game){return Object.values(game.game.practice||{}).filter(v=>v.mastered).length}
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
 return <div className="auth-shell"><div className="auth-card"><Brand/><div className="auth-coach"><img src={COACH_IMAGES.welcome} alt="Farangis"/></div><small>WELKOM TERUG</small><h1>Salaam 👋</h1><p>Log in om je eigen woorden, VP en voortgang te laden.</p><form onSubmit={login}><label>Naam of e-mailadres<input type="text" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Wachtwoord<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<div className="auth-error">{error}</div>}<button className="auth-primary" disabled={busy}>{busy?'Even laden…':'Inloggen'}</button></form></div></div>
}
async function loadCloudState(session){
 const response=await fetch('/api/profile',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data?.error||'Profiel kon niet worden geladen.');
 return data;
}
function AdminPanel({session,profile}){
 const[users,setUsers]=useState([]),[name,setName]=useState(''),[password,setPassword]=useState(''),[mode,setMode]=useState('adult'),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const[recordType,setRecordType]=useState('word'),[recordIndex,setRecordIndex]=useState(0),[recording,setRecording]=useState(false),[audioUrl,setAudioUrl]=useState(null);
 const[recordedMap,setRecordedMap]=useState({}),[currentAudio,setCurrentAudio]=useState(null),[searchAudio,setSearchAudio]=useState('');
 const mediaRef=useRef(null),chunksRef=useRef([]);

 const refresh=async()=>{const r=await fetch('/api/admin-users',{headers:{Authorization:`Bearer ${session.access_token}`}});const j=await r.json();if(r.ok)setUsers(j.users||[])};
 const loadAudioState=async()=>{
  const{data,error}=await supabase.from('audio_recordings').select('item_type,item_id,storage_path,updated_at').eq('approved',true);
  if(error){setMsg(error.message);return}
  const map={};(data||[]).forEach(r=>map[`${r.item_type}:${r.item_id}`]=r);setRecordedMap(map);
 };
 useEffect(()=>{refresh();loadAudioState()},[]);

 const createUser=async e=>{e.preventDefault();setBusy(true);setMsg('');const r=await fetch('/api/admin-users',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({displayName:name,password,mode})});const j=await r.json();setBusy(false);setMsg(r.ok?'Gebruiker aangemaakt.':j.error||'Aanmaken mislukt.');if(r.ok){setName('');setPassword('');refresh()}};
 const resetUser=async id=>{if(!confirm('Alle leerprogressie van deze gebruiker resetten?'))return;const r=await fetch('/api/admin-reset',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({userId:id})});setMsg(r.ok?'Voortgang gereset.':'Resetten mislukt.')};

 const items=recordType==='word'?vocab:sentences;
 const filteredItems=searchAudio.trim()?items.filter(x=>`${x.id} ${x.dutch} ${x.spoken||x.latin}`.toLowerCase().includes(searchAudio.trim().toLowerCase())):items;
 const item=filteredItems.length?filteredItems[Math.min(recordIndex,filteredItems.length-1)]:null;
 const spoken=item?.spoken||item?.latin;
 const audioKey=item?`${recordType}:${Number(item.id)}`:'';
 const existing=recordedMap[audioKey];
 const recordedCount=Object.keys(recordedMap).filter(k=>k.startsWith(`${recordType}:`)).length;
 const progressPct=items.length?Math.round(recordedCount/items.length*100):0;

 useEffect(()=>{
  setAudioUrl(null);mediaRef.current=null;setCurrentAudio(null);
  if(!existing?.storage_path)return;
  const{data}=supabase.storage.from('farangis-audio').getPublicUrl(existing.storage_path);
  if(data?.publicUrl)setCurrentAudio(data.publicUrl);
 },[audioKey,existing?.storage_path]);

 const changeType=t=>{setRecordType(t);setRecordIndex(0);setSearchAudio('');setAudioUrl(null);mediaRef.current=null};
 const goNext=()=>setRecordIndex(i=>filteredItems.length?Math.min(i+1,filteredItems.length-1):0);
 const goPrev=()=>setRecordIndex(i=>Math.max(0,i-1));

 const startRecording=async()=>{
  try{
   setMsg('');
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   const mr=new MediaRecorder(stream);chunksRef.current=[];
   mr.ondataavailable=e=>{if(e.data?.size)chunksRef.current.push(e.data)};
   mr.onstop=()=>{const mime=mr.mimeType||'audio/webm';const blob=new Blob(chunksRef.current,{type:mime});setAudioUrl(URL.createObjectURL(blob));mediaRef.current={blob,mime};stream.getTracks().forEach(t=>t.stop())};
   mr.start();mediaRef.current=mr;setRecording(true);
  }catch(e){setMsg('Microfoon kon niet worden geopend. Controleer de toestemming in Safari.')}
 };
 const stopRecording=()=>{if(mediaRef.current?.state==='recording')mediaRef.current.stop();setRecording(false)};
 const discardRecording=()=>{if(audioUrl)URL.revokeObjectURL(audioUrl);setAudioUrl(null);mediaRef.current=null};

 const saveRecording=async()=>{
  if(!mediaRef.current?.blob||!item)return;
  setBusy(true);setMsg('');
  try{
   const mime=mediaRef.current.mime||'audio/webm';
   const ext=mime.includes('mp4')?'m4a':mime.includes('mpeg')?'mp3':mime.includes('wav')?'wav':'webm';
   const stamp=new Date().toISOString().replace(/[:.]/g,'-');
   const path=`${recordType}s/${item.id}/${stamp}.${ext}`;

   const{error:upErr}=await supabase.storage.from('farangis-audio').upload(path,mediaRef.current.blob,{upsert:false,contentType:mime});
   if(upErr)throw upErr;

   if(existing?.storage_path){
    const{error:vErr}=await supabase.from('audio_recording_versions').insert({
     item_type:recordType,item_id:Number(item.id),storage_path:existing.storage_path,
     replaced_by:path,recorded_by:session.user.id
    });
    if(vErr)throw vErr;
   }

   const{error:dbErr}=await supabase.from('audio_recordings').upsert({
    item_type:recordType,item_id:Number(item.id),storage_path:path,
    recorded_by:session.user.id,approved:true,updated_at:new Date().toISOString()
   },{onConflict:'item_type,item_id'});
   if(dbErr)throw dbErr;

   setMsg(existing?'Nieuwe uitspraak opgeslagen ✓ Vorige opname is bewaard.':'Opname opgeslagen ✓');
   discardRecording();await loadAudioState();goNext();
  }catch(e){setMsg(e.message||'Opslaan mislukt.')}
  finally{setBusy(false)}
 };

 const restorePrevious=async()=>{
  if(!item)return;
  setBusy(true);setMsg('');
  try{
   const{data:version,error}=await supabase.from('audio_recording_versions')
    .select('id,storage_path').eq('item_type',recordType).eq('item_id',Number(item.id))
    .order('created_at',{ascending:false}).limit(1).maybeSingle();
   if(error)throw error;if(!version)throw new Error('Er is geen vorige opname om te herstellen.');
   const current=existing?.storage_path;
   const{error:uErr}=await supabase.from('audio_recordings').update({storage_path:version.storage_path,updated_at:new Date().toISOString()})
    .eq('item_type',recordType).eq('item_id',Number(item.id));
   if(uErr)throw uErr;
   await supabase.from('audio_recording_versions').delete().eq('id',version.id);
   if(current)await supabase.from('audio_recording_versions').insert({item_type:recordType,item_id:Number(item.id),storage_path:current,replaced_by:version.storage_path,recorded_by:session.user.id});
   setMsg('Vorige opname hersteld ✓');await loadAudioState();
  }catch(e){setMsg(e.message||'Herstellen mislukt.')}
  finally{setBusy(false)}
 };

 return <div className="admin-screen"><PageHead eyebrow="ADMIN" title="Beheer" sub="Gebruikers, voortgang en de stem van Farangis."/>
  {msg&&<div className="admin-message">{msg}</div>}
  <section className="admin-card"><h3>Gebruikers</h3><div className="admin-users">{users.map(u=><div className="admin-user" key={u.id}><div className="admin-avatar">{(u.display_name||'?')[0]}</div><div><b>{u.display_name}</b><span>{u.role==='admin'?'Administrator':u.mode==='kids'?'Kids':'Volwassen'}</span></div>{u.role!=='admin'&&<button onClick={()=>resetUser(u.id)}><RefreshCw/> Reset</button>}</div>)}</div>
   <form className="admin-create" onSubmit={createUser}><h4>Nieuw account</h4><input placeholder="Naam, bijvoorbeeld Aeden" value={name} onChange={e=>setName(e.target.value)} required/><input placeholder="Tijdelijk wachtwoord" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength="6" required/><select value={mode} onChange={e=>setMode(e.target.value)}><option value="adult">Volwassen</option><option value="kids">Kids</option></select><button disabled={busy}><UserRound/> Account aanmaken</button></form>
  </section>

  <section className="admin-card audio-admin">
   <div className="audio-admin-head"><div><small>STEM VAN FARANGIS</small><h3>Audio opnemen</h3><p>Neem op, luister terug en vervang later zonder oude opnames kwijt te raken.</p></div><div className="audio-progress-badge"><b>{recordedCount}/{items.length}</b><span>{progressPct}% opgenomen</span></div></div>
   <div className="audio-progress-track"><i style={{width:`${progressPct}%`}}/></div>
   <div className="audio-type-switch"><button className={recordType==='word'?'active':''} onClick={()=>changeType('word')}>Woorden</button><button className={recordType==='sentence'?'active':''} onClick={()=>changeType('sentence')}>Zinnen</button></div>
   <div className="audio-browser"><button onClick={goPrev} disabled={recordIndex===0}><ChevronLeft/></button><input value={searchAudio} onChange={e=>{setSearchAudio(e.target.value);setRecordIndex(0)}} placeholder="Zoek nummer, Nederlands of fonetisch…"/><button onClick={goNext} disabled={recordIndex>=filteredItems.length-1}><ChevronRight/></button></div>
   {item?<>
    <div className="record-meta"><span>{recordType==='word'?'WOORD':'ZIN'} {item.id}</span><span className={existing?'done':'todo'}>{existing?'✓ Opgenomen':'Nog opnemen'}</span></div>
    <div className="record-prompt"><small>NEDERLANDS</small><b>{item.dutch}</b><small>FONETISCH</small><strong>{spoken||'—'}</strong></div>
    {currentAudio&&<div className="current-recording"><div><small>HUIDIGE OPNAME</small><b>Farangis</b></div><audio controls src={currentAudio}/>{existing&&<button className="restore-audio" onClick={restorePrevious} disabled={busy}><RotateCcw/> Vorige herstellen</button>}</div>}
    <div className="record-actions">
     {!recording?<button className="record-button" onClick={startRecording}><Mic/> {existing?'Opnieuw opnemen':'Opnemen'}</button>:<button className="record-button recording" onClick={stopRecording}><Square/> Stop</button>}
     {audioUrl&&<div className="new-recording"><small>NIEUWE OPNAME — LUISTER EERST TERUG</small><audio controls src={audioUrl}/><div><button className="discard-audio" onClick={discardRecording}><Trash2/> Opnieuw</button><button className="save-audio" onClick={saveRecording} disabled={busy}><Check/> {existing?'Vervangen & volgende':'Opslaan & volgende'}</button></div></div>}
    </div>
   </>:<div className="audio-empty">Geen resultaten gevonden.</div>}
  </section>
 </div>
}
function App(){
 const[session,setSession]=useState(null),[authReady,setAuthReady]=useState(false),[profile,setProfile]=useState(null),[cloudProgress,setCloudProgress]=useState({}),[cloudGame,setCloudGame]=useState({});
 const[tab,setTab]=useState('today'),[mode,setMode]=useState('family'),[selectedLesson,setSelectedLesson]=useState(null);
 const[contentStatus,setContentStatus]=useState(()=>readJsonStorage(CONTENT_STATUS_KEY,{state:cachedContent?'cached':'bundled',lastSync:cachedContent?.syncedAt||null,vocabularyCount:vocab.length,sentenceCount:sentences.length,source:cachedContent?'OneDrive cache':'Ingebouwde reservekopie'}));
 const syncTimer=useRef(null),gameTimer=useRef(null);
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);setAuthReady(true)});return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{
  if(!session?.user?.id){setProfile(null);return}
  let cancelled=false;
  loadCloudState(session).then(s=>{if(cancelled)return;setProfile(s.profile);setCloudProgress(s.progress||{});setCloudGame(s.game||{});setMode(s.profile?.mode==='kids'?'kids':'family')}).catch(error=>{
   console.error('Profiel laden mislukt',error);
   if(cancelled)return;
   const fallbackRole=session.user.app_metadata?.role==='admin'?'admin':'user';
   setProfile({id:session.user.id,display_name:session.user.user_metadata?.display_name||session.user.email?.split('@')[0]||'Leerling',role:fallbackRole,mode:'adult',is_active:true,_loadError:error.message});
  });
  return()=>{cancelled=true};
 },[session?.user?.id]);
 const queueProgress=p=>{if(!session?.user?.id)return;clearTimeout(syncTimer.current);syncTimer.current=setTimeout(async()=>{const known=new Set((p.known||[]).map(String));await supabase.from('user_progress').upsert({user_id:session.user.id,streak:p.streak||0,last_active_date:p.lastOpen||dayKey(),updated_at:new Date().toISOString()});if(known.size){await supabase.from('word_progress').upsert([...known].map(id=>({user_id:session.user.id,word_id:Number(id),status:'mastered',updated_at:new Date().toISOString()})),{onConflict:'user_id,word_id'})}},450)};
 const queueGame=g=>{if(!session?.user?.id)return;clearTimeout(gameTimer.current);gameTimer.current=setTimeout(()=>supabase.from('user_progress').upsert({user_id:session.user.id,xp:g.xp||0,level:Math.min(50,Math.max(1,(g.completedLevels||[]).length+1)),updated_at:new Date().toISOString()}),450)};
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
  {tab==='path'&&<LearningPath app={app} game={game} isAdmin={profile.role==='admin'} openLesson={l=>{setSelectedLesson(l);go('games')}}/>}
  {tab==='games'&&<Games app={app} game={game} go={go} isAdmin={profile.role==='admin'} selectedLesson={selectedLesson} clearSelectedLesson={()=>setSelectedLesson(null)}/>}
  {tab==='words'&&<Words app={app} game={game} go={go} selectedLesson={selectedLesson} clearSelectedLesson={()=>setSelectedLesson(null)}/>} {tab==='review'&&<ReviewPractice game={game} go={go}/>} 
  {tab==='sentences'&&<Sentences/>}{tab==='grammar'&&<Grammar/>}{tab==='speak'&&<SpeakPractice/>}
  {tab==='profile'&&<Profile app={app} game={game} mode={mode} setMode={setModePersist} contentStatus={contentStatus} refreshContent={refreshContent} profile={profile} go={go} onLogout={()=>supabase.auth.signOut()}/>}
  {tab==='admin'&&profile.role==='admin'&&<AdminPanel session={session} profile={profile}/>}
 </main><BottomNav tab={tab} go={go}/></div></div>
}
function Brand(){return <div className="brand"><div className="brand-arch">A</div><div><strong>Afghan Fluent</strong><span>Leer Afghaans op jouw manier</span></div></div>}
function DesktopRail({tab,go,streak,isAdmin=false}){let items=[['today',Home,'Vandaag'],['path',BookOpen,'Leerpad'],['words',Layers3,'Woorden'],['sentences',MessageCircle,'Zinnen'],['grammar',BookText,'Grammatica'],['speak',Mic,'Uitspraak']];if(isAdmin)items.push(['admin',ShieldCheck,'Beheer']);return <aside className="desktop-rail"><Brand/><div className="rail-stats"><span><Flame/> {streak} dagen</span><span><Sparkles/> 1000 woorden</span></div><nav>{items.map(([id,I,l])=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)}><I/><span>{l}</span></button>)}</nav><button className="profile-tile" onClick={()=>go('profile')}><div className="avatar">A</div><div><b>Jouw profiel</b><small>Family mode</small></div><ChevronRight/></button></aside>}
function TopChrome({mode,setMode,displayName}){return <header className="top-chrome"><div className="mobile-brand"><div className="mini-arch">A</div><span>Afghan Fluent</span></div><div className="mode-switch"><button className={mode==='family'?'active':''} onClick={()=>setMode('family')}>Volwassen</button><button className={mode==='kids'?'active':''} onClick={()=>setMode('kids')}>Kids</button></div></header>}
function PageHead({eyebrow,title,sub,badge}){return <div className="page-head"><div><span>{eyebrow}</span><h1>{title}</h1>{sub&&<p>{sub}</p>}</div>{badge&&<div className="page-badge">{badge}</div>}</div>}
function SectionTitle({title}){return <div className="section-title"><h2>{title}</h2></div>}
function GameSummary({game}){const pct=Math.min(100,Math.round(game.daily/game.goal*100)),results=game.game.levelResults?.[game.level]||{},missions=new Set(MISSION_TYPES.filter(m=>results[m]?.passed===true)),wordsDone=levelWordsDone(game,game.level),parts=(wordsDone?1:0)+missions.size;return <section className="game-summary"><div className="game-stat"><span><Trophy/></span><div><small>LEVEL</small><b>{game.level}/50</b></div></div><div className="game-xp"><div><b className="vp-amount"><img className="vp-kite-icon" src="/images/game/kite.png" alt=""/>{game.xp}</b><small>{parts}/5 onderdelen in level {game.level}</small></div><div className="game-bar"><i style={{width:`${parts*20}%`}}/></div></div><div className="game-stat"><span><Sparkles/></span><div><small>VLIEGERS</small><b>{game.kiteTickets}</b></div></div><div className="game-goal"><div className="game-bar"><i style={{width:`${pct}%`}}/></div><small>{game.daily}/{game.goal} vandaag</small></div></section>}
function Quick({title,sub,icon,onClick}){return <button className="quick-card" onClick={onClick}><span className="quick-icon">{icon}</span><div><b>{title}</b><small>{sub}</small></div></button>}
function Today({app,game,go,displayName='Leerling'}){const known=app.knownIds.size;return <div className="screen today-screen home-v14"><section className="welcome home-welcome-v2"><div className="welcome-copy"><p className="kicker">GOEDE DAG</p><h1>Salaam, {displayName}! <span>👋</span></h1><p className="welcome-line">Vandaag is een mooie dag om te leren.</p></div><div className="streak-pill"><Flame/><b>{app.progress.streak||1}</b><span>dagen</span></div><div className="home-coach-stage" aria-hidden="true"><img className="home-coach-character" src={COACH_IMAGES.welcome} alt=""/></div></section><div className="continue-card" onClick={()=>go(game.game.lastTab&&game.game.lastTab!=='today'?game.game.lastTab:'path')}><div className="continue-copy"><small>GA VERDER WAAR JE WAS</small><h2>Verder leren</h2><div className="mini-progress"><i style={{width:`${Math.min(100,game.daily)}%`}}/></div></div><button aria-label="Verder leren"><ChevronRight/></button></div><section className="quick-grid home-actions"><Quick title="Spelen" sub="Oefen je huidige level" icon={<Trophy/>} onClick={()=>go('games')}/><Quick title="Woorden" sub="Flashcards" icon={<Layers3/>} onClick={()=>go('words')}/><Quick title="Zinnen" sub="Oefen zinnen" icon={<MessageCircle/>} onClick={()=>go('sentences')}/><Quick title="Uitspraak" sub="Luister & spreek" icon={<Mic/>} onClick={()=>go('speak')}/></section><div className="review-banner home-review" onClick={()=>go('review')}><div className="seal"><Brain/></div><div><b>Nog oefenen</b><span>Korte challenge met wat extra aandacht nodig heeft.</span></div><ChevronRight/></div><section className="home-progress"><div className="home-progress-title"><span>JOUW VOORTGANG</span><b>Vandaag</b></div><GameSummary game={game}/><div className="profile-stats"><StatCard icon={<Layers3/>} value={known} label="Woorden"/><StatCard icon={<img className="vp-kite-icon stat-kite" src="/images/game/kite.png" alt=""/>} value={game.xp} label="VP"/><StatCard icon={<Flame/>} value={app.progress.streak||1} label="Streak"/></div></section></div>}
function LearningPath({app,game,isAdmin=false,openLesson}){const completed=new Set(game.game.completedLevels||[]),current=Math.min(50,completed.size+1),adminOpen=isAdmin&&!!game.game.adminAllLevels;return <div className="screen curriculum-screen"><PageHead eyebrow="JOUW ROUTE" title="Van eerste woord tot gesprek" sub="50 levels. Eerst leer je de nieuwe woorden; daarna pas je ze toe in vier verschillende spellen." badge={<><img className="vp-kite-icon" src="/images/game/kite.png" alt=""/>{game.xp}</>}/><div className="curriculum-intro"><div><small>DOEL</small><b>Na level 50 kun je veel dagelijkse Afghaanse gesprekken begrijpen en zelf voeren.</b></div><span>{completed.size}/50</span></div>{adminOpen&&<div className="admin-unlock-banner"><ShieldCheck/> Admin testmodus: alle 50 levels zijn speelbaar.</div>}<div className="path-list curriculum-path">{CURRICULUM.map(l=>{const done=completed.has(l.number),locked=!adminOpen&&l.number>current,results=game.game.levelResults?.[l.number]||{},missions=new Set(MISSION_TYPES.filter(m=>results[m]?.passed===true)),wordsDone=levelWordsDone(game,l.number),parts=(wordsDone?1:0)+missions.size;return <div className={`path-item curriculum-level ${done?'done':''} ${locked?'locked':''}`} key={l.id}><span className={`path-node ${done?'complete':''}`}>{done?<Check/>:locked?<Lock/>:l.number}</span><button className="lesson-row" disabled={locked} onClick={()=>openLesson(l)}><span className="lesson-art">{l.emoji}</span><div className="lesson-main"><div className="level-title-row"><b>{l.number}. {l.title}</b><em>{l.difficulty}</em></div><small>{l.phase} · {l.words.length} woorden · {parts}/5 onderdelen voltooid</small><div className="level-five-dots"><i className={wordsDone?'done':''}/>{MISSION_TYPES.map(m=><i key={m} className={missions.has(m)?'done':''}/>)}</div><div className="tiny-bar"><i style={{width:`${done?100:parts*20}%`}}/></div></div>{!locked&&<ChevronRight/>}</button>{done&&<div className="kite-earned"><Sparkles/> Level voltooid · Vlieger vrijgespeeld</div>}</div>})}</div></div>}
function Games({app,game,go,isAdmin=false,selectedLesson,clearSelectedLesson}){
 const[type,setType]=useState(null); const level=selectedLesson?.number||game.level; const lesson=selectedLesson||CURRICULUM[level-1]||CURRICULUM[0];
 const results=game.game.levelResults?.[level]||{},missions=new Set(MISSION_TYPES.filter(m=>results[m]?.passed===true)),adminOpen=isAdmin&&!!game.game.adminAllLevels,locked=!adminOpen&&level>game.level,wordsDone=levelWordsDone(game,level),parts=(wordsDone?1:0)+missions.size,allPassed=wordsDone&&MISSION_TYPES.every(m=>results[m]?.passed===true);
 const choose=t=>{if(locked)return;if(t==='words'){go('words');return}if(!adminOpen&&!wordsDone&&MISSION_TYPES.includes(t))return;if(t==='kite'&&!adminOpen){if(!allPassed||(game.game.kiteTickets||0)<=0)return;game.updateGame(g=>({...g,kiteTickets:Math.max(0,(g.kiteTickets||0)-1)}))}setType(t);game.updateGame(g=>({...g,lastGame:t}))};
 const reset=()=>setType(null);
 if(type)return <ChallengeErrorBoundary key={`${type}-${level}`} onReset={reset}>{type==='picture'?<PictureGame game={game} lesson={lesson} onClose={reset}/>:type==='listen'?<ListenGame game={game} lesson={lesson} onClose={reset}/>:type==='speed'?<SpeedGame game={game} lesson={lesson} onClose={reset}/>:type==='kite'?<KiteAdventure game={game} lesson={lesson} onClose={reset}/>:<SentenceBuilder game={game} lesson={lesson} onClose={reset}/>}</ChallengeErrorBoundary>;
 return <div className="screen games-home-safe level-hub"><button className="focus-exit" onClick={()=>{if(selectedLesson){clearSelectedLesson?.();go('path')}else go('today')}}><X/> Sluiten</button><PageHead eyebrow={`LEVEL ${level} VAN 50 · ${lesson.difficulty}`} title={lesson.title} sub={`${lesson.words.length} nieuwe woorden · leer ze eerst, gebruik ze daarna in de vier spellen.`} badge={<><img className="vp-kite-icon" src="/images/game/kite.png" alt=""/>{game.xp}</>}/><div className="level-mission-strip"><div><small>LEVELVOORTGANG</small><b>{parts}/5 onderdelen</b></div><div className="mission-dots mission-dots-five"><i className={wordsDone?'done':''}/>{MISSION_TYPES.map(m=><i key={m} className={missions.has(m)?'done':''}/>)}</div></div><div className="games-safe-grid games-safe-grid-five"><button className={`word-intro-choice ${wordsDone?'mission-done':''}`} onClick={()=>choose('words')}><span><BookOpen/></span><b>Nieuwe woorden</b><small>{wordsDone?'Alle woorden bekeken · herhalen mag altijd':`${game.game.levelWordSeen?.[level]?.length||0}/${lesson.words.length} bekeken · geen VP`}</small>{wordsDone&&<Check/>}</button><button className={missions.has('picture')?'mission-done':''} disabled={!adminOpen&&!wordsDone} onClick={()=>choose('picture')}><span>{!adminOpen&&!wordsDone?<Lock/>:<Layers3/>}</span><b>Plaatjes</b><small>{!adminOpen&&!wordsDone?'Eerst Nieuwe woorden afronden':'Herken betekenis en beeld · max 10 🪁'}</small>{missions.has('picture')&&<Check/>}</button><button className={missions.has('listen')?'mission-done':''} disabled={!adminOpen&&!wordsDone} onClick={()=>choose('listen')}><span>{!adminOpen&&!wordsDone?<Lock/>:<Headphones/>}</span><b>Luisteren</b><small>{!adminOpen&&!wordsDone?'Eerst Nieuwe woorden afronden':'Begrijp wat je hoort · max 15 🪁'}</small>{missions.has('listen')&&<Check/>}</button><button className={missions.has('sentence')?'mission-done':''} disabled={!adminOpen&&!wordsDone} onClick={()=>choose('sentence')}><span>{!adminOpen&&!wordsDone?<Lock/>:<BookText/>}</span><b>Bouw de zin</b><small>{!adminOpen&&!wordsDone?'Eerst Nieuwe woorden afronden':'Zet taal actief in elkaar · max 20 🪁'}</small>{missions.has('sentence')&&<Check/>}</button><button className={missions.has('speed')?'mission-done':''} disabled={!adminOpen&&!wordsDone} onClick={()=>choose('speed')}><span>{!adminOpen&&!wordsDone?<Lock/>:<Zap/>}</span><b>Snelle ronde</b><small>{!adminOpen&&!wordsDone?'Eerst Nieuwe woorden afronden':'Automatiseer wat je kent'}</small>{missions.has('speed')&&<Check/>}</button><button className={`kite-choice ${adminOpen?'kite-admin-open':((!allPassed||(game.game.kiteTickets||0)<=0)?'kite-locked':'')}`} disabled={!adminOpen&&(!allPassed||(game.game.kiteTickets||0)<=0)} onClick={()=>choose('kite')}><span>{adminOpen?<ShieldCheck/>:(game.game.kiteTickets||0)>0&&allPassed?<Sparkles/>:<Lock/>}</span><b>Vlieger Avontuur</b><small>{adminOpen?'Admin testmodus · altijd speelbaar':allPassed&&(game.game.kiteTickets||0)>0?`${game.game.kiteTickets} verdiend · speel nu`:'Voltooi Nieuwe woorden + alle 4 spellen met meer dan 80%'}</small></button></div><div className="reward-rules"><b>Zo werkt dit level</b><span><strong>Nieuwe woorden</strong> is de introductie en geeft geen VP. Daarna gebruik je dezelfde woorden in Plaatjes, Luisteren, Bouw de zin en Snelle ronde. {adminOpen?'Admin testmodus omzeilt de vergrendeling en het Vlieger Avontuur kost geen ticket.':'Pas als de woorden bekeken zijn en alle vier spellen boven 80% zijn gehaald, is het level voltooid en wordt het Vlieger Avontuur vrijgespeeld.'}</span></div><GameSummary game={game}/></div>
}
class ChallengeErrorBoundary extends React.Component{
 constructor(props){super(props);this.state={error:null}}
 static getDerivedStateFromError(error){return{error}}
 componentDidCatch(error,info){console.error('GAME_CHALLENGE_RENDER_ERROR',error,info)}
 render(){
  if(this.state.error){return <div className="challenge-error-card"><small>DIT SPEL KON NIET OPENEN</small><h2>Er ging iets mis</h2><p>{String(this.state.error?.message||this.state.error||'Onbekende fout')}</p><button className="primary-game" onClick={this.props.onReset}>Terug naar Spellen</button></div>}
  return this.props.children
 }
}

function Words({app,game,go,selectedLesson,clearSelectedLesson}){
 const[libraryFilter,setLibraryFilter]=useState(null),[query,setQuery]=useState(''),[idx,setIdx]=useState(0),[revealed,setRevealed]=useState(false),[dragX,setDragX]=useState(0),[dragging,setDragging]=useState(false),start=useRef(null),[exit,setExit]=useState(null),[levelFinished,setLevelFinished]=useState(false);
 const isLevel=!!selectedLesson,level=selectedLesson?.number||null,levelIds=useMemo(()=>new Set((selectedLesson?.words||[]).map(x=>Number(x.id))),[selectedLesson]);
 const completedLevels=new Set(game.game.completedLevels||[]),seenMap=game.game.levelWordSeen||{};
 const discoveredIds=useMemo(()=>{const ids=new Set((app.progress.known||[]).map(Number));completedLevels.forEach(n=>(CURRICULUM[n-1]?.words||[]).forEach(w=>ids.add(Number(w.id))));Object.values(seenMap).flat().forEach(id=>ids.add(Number(id)));return ids},[app.progress.known,game.game.completedLevels,game.game.levelWordSeen]);
 const discovered=vocab.filter(v=>discoveredIds.has(Number(v.id)));
 const cats=useMemo(()=>{const map={};discovered.forEach(w=>{const c=labelFor(w.category)||'Overig';map[c]=(map[c]||0)+1});return Object.entries(map).sort((a,b)=>b[1]-a[1])},[discovered.length,game.game.levelWordSeen,app.progress.known]);
 const source=useMemo(()=>{if(isLevel)return vocab.filter(v=>levelIds.has(Number(v.id)));if(libraryFilter==='review'){const reviewIds=new Set(reviewItems(game,100).map(([k])=>Number(k.split(':').pop())));return discovered.filter(v=>reviewIds.has(Number(v.id)))}if(libraryFilter==='mastered')return discovered.filter(v=>game.game.practice?.[`word:${v.id}`]?.mastered);if(libraryFilter&&libraryFilter!=='all')return discovered.filter(v=>labelFor(v.category)===libraryFilter);return discovered},[isLevel,selectedLesson,libraryFilter,discovered.length,game.game.practice]);
 const filtered=useMemo(()=>source.filter(v=>!query||`${v.dutch} ${v.spoken} ${v.latin}`.toLowerCase().includes(query.toLowerCase())),[source,query]);
 const w=filtered[idx%Math.max(1,filtered.length)]||source[0]||vocab[0],nextW=filtered[(idx+1)%Math.max(1,filtered.length)]||w;
 useEffect(()=>{setIdx(0);setRevealed(false);setLevelFinished(false)},[selectedLesson?.number,libraryFilter]);
 const requiredIds=(selectedLesson?.words||[]).map(x=>Number(x.id));
 const finish=right=>{if(exit||!filtered.length)return;app.update(p=>{const set=new Set(p.known||[]);right?set.add(w.id):set.delete(w.id);return{...p,known:[...set]}});practice(game,`word:${w.id}`,right);if(isLevel)markLevelWordSeen(game,level,w.id,requiredIds);setExit(right?'right':'left');setDragX((right?1:-1)*Math.max(window.innerWidth*1.35,700));setTimeout(()=>{if(isLevel){const before=new Set(game.game.levelWordSeen?.[level]||[]);before.add(Number(w.id));const nowDone=requiredIds.length>0&&requiredIds.every(id=>before.has(id));if(nowDone){setLevelFinished(true);setExit(null);setDragX(0);setRevealed(false);return}}const n=(idx+1)%filtered.length;setIdx(n);if(!isLevel)remember(game,'words',n);setRevealed(false);setDragging(false);setDragX(0);setExit(null)},300)};
 const cardStyle={transform:`translateX(${dragX}px) rotate(${dragX/24}deg)`,opacity:exit?.12:1,transition:dragging?'none':'transform .30s cubic-bezier(.2,.8,.2,1), opacity .25s ease'};
 const revealProgress=Math.min(1,Math.max(0,(Math.abs(dragX)-10)/105));
 const underStyle={opacity:revealProgress,transform:`translateY(${9-revealProgress*9}px) scale(${.972+revealProgress*.028})`,transition:dragging?'none':'opacity .18s ease, transform .22s ease'};
 const cardContent=(word,showTranslation=false)=><><div className="card-top"><span>{labelFor(word.category)}</span></div><WordIllustration word={word}/><div className="word-copy"><small>NEDERLANDS</small><h2>{word.dutch}</h2><div className="translation-reserved">{showTranslation?<><small>ZO ZEG JE HET</small><h3>{word.spoken||word.latin}</h3><button className="sound-btn" onClick={e=>{e.stopPropagation();speak(word.spoken||word.latin,.88,'word',word.id)}}><Volume2/> Luister</button></>:<div className="reveal-hint"><Eye/> Tik voor vertaling</div>}</div></div></>;
 if(!isLevel&&!libraryFilter)return <div className="screen words-library"><PageHead eyebrow="JOUW WOORDEN" title="Woorden" sub="Hier herhaal je woorden die je al in het leerpad hebt ontdekt." badge={<>{discovered.length} / 1000</>}/><div className="words-library-hero"><div><small>ONTDEKT</small><b>{discovered.length}</b><span>woorden</span></div><div className="words-library-progress"><i style={{width:`${Math.min(100,discovered.length/10)}%`}}/></div><p>Nieuwe woorden leer je per level. Hier kun je ze daarna vrij herhalen.</p></div><div className="word-library-actions"><button onClick={()=>setLibraryFilter('review')}><Brain/><b>Nog oefenen</b><small>Moeilijke en bijna vergeten woorden</small></button><button onClick={()=>setLibraryFilter('mastered')}><Check/><b>Beheerst</b><small>Woorden die meerdere keren goed gingen</small></button><button onClick={()=>setLibraryFilter('all')}><Layers3/><b>Alle ontdekte woorden</b><small>{discovered.length} beschikbaar</small></button></div><SectionTitle title="Categorieën"/><div className="word-category-grid">{cats.map(([c,n])=><button key={c} onClick={()=>setLibraryFilter(c)}><span>{iconFor(vocab.find(v=>labelFor(v.category)===c)?.category)}</span><b>{c}</b><small>{n} woorden</small></button>)}</div></div>;
 if(levelFinished)return <div className="screen focus-screen words-focus level-words-finished"><PageHead eyebrow={`LEVEL ${level} · NIEUWE WOORDEN`} title="Alle woorden bekeken" sub="Je hebt de woorden van dit level gezien. Nu ga je ze herkennen, horen en gebruiken." badge={<Check/>}/><div className="word-finish-card"><span>{selectedLesson.emoji}</span><h2>{selectedLesson.title}</h2><b>{requiredIds.length}/{requiredIds.length} woorden</b><p>Hier kreeg je bewust geen VP voor. De vier spellen hierna bepalen hoe goed je de woorden beheerst.</p><button className="primary-game" onClick={()=>go('games')}>Ga verder met de spellen <ChevronRight/></button></div></div>;
 return <div className="screen focus-screen words-focus"><button className="focus-exit" onClick={()=>{if(isLevel)go('games');else if(libraryFilter)setLibraryFilter(null);else go('today')}}><X/> {isLevel?'Level':'Sluiten'}</button><PageHead eyebrow={isLevel?`LEVEL ${level} · NIEUWE WOORDEN`:'WOORDEN HERHALEN'} title={isLevel?selectedLesson.title:'Woorden'} sub={isLevel?'Bekijk alle woorden van dit level. Swipe links of rechts; beide tellen als bekeken en geven geen VP.':'Herhaal alleen woorden die je al hebt ontdekt.'} badge={<>{idx+1} / {filtered.length}</>}/>{!isLevel&&<div className="word-toolbar"><label><Search/><input value={query} onChange={e=>{setQuery(e.target.value);setIdx(0);setRevealed(false)}} placeholder="Zoek Nederlands of fonetisch…"/></label></div>}{isLevel&&<div className="level-word-progress"><span>{game.game.levelWordSeen?.[level]?.length||0}/{requiredIds.length} bekeken</span><i><b style={{width:`${Math.min(100,((game.game.levelWordSeen?.[level]?.length||0)/Math.max(1,requiredIds.length))*100)}%`}}/></i></div>}<div className={`swipe-stage ${exit?'card-is-exiting':''}`}><article className="premium-flashcard swipe-card swipe-card-under" style={underStyle} aria-hidden="true">{cardContent(nextW,false)}</article><article key={`${w.id}-${idx}`} className="premium-flashcard swipe-card swipe-card-top" style={cardStyle} onPointerDown={e=>{if(exit)return;start.current=e.clientX;setDragging(true)}} onPointerMove={e=>{if(start.current!==null&&!exit)setDragX(Math.max(-240,Math.min(240,e.clientX-start.current)))}} onPointerUp={()=>{setDragging(false);start.current=null;if(Math.abs(dragX)>85)finish(dragX>0);else setDragX(0)}} onPointerCancel={()=>{setDragging(false);start.current=null;setDragX(0)}} onClick={()=>Math.abs(dragX)<8&&!exit&&setRevealed(r=>!r)}><div className={`swipe-stamp learn ${dragX<-25?'show':''}`}>NOG OEFENEN</div><div className={`swipe-stamp know ${dragX>25?'show':''}`}>KEN IK</div>{cardContent(w,revealed)}</article></div><div className="card-nav swipe-actions-row"><button className="swipe-action practice-again" onClick={()=>finish(false)}><ChevronLeft/><span>Nog oefenen</span></button><button className="swipe-action know-it" onClick={()=>finish(true)}><span>Ken ik</span><ChevronRight/></button></div></div>
}
function WordIllustration({word}){const n=Number(word?.id),file=Number.isFinite(n)&&n>=1?String(n).padStart(3,'0'):null,[failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[n]);if(file&&!failed){const url=`/images/words/${file}.png`;return <div className="word-illustration word-illustration-image"><img src={url} alt={word?.dutch||''} draggable="false" onError={()=>setFailed(true)}/></div>}return <div className="word-illustration word-illustration-fallback"><span>{iconFor(word?.category)}</span></div>}
function ReviewPractice({game,go}){const items=reviewItems(game,30),ids=items.map(([k])=>Number(k.split(':').pop())).filter(Number.isFinite),pool=[...new Map(ids.map(id=>[id,vocab.find(w=>Number(w.id)===id)]).filter(x=>x[1])).values()],data=pool.length?pool:vocab.filter(w=>!game.game.practice?.[`word:${w.id}`]?.mastered).slice(0,20),[idx,setIdx]=useState(0),[show,setShow]=useState(false),w=data[idx];if(!w)return <div className="screen"><PageHead eyebrow="HERHALEN" title="Alles is bijgewerkt"/><button className="primary-game" onClick={()=>go('today')}>Terug</button></div>;const grade=ok=>{practice(game,`word:${w.id}`,ok);setShow(false);setIdx(i=>i+1>=data.length?0:i+1)};return <div className="screen review-screen"><button className="focus-exit" onClick={()=>go('today')}><X/> Sluiten</button><PageHead eyebrow="SLIM HERHALEN" title="Nog oefenen" sub="De app kiest automatisch wat je bijna vergeet." badge={<>{idx+1}/{data.length}</>}/><section className="review-smart-card"><small>{labelFor(w.category)}</small><h2>{w.dutch}</h2><WordIllustration word={w}/>{show?<><p className="review-answer">{w.spoken||w.latin}</p><button onClick={()=>speak(w.spoken||w.latin,.8)}><Volume2/> Luister</button></>:<button onClick={()=>setShow(true)}><Eye/> Toon antwoord</button>}<div className="review-grade"><button disabled={!show} onClick={()=>grade(false)}>Nog oefenen</button><button disabled={!show} onClick={()=>grade(true)}>Wist ik</button></div></section></div>}
function Sentences(){const[q,setQ]=useState('');const data=sentences.filter(s=>!q||`${s.dutch} ${s.spoken}`.toLowerCase().includes(q.toLowerCase()));return <div className="screen"><PageHead eyebrow="400+ ZINNEN" title="Zinnen" sub="Leer complete zinnen."/><div className="word-toolbar"><label><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Zoek in zinnen…"/></label></div><Coach compact placement="section" type="tip" text="Tip: leer zinnen als één geheel. Zo klinkt je Afghaans sneller natuurlijk."/><div className="sentence-list">{data.slice(0,80).map((s,i)=><article className="sentence-card" key={s.id}><div className="sentence-num">{String(i+1).padStart(2,'0')}</div><div className="sentence-copy"><h3>{s.dutch}</h3><p>{s.spoken||s.latin}</p></div><button onClick={()=>speak(s.spoken||s.latin,.82)}><Volume2/></button></article>)}</div></div>}
function Grammar(){return <div className="screen"><PageHead eyebrow="PRAKTISCH" title="Grammatica" sub="Spreken vóór regels uit het hoofd leren."/><Coach compact placement="section" type="explain" text="Ik help je met de logica achter de taal. Geen lange regels — vooral voorbeelden die je meteen kunt gebruiken."/><div className="grammar-hero"><div className="grammar-mark">Aa</div><div><h2>Leer de logica door te spreken</h2><p>Korte patronen en voorbeelden uit je eigen woordenlijst.</p></div></div></div>}

function SpeakPractice(){
 const pool=useMemo(()=>sentences.filter(x=>x.spoken&&x.dutch).slice(0,120),[]);
 const [idx,setIdx]=useState(0),[mode,setMode]=useState('repeat'),[listening,setListening]=useState(false),[heard,setHeard]=useState(''),[score,setScore]=useState(null),[revealed,setRevealed]=useState(false);
 const s=pool[idx]||sentences[0], next=pool[(idx+1)%Math.max(1,pool.length)]||s;
 const reset=()=>{setHeard('');setScore(null);setRevealed(false);setListening(false)};
 const move=dir=>{setIdx(i=>(i+dir+pool.length)%pool.length);reset()};
 const normalize=t=>(t||'').toLowerCase().replace(/[^a-zA-ZÀ-ž\s]/g,' ').split(/\s+/).filter(Boolean);
 const record=(target=s.spoken)=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){setHeard('Spraakherkenning is op dit apparaat niet beschikbaar. Zeg de zin hardop en vergelijk hem daarna met Farangis.');setScore(null);return}const r=new SR();r.lang='fa-AF';r.interimResults=false;r.maxAlternatives=1;setListening(true);setHeard('');setScore(null);r.onresult=e=>{const t=e.results?.[0]?.[0]?.transcript||'';setHeard(t);const a=normalize(target),b=normalize(t);const match=a.filter(x=>b.some(y=>y===x||y.includes(x.slice(0,Math.max(2,x.length-1)))||x.includes(y.slice(0,Math.max(2,y.length-1))))).length;setScore(Math.min(100,Math.round(match/Math.max(1,a.length)*100)))};r.onerror=()=>{setHeard('Ik kon je stem niet goed verstaan. Probeer het rustig nog eens.');setScore(null)};r.onend=()=>setListening(false);r.start()};
 const feedback=score===null?'':score>=80?'Heel goed — dit klonk dicht bij het voorbeeld.':score>=55?'Goed op weg. Luister nog eens naar ritme en klank.':'Luister nog één keer en probeer daarna opnieuw.';
 return <div className="screen speak-screen speak-v3"><PageHead eyebrow="LUISTER & SPREEK" title="Uitspraak" sub="Van nadoen naar zelfstandig spreken." badge={<>{idx+1} / {pool.length}</>}/><div className="pronunciation-modes" role="tablist" aria-label="Uitspraak oefening"><button className={mode==='repeat'?'active':''} onClick={()=>{setMode('repeat');reset()}}><Headphones/><span>Luister & herhaal</span></button><button className={mode==='speak'?'active':''} onClick={()=>{setMode('speak');reset()}}><Mic/><span>Zeg het zelf</span></button><button className={mode==='dialogue'?'active':''} onClick={()=>{setMode('dialogue');reset()}}><MessageCircle/><span>Gesprek</span></button></div>
 {mode==='repeat'&&<section className="speak-practice-card pronunciation-card repeat-mode"><Coach hero placement="speak" type="listen" text="Luister eerst goed. Daarna doen we hem samen."/><div className="sound-orbit"><button onClick={()=>speak(s.spoken,.72)} aria-label="Luister naar de zin"><Volume2/></button></div><span className="pronunciation-label">LUISTER EN SPREEK NA</span><h2>{s.spoken}</h2><p className="pronunciation-meaning">{s.dutch}</p><button className="record-main" onClick={()=>speak(s.spoken,.72)}><Headphones/> Luister opnieuw</button><div className="speak-actions"><button onClick={()=>move(-1)} aria-label="Vorige"><ChevronLeft/></button><button onClick={()=>move(1)}>Volgende <ChevronRight/></button></div></section>}
 {mode==='speak'&&<section className="speak-practice-card pronunciation-card self-mode"><Coach hero placement="speak" type="think" text="Kijk alleen naar het Nederlands. Zeg de Afghaanse zin eerst zelf hardop."/><span className="pronunciation-label">ZEG DIT IN HET AFGHAANS</span><h2 className="self-dutch">{s.dutch}</h2><div className="self-speech-actions"><button className={`record-main ${listening?'recording':''}`} onClick={()=>record(s.spoken)}><Mic/>{listening?'Ik luister…':'Spreek nu'}</button><button className="reveal-answer" onClick={()=>setRevealed(true)}><Eye/> Toon antwoord</button></div>{heard&&<div className="pronunciation-feedback"><small>IK HOORDE</small><b>{heard}</b>{score!==null&&<><span className={score>=80?'good':score>=55?'almost':'retry'}>{score}% overeenkomst</span><p>{feedback}</p></>}</div>}{revealed&&<div className="pronunciation-solution"><small>ZO ZEG JE HET</small><h3>{s.spoken}</h3><button onClick={()=>speak(s.spoken,.72)}><Volume2/> Luister naar Farangis</button></div>}<div className="speak-actions"><button onClick={()=>move(-1)}><ChevronLeft/></button><button onClick={()=>move(1)}>Volgende <ChevronRight/></button></div></section>}
 {mode==='dialogue'&&<section className="speak-practice-card pronunciation-card dialogue-mode"><Coach hero placement="speak" type="welcome" text="We oefenen een korte gespreksronde. Luister naar mij en antwoord daarna zelf hardop."/><div className="dialogue-bubble farangis-turn"><small>FARANGIS</small><div><b>{s.spoken}</b><span>{s.dutch}</span></div><button onClick={()=>speak(s.spoken,.78)}><Volume2/></button></div><div className="dialogue-bubble learner-turn"><small>JIJ</small><div>{revealed?<><b>{next.spoken}</b><span>{next.dutch}</span></>:<><b>{next.dutch}</b><span>Zeg deze reactie in het Afghaans.</span></>}</div>{revealed?<button onClick={()=>speak(next.spoken,.76)}><Volume2/></button>:<button className="dialogue-mic" onClick={()=>record(next.spoken)}><Mic/></button>}</div>{heard&&<div className="pronunciation-feedback compact-feedback"><small>IK HOORDE</small><b>{heard}</b>{score!==null&&<span className={score>=80?'good':score>=55?'almost':'retry'}>{score}% overeenkomst</span>}</div>}<div className="dialogue-actions"><button className="reveal-answer" onClick={()=>setRevealed(true)}><Eye/> Voorbeeldantwoord</button><button className="primary-game" onClick={()=>move(2)}>Volgende ronde <ChevronRight/></button></div><p className="dialogue-note">De gespreksronde gebruikt je gevalideerde zinnen als spreektraining. Er worden geen nieuwe vertalingen bedacht.</p></section>}
 </div>
}
function StatCard({icon,value,label}){return <div className="stat-card"><span>{icon}</span><b>{value}</b><small>{label}</small></div>}
function Profile({app,game,mode,setMode,contentStatus,refreshContent,profile,go,onLogout}){return <div className="screen"><PageHead eyebrow="JOUW VOORTGANG" title="Profiel"/><div className="profile-hero"><div className="big-avatar">{(profile?.display_name||"A")[0]}</div><div><h2>{profile?.display_name||"Leerling"}</h2><p>{profile?.role==="admin"?"Administrator":"Afghan Fluent learner"}</p><span><Flame/> {app.progress.streak||1} dagen streak</span></div></div><GameSummary game={game}/><div className="profile-stats"><StatCard icon={<Layers3/>} value={app.knownIds.size} label="Woorden beheerst"/><StatCard icon={<img className="vp-kite-icon stat-kite" src="/images/game/kite.png" alt=""/>} value={game.xp} label="VP"/><StatCard icon={<MessageCircle/>} value={contentStatus?.sentenceCount||sentences.length} label="Zinnen"/><StatCard icon={<Star/>} value={masteryCount(game)} label="Langdurig beheerst"/></div><SectionTitle title="Leerinstellingen"/>{profile?.role==="admin"&&<div className="settings-card admin-entry" onClick={()=>go("admin")}><div><div className="setting-icon"><ShieldCheck/></div><div><b>Gebruikersbeheer</b><span>Accounts aanmaken en voortgang beheren.</span></div></div><ChevronRight/></div>}{profile?.role==="admin"&&<div className="settings-card admin-level-toggle"><div><div className="setting-icon"><Lock/></div><div><b>Alle levels testen</b><span>Alleen voor admin. Zet tijdelijk level 1 t/m 50 open.</span></div></div><div className="segmented admin-toggle"><button className={!game.game.adminAllLevels?'active':''} onClick={()=>game.updateGame(g=>({...g,adminAllLevels:false}))}>Uit</button><button className={game.game.adminAllLevels?'active':''} onClick={()=>game.updateGame(g=>({...g,adminAllLevels:true}))}>Aan</button></div></div>}<div className="settings-card"><div><div className="setting-icon"><UserRound/></div><div><b>Weergave</b><span>Volwassen of extra speels voor kinderen.</span></div></div><div className="segmented"><button className={mode==='family'?'active':''} onClick={()=>setMode('family')}>Volwassen</button><button className={mode==='kids'?'active':''} onClick={()=>setMode('kids')}>Kids</button></div></div><div className="settings-card"><div><div className="setting-icon"><RefreshCw/></div><div><b>OneDrive Excel</b><span>{contentStatus?.vocabularyCount||vocab.length} woorden · {contentStatus?.sentenceCount||sentences.length} zinnen</span></div></div><button className="sync-now" onClick={refreshContent}>Nu synchroniseren</button></div><div className="sync-note"><ShieldCheck/> OneDrive blijft de masterbron voor je woorden en zinnen.</div><button className="logout-button" onClick={onLogout}>Uitloggen</button></div>}
function BottomNav({tab,go}){const x=[['today',Home,'Vandaag'],['path',BookOpen,'Leerpad'],['words',Layers3,'Woorden'],['sentences',MessageCircle,'Zinnen'],['profile',UserRound,'Profiel']];return <nav className="bottom-nav">{x.map(([id,I,l])=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)}><I/><span>{l}</span></button>)}</nav>}
createRoot(document.getElementById('root')).render(<App/>);

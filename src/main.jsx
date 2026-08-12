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
  {tab==='profile'&&<Profile app={app} game={game} mode={mode} setMode={setModePersist} contentStatus={contentStatus} refreshContent={refreshContent} profile={profile} go={go} onLogout={()=>supabase.auth.signOut()}/>}
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


const AFGHAN_FACTS=[
 {title:'Hoge bergen',text:'De Hindu Kush loopt door een groot deel van Afghanistan. Veel toppen zijn duizenden meters hoog.'},
 {title:'Vliegers in de lucht',text:'Vliegeren is al generaties lang een geliefde activiteit in Afghanistan, vooral op heldere dagen.'},
 {title:'Granaatappels',text:'Afghanistan staat bekend om zoete granaatappels. In verschillende regio’s worden ze al eeuwen geteeld.'},
 {title:'Blauwe steen',text:'Lapis lazuli uit Afghanistan werd duizenden jaren geleden al gebruikt voor sieraden en kunst.'},
 {title:'Lente vieren',text:'Veel Afghaanse families vieren Nowruz aan het begin van de lente met bezoek, eten en tijd samen.'},
 {title:'Veel talen',text:'In Afghanistan worden verschillende talen gesproken. Dari en Pashto behoren tot de meest gebruikte.'},
 {title:'Gastvrijheid',text:'Gasten ontvangen met thee, eten en tijd voor elkaar is in veel Afghaanse families heel belangrijk.'},
 {title:'Steden en bergen',text:'Moderne steden, oude bazaars, dorpen en hoge bergen liggen in Afghanistan soms verrassend dicht bij elkaar.'}
];

function KiteAdventure({onExit}){
 const canvasRef=useRef(null),rafRef=useRef(null),lastRef=useRef(0),spawnRef=useRef(0),keysRef=useRef({left:false,right:false,action:false}),prevActionRef=useRef(false);
 const playerRef=useRef({x:150,y:516,w:34,h:48,vx:0,vy:0,onGround:false,invuln:0}),melonsRef=useRef([]),collectedRef=useRef(new Set());
 const[phase,setPhase]=useState('select'),[character,setCharacter]=useState('girl'),[seconds,setSeconds]=useState(60),[fact,setFact]=useState(null),[collected,setCollected]=useState(0),[hitNote,setHitNote]=useState(false),[roundSeed,setRoundSeed]=useState(0);

 const platforms=useMemo(()=>[
  {x1:24,x2:876,y:570},{x1:130,x2:430,y:465},{x1:515,x2:875,y:465},
  {x1:25,x2:330,y:350},{x1:420,x2:730,y:350},{x1:145,x2:560,y:235},{x1:650,x2:875,y:235},
  {x1:25,x2:325,y:120},{x1:440,x2:820,y:120}
 ],[]);
 const ramps=useMemo(()=>[
  {x1:420,y1:570,x2:525,y2:465},{x1:330,y1:350,x2:435,y2:235}
 ],[]);
 const ladders=useMemo(()=>[
  {x:205,top:465,bottom:570},{x:665,top:350,bottom:465},{x:245,top:120,bottom:235}
 ],[]);
 const kites=useMemo(()=>[
  {id:1,x:815,y:520},{id:2,x:80,y:300},{id:3,x:765,y:72}
 ],[]);
 const facts=useMemo(()=>shuffle(AFGHAN_FACTS).slice(0,3),[roundSeed]);

 const resetPlayer=()=>{playerRef.current={x:150,y:516,w:34,h:48,vx:0,vy:0,onGround:false,invuln:1.05}};
 const startRound=()=>{collectedRef.current=new Set();melonsRef.current=[];spawnRef.current=0;setCollected(0);setSeconds(60);setFact(null);setHitNote(false);resetPlayer();setPhase('playing');};
 const restart=()=>{setRoundSeed(s=>s+1);startRound()};
 const finish=()=>{setPhase('done');keysRef.current={left:false,right:false,action:false}};
 const playFact=f=>{if(f)speak(`${f.title}. ${f.text}`,.9)};
 const continueFromFact=()=>{setFact(null);setPhase(collectedRef.current.size>=3?'done':'playing')};

 useEffect(()=>{if(phase!=='playing')return;const t=setInterval(()=>setSeconds(s=>{if(s<=1){setPhase('done');return 0}return s-1}),1000);return()=>clearInterval(t)},[phase]);

 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext('2d');const DPR=Math.min(2,window.devicePixelRatio||1);canvas.width=900*DPR;canvas.height=620*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
  const supportY=(x,bottom,prevBottom)=>{
   let best=null;
   for(const p of platforms){if(x>=p.x1-10&&x<=p.x2+10&&prevBottom<=p.y+5&&bottom>=p.y){if(best===null||p.y<best)best=p.y}}
   for(const r of ramps){const minX=Math.min(r.x1,r.x2),maxX=Math.max(r.x1,r.x2);if(x>=minX&&x<=maxX){const t=(x-r.x1)/(r.x2-r.x1),y=r.y1+(r.y2-r.y1)*t;if(prevBottom<=y+6&&bottom>=y){if(best===null||y<best)best=y}}}
   return best;
  };
  const melonSupport=(m,prevBottom)=>{
   let y=null;
   for(const p of platforms){if(m.x>=p.x1+m.r*.15&&m.x<=p.x2-m.r*.15&&prevBottom<=p.y+4&&m.y+m.r>=p.y){if(y===null||p.y<y)y=p.y}}
   for(const r of ramps){const minX=Math.min(r.x1,r.x2),maxX=Math.max(r.x1,r.x2);if(m.x>=minX&&m.x<=maxX){const t=(m.x-r.x1)/(r.x2-r.x1),ry=r.y1+(r.y2-r.y1)*t;if(prevBottom<=ry+4&&m.y+m.r>=ry){if(y===null||ry<y)y=ry}}}
   return y;
  };
  const roundRect=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()};
  const drawBackground=()=>{
   const sky=ctx.createLinearGradient(0,0,0,620);sky.addColorStop(0,'#bfe2ee');sky.addColorStop(.52,'#e9e2c8');sky.addColorStop(1,'#d9c29d');ctx.fillStyle=sky;ctx.fillRect(0,0,900,620);
   ctx.fillStyle='rgba(255,255,255,.55)';for(const c of [[105,70,65],[175,55,52],[720,65,70],[790,80,55]]){ctx.beginPath();ctx.arc(c[0],c[1],c[2],0,Math.PI*2);ctx.fill()}
   const mountain=(pts,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,pts[0][1]);for(const [x,y] of pts)ctx.lineTo(x,y);ctx.lineTo(900,360);ctx.lineTo(0,360);ctx.closePath();ctx.fill()};
   mountain([[0,280],[110,175],[185,235],[300,125],[380,230],[520,145],[625,230],[755,135],[900,260]],'#90a98f');
   mountain([[0,315],[150,220],[270,300],[400,185],[540,300],[675,205],[805,285],[900,225]],'#758a7a');
   ctx.fillStyle='rgba(244,241,224,.9)';ctx.beginPath();ctx.moveTo(260,160);ctx.lineTo(300,125);ctx.lineTo(333,180);ctx.lineTo(304,165);ctx.lineTo(287,184);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(724,165);ctx.lineTo(755,135);ctx.lineTo(788,185);ctx.lineTo(757,170);ctx.lineTo(742,187);ctx.closePath();ctx.fill();
   // modern Afghan city silhouette
   const buildings=[[15,315,88,170],[108,330,72,155],[190,300,68,185],[270,335,94,150],[375,295,72,190],[458,325,88,160],[560,300,72,185],[644,320,86,165],[742,285,62,200],[812,330,72,155]];
   buildings.forEach((b,i)=>{ctx.fillStyle=i%2?'#d8c29d':'#cdb287';ctx.fillRect(b[0],b[1],b[2],b[3]);ctx.fillStyle='rgba(76,94,83,.34)';for(let yy=b[1]+18;yy<b[1]+b[3]-12;yy+=27)for(let xx=b[0]+12;xx<b[0]+b[2]-8;xx+=24)ctx.fillRect(xx,yy,8,11)});
   ctx.fillStyle='#7ea4a0';ctx.beginPath();ctx.arc(414,306,28,Math.PI,0);ctx.fill();ctx.fillRect(386,306,56,28);ctx.fillStyle='#b58e62';ctx.fillRect(370,334,88,58);ctx.fillStyle='#789b96';ctx.fillRect(450,265,7,70);ctx.beginPath();ctx.arc(453.5,263,9,Math.PI,0);ctx.fill();
   ctx.fillStyle='#5d755e';for(let i=0;i<18;i++){const x=22+i*52+(i%3)*7,y=460+(i%4)*8;ctx.beginPath();ctx.arc(x,y,9+(i%3)*3,0,Math.PI*2);ctx.fill()};ctx.fillStyle='#8d6043';ctx.fillRect(18,420,92,45);ctx.fillStyle='#c6784e';ctx.fillRect(18,420,92,8);ctx.fillStyle='#f0d09a';for(let x=26;x<102;x+=18){ctx.fillRect(x,434,10,4)}ctx.fillStyle='#477354';for(const [x,y] of [[62,405],[96,413],[744,416],[826,398]]){ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#a24e3f';ctx.fillRect(34,392,52,8);ctx.fillStyle='#e0a664';for(let x=36;x<84;x+=12){ctx.fillRect(x,392,5,8)}
  };
  const drawArchitecture=()=>{
   // De speelroutes voelen als daken, terrassen en binnenplaatsen in plaats van losse balken.
   const wall=(x1,x2,top,bottom,fill,accent='#8f6b4e')=>{
    ctx.save();const w=x2-x1,h=bottom-top;const g=ctx.createLinearGradient(x1,top,x2,bottom);g.addColorStop(0,fill);g.addColorStop(1,'#cbb18b');ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(x1,top+8);ctx.quadraticCurveTo(x1+18,top-3,x1+38,top+4);ctx.lineTo(x2-24,top+4);ctx.quadraticCurveTo(x2-8,top+2,x2,top+12);ctx.lineTo(x2,bottom);ctx.lineTo(x1,bottom);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,247,225,.22)';ctx.fillRect(x1+8,top+16,Math.max(0,w-16),3);
    // kleine ramen/nissen
    for(let xx=x1+26;xx<x2-22;xx+=72){const yy=top+34+((xx/72)%2)*13;ctx.fillStyle='rgba(49,74,59,.38)';ctx.beginPath();ctx.roundRect(xx,yy,18,24,6);ctx.fill();ctx.fillStyle='rgba(245,221,175,.28)';ctx.fillRect(xx+4,yy+5,10,3)}
    ctx.strokeStyle=accent;ctx.globalAlpha=.23;ctx.lineWidth=1;for(let yy=top+12;yy<bottom;yy+=30){ctx.beginPath();ctx.moveTo(x1+8,yy);ctx.lineTo(x2-8,yy);ctx.stroke()}ctx.restore();
   };
   wall(25,325,120,223,'#d8c3a0');
   wall(440,820,120,218,'#d2b991');
   wall(145,560,235,338,'#d9c39f');
   wall(650,875,235,338,'#cdb18b');
   wall(25,330,350,452,'#d6bd96');
   wall(420,730,350,452,'#dec8a5');
   wall(130,430,465,558,'#ceb08a');
   wall(515,875,465,558,'#d8c19d');

   // zachte traditionele accenten: tapijt, planten, moderne balkonrand.
   ctx.save();
   const rug=(x,y,w)=>{ctx.fillStyle='#9e4e3f';ctx.fillRect(x,y,w,13);ctx.fillStyle='#dfaa65';for(let i=5;i<w-5;i+=14){ctx.fillRect(x+i,y+3,6,2);ctx.fillRect(x+i+3,y+8,6,2)}};
   rug(53,184,82);rug(676,302,76);
   const pot=(x,y)=>{ctx.fillStyle='#9a6748';ctx.beginPath();ctx.roundRect(x-7,y,14,12,3);ctx.fill();ctx.fillStyle='#557653';ctx.beginPath();ctx.arc(x,y-6,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#75936b';ctx.beginPath();ctx.arc(x-7,y-11,6,0,Math.PI*2);ctx.arc(x+7,y-12,6,0,Math.PI*2);ctx.fill()};
   [[96,220],[500,334],[706,334],[802,104],[285,449],[828,449]].forEach(([x,y])=>pot(x,y));
   ctx.fillStyle='rgba(39,76,55,.74)';ctx.beginPath();ctx.roundRect(727,88,78,12,6);ctx.fill();
   ctx.restore();
  };
  const drawForeground=()=>{
   // Voorgrond maakt de scène minder rechthoekig en geeft diepte.
   ctx.save();
   const haze=ctx.createLinearGradient(0,500,0,620);haze.addColorStop(0,'rgba(242,229,201,0)');haze.addColorStop(1,'rgba(92,74,52,.18)');ctx.fillStyle=haze;ctx.fillRect(0,500,900,120);
   ctx.fillStyle='#496b50';for(const [x,y,r] of [[10,587,28],[35,602,34],[875,590,31],[842,610,38]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
   ctx.fillStyle='#7d9a70';for(const [x,y,r] of [[22,570,16],[58,590,18],[862,570,17],[824,596,20]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
   // subtiele vignette, geen hard canvas-kader
   const vg=ctx.createRadialGradient(450,285,250,450,310,570);vg.addColorStop(.65,'rgba(34,49,38,0)');vg.addColorStop(1,'rgba(34,49,38,.12)');ctx.fillStyle=vg;ctx.fillRect(0,0,900,620);ctx.restore();
  };
  const drawPlatform=p=>{const g=ctx.createLinearGradient(0,p.y,0,p.y+17);g.addColorStop(0,'#cf9a5a');g.addColorStop(.35,'#a96c37');g.addColorStop(1,'#77492d');ctx.fillStyle=g;ctx.fillRect(p.x1,p.y,p.x2-p.x1,16);ctx.fillStyle='rgba(255,222,166,.55)';ctx.fillRect(p.x1,p.y,p.x2-p.x1,3);ctx.strokeStyle='rgba(70,43,26,.5)';ctx.lineWidth=1.5;for(let x=p.x1+18;x<p.x2;x+=34){ctx.beginPath();ctx.moveTo(x,p.y+2);ctx.lineTo(x-8,p.y+15);ctx.stroke()}ctx.fillStyle='rgba(38,82,56,.35)';for(let x=p.x1+25;x<p.x2;x+=92){ctx.beginPath();ctx.arc(x,p.y+18,5,Math.PI,0);ctx.fill()}};
  const drawRamp=r=>{ctx.save();ctx.lineCap='round';ctx.strokeStyle='#71462b';ctx.lineWidth=22;ctx.beginPath();ctx.moveTo(r.x1,r.y1);ctx.lineTo(r.x2,r.y2);ctx.stroke();ctx.strokeStyle='#b9783f';ctx.lineWidth=15;ctx.beginPath();ctx.moveTo(r.x1,r.y1-1);ctx.lineTo(r.x2,r.y2-1);ctx.stroke();ctx.strokeStyle='rgba(255,224,176,.6)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(r.x1,r.y1-5);ctx.lineTo(r.x2,r.y2-5);ctx.stroke();ctx.restore()};
  const drawLadder=l=>{ctx.strokeStyle='#68462e';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(l.x-16,l.top);ctx.lineTo(l.x-16,l.bottom);ctx.moveTo(l.x+16,l.top);ctx.lineTo(l.x+16,l.bottom);ctx.stroke();ctx.strokeStyle='#ad7c4d';ctx.lineWidth=4;for(let y=l.top+12;y<l.bottom;y+=18){ctx.beginPath();ctx.moveTo(l.x-16,y);ctx.lineTo(l.x+16,y);ctx.stroke()}};
  const drawKite=k=>{if(collectedRef.current.has(k.id))return;ctx.save();ctx.translate(k.x,k.y);ctx.rotate(-.16);ctx.shadowColor='#f4c850';ctx.shadowBlur=16;ctx.fillStyle='#1f4d37';ctx.beginPath();ctx.moveTo(0,-23);ctx.lineTo(20,0);ctx.lineTo(0,24);ctx.lineTo(-20,0);ctx.closePath();ctx.fill();ctx.fillStyle='#e58b3e';ctx.beginPath();ctx.moveTo(0,-23);ctx.lineTo(20,0);ctx.lineTo(0,0);ctx.closePath();ctx.fill();ctx.fillStyle='#c84b3d';ctx.beginPath();ctx.moveTo(-20,0);ctx.lineTo(0,24);ctx.lineTo(0,0);ctx.closePath();ctx.fill();ctx.strokeStyle='#654b38';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,24);ctx.quadraticCurveTo(18,38,7,55);ctx.stroke();ctx.shadowBlur=0;ctx.restore()};
  const drawPlayer=p=>{ctx.save();ctx.globalAlpha=p.invuln>0&&Math.floor(p.invuln*12)%2===0?.52:1;const cx=p.x+p.w/2,base=p.y+p.h;ctx.translate(0,0);
   // contact shadow makes the character easy to find against busy scenery
   ctx.fillStyle='rgba(25,43,32,.20)';ctx.beginPath();ctx.ellipse(cx,base+3,19,6,0,0,Math.PI*2);ctx.fill();
   ctx.shadowColor='rgba(22,44,31,.24)';ctx.shadowBlur=8;ctx.shadowOffsetY=3;
   // benen / schoenen
   ctx.strokeStyle='#49372c';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(cx-8,p.y+37);ctx.lineTo(cx-10,base-1);ctx.moveTo(cx+8,p.y+37);ctx.lineTo(cx+10,base-1);ctx.stroke();
   ctx.strokeStyle='#2d2925';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(cx-12,base);ctx.lineTo(cx-5,base);ctx.moveTo(cx+5,base);ctx.lineTo(cx+13,base);ctx.stroke();
   // lichaam
   ctx.fillStyle='#f6efe1';ctx.beginPath();ctx.roundRect(cx-12,p.y+18,24,24,7);ctx.fill();
   ctx.fillStyle='#315b43';ctx.beginPath();ctx.roundRect(cx-17,p.y+19,7,24,3);ctx.roundRect(cx+10,p.y+19,7,24,3);ctx.fill();
   ctx.fillStyle='#bb654b';ctx.fillRect(cx-2,p.y+20,4,21);
   // hoofd
   ctx.fillStyle='#efb27d';ctx.beginPath();ctx.arc(cx,p.y+11,12,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
   ctx.fillStyle='#25211f';if(character==='girl'){ctx.beginPath();ctx.arc(cx,p.y+8,15,Math.PI,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx-12,p.y+15,6,0,Math.PI*2);ctx.arc(cx+12,p.y+15,6,0,Math.PI*2);ctx.fill()}else{ctx.fillStyle='#6c4c34';ctx.beginPath();ctx.ellipse(cx,p.y+1,15,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#292421';ctx.beginPath();ctx.arc(cx,p.y+7,13,Math.PI,Math.PI*2);ctx.fill()}
   // gezicht
   ctx.fillStyle='#2b2724';ctx.beginPath();ctx.arc(cx-4,p.y+10,1.5,0,Math.PI*2);ctx.arc(cx+4,p.y+10,1.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#7b4b34';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx,p.y+14,4,0,Math.PI);ctx.stroke();
   // helder randje zodat het poppetje niet wegvalt tegen muren
   ctx.strokeStyle='rgba(255,250,239,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(cx-18,p.y-5,36,51,16);ctx.stroke();ctx.restore()};
  const drawMelon=m=>{ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.rot);ctx.shadowColor='rgba(31,55,35,.28)';ctx.shadowBlur=7;ctx.shadowOffsetY=3;const mg=ctx.createRadialGradient(-6,-8,4,0,0,m.r);mg.addColorStop(0,'#77a94e');mg.addColorStop(.55,'#3e7e3f');mg.addColorStop(1,'#1f5633');ctx.fillStyle=mg;ctx.beginPath();ctx.arc(0,0,m.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#a8cf63';ctx.lineWidth=2.6;for(let a=-.72;a<=.72;a+=.36){ctx.beginPath();ctx.ellipse(a*7,0,4,m.r-3,a*.8,0,Math.PI*2);ctx.stroke()}ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.arc(-6,-8,4,0,Math.PI*2);ctx.fill();ctx.restore()};
  const draw=()=>{drawBackground();drawArchitecture();ramps.forEach(drawRamp);platforms.forEach(drawPlatform);ladders.forEach(drawLadder);kites.forEach(drawKite);melonsRef.current.forEach(drawMelon);drawPlayer(playerRef.current);drawForeground();ctx.fillStyle='rgba(252,247,238,.94)';ctx.beginPath();ctx.roundRect(18,17,110,42,18);ctx.fill();ctx.fillStyle='#274b38';ctx.font='700 18px Inter, sans-serif';ctx.fillText(`🪁 ${collectedRef.current.size}/3`,39,44);ctx.beginPath();ctx.roundRect(760,17,122,42,18);ctx.fill();ctx.fillStyle='#274b38';ctx.fillText(`◷ ${seconds}s`,784,44)};
  const update=(dt)=>{
   const p=playerRef.current,k=keysRef.current;const move=175;p.vx=(k.left?-move:k.right?move:0);const center=p.x+p.w/2;const ladder=ladders.find(l=>Math.abs(center-l.x)<25&&p.y+p.h>l.top-8&&p.y<l.bottom+5);
   if(k.action&&!prevActionRef.current&&!ladder&&p.onGround){p.vy=-355;p.onGround=false}
   if(k.action&&ladder){p.vy=-125;p.onGround=false}
   prevActionRef.current=k.action;
   const prevBottom=p.y+p.h;p.vy+=620*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.x=Math.max(4,Math.min(868,p.x));
   if(p.vy>=0){const sy=supportY(p.x+p.w/2,p.y+p.h,prevBottom);if(sy!==null){p.y=sy-p.h;p.vy=0;p.onGround=true}else p.onGround=false}
   if(p.y>625)resetPlayer();if(p.invuln>0)p.invuln-=dt;
   const elapsed=60-seconds;spawnRef.current-=dt;const interval=elapsed<20?5.2:elapsed<40?3.7:2.55;if(spawnRef.current<=0){const speed=(95+elapsed*1.25)*(Math.random()>.45?1:-1);melonsRef.current.push({x:speed>0?48:805,y:83,r:18,vx:speed,vy:0,rot:0});spawnRef.current=interval}
   melonsRef.current.forEach(m=>{const prev=m.y+m.r;m.vy+=590*dt;m.x+=m.vx*dt;m.y+=m.vy*dt;m.rot+=m.vx*dt/22;const sy=melonSupport(m,prev);if(m.vy>=0&&sy!==null){m.y=sy-m.r;m.vy=0}if(m.x<m.r){m.x=m.r;m.vx=Math.abs(m.vx)}if(m.x>900-m.r){m.x=900-m.r;m.vx=-Math.abs(m.vx)}});melonsRef.current=melonsRef.current.filter(m=>m.y<680);
   if(p.invuln<=0){for(const m of melonsRef.current){const dx=(p.x+p.w/2)-m.x,dy=(p.y+p.h/2)-m.y;if(Math.hypot(dx,dy)<m.r+17){resetPlayer();setHitNote(true);setTimeout(()=>setHitNote(false),900);break}}}
   for(const kite of kites){if(collectedRef.current.has(kite.id))continue;const dx=(p.x+p.w/2)-kite.x,dy=(p.y+p.h/2)-kite.y;if(Math.hypot(dx,dy)<38){collectedRef.current.add(kite.id);setCollected(collectedRef.current.size);const f=facts[kite.id-1];setFact(f);setPhase('fact');setTimeout(()=>playFact(f),180);break}}
  };
  const loop=t=>{const dt=Math.min(.032,(t-(lastRef.current||t))/1000);lastRef.current=t;if(phase==='playing')update(dt);draw();rafRef.current=requestAnimationFrame(loop)};rafRef.current=requestAnimationFrame(loop);return()=>cancelAnimationFrame(rafRef.current)
 },[phase,seconds,character,facts,platforms,ramps,ladders,kites]);

 const press=(key,val)=>{keysRef.current[key]=val};
 const buttonProps=key=>({onPointerDown:e=>{e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);press(key,true)},onPointerUp:e=>{e.preventDefault();press(key,false)},onPointerCancel:()=>press(key,false),onPointerLeave:e=>{if(e.buttons===0)press(key,false)}});
 return <section className={`kite-adventure-shell phase-${phase}`}>
   <div className="kite-game-topbar"><button className="kite-exit" onClick={onExit}><X/> Stoppen</button><div className="kite-title"><small>SPELEN</small><b>Vlieger Avontuur</b></div><button className="kite-skip" onClick={finish}><SkipForward/> Overslaan</button></div>
   <div className="kite-game-stage">
    <canvas ref={canvasRef} className="kite-canvas" aria-label="Vlieger Avontuur spel"/>
    <div className="kite-stage-gloss" aria-hidden="true"/>
    {hitNote&&<div className="kite-hit-note">🍉 Oeps! Kies snel een andere route.</div>}
    {phase==='playing'&&<div className="kite-controls kite-controls-overlay"><button {...buttonProps('left')} aria-label="Links"><ChevronLeft/></button><button {...buttonProps('right')} aria-label="Rechts"><ChevronRight/></button><button className="kite-action" {...buttonProps('action')} aria-label="Spring of klim"><span>↑</span><small>SPRING</small></button></div>}
    {phase==='select'&&<div className="kite-overlay kite-select"><div className="kite-panel kite-select-panel"><span className="kite-eyebrow">KIES JE AVONTURIER</span><h2>Wie gaat de vliegers zoeken?</h2><p>Kies je avonturier. Daarna begint je tocht door de stad en de bergen.</p><div className="character-choice"><button className={character==='girl'?'active':''} onClick={()=>setCharacter('girl')}><span className="character-preview girl">👧🏻</span><b>Meisje</b></button><button className={character==='boy'?'active':''} onClick={()=>setCharacter('boy')}><span className="character-preview boy">👦🏻</span><b>Jongen</b></button></div><button className="kite-start" onClick={startRound}><Play/> Start avontuur</button></div></div>}
    {phase==='fact'&&fact&&<div className="kite-overlay kite-fact"><div className="kite-panel kite-fact-panel"><div className="kite-ribbon">Vlieger gevonden!</div><span className="fact-kite premium-kite">🪁</span><h2>Wist je dat?</h2><div className="kite-fact-divider"><i/><span>✦</span><i/></div><h3>{fact.title}</h3><p>{fact.text}</p><div className="kite-fact-actions"><button className="fact-listen" onClick={()=>playFact(fact)} aria-label="Luister naar weetje"><Volume2/></button><button className="kite-start" onClick={continueFromFact}>Verder spelen <ChevronRight/></button></div></div></div>}
    {phase==='done'&&<div className="kite-overlay kite-done"><div className="kite-panel kite-done-panel"><div className="kite-ribbon done-ribbon">Mooi gespeeld!</div><div className="done-character-wrap"><span className="done-character">{character==='girl'?'👧🏻':'👦🏻'}</span></div><h2>Je avontuur is klaar</h2><p>Je hebt vandaag <b>{collected}</b> {collected===1?'nieuw weetje':'nieuwe weetjes'} over Afghanistan ontdekt.</p><div className="kite-confetti" aria-hidden="true">✦　◆　✦　◇　◆</div><div className="kite-done-actions"><button onClick={onExit}>Terug naar Spelen</button><button className="kite-start" onClick={restart}><Play/> Volgende ronde</button></div></div></div>}
   </div>
   {phase==='select'&&<div className="kite-howto"><span>🪁 <b>Pak 3 vliegers</b></span><span>🍉 <b>Ontwijk watermeloenen</b></span><span>🧩 <b>Vind je route</b></span><span>⏱️ <b>Steeds iets moeilijker</b></span></div>}
  </section>
}


function Badges({app,game}){const a=[['Eerste stap','25 woorden',app.knownIds.size>=25,'🌱'],['Woordenkenner','100 woorden',app.knownIds.size>=100,'📚'],['Op stoom','500 XP',game.xp>=500,'⭐'],['Doorzetter','7 dagen',(app.progress.streak||0)>=7,'🔥'],['Taalheld','2500 XP',game.xp>=2500,'🏆']];return <div className="badges-grid">{a.map(([n,s,u,e])=><div key={n} className={`badge-card ${u?'unlocked':''}`}><span>{e}</span><b>{n}</b><small>{s}</small>{u&&<Medal/>}</div>)}</div>}
function Games({app,game,go}){const[type,setType]=useState(game.game.lastGame||'sentence');const choose=t=>{setType(t);game.updateGame(g=>({...g,lastGame:t}))};return <div className={`screen focus-screen games-focus ${type==='kite'?'kite-game-active':''}`}><button className="focus-exit" onClick={()=>go('today')}><X/> Sluiten</button><PageHead eyebrow="SPELEN & LEREN" title="Challenges" sub="Oefen kort, ontdek Afghanistan en verbeter wat nog lastig is." badge={<><Trophy/> Level {game.level}</>}/>{type!=='kite'&&<GameSummary game={game}/>}<div className="games-tabs games-tabs-minimal"><button className={type==='sentence'?'active':''} onClick={()=>choose('sentence')}><BookText/><span>Bouw de zin</span></button><button className={type==='listen'?'active':''} onClick={()=>choose('listen')}><Headphones/><span>Luisteren</span></button><button className={type==='picture'?'active':''} onClick={()=>choose('picture')}><Layers3/><span>Plaatjes</span></button><button className={type==='speed'?'active':''} onClick={()=>choose('speed')}><Zap/><span>Snelle ronde</span></button><button className={type==='kite'?'active':''} onClick={()=>choose('kite')}><Sparkles/><span>Vlieger</span></button></div>{type==='sentence'?<SentenceBuilder game={game}/>:type==='listen'?<ListeningQuiz game={game}/>:type==='picture'?<PictureQuiz game={game}/>:type==='speed'?<SpeedRound game={game}/>:<KiteAdventure onExit={()=>choose('sentence')}/>} {type!=='kite'&&<><SectionTitle title="Badges"/><Badges app={app} game={game}/></>}</div>}

function Words({app,game,go,selectedLesson,clearSelectedLesson}){const[query,setQuery]=useState(''),[idx,setIdx]=useState(game.game.positions?.words||0),[revealed,setRevealed]=useState(false),[dragX,setDragX]=useState(0),[dragging,setDragging]=useState(false),start=useRef(null),[exit,setExit]=useState(null);const filtered=useMemo(()=>{const ids=selectedLesson?new Set(selectedLesson.words.map(x=>x.id)):null;return vocab.filter(v=>(!ids||ids.has(v.id))&&(!query||`${v.dutch} ${v.spoken} ${v.latin}`.toLowerCase().includes(query.toLowerCase())))},[query,selectedLesson]);const w=filtered[idx%Math.max(1,filtered.length)]||vocab[0],nextW=filtered[(idx+1)%Math.max(1,filtered.length)]||w,known=app.knownIds.has(w.id);const finish=right=>{if(exit)return;app.update(p=>{const set=new Set(p.known||[]),was=set.has(w.id);right?set.add(w.id):set.delete(w.id);return{...p,known:[...set]}});practice(game,`word:${w.id}`,right);if(right&&!known)awardXP(game,10,'woord geleerd');setExit(right?'right':'left');setDragX(right?700:-700);setTimeout(()=>{const n=(idx+1)%filtered.length;setIdx(n);remember(game,'words',n);setRevealed(false);setDragX(0);setExit(null)},270)};return <div className="screen focus-screen words-focus"><button className="focus-exit" onClick={()=>go('today')}><X/> Sluiten</button><PageHead eyebrow="1000+ WOORDEN" title="Woorden" sub="Swipe rechts: Ken ik. Links: Nog oefenen." badge={<>{idx+1} / {filtered.length}</>}/>{selectedLesson&&<div className="review-banner"><div className="seal">{selectedLesson.emoji}</div><div><b>Les {selectedLesson.number} · {selectedLesson.title}</b><span>{selectedLesson.words.length} woorden</span></div><button onClick={clearSelectedLesson}><X/></button></div>}<div className="word-toolbar"><label><Search/><input value={query} onChange={e=>{setQuery(e.target.value);setIdx(0)}} placeholder="Zoek Nederlands of fonetisch…"/></label></div><div className="swipe-stage"><article className="premium-flashcard swipe-card swipe-card-under"><WordIllustration word={nextW}/></article><article className="premium-flashcard swipe-card swipe-card-top" style={{transform:`translateX(${dragX}px) rotate(${dragX/24}deg)`,transition:dragging?'none':'transform .27s'}} onPointerDown={e=>{start.current=e.clientX;setDragging(true)}} onPointerMove={e=>{if(start.current!==null)setDragX(Math.max(-220,Math.min(220,e.clientX-start.current)))}} onPointerUp={()=>{setDragging(false);start.current=null;if(Math.abs(dragX)>85)finish(dragX>0);else setDragX(0)}} onClick={()=>Math.abs(dragX)<8&&setRevealed(r=>!r)}><div className={`swipe-stamp learn ${dragX<-25?'show':''}`}>NOG OEFENEN</div><div className={`swipe-stamp know ${dragX>25?'show':''}`}>KEN IK!</div><div className="card-top"><span>{labelFor(w.category)}</span></div><WordIllustration word={w}/><div className="word-copy"><small>NEDERLANDS</small><h2>{w.dutch}</h2>{revealed?<><small>ZO ZEG JE HET</small><h3>{w.spoken||w.latin}</h3><button className="sound-btn" onClick={e=>{e.stopPropagation();speak(w.spoken||w.latin,.88,'word',w.id)}}><Volume2/> Luister</button></>:<div className="reveal-hint"><Eye/> Tik voor vertaling</div>}</div></article></div><div className="card-nav swipe-actions-row"><button onClick={()=>finish(false)}><X/> Nog oefenen</button><button onClick={()=>finish(true)}><Check/> Ken ik! +10 XP</button></div></div>}

function WordIllustration({word}){const n=Number(word?.id),file=Number.isFinite(n)&&n>=1?String(n).padStart(3,'0'):null,[failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[n]);if(file&&!failed){const url=`/images/words/${file}.png`;return <div className="word-illustration word-illustration-image" style={{backgroundImage:`url("${url}")`,backgroundSize:'contain',backgroundPosition:'center',backgroundRepeat:'no-repeat',backgroundColor:'#f7f0e3'}}><img src={url} alt="" onError={()=>setFailed(true)} style={{display:'none'}}/></div>}return <div className="word-illustration"><span>{iconFor(word?.category)}</span></div>}
function Sentences(){const[q,setQ]=useState('');const data=sentences.filter(s=>!q||`${s.dutch} ${s.spoken}`.toLowerCase().includes(q.toLowerCase()));return <div className="screen"><PageHead eyebrow="400+ ZINNEN" title="Zinnen" sub="Leer complete zinnen."/><div className="word-toolbar"><label><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Zoek in zinnen…"/></label></div><Coach compact placement="section" type="tip" text="Tip: leer zinnen als één geheel. Zo klinkt je Afghaans sneller natuurlijk."/><div className="sentence-list">{data.slice(0,80).map((s,i)=><article className="sentence-card" key={s.id}><div className="sentence-num">{String(i+1).padStart(2,'0')}</div><div className="sentence-copy"><h3>{s.dutch}</h3><p>{s.spoken||s.latin}</p></div><button onClick={()=>speak(s.spoken||s.latin,.82)}><Volume2/></button></article>)}</div></div>}
function Grammar(){return <div className="screen"><PageHead eyebrow="PRAKTISCH" title="Grammatica" sub="Spreken vóór regels uit het hoofd leren."/><Coach compact placement="section" type="explain" text="Ik help je met de logica achter de taal. Geen lange regels — vooral voorbeelden die je meteen kunt gebruiken."/><div className="grammar-hero"><div className="grammar-mark">Aa</div><div><h2>Leer de logica door te spreken</h2><p>Korte patronen en voorbeelden uit je eigen woordenlijst.</p></div></div></div>}
function SpeakPractice(){const pool=sentences.filter(s=>s.spoken).slice(0,50),[idx,setIdx]=useState(0),s=pool[idx]||sentences[0];return <div className="screen"><PageHead eyebrow="LUISTER & SPREEK" title="Uitspraak"/><section className="speak-practice-card"><Coach hero placement="speak" type="listen" text="Luister eerst goed. Daarna doen we hem samen."/><div className="sound-orbit"><button onClick={()=>speak(s.spoken,.72)}><Volume2/></button></div><h2>{s.spoken}</h2><p>{s.dutch}</p><button className="record-main" onClick={()=>speak(s.spoken,.72)}><Headphones/> Luister opnieuw</button><div className="speak-actions"><button onClick={()=>setIdx(i=>(i-1+pool.length)%pool.length)}><ChevronLeft/></button><button onClick={()=>setIdx(i=>(i+1)%pool.length)}>Volgende <ChevronRight/></button></div></section></div>}
function StatCard({icon,value,label}){return <div className="stat-card"><span>{icon}</span><b>{value}</b><small>{label}</small></div>}
function Profile({app,game,mode,setMode,contentStatus,refreshContent,profile,go,onLogout}){return <div className="screen"><PageHead eyebrow="JOUW VOORTGANG" title="Profiel"/><div className="profile-hero"><div className="big-avatar">{(profile?.display_name||"A")[0]}</div><div><h2>{profile?.display_name||"Leerling"}</h2><p>{profile?.role==="admin"?"Administrator":"Afghan Fluent learner"}</p><span><Flame/> {app.progress.streak||1} dagen streak</span></div></div><GameSummary game={game}/><div className="profile-stats"><StatCard icon={<Layers3/>} value={app.knownIds.size} label="Woorden beheerst"/><StatCard icon={<Trophy/>} value={game.xp} label="XP"/><StatCard icon={<MessageCircle/>} value={contentStatus?.sentenceCount||sentences.length} label="Zinnen"/></div><SectionTitle title="Leerinstellingen"/>{profile?.role==="admin"&&<div className="settings-card admin-entry" onClick={()=>go("admin")}><div><div className="setting-icon"><ShieldCheck/></div><div><b>Gebruikersbeheer</b><span>Accounts aanmaken en voortgang beheren.</span></div></div><ChevronRight/></div>}<div className="settings-card"><div><div className="setting-icon"><UserRound/></div><div><b>Weergave</b><span>Volwassen of extra speels voor kinderen.</span></div></div><div className="segmented"><button className={mode==='family'?'active':''} onClick={()=>setMode('family')}>Volwassen</button><button className={mode==='kids'?'active':''} onClick={()=>setMode('kids')}>Kids</button></div></div><div className="settings-card"><div><div className="setting-icon"><RefreshCw/></div><div><b>OneDrive Excel</b><span>{contentStatus?.vocabularyCount||vocab.length} woorden · {contentStatus?.sentenceCount||sentences.length} zinnen</span></div></div><button className="sync-now" onClick={refreshContent}>Nu synchroniseren</button></div><div className="sync-note"><ShieldCheck/> OneDrive blijft de masterbron voor je woorden en zinnen.</div><button className="logout-button" onClick={onLogout}>Uitloggen</button></div>}
function BottomNav({tab,go}){const x=[['today',Home,'Vandaag'],['path',BookOpen,'Leerpad'],['games',Trophy,'Spelen'],['words',Layers3,'Woorden'],['profile',UserRound,'Profiel']];return <nav className="bottom-nav">{x.map(([id,I,l])=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)}><I/><span>{l}</span></button>)}</nav>}
createRoot(document.getElementById('root')).render(<App/>);

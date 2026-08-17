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

const CATEGORY={home:{label:'Thuis',emoji:'🏡'},food:{label:'Eten & drinken',emoji:'🥣'},travel:{label:'Onderweg',emoji:'🚌'},daily:{label:'Dagelijks',emoji:'☀️'},verbs:{label:'Werkwoorden',emoji:'🏃'},family:{label:'Familie',emoji:'👨‍👩‍👧‍👦'},people:{label:'Mensen',emoji:'🧑'},body:{label:'Lichaam',emoji:'🫶'},clothes:{label:'Kleding',emoji:'🧥'},nature:{label:'Natuur',emoji:'🌿'},animals:{label:'Dieren',emoji:'🐾'},school:{label:'School',emoji:'🎒'},work:{label:'Werk',emoji:'💼'},shopping:{label:'Winkelen',emoji:'🛍️'},time:{label:'Tijd',emoji:'🕰️'},feelings:{label:'Gevoelens',emoji:'💛'},colors:{label:'Kleuren',emoji:'🎨'},numbers:{label:'Getallen',emoji:'🔢'},greetings:{label:'Kennismaking',emoji:'👋'},questions:{label:'Vragen',emoji:'❓'},other:{label:'Overig',emoji:'✨'}};
const iconFor=c=>(CATEGORY[c]||CATEGORY.other).emoji, labelFor=c=>(CATEGORY[c]||{label:c||'Overig'}).label;
const MISSION_TYPES=['picture','listen','sentence','speed'];
const MISSION_LABELS={picture:'Plaatjes',listen:'Luisteren',sentence:'Bouw de zin',speed:'Snelle ronde'};
const MISSION_CONFIG_KEY='afghanFluentEnabledGamesV1';
function readMissionConfig(){const cached=readJsonStorage(MISSION_CONFIG_KEY,null);const list=Array.isArray(cached)?cached:MISSION_TYPES;return MISSION_TYPES.filter(m=>list.includes(m))}
function cacheMissionConfig(list){const clean=MISSION_TYPES.filter(m=>list.includes(m));try{localStorage.setItem(MISSION_CONFIG_KEY,JSON.stringify(clean))}catch{}return clean}
function activeMissionTypes(){return readMissionConfig()}
function normalizeMissionConfig(raw){
 if(Array.isArray(raw))return MISSION_TYPES.filter(m=>raw.includes(m));
 if(raw&&typeof raw==='object'){
  if(Array.isArray(raw.missions))return MISSION_TYPES.filter(m=>raw.missions.includes(m));
  const legacy={picture:raw.picture??raw.pictures,listen:raw.listen??raw.listening,sentence:raw.sentence,speed:raw.speed??raw.quick};
  if(Object.values(legacy).some(v=>typeof v==='boolean'))return MISSION_TYPES.filter(m=>legacy[m]!==false);
 }
 return MISSION_TYPES;
}
async function fetchMissionConfig(){
 // v47 ondersteunt zowel de nieuwe key-schema als de eerder gedeelde id-schema.
 try{
  const{data,error}=await supabase.from('app_settings').select('value').eq('key','enabled_games').maybeSingle();
  if(error)throw error;
  if(data)return cacheMissionConfig(normalizeMissionConfig(data.value));
 }catch(error){console.warn('Nieuwe app_settings-schema niet beschikbaar; probeer compatibiliteitsmodus.',error)}
 try{
  const{data,error}=await supabase.from('app_settings').select('value').eq('id','game_settings').maybeSingle();
  if(error)throw error;
  if(data)return cacheMissionConfig(normalizeMissionConfig(data.value));
 }catch(error){console.warn('Compatibele app_settings-schema niet beschikbaar; lokale veilige standaard wordt gebruikt.',error)}
 return readMissionConfig();
}
async function persistMissionConfig(list){
 const missions=cacheMissionConfig(list),updated_at=new Date().toISOString();
 const primary=await supabase.from('app_settings').upsert({key:'enabled_games',value:{missions},updated_at},{onConflict:'key'});
 if(!primary.error)return missions;
 const legacyValue={pictures:missions.includes('picture'),listening:missions.includes('listen'),sentence:missions.includes('sentence'),quick:missions.includes('speed')};
 const legacy=await supabase.from('app_settings').upsert({id:'game_settings',value:legacyValue,updated_at},{onConflict:'id'});
 if(legacy.error)throw primary.error;
 return missions;
}
const CURRICULUM_ORDER=['greetings','numbers','family','people','home','food','daily','questions','verbs','time','school','clothes','body','feelings','shopping','travel','work','nature','animals','colors','other'];
const LEVEL_TITLES=['Eerste woorden','Hallo & kennismaken','Tellen & kiezen','Mijn familie','Mensen om je heen','Thuis','Eten & drinken','Elke dag','Vragen stellen','Doen & bewegen','Tijd & plannen','School & leren','Kleding','Lichaam & gezondheid','Gevoelens','Winkelen','Onderweg','Werk & afspraken','Buiten & natuur','Dieren','Kleuren & beschrijven','Meer dagelijkse woorden','Korte antwoorden','Korte zinnen','Luisteren in context','Zinnen combineren','Vraag en antwoord','Dagelijkse gesprekken','Thuis praten','Samen eten','Op pad','Plannen maken','Vertellen wat je doet','Vertellen wat je wilt','Mensen beschrijven','Plaatsen beschrijven','Meer luisteren','Sneller herkennen','Langere zinnen','Gesprekken volgen','Zonder vertaling denken','Tempo maken','Combineren & reageren','Praktische gesprekken','Vrijer spreken','Natuurlijk luisteren','Snel reageren','Alles door elkaar','Eindmissie','Afghan Fluent'];
function buildCurriculum(){
 const rank=Object.fromEntries(CURRICULUM_ORDER.map((c,i)=>[c,i]));
 const grouped={};
 vocab.forEach(w=>{const c=w.category||'other';(grouped[c]??=[]).push(w)});
 Object.values(grouped).forEach(list=>list.sort((a,b)=>Number(a.id)-Number(b.id)));
 const categories=Object.keys(grouped).sort((a,b)=>(rank[a]??999)-(rank[b]??999));

 // Verdeel de 50 levels over de echte categorieën. Een level bevat NOOIT
 // woorden uit twee verschillende categorieën.
 const targetLevels=50;
 const total=Math.max(1,vocab.length);
 const allocation=Object.fromEntries(categories.map(c=>[c,1]));
 let remaining=Math.max(0,targetLevels-categories.length);
 const exact=categories.map(c=>({c,share:grouped[c].length/total*targetLevels}));
 while(remaining>0){
  const pick=[...exact].sort((a,b)=>(b.share-allocation[b.c])-(a.share-allocation[a.c]))[0];
  allocation[pick.c]++;remaining--;
 }

 const levels=[];
 const normalize=t=>(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ');
 const sentenceMatchesWords=(sentence,words)=>{
  const hayNl=` ${normalize(sentence.dutch)} `;
  const haySp=` ${normalize(sentence.spoken||sentence.latin)} `;
  return words.some(w=>{
   const nl=normalize(w.dutch).trim(),sp=normalize(w.spoken||w.latin).trim();
   return (nl&&hayNl.includes(` ${nl} `))||(sp&&haySp.includes(` ${sp} `));
  });
 };

 categories.forEach(category=>{
  const words=grouped[category];
  const count=Math.min(allocation[category],words.length);
  for(let part=0;part<count;part++){
   const from=Math.floor(part*words.length/count),to=Math.floor((part+1)*words.length/count);
   const levelWords=words.slice(from,to);
   const related=sentences.filter(s=>sentenceMatchesWords(s,levelWords));
   const maxWords=levels.length<10?4:levels.length<25?6:levels.length<40?9:99;
   let levelSentences=related.filter(x=>{const n=(x.spoken||x.latin||'').trim().split(/\s+/).filter(Boolean).length;return n>=3&&n<=maxWords});
   if(levelSentences.length<4)levelSentences=related;
   levelSentences=levelSentences.slice(0,12);
   const number=levels.length+1;
   const categoryLabel=labelFor(category);
   const title=count>1?`${categoryLabel} ${part+1}`:categoryLabel;
   const phase=number<=10?'Herkennen & uitspreken':number<=20?'Korte zinnen begrijpen':number<=30?'Zelf zinnen maken':number<=40?'Gesprekken volgen':'Vrij reageren';
   const difficulty=number<=10?'Starter':number<=20?'Basis':number<=30?'Actief':number<=40?'Gesprek':'Vloeiender';
   levels.push({id:`level-${number}`,number,title,category,emoji:iconFor(category),words:levelWords,sentences:levelSentences,difficulty,phase});
  }
 });
 return levels.slice(0,targetLevels);
}
const CURRICULUM=buildCurriculum();
const seeded=n=>((Number(n||1)*9301+49297)%233280)/233280;
function dayKey(d=new Date()){return d.toISOString().slice(0,10)}
function loadProgress(userId){return readJsonStorage(userId?profileStorageKey(userId):'afghanFluentProgress',{})}
function saveProgress(userId,p){localStorage.setItem(userId?profileStorageKey(userId):'afghanFluentProgress',JSON.stringify(p))}
function useAppState(userId,cloudProgress,onCloudChange){
 const[progress,setProgress]=useState(()=>loadProgress(userId));
 useEffect(()=>{if(!userId)return;const local=loadProgress(userId);setProgress(cloudProgress&&Object.keys(cloudProgress).length?{...local,...cloudProgress}:local)},[userId,cloudProgress]);
 const update=fn=>setProgress(p=>{const n=typeof fn==='function'?fn(p):fn;saveProgress(userId,n);onCloudChange?.(n);return n});
 return{progress,update,knownIds:new Set(progress.known||[]),favorites:new Set(progress.favorites||[])};
}
function loadGame(userId){return readJsonStorage(userId?gameStorageKey(userId):GAME_KEY,{})}
function saveGame(userId,g){localStorage.setItem(userId?gameStorageKey(userId):GAME_KEY,JSON.stringify(g))}
function useGameState(userId,cloudGame,onCloudChange){
 const[game,setGame]=useState(()=>loadGame(userId));
 useEffect(()=>{if(!userId)return;const local=loadGame(userId);setGame(cloudGame&&Object.keys(cloudGame).length?{...local,...cloudGame}:local)},[userId,cloudGame]);
 const updateGame=fn=>setGame(g=>{const n=typeof fn==='function'?fn(g):fn;saveGame(userId,n);onCloudChange?.(n);return n});
 const xp=game.xp||0,completed=new Set(game.completedLevels||[]),level=Math.min(50,Math.max(1,completed.size+1));return{game,updateGame,xp,level,levelXp:game.levelPoints?.[level]||0,daily:game.daily?.date===dayKey()?(game.daily.xp||0):0,goal:game.dailyGoal||80,kiteTickets:game.kiteTickets||0};
}
function rewardFor(base,{hint=false,wrong=0,revealed=false}={}){let n=base;if(hint)n*=.75;if(wrong)n*=Math.max(.35,1-Math.min(3,wrong)*.15);if(revealed)n*=.5;return Math.max(1,Math.round(n))}
function awardXP(gs,n,reason,level=null){gs.updateGame(g=>{const d=g.daily?.date===dayKey()?g.daily:{date:dayKey(),xp:0},lp={...(g.levelPoints||{})},after=(g.xp||0)+n;if(level)lp[level]=(lp[level]||0)+n;return{...g,xp:after,levelPoints:lp,daily:{date:dayKey(),xp:(d.xp||0)+n},lastActivity:{date:new Date().toISOString(),reason,amount:n}}})}
function completeMission(gs,level,type){if(!level||!MISSION_TYPES.includes(type))return;gs.updateGame(g=>{const missions={...(g.levelMissions||{})},done=new Set(missions[level]||[]);done.add(type);missions[level]=[...done];const required=activeMissionTypes(),completed=new Set(g.completedLevels||[]);let tickets=g.kiteTickets||0;if(required.every(m=>done.has(m))&&!completed.has(level)){completed.add(level);tickets+=1}return{...g,levelMissions:missions,completedLevels:[...completed].sort((a,b)=>a-b),kiteTickets:tickets}})}
function saveMissionResult(gs,level,type,correct,total,minCorrect=0){const accuracy=total?Math.round(correct/total*100):0,passed=total>0&&correct>=minCorrect&&accuracy>80;gs.updateGame(g=>{const levelResult={...(g.levelResults?.[level]||{}),[type]:{correct,total,accuracy,passed,finishedAt:new Date().toISOString()}},levelResults={...(g.levelResults||{}),[level]:levelResult},missions={...(g.levelMissions||{})},done=new Set(missions[level]||[]);if(passed)done.add(type);else done.delete(type);missions[level]=[...done];const wordsDone=!!g.levelWordsCompleted?.[level],allPassed=activeMissionTypes().every(m=>levelResult[m]?.passed===true),completed=new Set(g.completedLevels||[]);let tickets=g.kiteTickets||0;if(wordsDone&&allPassed&&!completed.has(level)){completed.add(level);tickets+=1}return{...g,levelResults,levelMissions:missions,completedLevels:[...completed].sort((a,b)=>a-b),kiteTickets:tickets}});return{accuracy,passed}}
function markLevelWordSeen(gs,level,wordId,totalWordIds=[]){if(!level||!wordId)return;gs.updateGame(g=>{const seenMap={...(g.levelWordSeen||{})},seen=new Set(seenMap[level]||[]);seen.add(Number(wordId));seenMap[level]=[...seen];const required=[...new Set((totalWordIds||[]).map(Number).filter(Number.isFinite))],wordsDone=required.length>0&&required.every(id=>seen.has(id)),completedMap={...(g.levelWordsCompleted||{})};if(wordsDone)completedMap[level]=true;const results=g.levelResults?.[level]||{},allPassed=activeMissionTypes().every(m=>results[m]?.passed===true),completed=new Set(g.completedLevels||[]);let tickets=g.kiteTickets||0;if(wordsDone&&allPassed&&!completed.has(level)){completed.add(level);tickets+=1}return{...g,levelWordSeen:seenMap,levelWordsCompleted:completedMap,completedLevels:[...completed].sort((a,b)=>a-b),kiteTickets:tickets}})}
function levelWordsDone(game,level){return !!game.game.levelWordsCompleted?.[level]}
function remember(gs,k,v){gs.updateGame(g=>({...g,positions:{...(g.positions||{}),[k]:v}}))}
function practice(gs,k,ok){gs.updateGame(g=>{const p={...(g.practice||{})},o=p[k]||{right:0,wrong:0,priority:0,streak:0};const streak=ok?(o.streak||0)+1:0,days=ok?(streak>=4?14:streak>=3?7:streak>=2?3:1):0;p[k]={right:o.right+(ok?1:0),wrong:o.wrong+(ok?0:1),priority:Math.max(0,(o.priority||0)+(ok?-1:3)),streak,due:new Date(Date.now()+days*86400000).toISOString(),last:new Date().toISOString(),mastered:streak>=4};return{...g,practice:p}})}
function reviewItems(game,limit=20){const now=Date.now();return Object.entries(game.game.practice||{}).filter(([,v])=>!v.due||new Date(v.due).getTime()<=now||(v.priority||0)>0).sort((a,b)=>(b[1].priority||0)-(a[1].priority||0)).slice(0,limit)}
function masteryCount(game){return Object.values(game.game.practice||{}).filter(v=>v.mastered).length}
async function speak(text,rate=.86,itemType=null,itemId=null){
 // Hybride uitspraak: 1) opname van Farangis, 2) Dari/Afghanistan (fa-AF), 3) Perzisch/Iran (fa-IR).
 // Bewust geen Nederlandse/default stem als fallback.
 if(itemType&&itemId){
  try{
   const{data}=await supabase.from('audio_recordings').select('storage_path').eq('item_type',itemType).eq('item_id',Number(itemId)).eq('approved',true).maybeSingle();
   if(data?.storage_path){
    const{data:urlData}=supabase.storage.from('farangis-audio').getPublicUrl(data.storage_path);
    if(urlData?.publicUrl){
     const audio=new Audio(urlData.publicUrl);
     await audio.play();
     return;
    }
   }
  }catch(e){console.warn('Farangis-audio niet beschikbaar; TTS fallback wordt gebruikt.',e)}
 }
 if(!text||!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window))return;
 const synth=window.speechSynthesis;
 const getVoices=()=>synth.getVoices?.()||[];
 let voices=getVoices();
 if(!voices.length){
  await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve()};const timer=setTimeout(finish,350);synth.addEventListener?.('voiceschanged',()=>{clearTimeout(timer);finish()},{once:true})});
  voices=getVoices();
 }
 const lang=v=>(v?.lang||'').toLowerCase();
 const voice=voices.find(v=>lang(v)==='fa-af')||voices.find(v=>lang(v).startsWith('fa-af'))||voices.find(v=>lang(v)==='fa-ir')||voices.find(v=>lang(v).startsWith('fa-ir'));
 if(!voice){console.warn('Geen fa-AF of fa-IR stem beschikbaar op dit apparaat.');return}
 synth.cancel();
 const u=new SpeechSynthesisUtterance(text);
 u.voice=voice;
 u.lang=lang(voice).startsWith('fa-af')?'fa-AF':'fa-IR';
 u.rate=rate;
 u.pitch=1;
 synth.speak(u);
}
function shuffle(a){a=[...a];for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}


function LoginScreen({onReady}){
 const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const login=async e=>{e.preventDefault();setBusy(true);setError('');const raw=email.trim();const slug=raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'');const loginEmail=raw.includes('@')?raw:`${slug}@users.afghan-fluent.local`;const{data,error}=await supabase.auth.signInWithPassword({email:loginEmail,password});setBusy(false);if(error)return setError('Inloggen lukt niet. Controleer je naam/e-mailadres en wachtwoord.');onReady?.(data.session)};
 return <div className="auth-shell"><div className="auth-card"><Brand/><div className="auth-coach"><img src={COACH_IMAGES.welcome} alt="Farangis"/></div><small>WELKOM TERUG</small><h1>Salaam 👋</h1><p>Log in om je eigen woorden, VP en voortgang te laden.</p><form onSubmit={login}><label>Naam of e-mailadres<input type="text" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Wachtwoord<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<div className="auth-error">{error}</div>}<button className="auth-primary" disabled={busy}>{busy?'Even laden…':'Inloggen'}</button></form></div></div>
}
async function loadCloudState(session){
 const headers={Authorization:`Bearer ${session.access_token}`};
 const [profileResponse,stateResponse]=await Promise.all([
  fetch('/api/profile',{headers,cache:'no-store'}),
  fetch(`/api/game-state?ts=${Date.now()}`,{headers,cache:'no-store'})
 ]);
 const profileData=await profileResponse.json().catch(()=>({}));
 if(!profileResponse.ok)throw new Error(profileData?.error||'Profiel kon niet worden geladen.');
 const stateData=await stateResponse.json().catch(()=>({}));
 if(!stateResponse.ok)console.error('Cloudvoortgang laden mislukt',stateData?.error||stateResponse.statusText);
 const cloud=stateResponse.ok?stateData?.state:null;
 return{
  ...profileData,
  progress:cloud?.progress&&Object.keys(cloud.progress).length?cloud.progress:profileData.progress,
  game:cloud?.game&&Object.keys(cloud.game).length?cloud.game:profileData.game,
  hasFullCloudState:!!cloud
 };
}
function AdminPanel({session,profile,enabledMissions=MISSION_TYPES,onMissionToggle}){
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

  <section className="admin-card admin-games-card">
   <div className="admin-games-head"><div><small>SPELMODULES</small><h3>Spellen beschikbaar</h3><p>Zet modules tijdelijk uit als ze nog niet klaar zijn. Uitgeschakelde spellen verdwijnen voor leerlingen en tellen niet mee voor levelvoortgang of het Vlieger Avontuur.</p></div><span>{enabledMissions.length}/{MISSION_TYPES.length} actief</span></div>
   <div className="admin-game-toggles">{MISSION_TYPES.map(type=>{const enabled=enabledMissions.includes(type);const I=type==='picture'?Layers3:type==='listen'?Headphones:type==='sentence'?BookText:Zap;return <div className={`admin-game-toggle ${enabled?'enabled':'disabled'}`} key={type}><span><I/></span><div><b>{MISSION_LABELS[type]}</b><small>{enabled?'Beschikbaar voor leerlingen':'Tijdelijk verborgen · telt niet mee'}</small></div><button type="button" role="switch" aria-checked={enabled} className={`admin-switch ${enabled?'on':''}`} onClick={()=>onMissionToggle?.(type,!enabled)}><i/></button></div>})}</div>
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

function Quick({title,sub,icon,onClick}){return <button className="quick-card" onClick={onClick}><span className="quick-icon">{icon}</span><div><b>{title}</b><small>{sub}</small></div></button>}
function Today({app,game,go,displayName='Leerling'}){const known=app.knownIds.size;return <div className="screen today-screen home-v14 home-v16"><section className="welcome home-welcome-v2"><div className="welcome-copy"><p className="kicker">GOEDE DAG</p><h1>Salaam, {displayName}! <span>👋</span></h1><p className="welcome-line">Vandaag is een mooie dag om te leren.</p></div><div className="streak-pill"><Flame/><b>{app.progress.streak||1}</b><span>dagen</span></div><div className="home-coach-stage" aria-hidden="true"><img className="home-coach-character" src={COACH_IMAGES.welcome} alt=""/></div></section><div className="continue-card" onClick={()=>go(game.game.lastTab&&game.game.lastTab!=='today'?game.game.lastTab:'path')}><div className="continue-copy"><small>GA VERDER WAAR JE WAS</small><h2>Verder leren</h2><div className="mini-progress"><i style={{width:`${Math.min(100,game.daily)}%`}}/></div></div><button aria-label="Verder leren"><ChevronRight/></button></div><section className="quick-grid home-actions"><Quick title="Spelen" sub="Oefen je huidige level" icon={<Trophy/>} onClick={()=>go('games')}/><Quick title="Woorden" sub="Flashcards" icon={<Layers3/>} onClick={()=>go('words')}/><Quick title="Zinnen" sub="Oefen zinnen" icon={<MessageCircle/>} onClick={()=>go('sentences')}/><Quick title="Uitspraak" sub="Luister & spreek" icon={<Mic/>} onClick={()=>go('speak')}/></section><div className="review-banner home-review" onClick={()=>go('review')}><div className="seal"><Brain/></div><div><b>Nog oefenen</b><span>Korte challenge met wat extra aandacht nodig heeft.</span></div><ChevronRight/></div><section className="home-progress"><div className="home-progress-title"><span>JOUW VOORTGANG</span><b>Vandaag</b></div><GameSummary game={game}/><div className="profile-stats"><StatCard icon={<Layers3/>} value={known} label="Woorden"/><StatCard icon={<img className="vp-kite-icon stat-kite" src="/images/game/kite.png" alt=""/>} value={game.xp} label="VP"/><StatCard icon={<Flame/>} value={app.progress.streak||1} label="Streak"/></div></section></div>}

function App(){
 const[session,setSession]=useState(null),[authReady,setAuthReady]=useState(false),[profile,setProfile]=useState(null),[cloudProgress,setCloudProgress]=useState({}),[cloudGame,setCloudGame]=useState({});
 const[tab,setTab]=useState('today'),[mode,setMode]=useState('family'),[selectedLesson,setSelectedLesson]=useState(null),[enabledMissions,setEnabledMissions]=useState(()=>readMissionConfig()),[missionConfigError,setMissionConfigError]=useState('');
 const[contentStatus,setContentStatus]=useState(()=>readJsonStorage(CONTENT_STATUS_KEY,{state:cachedContent?'cached':'bundled',lastSync:cachedContent?.syncedAt||null,vocabularyCount:vocab.length,sentenceCount:sentences.length,source:cachedContent?'OneDrive cache':'Ingebouwde reservekopie'}));
 const cloudSyncTimer=useRef(null),latestCloudState=useRef({progress:null,game:null}),cloudStateLoaded=useRef(false);
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);setAuthReady(true)});return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(!session?.user?.id)return;let cancelled=false;fetchMissionConfig().then(list=>{if(!cancelled){setEnabledMissions(list);setMissionConfigError('')}}).catch(error=>{console.warn('Spelinstellingen konden niet uit Supabase worden geladen; lokale reserve wordt gebruikt.',error);if(!cancelled){setEnabledMissions(readMissionConfig());setMissionConfigError('Cloudinstelling niet beschikbaar')}});return()=>{cancelled=true}},[session?.user?.id]);
 useEffect(()=>{
  if(!session?.user?.id){setProfile(null);return}
  let cancelled=false;
  cloudStateLoaded.current=false;
  loadCloudState(session).then(s=>{if(cancelled)return;setProfile(s.profile);setCloudProgress(s.progress||{});setCloudGame(s.game||{});latestCloudState.current={progress:s.progress||{},game:s.game||{}};cloudStateLoaded.current=true;setMode(s.profile?.mode==='kids'?'kids':'family');
   // Migratie: als er nog geen volledige cloud-state bestaat, zet de lokale
   // voortgang van dit apparaat direct klaar om naar de cloud te schrijven.
   if(!s.hasFullCloudState){latestCloudState.current={progress:{...s.progress,...loadProgress(session.user.id)},game:{...s.game,...loadGame(session.user.id)}};clearTimeout(cloudSyncTimer.current);cloudSyncTimer.current=setTimeout(()=>saveFullCloudState(latestCloudState.current),250)}
  }).catch(error=>{
   console.error('Profiel laden mislukt',error);
   if(cancelled)return;
   const fallbackRole=session.user.app_metadata?.role==='admin'?'admin':'user';
   setProfile({id:session.user.id,display_name:session.user.user_metadata?.display_name||session.user.email?.split('@')[0]||'Leerling',role:fallbackRole,mode:'adult',is_active:true,_loadError:error.message});
  });
  return()=>{cancelled=true};
 },[session?.user?.id]);
 const saveFullCloudState=async state=>{
  if(!session?.user?.id||!cloudStateLoaded.current)return;
  const payload={progress:state.progress||loadProgress(session.user.id),game:state.game||loadGame(session.user.id)};
  try{
   const response=await fetch('/api/game-state',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(payload)});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data?.error||'Cloud-sync mislukt.');
  }catch(error){console.error('Voortgang opslaan in cloud mislukt',error)}
 };
 const scheduleCloudSave=()=>{if(!session?.user?.id||!cloudStateLoaded.current)return;clearTimeout(cloudSyncTimer.current);cloudSyncTimer.current=setTimeout(()=>saveFullCloudState(latestCloudState.current),500)};
 const queueProgress=p=>{if(!session?.user?.id)return;latestCloudState.current={...latestCloudState.current,progress:p};scheduleCloudSave()};
 const queueGame=g=>{if(!session?.user?.id)return;latestCloudState.current={...latestCloudState.current,game:g};scheduleCloudSave()};
 const app=useAppState(session?.user?.id,cloudProgress,queueProgress),game=useGameState(session?.user?.id,cloudGame,queueGame);
 const changeMissionAvailability=async(type,enabled)=>{
  const next=MISSION_TYPES.filter(m=>m!==type?enabledMissions.includes(m):enabled);
  setEnabledMissions(cacheMissionConfig(next));setMissionConfigError('');
  // Alleen na een bewuste adminwijziging herberekenen. Niet tijdens app-start.
  game.updateGame(g=>{const completed=new Set(g.completedLevels||[]);let tickets=g.kiteTickets||0,changed=false;for(const l of CURRICULUM){if(completed.has(l.number))continue;const wordsDone=!!g.levelWordsCompleted?.[l.number],results=g.levelResults?.[l.number]||{};if(wordsDone&&next.every(m=>results[m]?.passed===true)){completed.add(l.number);tickets+=1;changed=true}}return changed?{...g,completedLevels:[...completed].sort((a,b)=>a-b),kiteTickets:tickets}:g});
  try{await persistMissionConfig(next)}catch(error){console.error('Spelinstelling opslaan mislukt',error);setMissionConfigError('Cloudinstelling kon niet worden opgeslagen. De app blijft lokaal werken.')}
 };
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
  {tab==='admin'&&profile.role==='admin'&&<AdminPanel session={session} profile={profile} enabledMissions={enabledMissions} onMissionToggle={changeMissionAvailability}/>}
 </main><BottomNav tab={tab} go={go}/></div></div>
}
function Brand(){return <div className="brand"><div className="brand-arch">A</div><div><strong>Afghan Fluent</strong><span>Leer Afghaans op jouw manier</span></div></div>}
function DesktopRail({tab,go,streak,isAdmin=false}){let items=[['today',Home,'Vandaag'],['path',BookOpen,'Leerpad'],['words',Layers3,'Woorden'],['sentences',MessageCircle,'Zinnen'],['grammar',BookText,'Grammatica'],['speak',Mic,'Uitspraak']];if(isAdmin)items.push(['admin',ShieldCheck,'Beheer']);return <aside className="desktop-rail"><Brand/><div className="rail-stats"><span><Flame/> {streak} dagen</span><span><Sparkles/> 1000 woorden</span></div><nav>{items.map(([id,I,l])=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)}><I/><span>{l}</span></button>)}</nav><button className="profile-tile" onClick={()=>go('profile')}><div className="avatar">A</div><div><b>Jouw profiel</b><small>Family mode</small></div><ChevronRight/></button></aside>}
function TopChrome({mode,setMode,displayName}){return <header className="top-chrome"><div className="mobile-brand"><div className="mini-arch">A</div><span>Afghan Fluent</span></div><div className="mode-switch"><button className={mode==='family'?'active':''} onClick={()=>setMode('family')}>Volwassen</button><button className={mode==='kids'?'active':''} onClick={()=>setMode('kids')}>Kids</button></div></header>}
function PageHead({eyebrow,title,sub,badge}){return <div className="page-head"><div><span>{eyebrow}</span><h1>{title}</h1>{sub&&<p>{sub}</p>}</div>{badge&&<div className="page-badge">{badge}</div>}</div>}
function SectionTitle({title}){return <div className="section-title"><h2>{title}</h2></div>}
function GameSummary({game}){const enabled=activeMissionTypes(),totalParts=1+enabled.length,pct=Math.min(100,Math.round(game.daily/game.goal*100)),results=game.game.levelResults?.[game.level]||{},missions=new Set(enabled.filter(m=>results[m]?.passed===true)),wordsDone=levelWordsDone(game,game.level),parts=(wordsDone?1:0)+missions.size;return <section className="game-summary"><div className="game-stat"><span><Trophy/></span><div><small>LEVEL</small><b>{game.level}/50</b></div></div><div className="game-xp"><div><b className="vp-amount"><img className="vp-kite-icon" src="/images/game/kite.png" alt=""/>{game.xp}</b><small>{parts}/{totalParts} onderdelen in level {game.level}</small></div><div className="game-bar"><i style={{width:`${totalParts?parts/totalParts*100:0}%`}}/></div></div><div className="game-stat"><span><Sparkles/></span><div><small>VLIEGERS</small><b>{game.kiteTickets}</b></div></div><div className="game-goal"><div className="game-bar"><i style={{width:`${pct}%`}}/></div><small>{game.daily}/{game.goal} vandaag</small></div></section>}
function LearningPath({app,game,isAdmin=false,openLesson}){const enabled=activeMissionTypes(),totalParts=1+enabled.length,completed=new Set(game.game.completedLevels||[]),current=Math.min(50,completed.size+1),adminOpen=isAdmin&&!!game.game.adminAllLevels;return <div className="screen curriculum-screen"><PageHead eyebrow="JOUW ROUTE" title="Van eerste woord tot gesprek" sub={`50 levels. Eerst leer je de nieuwe woorden; daarna pas je ze toe in ${enabled.length} actieve ${enabled.length===1?'spel':'spellen'}.`} badge={<><img className="vp-kite-icon" src="/images/game/kite.png" alt=""/>{game.xp}</>}/><div className="curriculum-intro"><div><small>DOEL</small><b>Na level 50 kun je veel dagelijkse Afghaanse gesprekken begrijpen en zelf voeren.</b></div><span>{completed.size}/50</span></div>{adminOpen&&<div className="admin-unlock-banner"><ShieldCheck/> Admin testmodus: alle 50 levels zijn speelbaar.</div>}<div className="path-list curriculum-path">{CURRICULUM.map(l=>{const done=completed.has(l.number),locked=!adminOpen&&l.number>current,results=game.game.levelResults?.[l.number]||{},missions=new Set(enabled.filter(m=>results[m]?.passed===true)),wordsDone=levelWordsDone(game,l.number),parts=(wordsDone?1:0)+missions.size;return <div className={`path-item curriculum-level ${done?'done':''} ${locked?'locked':''}`} key={l.id}><span className={`path-node ${done?'complete':''}`}>{done?<Check/>:locked?<Lock/>:l.number}</span><button className="lesson-row" disabled={locked} onClick={()=>openLesson(l)}><span className="lesson-art">{l.emoji}</span><div className="lesson-main"><div className="level-title-row"><b>{l.number}. {l.title}</b><em>{l.difficulty}</em></div><small>{l.phase} · {l.words.length} woorden · {parts}/{totalParts} onderdelen voltooid</small><div className="level-five-dots"><i className={wordsDone?'done':''}/>{enabled.map(m=><i key={m} className={missions.has(m)?'done':''}/>)}</div><div className="tiny-bar"><i style={{width:`${done?100:(totalParts?parts/totalParts*100:0)}%`}}/></div></div>{!locked&&<ChevronRight/>}</button>{done&&<div className="kite-earned"><Sparkles/> Level voltooid · Vlieger vrijgespeeld</div>}</div>})}</div></div>}
function SentenceBuilder({game,level,lesson,onSolved}){
 const pool=useMemo(()=>{const base=lesson?.sentences?.length?lesson.sentences:sentences;return base.filter(s=>(s.spoken||s.latin||'').trim().split(/\s+/).length>=3)},[lesson?.id]),[idx,setIdx]=useState(0),s=pool[idx%Math.max(1,pool.length)];
 const[bank,setBank]=useState([]),[answer,setAnswer]=useState([]),[result,setResult]=useState(null),[dragging,setDragging]=useState(null),[dragPos,setDragPos]=useState(null),[hoverSlot,setHoverSlot]=useState(null),[coachMessage,setCoachMessage]=useState(null),[help,setHelp]=useState({hint:false,revealed:false,wrong:0}),[finished,setFinished]=useState(null); const drag=useRef(null),sessionStats=useRef({correct:0,total:0});

 useEffect(()=>{if(!s)return;const words=(s.spoken||s.latin).trim().split(/\s+/).map((word,i)=>({id:`${s.id}-${i}-${word}`,word,origin:i}));setBank(shuffle(words));setAnswer(Array(words.length).fill(null));setResult(null);setDragging(null);setDragPos(null);setHoverSlot(null);setCoachMessage(null);setHelp({hint:false,revealed:false,wrong:0})},[s?.id]);

 const reset=()=>{const all=[...bank,...answer.filter(Boolean)];setBank(shuffle(all));setAnswer(Array(all.length).fill(null));setResult(null);setDragging(null);setDragPos(null);setHoverSlot(null);setCoachMessage(null)};
 const showHint=()=>{setHelp(h=>({...h,hint:true}));const first=(s.spoken||s.latin).trim().split(/\s+/)[0];setCoachMessage({type:'tip',text:`Begin eens met ‘${first}’. Daarna valt de rest vaak vanzelf op zijn plek.`})};
 const revealAnswer=()=>{setHelp(h=>({...h,revealed:true}));const words=(s.spoken||s.latin).trim().split(/\s+/).map((word,i)=>({id:`${s.id}-${i}-${word}`,word,origin:i}));setAnswer(words);setBank([]);setResult(null);setCoachMessage({type:'help',text:'Ik heb de goede volgorde voor je klaargezet. Kijk er rustig naar.'})};

 const putInSlot=(tile,slot,source,sourceIndex)=>{setResult(null);setAnswer(a=>{const n=[...a],displaced=n[slot];n[slot]=tile;if(source==='slot'&&sourceIndex!==slot)n[sourceIndex]=displaced||null;else if(source==='bank'&&displaced)setBank(b=>[...b,displaced]);return n});if(source==='bank')setBank(b=>b.filter(x=>x.id!==tile.id))};
 const returnToBank=(slot)=>{const tile=answer[slot];if(!tile)return;setAnswer(a=>a.map((x,i)=>i===slot?null:x));setBank(b=>[...b,tile]);setResult(null)};
 const tapBank=tile=>{const slot=answer.findIndex(x=>!x);if(slot>=0)putInSlot(tile,slot,'bank',null)};
 const startDrag=(e,tile,source,sourceIndex)=>{if(result==='good')return;e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);drag.current={tile,source,sourceIndex,pointerId:e.pointerId};setDragging(tile.id);setDragPos({x:e.clientX,y:e.clientY,word:tile.word})};
 const moveDrag=e=>{if(!drag.current)return;e.preventDefault();setDragPos({x:e.clientX,y:e.clientY,word:drag.current.tile.word});const el=document.elementsFromPoint(e.clientX,e.clientY).find(n=>n?.dataset?.answerSlot!==undefined);setHoverSlot(el?Number(el.dataset.answerSlot):null)};
 const endDrag=e=>{if(!drag.current)return;const d=drag.current;const el=document.elementsFromPoint(e.clientX,e.clientY).find(n=>n?.dataset?.answerSlot!==undefined);const slot=el?Number(el.dataset.answerSlot):null;if(slot!==null)putInSlot(d.tile,slot,d.source,d.sourceIndex);drag.current=null;setDragging(null);setDragPos(null);setHoverSlot(null);try{e.currentTarget.releasePointerCapture?.(e.pointerId)}catch{}};

 const check=()=>{if(answer.some(x=>!x))return;const ok=answer.every((t,i)=>t?.origin===i);sessionStats.current.total+=1;if(ok)sessionStats.current.correct+=1;setResult(ok?'good':'bad');practice(game,`sentence:${s.id}`,ok);if(ok){const pts=rewardFor(20,help);awardXP(game,pts,'zin gebouwd',level);setCoachMessage({type:'correct',text:`Perfect! +${pts} vliegerpunten ✨`})}else{setHelp(h=>({...h,wrong:h.wrong+1}));setCoachMessage({type:'almost',text:'Bijna — probeer het nog eens. Bij een volgende poging zijn iets minder vliegerpunten te verdienen.'})}};
 const next=()=>{if((idx%pool.length)>=pool.length-1){const r=saveMissionResult(game,level,'sentence',sessionStats.current.correct,sessionStats.current.total);setFinished(r);if(r.passed)onSolved?.('sentence');return}const n=(idx+1)%pool.length;setIdx(n);remember(game,'builder',n)};
 const restartSession=()=>{sessionStats.current={correct:0,total:0};setFinished(null);setIdx(0);remember(game,'builder',0)};

 if(!s)return null;
 if(finished)return <section className="game-card mission-finish-card"><Trophy/><small>BOUW DE ZIN AFGEROND</small><h2>{finished.accuracy}% goed</h2><p>{finished.passed?'Missie gehaald. Deze telt mee voor het vrijspelen van het Vlieger Avontuur.':'Je hebt meer dan 80% nodig. Probeer de ronde nog een keer.'}</p><button className="primary-game" onClick={finished.passed?()=>onSolved?.('done'):restartSession}>{finished.passed?'Klaar':'Opnieuw proberen'}</button></section>;
 const coachType=coachMessage?.type||'think'; const coachSrc=COACH_IMAGES[coachType]||COACH_IMAGES.think;

 const sentenceWords=(s.spoken||s.latin||'').trim().split(/\s+/).filter(Boolean);
 const sentenceChars=sentenceWords.join('').length;
 const longestWord=Math.max(1,...sentenceWords.map(w=>w.length));
 const tileFontSize=sentenceChars<=16&&longestWord<=8?18:sentenceChars<=24&&longestWord<=10?16:sentenceChars<=34&&longestWord<=12?14:12;

 return <section className={`game-card sentence-builder-v2 sentence-builder-v29 ${answer.length>3?'has-many-words':'has-three-words'}`} style={{'--word-count':Math.max(1,answer.length),'--sentence-tile-font':`${tileFontSize}px`}}>
   <div className="builder-v29-head">
     <div className="builder-v29-title">
       <small>🧩 BOUW DE ZIN <span className="builder-xp-inline">max 20 VP</span></small>
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
       <button className="primary-game" disabled={answer.some(x=>!x)} onClick={result==='good'?next:check}>{result==='good'?((idx%pool.length)>=pool.length-1?'Afronden':'Volgende zin'):'Controleren'}</button>
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

function ListeningQuiz({game,level,lesson,onSolved}){
 const pool=useMemo(()=>{const base=lesson?.sentences?.length?lesson.sentences:sentences;return base.filter(s=>(s.spoken||s.latin)&&s.dutch)},[lesson?.id]),[idx,setIdx]=useState(0),[choice,setChoice]=useState(null),[coachMessage,setCoachMessage]=useState(null),[help,setHelp]=useState({hint:false,revealed:false,wrong:0}),[finished,setFinished]=useState(null),stats=useRef({correct:0,total:0}),s=pool[idx];
 const opts=useMemo(()=>s?shuffle([s,...shuffle(pool.filter(x=>x.id!==s.id)).slice(0,3)]):[],[s?.id]);
 useEffect(()=>{setChoice(null);setCoachMessage(null);setHelp({hint:false,revealed:false,wrong:0})},[s?.id]);
 if(finished)return <section className="game-card mission-finish-card"><Trophy/><small>LUISTEREN AFGEROND</small><h2>{finished.accuracy}% goed</h2><p>{finished.passed?'Missie gehaald. Luisteren telt mee voor je level.':'Je hebt meer dan 80% nodig. Probeer de hele ronde nog een keer.'}</p><button className="primary-game" onClick={()=>{if(finished.passed){onSolved?.('done')}else{stats.current={correct:0,total:0};setIdx(0);setFinished(null)}}}>{finished.passed?'Klaar':'Opnieuw proberen'}</button></section>;
 if(!s)return null;
 const play=()=>{const rate=level<=10?.68:level<=20?.76:level<=30?.84:level<=40?.92:1;speak(s.spoken||s.latin,rate,'sentence',s.id);setCoachMessage({type:'listen',text:'Luister goed naar de klank en het ritme. Daarna kun je kiezen.'})};
 const hint=()=>{setHelp(h=>({...h,hint:true}));setCoachMessage({type:'tip',text:'Luister nog een keer. Denk aan de betekenis van wat je hoort.'})};
 const reveal=()=>{setHelp(h=>({...h,revealed:true}));setCoachMessage({type:'help',text:`Het juiste antwoord is: “${s.dutch}”.`})};
 const answer=o=>{if(choice)return;const ok=o.id===s.id;stats.current.total+=1;if(ok)stats.current.correct+=1;setChoice({id:o.id,ok});practice(game,`listen:${s.id}`,ok);if(ok){const pts=rewardFor(15,help);awardXP(game,pts,'luisterquiz',level);setCoachMessage({type:'correct',text:`Goed gehoord! +${pts} vliegerpunten ✨`})}else{setHelp(h=>({...h,wrong:h.wrong+1}));setCoachMessage({type:'almost',text:'Bijna. Probeer opnieuw; na fouten daalt de beloning iets.'})}};
 const reset=()=>{setChoice(null);setCoachMessage(null)};
 const next=()=>{if(idx>=pool.length-1){const r=saveMissionResult(game,level,'listen',stats.current.correct,stats.current.total);setFinished(r);if(r.passed)onSolved?.('listen');return}const n=idx+1;setIdx(n);setChoice(null);setCoachMessage(null);remember(game,'listen',n)};
 return <section className="game-card sentence-builder-v29 unified-game-card listening-unified"><div className="builder-v29-head unified-game-head"><div className="builder-v29-title"><small>🎧 LUISTERQUIZ <span className="builder-xp-inline">max 15 VP</span></small><h2>Luister en kies<br/>het juiste antwoord</h2><p>{idx+1} van {pool.length}</p></div><UnifiedGameTools onHint={hint} onListen={play} onAnswer={reveal}/></div><button className="unified-listen-main" onClick={play}><Headphones/> Luister</button><div className="quiz-options unified-choice-grid">{opts.map(o=><button key={o.id} onClick={()=>answer(o)} disabled={!!choice} className={choice?(o.id===s.id?'correct':choice.id===o.id?'wrong':'muted-answer'):''}>{o.id===s.id&&choice&&<Check/>}{choice?.id===o.id&&!choice.ok&&<X/>}{o.dutch}</button>)}</div><UnifiedCoachZone message={coachMessage} onReset={reset} onPrimary={choice?(choice.ok?next:reset):play} primaryLabel={choice?(choice.ok?(idx>=pool.length-1?'Afronden':'Volgende'):'Nog eens'):'Luisteren'}/></section>
}

function PictureQuiz({game,level,lesson,onSolved}){
 const pool=useMemo(()=>lesson?.words?.length?lesson.words:vocab.filter(w=>Number(w.id)>=1),[lesson?.id]),[idx,setIdx]=useState(0),[choice,setChoice]=useState(null),[coachMessage,setCoachMessage]=useState(null),[help,setHelp]=useState({hint:false,revealed:false,wrong:0}),[finished,setFinished]=useState(null),stats=useRef({correct:0,total:0}),w=pool[idx];
 const opts=useMemo(()=>w?shuffle([w,...shuffle(pool.filter(x=>x.id!==w.id)).slice(0,3)]):[],[w?.id]);
 useEffect(()=>{setChoice(null);setCoachMessage(null);setHelp({hint:false,revealed:false,wrong:0})},[w?.id]);
 if(finished)return <section className="game-card mission-finish-card"><Trophy/><small>PLAATJES AFGEROND</small><h2>{finished.accuracy}% goed</h2><p>{finished.passed?'Missie gehaald. Plaatjes telt mee voor je level.':'Je hebt meer dan 80% nodig. Probeer de hele ronde nog een keer.'}</p><button className="primary-game" onClick={()=>{if(finished.passed){onSolved?.('done')}else{stats.current={correct:0,total:0};setIdx(0);setFinished(null)}}}>{finished.passed?'Klaar':'Opnieuw proberen'}</button></section>;
 if(!w)return null; const spoken=w.spoken||w.latin;
 const hint=()=>{setHelp(h=>({...h,hint:true}));setCoachMessage({type:'tip',text:`Kijk goed naar de vier beelden en denk aan de betekenis van “${spoken}”.`})};
 const listen=()=>{speak(spoken,.78,'word',w.id);setCoachMessage({type:'listen',text:`Luister naar “${spoken}” en kijk daarna opnieuw naar de plaatjes.`})};
 const reveal=()=>{setHelp(h=>({...h,revealed:true}));setCoachMessage({type:'help',text:`“${spoken}” betekent “${w.dutch}”.`})};
 const answer=o=>{if(choice)return;const ok=o.id===w.id;stats.current.total+=1;if(ok)stats.current.correct+=1;setChoice({id:o.id,ok});practice(game,`picture:${w.id}`,ok);if(ok){const pts=rewardFor(10,help);awardXP(game,pts,'plaatjesquiz',level);setCoachMessage({type:'correct',text:`Precies! +${pts} vliegerpunten ✨`})}else{setHelp(h=>({...h,wrong:h.wrong+1}));setCoachMessage({type:'almost',text:'Bijna. Probeer opnieuw; na fouten daalt de beloning iets.'})}};
 const reset=()=>{setChoice(null);setCoachMessage(null)};
 const next=()=>{if(idx>=pool.length-1){const r=saveMissionResult(game,level,'picture',stats.current.correct,stats.current.total);setFinished(r);if(r.passed)onSolved?.('picture');return}const n=idx+1;setIdx(n);setChoice(null);setCoachMessage(null);remember(game,'picture',n)};
 return <section className="game-card sentence-builder-v29 unified-game-card picture-unified"><div className="builder-v29-head unified-game-head"><div className="builder-v29-title"><small>🖼️ PLAATJESQUIZ <span className="builder-xp-inline">max 10 VP</span></small><h2>Welke afbeelding<br/>hoort erbij?</h2><p>{idx+1} van {pool.length}</p></div><UnifiedGameTools onHint={hint} onListen={listen} onAnswer={reveal}/></div><div className="picture-word unified-picture-word">{spoken}</div><div className="picture-options unified-picture-grid">{opts.map(o=>{const correct=choice&&o.id===w.id,wrong=choice&&!choice.ok&&choice.id===o.id;return <button key={o.id} onClick={()=>answer(o)} disabled={!!choice} className={`${correct?'correct':''} ${wrong?'wrong':''} ${choice&&!correct&&!wrong?'muted-answer':''}`}><div className="picture-state">{correct?<Check/>:wrong?<X/>:null}</div><WordIllustration word={o}/><span>{o.dutch}</span></button>})}</div><UnifiedCoachZone message={coachMessage} onReset={reset} onPrimary={choice?(choice.ok?next:reset):listen} primaryLabel={choice?(choice.ok?(idx>=pool.length-1?'Afronden':'Volgende'):'Nog eens'):'Luisteren'}/></section>
}

function SpeedRound({game,level,lesson,onSolved}){
 const[running,setRunning]=useState(false),[seconds,setSeconds]=useState(60),[score,setScore]=useState(0),[q,setQ]=useState(null),[opts,setOpts]=useState([]),[feedback,setFeedback]=useState(null),[coachMessage,setCoachMessage]=useState(null),[assists,setAssists]=useState(0),[wrongs,setWrongs]=useState(0);const feedbackTimer=useRef(null);
 const speedPool=lesson?.words?.length?lesson.words:vocab; const newQ=()=>{const w=speedPool[Math.floor(Math.random()*speedPool.length)];setQ(w);setOpts(shuffle([w,...shuffle(speedPool.filter(x=>x.id!==w.id)).slice(0,3)]));setFeedback(null);setCoachMessage(null)};
 useEffect(()=>{if(!running)return;const t=setInterval(()=>setSeconds(s=>s-1),1000);return()=>clearInterval(t)},[running]);
 useEffect(()=>{if(running&&seconds<=0){setRunning(false);clearTimeout(feedbackTimer.current);const pts=rewardFor(score*5,{hint:assists>0,wrong:wrongs,revealed:assists>2});awardXP(game,pts,'snelle ronde',level);const r=saveMissionResult(game,level,'speed',score,score+wrongs,3);if(r.passed&&score>=3)onSolved?.('speed');setCoachMessage({type:r.passed?'celebrate':'almost',text:`Ronde klaar! ${score} goed · ${r.accuracy}% correct · +${pts} VP${r.passed?' ✨':' · meer dan 80% nodig'}`})}},[seconds]);
 useEffect(()=>()=>clearTimeout(feedbackTimer.current),[]);
 const start=()=>{setSeconds(60);setScore(0);setAssists(0);setWrongs(0);setRunning(true);newQ()};
 const answer=o=>{if(feedback||!running)return;const ok=o.id===q.id;if(ok)setScore(s=>s+1);else setWrongs(n=>n+1);practice(game,`speed:${q.id}`,ok);setFeedback({id:o.id,ok,correct:q.id,correctText:q.spoken||q.latin});setCoachMessage(ok?{type:'correct',text:'Goed! Snel én correct. ✨'}:{type:'almost',text:`Nog niet. Het juiste antwoord is “${q.spoken||q.latin}”.`});feedbackTimer.current=setTimeout(()=>{if(seconds>0)newQ()},ok?650:1050)};
 const hint=()=>{if(q){setAssists(n=>n+1);setCoachMessage({type:'tip',text:`Denk aan “${q.dutch}” en vergelijk de vier antwoorden.`})}};
 const listen=()=>{if(q){speak(q.spoken||q.latin,.78);setCoachMessage({type:'listen',text:'Luister naar het juiste Afghaanse woord.'})}};
 const reveal=()=>{if(q){setAssists(n=>n+2);setCoachMessage({type:'help',text:`“${q.dutch}” is “${q.spoken||q.latin}”.`})}};
 const reset=()=>{clearTimeout(feedbackTimer.current);setRunning(false);setSeconds(60);setScore(0);setQ(null);setOpts([]);setFeedback(null);setCoachMessage(null)};
 return <section className={`game-card sentence-builder-v29 unified-game-card speed-card speed-unified ${feedback?.ok?'speed-good':feedback&&!feedback.ok?'speed-bad':''}`}>
   <div className="builder-v29-head unified-game-head">
     <div className="builder-v29-title"><small>⚡ SNELLE RONDE <span className="builder-xp-inline">max 5 VP per goed</span></small><h2>Vertaal zo snel<br/>mogelijk</h2><p>{running?`${seconds} seconden over`:'60 seconden · zo veel mogelijk goed'}</p></div>
     <UnifiedGameTools onHint={hint} onListen={listen} onAnswer={reveal}/>
   </div>
   {!running&&seconds>0?<div className="unified-speed-start"><Zap/><p>Start de ronde en kies zo snel mogelijk het juiste antwoord.</p><button className="primary-game" onClick={start}>Start ronde</button></div>:running?<><div className="speed-prompt-card">
  <div className="speed-score-pill"><b>{score}</b><small>goed</small></div>
  <div className="speed-current-word"><small>VERTAAL</small><strong>{q?.dutch}</strong></div>
</div><div className="quiz-options unified-choice-grid speed-options">{opts.map(o=><button key={o.id} disabled={!!feedback} onClick={()=>answer(o)} className={feedback?(o.id===q.id?'correct':feedback.id===o.id?'wrong':'muted-answer'):''}>{feedback&&o.id===q.id&&<Check/>}{feedback&&!feedback.ok&&feedback.id===o.id&&<X/>}{o.spoken||o.latin}</button>)}</div></>:<div className="round-finish unified-round-finish"><Trophy/><h3>Ronde klaar!</h3><b>{score} goed · {score+wrongs?Math.round(score/(score+wrongs)*100):0}% correct</b></div>}
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


class KiteGameErrorBoundary extends React.Component{
 constructor(props){super(props);this.state={error:null}}
 static getDerivedStateFromError(error){return{error}}
 componentDidCatch(error,info){console.error('Vlieger Avontuur renderfout:',error,info)}
 render(){
  if(this.state.error){
   return <section className="kite-v8 kite-v8-error">
    <div className="v8-error-card">
     <small>SPEL KON NIET STARTEN</small>
     <h2>Vlieger Avontuur liep vast</h2>
     <p>{String(this.state.error?.message||this.state.error||'Onbekende fout')}</p>
     <button className="primary-game" onClick={this.props.onReset}>Terug naar Spelen</button>
    </div>
   </section>
  }
  return this.props.children
 }
}

function KiteAdventure({onExit,onComplete}){
 const WORLD_W=1536,WORLD_H=717;
 const rafRef=useRef(null),lastRef=useRef(0),spawnRef=useRef(1.8),keysRef=useRef({left:false,right:false}),actionLatchRef=useRef(false);
 const playerRef=useRef({x:150,y:548,w:72,h:112,vx:0,vy:0,onGround:false,mode:'normal',climbTarget:null,dir:1,invuln:0});
 const melonsRef=useRef([]),collectedRef=useRef(new Set()),phaseRef=useRef('select'),secondsRef=useRef(60),factsRef=useRef([]),lastPaintRef=useRef(0);
 const[phase,setPhaseState]=useState('select'),[character,setCharacter]=useState('girl'),[difficulty,setDifficulty]=useState('easy'),[seconds,setSeconds]=useState(60),[collected,setCollected]=useState(0),[fact,setFact]=useState(null),[hitNote,setHitNote]=useState(false),[roundSeed,setRoundSeed]=useState(0),[runtimeError,setRuntimeError]=useState(''),[worldError,setWorldError]=useState(false),[worldIndex,setWorldIndex]=useState(()=>{try{const last=Number(window.localStorage.getItem('afghanFluentKiteLastWorld'));return Number.isFinite(last)?(last+1)%10:0}catch{return 0}}),[frame,setFrame]=useState({player:{x:150,y:548,pose:'idle',dir:1},melons:[]});
 const setPhase=p=>{phaseRef.current=p;setPhaseState(p)};
 const worldFile=`/images/game/world-${String(worldIndex+1).padStart(2,'0')}.jpg`;
 const worldFallback='/images/game/afghan-city.jpg';
 const rememberWorld=i=>{try{window.localStorage.setItem('afghanFluentKiteLastWorld',String(i))}catch{}};
 useEffect(()=>{setWorldError(false);const img=new Image();img.src=worldFile;img.onerror=()=>setWorldError(true)},[worldFile]);

 // Stable platform geometry. Backgrounds are decorative; only these surfaces are physical.
 const platforms=useMemo(()=>[
  {id:'ground',x1:35,x2:1500,y:670,level:0},
  {id:'midL',x1:80,x2:590,y:520,level:1},
  {id:'midC',x1:650,x2:1080,y:520,level:1},
  {id:'midR',x1:1130,x2:1500,y:520,level:1},
  {id:'upL',x1:180,x2:700,y:355,level:2},
  {id:'upC',x1:720,x2:1190,y:345,level:2},
  {id:'upR',x1:1120,x2:1500,y:340,level:2},
  {id:'topL',x1:300,x2:850,y:185,level:3},
  {id:'topR',x1:900,x2:1450,y:175,level:3}
 ],[]);

 const seeded=seed=>{let s=((seed+1)*9301+49297)%233280;return()=>{s=(s*9301+49297)%233280;return s/233280}};
 const ladders=useMemo(()=>{
  const rnd=seeded(roundSeed+worldIndex*31+37),byId=Object.fromEntries(platforms.map(p=>[p.id,p]));
  const LADDER_W=48,MIN_EDGE_GAP=LADDER_W*2,MIN_CENTER_GAP=LADDER_W+MIN_EDGE_GAP,MARGIN=78;
  // Hard constraint: between two ladders there is always at least TWO full ladder widths of empty space.
  const transitionOptions=[
   [['ground','midL'],['ground','midC'],['ground','midR']],
   [['midL','upL'],['midC','upC'],['midR','upR'],['midC','upL'],['midR','upC']],
   [['upL','topL'],['upC','topL'],['upC','topR'],['upR','topR']]
  ];
  const placed=[];
  const legalX=(x)=>placed.every(l=>Math.abs(x-l.x)>=MIN_CENTER_GAP);
  const shuffled=a=>[...a].map(v=>({v,r:rnd()})).sort((a,b)=>a.r-b.r).map(o=>o.v);
  for(let tier=0;tier<transitionOptions.length;tier++){
   let chosen=null;
   for(const [from,to] of shuffled(transitionOptions[tier])){
    const low=byId[from],high=byId[to],lo=Math.max(low.x1,high.x1)+MARGIN,hi=Math.min(low.x2,high.x2)-MARGIN;
    if(hi<=lo)continue;
    const candidates=shuffled(Array.from({length:45},(_,n)=>lo+(hi-lo)*(n/44))).filter(legalX);
    if(candidates.length){chosen={id:`lad-${tier}`,x:candidates[0],top:high.y,bottom:low.y,w:LADDER_W,from,to};break}
   }
   if(chosen)placed.push(chosen);
  }
  return placed;
 },[platforms,roundSeed,worldIndex]);

 const reachablePlatforms=useMemo(()=>{
  const adj={};platforms.forEach(p=>adj[p.id]=[]);
  // Ladders connect different heights.
  ladders.forEach(l=>{adj[l.from]?.push(l.to);adj[l.to]?.push(l.from)});
  // Short gaps on the same level are deliberately jumpable; these are also valid routes.
  const JUMPABLE_GAP=125;
  for(let i=0;i<platforms.length;i++)for(let j=i+1;j<platforms.length;j++){
   const a=platforms[i],b=platforms[j];if(a.level!==b.level)continue;
   const gap=Math.max(0,Math.max(a.x1,b.x1)-Math.min(a.x2,b.x2));
   if(gap<=JUMPABLE_GAP){adj[a.id].push(b.id);adj[b.id].push(a.id)}
  }
  const seen=new Set(['ground']),queue=['ground'];
  while(queue.length){const id=queue.shift();for(const n of adj[id]||[])if(!seen.has(n)){seen.add(n);queue.push(n)}}
  return seen;
 },[platforms,ladders]);

 const kites=useMemo(()=>{
  const rnd=seeded(roundSeed+worldIndex*43+101);
  const candidates=platforms.filter(p=>p.level>=2&&reachablePlatforms.has(p.id));
  const ranked=[...candidates].map(v=>({v,r:rnd()})).sort((a,b)=>a.r-b.r).map(o=>o.v);
  return ranked.slice(0,3).map((pl,i)=>{
   const mouths=ladders.filter(l=>l.to===pl.id||l.from===pl.id).map(l=>l.x),lo=pl.x1+105,hi=pl.x2-105;
   const spots=Array.from({length:21},(_,n)=>lo+Math.max(1,hi-lo)*(n/20));
   let best=spots[0],score=-1;for(const x of spots){const s=mouths.length?Math.min(...mouths.map(mx=>Math.abs(mx-x))):9999;if(s>score){best=x;score=s}}
   return{id:i+1,x:best,y:pl.y-62,platform:pl.id};
  });
 },[platforms,ladders,reachablePlatforms,roundSeed,worldIndex]);
 useEffect(()=>{if(kites.length<3)console.error('V13 route validation failed: fewer than 3 reachable kites',{roundSeed,ladders,kites})},[kites,ladders,roundSeed]);
 const facts=useMemo(()=>shuffle(AFGHAN_FACTS).slice(0,3),[roundSeed]);
 useEffect(()=>{factsRef.current=facts},[facts]);useEffect(()=>{secondsRef.current=seconds},[seconds]);useEffect(()=>{phaseRef.current=phase},[phase]);
 const sprite=pose=>`/images/game/${character}-${pose}.png`;
 const resetPlayer=()=>{playerRef.current={x:150,y:548,w:72,h:112,vx:0,vy:0,onGround:false,mode:'normal',climbTarget:null,dir:1,invuln:.8}};
 const resetRound=()=>{collectedRef.current=new Set();melonsRef.current=[];spawnRef.current=difficulty==='hard'?1.2:difficulty==='easy'?2.4:999;keysRef.current={left:false,right:false};actionLatchRef.current=false;setCollected(0);setSeconds(60);secondsRef.current=60;setFact(null);setHitNote(false);resetPlayer();setFrame({player:{x:150,y:548,pose:'idle',dir:1},melons:[]})};
 const startRound=()=>{setRuntimeError('');rememberWorld(worldIndex);resetRound();setPhase('playing')};
 const restart=()=>{setRuntimeError('');const next=(worldIndex+1)%10;setWorldIndex(next);rememberWorld(next);setRoundSeed(v=>v+1);resetRound();setPhase('playing')};
 const finish=()=>{keysRef.current={left:false,right:false};setPhase('done');onComplete?.(collectedRef.current.size)};
 const togglePause=()=>{if(phaseRef.current==='playing')setPhase('paused');else if(phaseRef.current==='paused')setPhase('playing')};
 const playFact=f=>f&&speak(`${f.title}. ${f.text}`,.9);const continueFromFact=()=>{setFact(null);if(collectedRef.current.size>=3){setPhase('done');onComplete?.(3)}else setPhase('playing')};
 useEffect(()=>{if(phase!=='playing')return;const timer=setInterval(()=>setSeconds(s=>{const n=Math.max(0,s-1);secondsRef.current=n;if(n===0)setPhase('done');return n}),1000);return()=>clearInterval(timer)},[phase]);
 useEffect(()=>{const clear=()=>{keysRef.current.left=false;keysRef.current.right=false};window.addEventListener('pointerup',clear);window.addEventListener('pointercancel',clear);window.addEventListener('blur',clear);return()=>{window.removeEventListener('pointerup',clear);window.removeEventListener('pointercancel',clear);window.removeEventListener('blur',clear)}},[]);
 useEffect(()=>{const down=e=>{if(['ArrowLeft','a','A'].includes(e.key))keysRef.current.left=true;if(['ArrowRight','d','D'].includes(e.key))keysRef.current.right=true;if(['ArrowUp',' ','w','W'].includes(e.key)){e.preventDefault();actionLatchRef.current=true}};const up=e=>{if(['ArrowLeft','a','A'].includes(e.key))keysRef.current.left=false;if(['ArrowRight','d','D'].includes(e.key))keysRef.current.right=false};window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)}},[]);
 useEffect(()=>{
  const supportAt=(cx,bottom,prevBottom)=>{let best=null;for(const pl of platforms){if(cx>=pl.x1-7&&cx<=pl.x2+7&&prevBottom<=pl.y+9&&bottom>=pl.y){if(best===null||pl.y<best)best=pl.y}}return best};
  const nearestLadder=p=>{const cx=p.x+p.w/2,feet=p.y+p.h;let best=null,bestScore=999;for(const l of ladders){const dx=Math.abs(cx-l.x),mouth=Math.min(Math.abs(feet-l.bottom),Math.abs(feet-l.top));const score=dx+mouth*1.4;if(dx<30&&mouth<24&&score<bestScore){best=l;bestScore=score}}return best};
  const startAction=()=>{if(phaseRef.current!=='playing')return;const p=playerRef.current;if(p.mode==='climb')return;const l=nearestLadder(p),feet=p.y+p.h;if(l){const fromBottom=Math.abs(feet-l.bottom)<Math.abs(feet-l.top);p.mode='climb';p.vx=0;p.vy=0;p.x=l.x-p.w/2;p.climbTarget=fromBottom?l.top-p.h:l.bottom-p.h;return}if(p.onGround){p.vy=-455;p.onGround=false}};
  const updateMelons=(dt,elapsed)=>{
   if(difficulty==='none'){melonsRef.current=[];return}
   const hard=difficulty==='hard',spawnEvery=hard?Math.max(1.65,3.7-elapsed*.03):Math.max(3.9,6.4-elapsed*.02),speed=hard?145+elapsed*1.45:92+elapsed*.55,maxMelons=hard?7:3;
   spawnRef.current-=dt;
   if(spawnRef.current<=0&&melonsRef.current.length<maxMelons){
    const pool=hard?platforms.slice(1,8):platforms.filter(p=>p.level===1||p.id==='ground');
    const source=pool[Math.floor(Math.random()*pool.length)],dir=Math.random()>.5?1:-1,x=dir>0?source.x1+40:source.x2-40;
    melonsRef.current.push({id:`m${Date.now()}${Math.random()}`,x,y:source.y-28,r:28,vx:dir*speed,vy:0,rot:0});
    spawnRef.current=spawnEvery*(.9+Math.random()*.22)
   }
   melonsRef.current.forEach(m=>{const prevBottom=m.y+m.r;m.vy+=910*dt;m.x+=m.vx*dt;m.y+=m.vy*dt;m.rot+=m.vx*dt/m.r;let support=null;for(const pl of platforms){if(m.x>=pl.x1+m.r*.1&&m.x<=pl.x2-m.r*.1&&prevBottom<=pl.y+8&&m.y+m.r>=pl.y){if(support===null||pl.y<support)support=pl.y}}if(support!==null&&m.vy>=0){m.y=support-m.r;m.vy=0}if(m.x<15){m.x=15;m.vx=Math.abs(m.vx)}if(m.x>WORLD_W-15){m.x=WORLD_W-15;m.vx=-Math.abs(m.vx)}});
   melonsRef.current=melonsRef.current.filter(m=>m.y<WORLD_H+120)
  };
  const update=dt=>{if(phaseRef.current!=='playing')return;const p=playerRef.current,keys=keysRef.current,prevBottom=p.y+p.h;if(p.invuln>0)p.invuln-=dt;if(actionLatchRef.current){actionLatchRef.current=false;startAction()}if(p.mode==='climb'){const target=p.climbTarget??p.y,delta=target-p.y,step=Math.sign(delta)*205*dt;if(Math.abs(delta)<=Math.abs(step)+2){p.y=target;p.mode='normal';p.climbTarget=null;p.vy=0;p.onGround=true}else p.y+=step}else{if(keys.left&&!keys.right){p.vx=-250;p.dir=-1}else if(keys.right&&!keys.left){p.vx=250;p.dir=1}else p.vx*=Math.pow(.001,dt);p.vy+=980*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;const bottom=p.y+p.h,support=supportAt(p.x+p.w/2,bottom,prevBottom);if(p.vy>=0&&support!==null){p.y=support-p.h;p.vy=0;p.onGround=true}else p.onGround=false}p.x=Math.max(4,Math.min(WORLD_W-p.w-4,p.x));if(p.y>WORLD_H+90)resetPlayer();const elapsed=60-secondsRef.current;updateMelons(dt,elapsed);const pcx=p.x+p.w/2,pcy=p.y+p.h/2;for(const m of melonsRef.current){if(p.invuln<=0&&Math.hypot(pcx-m.x,pcy-m.y)<m.r+28){setHitNote(true);window.setTimeout(()=>setHitNote(false),900);resetPlayer();break}}for(const k of kites){if(collectedRef.current.has(k.id))continue;if(Math.hypot(pcx-k.x,pcy-k.y)<62){collectedRef.current.add(k.id);const n=collectedRef.current.size;setCollected(n);setFact(factsRef.current[n-1]||factsRef.current[0]);keysRef.current={left:false,right:false};setPhase('fact');break}}};
  const paint=time=>{try{const dt=Math.min(.03,(time-lastRef.current)/1000||.016);lastRef.current=time;update(dt);if(time-lastPaintRef.current>33){lastPaintRef.current=time;const p=playerRef.current;let pose='idle';if(p.mode==='climb')pose='climb';else if(!p.onGround)pose='jump';else if(Math.abs(p.vx)>35)pose='run';setFrame({player:{x:p.x,y:p.y,pose,dir:p.dir},melons:melonsRef.current.map(m=>({...m}))})}rafRef.current=requestAnimationFrame(paint)}catch(err){console.error('Vlieger Avontuur runtimefout:',err);setRuntimeError(String(err?.message||err||'Onbekende runtimefout'));setPhase('error')}};rafRef.current=requestAnimationFrame(paint);return()=>cancelAnimationFrame(rafRef.current)
 },[platforms,ladders,kites,difficulty]);
 const press=key=>e=>{e.preventDefault();e.stopPropagation();try{e.currentTarget.setPointerCapture?.(e.pointerId)}catch{}keysRef.current[key]=true};
 const release=key=>e=>{e.preventDefault();e.stopPropagation();keysRef.current[key]=false};
 const action=e=>{e.preventDefault();e.stopPropagation();actionLatchRef.current=true};
 const MAX_CAMERA=63.2;const camera=Math.max(0,Math.min(MAX_CAMERA,(frame.player.x/Math.max(1,WORLD_W-playerRef.current.w))*MAX_CAMERA));
 return <section className={`kite-v11 kite-v12 phase-${phase}`} onContextMenu={e=>e.preventDefault()}>
  <header className="v11-header"><button onClick={onExit}><X/></button><div><small>SPELEN</small><strong>Vlieger Avontuur</strong></div><div className="v11-header-actions"><button onClick={togglePause} disabled={!['playing','paused'].includes(phase)}>{phase==='paused'?'▶':'Ⅱ'}</button><button onClick={finish}><SkipForward/></button></div></header>
  <div className="v11-stage v12-stage" onContextMenu={e=>e.preventDefault()}>
   <div className="v11-world" style={{'--camera':camera}}>
    <img className="v11-background" src={worldError?worldFallback:worldFile} alt="" draggable="false" onError={()=>setWorldError(true)}/>
    {platforms.map(pl=><div key={pl.id} className="v12-platform-guide" style={{left:`${pl.x1/WORLD_W*100}%`,top:`${pl.y/WORLD_H*100}%`,width:`${(pl.x2-pl.x1)/WORLD_W*100}%`}}/>)}
    {ladders.map(l=><div key={l.id} className="v11-ladder v12-ladder" style={{left:`${(l.x-l.w/2)/WORLD_W*100}%`,top:`${l.top/WORLD_H*100}%`,width:`${l.w/WORLD_W*100}%`,height:`${(l.bottom-l.top)/WORLD_H*100}%`}}><span/></div>)}
    {kites.map((k,i)=>!collectedRef.current.has(k.id)&&<img key={k.id} className="v11-kite" src="/images/game/kite.png" draggable="false" style={{left:`${(k.x-45)/WORLD_W*100}%`,top:`${(k.y-55)/WORLD_H*100}%`,animationDelay:`${i*.3}s`}}/>)}
    {frame.melons.map(m=><img key={m.id} className="v11-melon" src="/images/game/watermelon.png" draggable="false" style={{left:`${(m.x-m.r)/WORLD_W*100}%`,top:`${(m.y-m.r)/WORLD_H*100}%`,width:`${m.r*2/WORLD_W*100}%`,transform:`rotate(${m.rot}rad)`}}/>)}
    <img className={`v11-player pose-${frame.player.pose}`} src={sprite(frame.player.pose)} draggable="false" style={{left:`${(frame.player.x+playerRef.current.w/2)/WORLD_W*100}%`,top:`${frame.player.y/WORLD_H*100}%`,height:`${playerRef.current.h/WORLD_H*100}%`,transform:`translateX(-50%) scaleX(${frame.player.dir<0?-1:1})`}}/>
   </div>
   <div className="v11-hud"><span><img src="/images/game/kite.png" draggable="false"/>{collected}/3</span><span>⏱ {String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</span></div>
   <div className="v12-world-label">Wereld {worldIndex+1} / 10</div>
   {hitNote&&<div className="v11-hit">🍉 Oeps! Probeer een andere route.</div>}
   {phase==='select'&&<div className="v11-overlay"><div className="v11-panel v14-start-panel"><small>KIES JE AVONTURIER</small><h2>Wie gaat de vliegers zoeken?</h2><p>Elke ronde krijgt een nieuwe wereld en nieuwe ladderroute. Alle drie de vliegers blijven bereikbaar.</p><div className="v11-characters"><button className={character==='boy'?'selected':''} onClick={()=>setCharacter('boy')}><img src="/images/game/boy-idle.png" draggable="false"/><b>Jongen</b></button><button className={character==='girl'?'selected':''} onClick={()=>setCharacter('girl')}><img src="/images/game/girl-idle.png" draggable="false"/><b>Meisje</b></button></div><div className="v14-difficulty"><small>KIES MOEILIJKHEID</small><button className={difficulty==='none'?'selected':''} onClick={()=>setDifficulty('none')}><span>1</span><div><b>Zonder watermeloenen</b><small>Rustig ontdekken en vliegers zoeken.</small></div></button><button className={difficulty==='easy'?'selected':''} onClick={()=>setDifficulty('easy')}><span>2</span><div><b>Watermeloenen · makkelijk</b><small>Minder vaak en langzamer.</small></div></button><button className={difficulty==='hard'?'selected':''} onClick={()=>setDifficulty('hard')}><span>3</span><div><b>Watermeloenen · moeilijker</b><small>Vaker, sneller en op meer niveaus.</small></div></button></div><button className="primary-game" onClick={startRound}><Play/> Start avontuur</button></div></div>}
   {phase==='paused'&&<div className="v11-overlay"><div className="v11-panel v11-small"><small>PAUZE</small><h2>Even gestopt</h2><button className="primary-game" onClick={togglePause}>Verder spelen</button></div></div>}
   {phase==='fact'&&fact&&<div className="v11-overlay"><div className="v11-panel v11-fact"><div className="v11-ribbon">Vlieger gepakt!</div><img className="v11-prize" src="/images/game/kite.png" draggable="false"/><small>WIST JE DAT?</small><h2>{fact.title}</h2><p>{fact.text}</p><button className="v11-listen" onClick={()=>playFact(fact)}><Volume2/> Luister</button><button className="primary-game" onClick={continueFromFact}>Verder spelen <ChevronRight/></button></div></div>}
   {phase==='error'&&<div className="v11-overlay"><div className="v11-panel"><h2>Er ging iets mis</h2><p>{runtimeError}</p><button className="primary-game" onClick={onExit}>Terug naar Spelen</button></div></div>}
   {phase==='done'&&<div className="v11-overlay"><div className="v11-panel"><div className="v11-ribbon">Mooi gespeeld!</div><img src={sprite('idle')} className="v11-finish-character" draggable="false"/><h2>Je avontuur is klaar</h2><p>Je hebt <b>{collected}</b> {collected===1?'weetje':'weetjes'} ontdekt.</p><button className="primary-game" onClick={restart}><Play/> Nieuwe wereld</button><button className="v11-secondary" onClick={onExit}>Terug naar Spelen</button></div></div>}
  </div>
  {phase==='playing'&&<div className="v11-controls v12-controls" onContextMenu={e=>e.preventDefault()}><div className="v11-directions"><button onPointerDown={press('left')} onPointerUp={release('left')} onPointerLeave={release('left')} onPointerCancel={release('left')}><ChevronLeft/></button><button onPointerDown={press('right')} onPointerUp={release('right')} onPointerLeave={release('right')} onPointerCancel={release('right')}><ChevronRight/></button></div><button className="v11-action" onPointerDown={action}><span>↑</span><small>SPRING / KLIM</small></button></div>}
 </section>
}

function Games({app,game,go,isAdmin=false,selectedLesson,clearSelectedLesson}){
 const[type,setType]=useState(null); const level=selectedLesson?.number||game.level; const lesson=selectedLesson||CURRICULUM[level-1]||CURRICULUM[0];
 const enabled=activeMissionTypes(),totalParts=1+enabled.length,results=game.game.levelResults?.[level]||{},missions=new Set(enabled.filter(m=>results[m]?.passed===true)),adminOpen=isAdmin&&!!game.game.adminAllLevels,locked=!adminOpen&&level>game.level,wordsDone=levelWordsDone(game,level),seenCount=game.game.levelWordSeen?.[level]?.length||0,parts=(wordsDone?1:0)+missions.size,allPassed=wordsDone&&enabled.every(m=>results[m]?.passed===true);
 const choose=t=>{if(locked)return;if(t==='words'){go('words');return}if(!enabled.includes(t)&&MISSION_TYPES.includes(t))return;if(!adminOpen&&!wordsDone&&enabled.includes(t))return;if(t==='kite'&&!adminOpen){if(!allPassed||(game.game.kiteTickets||0)<=0)return;game.updateGame(g=>({...g,kiteTickets:Math.max(0,(g.kiteTickets||0)-1)}))}setType(t);game.updateGame(g=>({...g,lastGame:t}))};
 const reset=()=>setType(null);
 if(type){const done=()=>reset();return <div className={`screen focus-screen games-focus ${type==='kite'?'kite-game-active':''}`}><button className="focus-exit" onClick={reset}><ChevronLeft/> Level {level}</button>{type!=='kite'&&<PageHead eyebrow={`LEVEL ${level} · ${lesson.difficulty}`} title={type==='sentence'?'Bouw de zin':type==='listen'?'Luisteren':type==='picture'?'Plaatjes':'Snelle ronde'} sub={`${lesson.title} · hulp en fouten verlagen je vliegerpunten.`}/>}<ChallengeErrorBoundary key={`${type}-${level}`} onReset={reset}>{type==='sentence'?<SentenceBuilder game={game} level={level} lesson={lesson} onSolved={done}/>:type==='listen'?<ListeningQuiz game={game} level={level} lesson={lesson} onSolved={done}/>:type==='picture'?<PictureQuiz game={game} level={level} lesson={lesson} onSolved={done}/>:type==='speed'?<SpeedRound game={game} level={level} lesson={lesson} onSolved={done}/>:<KiteGameErrorBoundary onReset={reset}><KiteAdventure onExit={reset} onComplete={reset}/></KiteGameErrorBoundary>}</ChallengeErrorBoundary></div>}
 const tile=(m,Icon,title,accent,reward)=>{if(!enabled.includes(m))return null;const r=results[m],done=missions.has(m),blocked=!adminOpen&&!wordsDone;return <button key={m} className={`game-tile-v45 game-tile-v46 ${accent} ${done?'mission-done':''}`} disabled={blocked} onClick={()=>choose(m)}><span className="game-icon-chip">{blocked?<Lock/>:<Icon/>}</span><div className="game-tile-copy"><b>{title}</b><em>{blocked?'Eerst woorden leren':r?.total?`${r.accuracy}% goed`:reward}</em></div>{done&&<Check className="game-done-check"/>}</button>};
 return <div className="screen games-home-safe level-hub level-hub-v45 level-hub-v46">
  <button className="focus-exit" onClick={()=>{if(selectedLesson){clearSelectedLesson?.();go('path')}else go('today')}}><X/> Sluiten</button>
  <PageHead eyebrow={`LEVEL ${level} VAN 50 · ${lesson.difficulty}`} title={lesson.title} sub={`${lesson.words.length} nieuwe woorden · ${parts}/${totalParts} voltooid`} badge={<><img className="vp-kite-icon" src="/images/game/kite.png" alt=""/>{game.xp}</>}/>
  <button className={`word-intro-choice word-intro-v45 word-intro-v46 ${wordsDone?'mission-done':''}`} onClick={()=>choose('words')}>
    <span><BookOpen/></span><div><b>{lesson.words.length} nieuwe woorden</b><small>{wordsDone?`${lesson.words.length}/${lesson.words.length} woorden bekeken`:`${seenCount}/${lesson.words.length} woorden bekeken`}</small></div>{wordsDone?<Check/>:<ChevronRight/>}
  </button>
  <div className="game-picker-label game-picker-label-v46"><span>KIES EEN SPEL</span></div>
  <div className={`games-safe-grid games-grid-v45 games-grid-v46 game-count-${enabled.length}`}>
    {tile('picture',Layers3,'Plaatjes','game-accent-clay','tot 10 🪁')}
    {tile('listen',Headphones,'Luisteren','game-accent-blue','tot 15 🪁')}
    {tile('sentence',BookText,'Bouw de zin','game-accent-sand','tot 20 🪁')}
    {tile('speed',Zap,'Snelle ronde','game-accent-sage','snelle test')}
  </div>
  <button className={`kite-choice kite-choice-v45 kite-choice-v46 ${adminOpen?'kite-admin-open':((!allPassed||(game.game.kiteTickets||0)<=0)?'kite-locked':'')}`} disabled={!adminOpen&&(!allPassed||(game.game.kiteTickets||0)<=0)} onClick={()=>choose('kite')}><span>{adminOpen?<ShieldCheck/>:(game.game.kiteTickets||0)>0&&allPassed?<Sparkles/>:<Lock/>}</span><div><b>Vlieger Avontuur</b><small>{adminOpen?'Admin testmodus · altijd speelbaar':allPassed&&(game.game.kiteTickets||0)>0?`${game.game.kiteTickets} verdiend · speel nu`:`Voltooi ${enabled.length===1?'het actieve spel':`de ${enabled.length} actieve spellen`} met 80%+`}</small></div><ChevronRight/></button>
 </div>
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
class AppCrashBoundary extends React.Component{constructor(props){super(props);this.state={error:null}}static getDerivedStateFromError(error){return{error}}componentDidCatch(error,info){console.error('APP_RENDER_ERROR',error,info)}render(){if(this.state.error)return <div className="app-crash-screen"><div><small>AFGHAN FLUENT</small><h1>De app kon niet starten</h1><p>{String(this.state.error?.message||this.state.error)}</p><button onClick={()=>location.reload()}>Opnieuw laden</button></div></div>;return this.props.children}}
createRoot(document.getElementById('root')).render(<AppCrashBoundary><App/></AppCrashBoundary>);

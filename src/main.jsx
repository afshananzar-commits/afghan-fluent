import React, {useEffect, useMemo, useRef, useState} from 'react';
import { createRoot } from 'react-dom/client';
import {
  Home, BookOpen, Layers3, MessageCircle, UserRound, Volume2, Mic, Heart,
  ChevronRight, ChevronLeft, Check, Flame, Search, SlidersHorizontal, RotateCcw,
  Sparkles, Brain, Lock, Trophy, Star, Headphones, Settings, X, Eye, EyeOff,
  BadgeCheck, Clock3, Play, Pause, CircleHelp, ShieldCheck, WandSparkles, Moon,
  SunMedium, Shuffle, BookText, GraduationCap, ArrowRight, RefreshCw, Gauge,
  AudioLines, LibraryBig, CircleCheckBig, Circle, Languages, Download, SkipForward, Square, Trash2
} from 'lucide-react';
import vocabularyRaw from './vocabulary.json';
import sentencesRaw from './sentences.json';
import JSZip from 'jszip';
import './styles.css';

const vocabHeaders = ['id','dutch','english','category','spoken','latin','script','type','confidence','status','exampleNl','exampleSpoken','notes','source'];
const sentenceHeaders = ['id','dutch','spoken','latin','status','grammar','notes','source'];
const CONTENT_CACHE_KEY = 'afghanFluentOneDriveContentV1';
const CONTENT_STATUS_KEY = 'afghanFluentOneDriveStatusV1';
function readJsonStorage(key, fallback=null){
  try { return JSON.parse(localStorage.getItem(key)||'null') ?? fallback; } catch { return fallback; }
}
const cachedContent = typeof window!=='undefined' ? readJsonStorage(CONTENT_CACHE_KEY) : null;
const vocabSource = cachedContent?.vocabulary?.length ? cachedContent.vocabulary : vocabularyRaw;
const sentenceSource = cachedContent?.sentences?.length ? cachedContent.sentences : sentencesRaw;
const vocab = vocabSource.map(r => Object.fromEntries(vocabHeaders.map((h,i)=>[h,r[i] ?? ''])));
const sentences = sentenceSource.map(r => Object.fromEntries(sentenceHeaders.map((h,i)=>[h,r[i] ?? ''])));

async function syncOneDriveContent(){
  const response = await fetch(`/api/content?ts=${Date.now()}`, {cache:'no-store'});
  const data = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data?.error || 'OneDrive kon niet worden gelezen.');
  if(!Array.isArray(data.vocabulary) || !Array.isArray(data.sentences)) throw new Error('Onverwacht gegevensformaat.');
  const previous = readJsonStorage(CONTENT_CACHE_KEY);
  const changed = previous?.version !== data.version;
  localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify({version:data.version,vocabulary:data.vocabulary,sentences:data.sentences,syncedAt:data.syncedAt}));
  localStorage.setItem(CONTENT_STATUS_KEY, JSON.stringify({state:'ready',lastSync:data.syncedAt,version:data.version,vocabularyCount:data.vocabulary.length,sentenceCount:data.sentences.length,source:'OneDrive Excel'}));
  return {changed,data};
}

const CATEGORY = {
  home:{label:'Thuis',emoji:'🏡'}, food:{label:'Eten & drinken',emoji:'🥣'}, travel:{label:'Onderweg',emoji:'🚌'},
  daily:{label:'Dagelijks',emoji:'☀️'}, verbs:{label:'Werkwoorden',emoji:'🏃'}, family:{label:'Familie',emoji:'👨‍👩‍👧‍👦'},
  people:{label:'Mensen',emoji:'🧑'}, body:{label:'Lichaam',emoji:'🫶'}, clothes:{label:'Kleding',emoji:'🧥'},
  nature:{label:'Natuur',emoji:'🌿'}, animals:{label:'Dieren',emoji:'🐾'}, school:{label:'School',emoji:'🎒'},
  work:{label:'Werk',emoji:'💼'}, shopping:{label:'Winkelen',emoji:'🛍️'}, time:{label:'Tijd',emoji:'🕰️'},
  feelings:{label:'Gevoelens',emoji:'💛'}, colors:{label:'Kleuren',emoji:'🎨'}, numbers:{label:'Getallen',emoji:'🔢'},
  greetings:{label:'Begroeten',emoji:'👋'}, questions:{label:'Vragen',emoji:'❓'}, other:{label:'Overig',emoji:'✨'}
};
const iconFor = (cat='') => (CATEGORY[cat] || CATEGORY.other).emoji;
const labelFor = (cat='') => (CATEGORY[cat] || {label:cat || 'Overig'}).label;
const seeded = (n) => ((Number(n||1)*9301+49297)%233280)/233280;

const grammarLessons = [
  {n:'01',title:'Ik, jij, hij/zij',tag:'Basis',desc:'Bouw je eerste zinnen met persoonlijke voornaamwoorden.',example:'ma · tu · u',detail:'In spreektaal leer je eerst de vormen die je werkelijk gebruikt. Oefen ze steeds in een korte zin: “ma merom” — ik ga.'},
  {n:'02',title:'Ik wil…',tag:'Dagelijks',desc:'Vraag en vertel wat je wilt.',example:'ma mi khojom…',detail:'Gebruik dit patroon als een bouwblok. Voeg daarna een bekend woord toe, bijvoorbeeld water of eten.'},
  {n:'03',title:'Vragen stellen',tag:'Gesprek',desc:'Waar, wat, wie en hoe in echte gesprekken.',example:'goja? · chi?',detail:'Een vraag wordt sneller vanzelfsprekend als je hem als complete zin leert. Begin daarom met vaste, veelgebruikte vragen.'},
  {n:'04',title:'Ontkenning',tag:'Basis',desc:'Zeg dat iets niet zo is of niet moet.',example:'na… · nako',detail:'Oefen positief en negatief naast elkaar. Zo hoor je het verschil sneller in een gesprek.'},
  {n:'05',title:'Hebben & zijn',tag:'A1',desc:'Essentiële patronen voor dagelijkse zinnen.',example:'asti · astan',detail:'Koppel iedere vorm aan één voorbeeldzin uit je eigen woordenlijst. Spreken gaat vóór regels uit het hoofd leren.'},
  {n:'06',title:'Verleden tijd',tag:'A2',desc:'Vertel eenvoudig wat er gebeurd is.',example:'gisteren · gedaan',detail:'Leer verleden tijd via korte verhalen van drie zinnen: wat gebeurde eerst, daarna en als laatste?'}
];

function loadProgress(){
  try { return JSON.parse(localStorage.getItem('afghanFluentProgress')||'{}'); } catch { return {}; }
}
function saveProgress(p){ localStorage.setItem('afghanFluentProgress',JSON.stringify(p)); }
function dayKey(d=new Date()){ return d.toISOString().slice(0,10); }

function useAppState(){
  const [progress,setProgress] = useState(loadProgress);
  const update = fn => setProgress(p=>{ const next = typeof fn==='function'?fn(p):fn; saveProgress(next); return next; });
  const knownIds = new Set(progress.known||[]);
  const favorites = new Set(progress.favorites||[]);
  return {progress,update,knownIds,favorites};
}

function speak(text, rate=.88){
  if(!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text); u.rate=rate; u.pitch=1; window.speechSynthesis.speak(u);
}

function App(){
  const [tab,setTab]=useState('today');
  const [mode,setMode]=useState(localStorage.getItem('afghanFluentMode')||'family');
  const [contentStatus,setContentStatus]=useState(()=>readJsonStorage(CONTENT_STATUS_KEY,{state:cachedContent?'cached':'bundled',lastSync:cachedContent?.syncedAt||null,vocabularyCount:vocab.length,sentenceCount:sentences.length,source:cachedContent?'OneDrive cache':'Ingebouwde reservekopie'}));
  const [selectedLesson,setSelectedLesson]=useState(null);
  const setModePersist=(m)=>{setMode(m);localStorage.setItem('afghanFluentMode',m)};
  const app=useAppState();
  const refreshContent=async()=>{
    setContentStatus(s=>({...s,state:'syncing',error:null}));
    try{
      const {changed,data}=await syncOneDriveContent();
      setContentStatus({state:'ready',lastSync:data.syncedAt,version:data.version,vocabularyCount:data.vocabulary.length,sentenceCount:data.sentences.length,source:'OneDrive Excel'});
      if(changed) setTimeout(()=>window.location.reload(),450);
      return true;
    }catch(error){
      const fallback={...contentStatus,state:'error',error:error.message||'Synchronisatie mislukt'};
      setContentStatus(fallback);
      localStorage.setItem(CONTENT_STATUS_KEY,JSON.stringify(fallback));
      return false;
    }
  };
  const streak = app.progress.streak || 0;
  useEffect(()=>{ refreshContent(); },[]);
  useEffect(()=>{
    const today=dayKey();
    if(app.progress.lastOpen!==today){
      const y=new Date(); y.setDate(y.getDate()-1);
      const nextStreak = app.progress.lastOpen===dayKey(y)?Math.max(1,(app.progress.streak||0)+1):1;
      app.update(p=>({...p,lastOpen:today,streak:nextStreak}));
    }
  },[]);

  const go=(name)=>{ setTab(name); window.scrollTo({top:0,behavior:'smooth'}); };
  return <div className={`app ${mode==='kids'?'kids-mode':''}`}>
    <DesktopRail tab={tab} go={go} streak={streak}/>
    <div className="app-stage">
      <TopChrome mode={mode} setMode={setModePersist}/>
      <main>
        {tab==='today' && <Today app={app} go={go}/>} 
        {tab==='path' && <LearningPath app={app} go={go} openLesson={(lesson)=>{setSelectedLesson(lesson);go('words')}}/>} 
        {tab==='words' && <Words app={app} selectedLesson={selectedLesson} clearSelectedLesson={()=>setSelectedLesson(null)}/>} 
        {tab==='sentences' && <Sentences app={app}/>} 
        {tab==='grammar' && <Grammar/>} 
        {tab==='speak' && <SpeakPractice app={app}/>} 
        {tab==='profile' && <Profile app={app} mode={mode} setMode={setModePersist} contentStatus={contentStatus} refreshContent={refreshContent}/>} 
      </main>
      <BottomNav tab={tab} go={go}/>
    </div>
  </div>
}

function Brand(){return <div className="brand"><div className="brand-arch">A</div><div><strong>Afghan Fluent</strong><span>Leer Afghaans op jouw manier</span></div></div>}
function DesktopRail({tab,go,streak}){ const items=[['today',Home,'Vandaag'],['path',BookOpen,'Leerpad'],['words',Layers3,'Woorden'],['sentences',MessageCircle,'Zinnen'],['grammar',BookText,'Grammatica'],['speak',Mic,'Uitspraak']]; return <aside className="desktop-rail"><Brand/><div className="rail-stats"><span><Flame/> {streak} dagen</span><span><Sparkles/> 1000 woorden</span></div><nav>{items.map(([id,I,l])=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)}><I/><span>{l}</span></button>)}</nav><button className="profile-tile" onClick={()=>go('profile')}><div className="avatar">A</div><div><b>Jouw profiel</b><small>Family mode</small></div><ChevronRight/></button></aside> }
function TopChrome({mode,setMode}){ return <header className="top-chrome"><div className="mobile-brand"><div className="mini-arch">A</div><span>Afghan Fluent</span></div><div className="mode-switch"><button className={mode==='family'?'active':''} onClick={()=>setMode('family')}>Volwassen</button><button className={mode==='kids'?'active':''} onClick={()=>setMode('kids')}>Kids</button></div></header> }

function Today({app,go}){
 const known=app.knownIds.size; const dailyGoal=10; const learnedToday=app.progress.learnedToday?.date===dayKey()?app.progress.learnedToday.count:0; const pct=Math.min(100,Math.round(learnedToday/dailyGoal*100)); const reviewCount=Math.max(0,Math.min(14, known));
 return <div className="screen today-screen"><section className="welcome"><div><p className="kicker">GOEDE DAG</p><h1>Salaam, Afshan! <span>👋</span></h1><p>Vandaag is een mooie dag om te leren.</p></div><div className="streak-pill"><Flame/><b>{app.progress.streak||1}</b><span>dagen</span></div></section><section className="daily-card"><div className="daily-metrics"><div><Flame/><div><b>{app.progress.streak||1}</b><span>Dagelijkse streak</span></div></div><div className="divider"/><div><Gauge/><div><b>{pct}%</b><span>Weekdoel</span></div></div></div><div className="continue-card" onClick={()=>go('path')}><div><small>GA VERDER MET LEREN</small><h2>Les 5 · Familie</h2><div className="mini-progress"><i style={{width:`${Math.max(25,pct)}%`}}/></div><span>{Math.max(25,pct)}%</span></div><FamilyIllustration/><button><ChevronRight/></button></div></section><section className="quick-grid"><Quick title="Woorden" sub="Flashcards" icon="🃏" onClick={()=>go('words')}/><Quick title="Zinnen" sub="Oefen zinnen" icon="💬" onClick={()=>go('sentences')}/><Quick title="Uitspraak" sub="Luister & spreek" icon="🎙️" onClick={()=>go('speak')}/><Quick title="Grammatica" sub="Eenvoudig uitgelegd" icon="📕" onClick={()=>go('grammar')}/></section><section className="review-banner" onClick={()=>go('words')}><div className="seal"><Brain/></div><div><b>Woorden om te herhalen</b><span>{reviewCount || 10} woorden wachten op jou</span></div><ChevronRight/></section><SectionTitle title="Jouw leerroute" action="Bekijk alles" onClick={()=>go('path')}/><div className="lesson-preview"><LessonRow emoji="👋" title="Begroeten" meta="12 / 12 woorden" progress={100} done/><LessonRow emoji="👨‍👩‍👧‍👦" title="Familie" meta={`${Math.min(known,18)} / 20 woorden`} progress={Math.min(90,known*5)}/><LessonRow emoji="🏡" title="Thuis" meta="15 / 20 woorden" progress={75}/></div></div>
}
function FamilyIllustration(){return <div className="family-illus"><span>👨🏽</span><span>👩🏽</span><span>👦🏽</span><span>👧🏽</span></div>}
function Quick({title,sub,icon,onClick}){return <button className="quick-card" onClick={onClick}><span className="quick-icon">{icon}</span><div><b>{title}</b><small>{sub}</small></div><ChevronRight/></button>}
function SectionTitle({title,action,onClick}){return <div className="section-title"><h2>{title}</h2>{action&&<button onClick={onClick}>{action}<ChevronRight/></button>}</div>}
function LessonRow({emoji,title,meta,progress,done,locked,onClick}){return <button className={`lesson-row ${locked?'locked':''}`} onClick={onClick} disabled={locked}><span className="lesson-art">{emoji}</span><div className="lesson-main"><b>{title}</b><small>{meta}</small><div className="tiny-bar"><i style={{width:`${progress}%`}}/></div></div>{locked?<Lock/>:done?<span className="done-dot"><Check/></span>:<span className="ring-mini" style={{'--p':`${progress*3.6}deg`}}/>}</button>}

function LearningPath({app,go,openLesson}){
 const LESSON_SIZE=20;
 const lessons=useMemo(()=>{
   const chunks=[];
   for(let i=0;i<vocab.length;i+=LESSON_SIZE){
     const words=vocab.slice(i,i+LESSON_SIZE);
     if(!words.length) continue;
     const counts={}; words.forEach(w=>{const c=w.category||'other';counts[c]=(counts[c]||0)+1});
     const dominant=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'other';
     const base=labelFor(dominant);
     const sameBefore=chunks.filter(x=>x.category===dominant).length;
     chunks.push({id:`lesson-${chunks.length+1}`,number:chunks.length+1,category:dominant,title:sameBefore?`${base} · deel ${sameBefore+1}`:base,emoji:iconFor(dominant),words});
   }
   return chunks;
 },[]);
 const knownSet=app.knownIds;
 const progressFor=(lesson)=>{ const known=lesson.words.filter(w=>knownSet.has(w.id)).length; return {known,total:lesson.words.length,pct:Math.round(known/Math.max(1,lesson.words.length)*100)}; };
 const levels=[{name:'A1 · De basis',sub:'BEGINNER',from:0,to:12},{name:'A2 · Dagelijks leven',sub:'BASIS',from:12,to:25},{name:'B1 · Gesprekken',sub:'ZELFSTANDIG',from:25,to:38},{name:'B2 · Verder spreken',sub:'GEVORDERD',from:38,to:50}];
 const totalKnown=lessons.reduce((n,l)=>n+progressFor(l).known,0); const totalWords=lessons.reduce((n,l)=>n+l.words.length,0); const overall=Math.round(totalKnown/Math.max(1,totalWords)*100);
 return <div className="screen path-screen"><PageHead eyebrow="JOUW ROUTE" title="Leerpad" sub={`${totalWords} woorden verdeeld over ${lessons.length} lessen van ongeveer ${LESSON_SIZE} woorden.`} badge={<><Flame/> {app.progress.streak||1}</>}/><div className="level-heading"><div><span>VOLLEDIG LEERPAD</span><h2>Van basis naar vloeiender spreken</h2></div><div className="level-chip"><Trophy/> {overall}%</div></div>{levels.map((level,li)=>{const block=lessons.slice(level.from,Math.min(level.to,lessons.length));if(!block.length)return null;return <React.Fragment key={level.name}>{li>0 && <div className="level-divider"><span>{level.name}</span></div>}{li===0 && <div className="level-divider first-level"><span>{level.name}</span></div>}<div className="path-list">{block.map((lesson)=>{const p=progressFor(lesson);return <div className="path-item" key={lesson.id}><span className={`path-node ${p.pct===100?'complete':''}`}>{p.pct===100?<Check/>:lesson.number}</span><LessonRow emoji={lesson.emoji} title={`${lesson.number}. ${lesson.title}`} meta={`${p.known} / ${p.total} woorden`} progress={p.pct} done={p.pct===100} onClick={()=>openLesson(lesson)}/></div>})}</div></React.Fragment>})}</div>
}
function PageHead({eyebrow,title,sub,badge}){return <div className="page-head"><div><span>{eyebrow}</span><h1>{title}</h1>{sub&&<p>{sub}</p>}</div>{badge&&<div className="page-badge">{badge}</div>}</div>}

function Words({app,selectedLesson,clearSelectedLesson}){
 const [query,setQuery]=useState(''); const [category,setCategory]=useState('all'); const [idx,setIdx]=useState(0); const [revealed,setRevealed]=useState(false); const [shuffle,setShuffle]=useState(false);
 const [dragX,setDragX]=useState(0); const [dragging,setDragging]=useState(false); const dragStart=useRef(null);
 const cats=useMemo(()=>Array.from(new Set(vocab.map(v=>v.category).filter(Boolean))).slice(0,18),[]);
 const filtered=useMemo(()=>{ const lessonIds=selectedLesson?new Set(selectedLesson.words.map(x=>x.id)):null; let a=vocab.filter(v=>(!lessonIds||lessonIds.has(v.id)) && (category==='all'||v.category===category) && (!query||`${v.dutch} ${v.spoken} ${v.latin} ${v.english}`.toLowerCase().includes(query.toLowerCase()))); if(shuffle) a=[...a].sort((x,y)=>seeded(x.id)-seeded(y.id)); return a; },[query,category,shuffle,selectedLesson]);
 useEffect(()=>{setIdx(0);setRevealed(false);setCategory('all');setQuery('')},[selectedLesson]);
 useEffect(()=>{setIdx(0);setRevealed(false)},[query,category,shuffle]);
 const w=filtered[idx]||vocab[0]; const nextW=filtered[(idx+1)%Math.max(1,filtered.length)]||w; const known=app.knownIds.has(w.id); const fav=app.favorites.has(w.id);
 const [swipeExit,setSwipeExit]=useState(null);
 const next=()=>{if(swipeExit)return;setIdx(i=>(i+1)%Math.max(1,filtered.length));setRevealed(false);setDragX(0)}; const prev=()=>{if(swipeExit)return;setIdx(i=>(i-1+filtered.length)%Math.max(1,filtered.length));setRevealed(false);setDragX(0)};
 const saveKnown=()=>app.update(p=>{const set=new Set(p.known||[]); const wasKnown=set.has(w.id); set.add(w.id); const lt=p.learnedToday?.date===dayKey()?p.learnedToday:{date:dayKey(),count:0}; return {...p,known:[...set],learnedToday:{date:dayKey(),count:lt.count+(wasKnown?0:1)}}});
 const saveLearning=()=>app.update(p=>{const set=new Set(p.known||[]);set.delete(w.id);return {...p,known:[...set]}});
 const finishSwipe=(direction)=>{if(swipeExit)return; const right=direction==='right'; right?saveKnown():saveLearning(); setDragging(false); setSwipeExit(direction); const distance=Math.max(520,(typeof window!=='undefined'?window.innerWidth:430)*1.25); setDragX(right?distance:-distance); setTimeout(()=>{setIdx(i=>(i+1)%Math.max(1,filtered.length));setRevealed(false);setDragX(0);setSwipeExit(null)},270)};
 const markKnown=()=>finishSwipe('right'); const markLearning=()=>finishSwipe('left');
 const startDrag=(x)=>{if(swipeExit)return;dragStart.current=x;setDragging(true)}; const moveDrag=(x)=>{if(dragStart.current!==null&&!swipeExit)setDragX(Math.max(-220,Math.min(220,x-dragStart.current)))}; const endDrag=()=>{if(dragStart.current===null)return; const x=dragX; dragStart.current=null; setDragging(false); if(Math.abs(x)>85){finishSwipe(x>0?'right':'left')}else setDragX(0)};
 const toggleFav=()=>app.update(p=>{const s=new Set(p.favorites||[]);s.has(w.id)?s.delete(w.id):s.add(w.id);return {...p,favorites:[...s]}});
 return <div className="screen words-screen"><PageHead eyebrow="1000+ WOORDEN" title="Woorden" sub="Kijk, luister en herhaal. Spreken staat centraal." badge={<>{idx+1} / {filtered.length}</>}/>{selectedLesson&&<div className="review-banner lesson-active-banner"><div className="seal">{selectedLesson.emoji}</div><div><b>Les {selectedLesson.number} · {selectedLesson.title}</b><span>{selectedLesson.words.length} woorden uit je leerpad</span></div><button onClick={clearSelectedLesson}><X/></button></div>}<div className="word-toolbar"><label><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Zoek Nederlands of fonetisch…"/></label><button className={shuffle?'active':''} onClick={()=>setShuffle(s=>!s)}><Shuffle/> <span>Mix</span></button></div><div className="chips"><button className={category==='all'?'active':''} onClick={()=>setCategory('all')}>Alles</button>{cats.slice(0,8).map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{iconFor(c)} {labelFor(c)}</button>)}</div><div className="flash-layout"><div><div className={`swipe-stage ${swipeExit?'is-exiting':''}`}><article className="premium-flashcard swipe-card swipe-card-under" aria-hidden="true"><div className="card-top"><span>{labelFor(nextW.category)}</span><span className="stack-dot">•••</span></div><WordIllustration word={nextW}/><div className="word-copy"><small>NEDERLANDS</small><h2>{nextW.dutch}</h2><div className="reveal-hint"><Eye/> Tik om de vertaling te zien</div></div></article><article key={w.id} className={`premium-flashcard swipe-card swipe-card-top ${revealed?'revealed':''} ${dragging?'dragging':''} ${swipeExit?`exit-${swipeExit}`:''}`} style={{transform:`translateX(${dragX}px) rotate(${dragX/24}deg)`,transition:dragging?'none':swipeExit?'transform .27s cubic-bezier(.22,.72,.18,1)':'transform .24s cubic-bezier(.2,.75,.25,1)'}} onPointerDown={e=>{e.currentTarget.setPointerCapture?.(e.pointerId);startDrag(e.clientX)}} onPointerMove={e=>moveDrag(e.clientX)} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={()=>{if(!swipeExit&&Math.abs(dragX)<8)setRevealed(r=>!r)}}><div className={`swipe-stamp learn ${dragX< -25?'show':''}`}>NOG OEFENEN</div><div className={`swipe-stamp know ${dragX>25?'show':''}`}>KEN IK!</div><div className="card-top"><span>{labelFor(w.category)}</span><button onClick={e=>{e.stopPropagation();toggleFav()}} className={fav?'fav':''}><Heart fill={fav?'currentColor':'none'}/></button></div><WordIllustration word={w}/><div className="word-copy"><small>NEDERLANDS</small><h2>{w.dutch}</h2>{revealed?<><small>ZO ZEG JE HET</small><h3>{w.spoken||w.latin||'Uitspraak volgt'}</h3>{w.script&&<div className="native-script">{w.script}</div>}<button className="sound-btn" onClick={e=>{e.stopPropagation();speak(w.spoken||w.latin)}}><Volume2/> Luister</button></>:<div className="reveal-hint"><Eye/> Tik om de vertaling te zien</div>}</div>{revealed && (w.exampleNl||w.exampleSpoken) && <div className="example-box"><span>Voorbeeldzin</span><b>{w.exampleNl||'Voorbeeld'}</b><p>{w.exampleSpoken}</p>{w.exampleSpoken&&<button onClick={e=>{e.stopPropagation();speak(w.exampleSpoken,.82)}}><Volume2/></button>}</div>}</article></div><div className="swipe-hint"><span>← Nog oefenen</span><span>Swipe de kaart</span><span>Ken ik! →</span></div><div className="card-nav swipe-actions-row"><button className="learn-btn" onClick={markLearning} disabled={!!swipeExit}><X/> Nog oefenen</button><button className={known?'mastered':''} onClick={markKnown} disabled={!!swipeExit}>{known?<BadgeCheck/>:<Check/>} Ken ik!</button></div><div className="card-nav secondary-nav"><button onClick={prev}><ChevronLeft/> Vorige</button><button onClick={next}>Volgende <ChevronRight/></button></div></div><aside className="word-browser"><h3>Woordenlijst</h3><p>{filtered.length} woorden in deze selectie</p><div className="browser-list">{filtered.slice(Math.max(0,idx-4),Math.max(0,idx-4)+10).map((x,j)=>{const real=filtered.indexOf(x);return <button className={real===idx?'active':''} key={`${x.id}-${j}`} onClick={()=>{setIdx(real);setRevealed(true)}}><span>{iconFor(x.category)}</span><div><b>{x.dutch}</b><small>{x.spoken||x.latin}</small></div>{app.knownIds.has(x.id)&&<Check/>}</button>})}</div></aside></div></div>
}

function WordIllustration({word}){
  const numericId = Number(word?.id);
  const hasNumericId = Number.isFinite(numericId) && numericId >= 1;
  const filename = hasNumericId ? String(numericId).padStart(3,'0') : null;
  const [imageFailed,setImageFailed] = useState(false);
  const e = iconFor(word?.category);

  useEffect(()=>{ setImageFailed(false); },[numericId]);

  if(hasNumericId && !imageFailed){
    const imageUrl = `/images/words/${filename}.png`;
    return <div
      className={`word-illustration word-illustration-image cat-${String(word?.category||'').replace(/[^a-z]/g,'')}`}
      role="img"
      aria-label={word?.dutch || `Woord ${numericId}`}
      style={{
        backgroundImage:`url("${imageUrl}")`,
        backgroundSize:'contain',
        backgroundPosition:'center',
        backgroundRepeat:'no-repeat',
        backgroundColor:'#f7f0e3'
      }}
    >
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        onError={()=>setImageFailed(true)}
        style={{position:'absolute',width:'1px',height:'1px',opacity:0,pointerEvents:'none'}}
      />
    </div>;
  }

  return <div className={`word-illustration cat-${String(word?.category||'').replace(/[^a-z]/g,'')}`}>
    <div className="watercolor one"/>
    <div className="watercolor two"/>
    <span>{e}</span>
    <div className="ground"/>
  </div>;
}

function Sentences({app}){
 const [query,setQuery]=useState(''); const [playing,setPlaying]=useState(null); const data=useMemo(()=>sentences.filter(s=>(!query||`${s.dutch} ${s.spoken||''} ${s.latin||''}`.toLowerCase().includes(query.toLowerCase()))),[query]); const play=(s)=>{setPlaying(s.id);speak(s.spoken||s.latin,.82);setTimeout(()=>setPlaying(null),1700)};
 return <div className="screen"><PageHead eyebrow="400+ ZINNEN" title="Zinnen" sub="Leer hele zinnen zoals je ze in echte gesprekken gebruikt." badge={<MessageCircle/>}/><div className="sentence-hero"><div className="bubble-icon"><Languages/></div><div><small>ZIN VAN DE DAG</small><h2>{sentences[0].dutch}</h2><p>{sentences[0].spoken}</p></div><button onClick={()=>play(sentences[0])}><Volume2/></button></div><div className="word-toolbar"><label><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Zoek in zinnen…"/></label></div><div className="sentence-list">{data.slice(0,80).map((s,i)=><article className="sentence-card" key={s.id}><div className="sentence-num">{String(i+1).padStart(2,'0')}</div><div className="sentence-copy"><h3>{s.dutch}</h3><p>{s.spoken||s.latin}</p><div className="sentence-meta"><span>{s.grammar||'Dagelijks gesprek'}</span></div></div><button className={playing===s.id?'playing':''} onClick={()=>play(s)}>{playing===s.id?<AudioLines/>:<Volume2/>}</button></article>)}</div></div>
}

function Grammar(){const [open,setOpen]=useState(grammarLessons[0]);return <div className="screen"><PageHead eyebrow="PRAKTISCH" title="Grammatica" sub="Geen schoolboek. Alleen patronen die je helpen spreken en verstaan." badge={<BookOpen/>}/><div className="grammar-hero"><div className="grammar-mark">Aa</div><div><h2>Leer de logica door te spreken</h2><p>Korte uitleg, veel voorbeelden en meteen toepassen.</p></div></div><div className="grammar-layout"><div className="grammar-list">{grammarLessons.map(g=><button key={g.n} onClick={()=>setOpen(g)} className={open.n===g.n?'active':''}><span>{g.n}</span><div><small>{g.tag}</small><h3>{g.title}</h3><p>{g.desc}</p></div><ChevronRight/></button>)}</div><aside className="grammar-detail"><span className="detail-tag">{open.tag}</span><h2>{open.title}</h2><p>{open.detail}</p><div className="pattern"><small>PATROON</small><strong>{open.example}</strong><button onClick={()=>speak(open.example)}><Volume2/></button></div><button className="primary-wide"><Play/> Start oefening</button></aside></div></div>}

function SpeakPractice({app}){
 const pool=useMemo(()=>sentences.filter(s=>s.status==='VALIDATED'&&s.spoken).slice(0,50),[]); const [idx,setIdx]=useState(0); const [listening,setListening]=useState(false); const [heard,setHeard]=useState(''); const [score,setScore]=useState(null); const s=pool[idx]||sentences[0];
 const record=()=>{ const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR){setHeard('Spraakherkenning wordt in deze browser niet ondersteund. Gebruik de luisterknop en zeg de zin hardop na.');setScore(null);return} const r=new SR(); r.lang='fa-AF'; r.interimResults=false; r.maxAlternatives=1; setListening(true);setHeard('');setScore(null); r.onresult=e=>{const t=e.results[0][0].transcript;setHeard(t);const target=(s.spoken||'').toLowerCase().split(/\s+/);const got=t.toLowerCase().split(/\s+/);const match=target.filter(x=>got.some(y=>y.includes(x.slice(0,Math.max(2,x.length-1))))).length;setScore(Math.min(100,Math.round(match/Math.max(1,target.length)*100)));}; r.onerror=()=>setHeard('Ik kon je stem niet goed herkennen. Probeer het nog eens.'); r.onend=()=>setListening(false); r.start(); };
 return <div className="screen speak-screen"><PageHead eyebrow="LUISTER & SPREEK" title="Uitspraak" sub="Luister eerst. Zeg daarna rustig dezelfde zin na." badge={<>{idx+1} / {pool.length}</>}/><section className="speak-practice-card"><div className="sound-orbit"><button onClick={()=>speak(s.spoken,.72)}><Volume2/></button></div><span className="listen-label">LUISTER EN SPREEK NA</span><h2>{s.spoken}</h2><p>{s.dutch}</p><div className="speech-progress"><i style={{width:`${((idx+1)/pool.length)*100}%`}}/></div><button className={`record-main ${listening?'recording':''}`} onClick={record}><Mic/>{listening?'Ik luister…':'Tik en spreek'}</button>{heard&&<div className="heard-box"><small>Ik hoorde</small><b>{heard}</b>{score!==null&&<span className={score>60?'good':''}>{score}% overeenkomst</span>}</div>}<div className="tip-card"><Sparkles/><div><b>Tip</b><span>Spreek rustig. Het ritme is belangrijker dan perfecte spelling.</span></div></div><div className="speak-actions"><button onClick={()=>setIdx(i=>(i-1+pool.length)%pool.length)}><ChevronLeft/></button><button onClick={()=>{setIdx(i=>(i+1)%pool.length);setHeard('');setScore(null)}}>Volgende zin <ChevronRight/></button></div></section></div>
}

function audioDb(){ return new Promise((resolve,reject)=>{const req=indexedDB.open('afghanFluentAudio',1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('clips'))db.createObjectStore('clips')};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)}); }
async function saveClip(key,blob){const db=await audioDb();return new Promise((res,rej)=>{const tx=db.transaction('clips','readwrite');tx.objectStore('clips').put(blob,key);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function getClip(key){const db=await audioDb();return new Promise((res,rej)=>{const r=db.transaction('clips').objectStore('clips').get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function deleteClip(key){const db=await audioDb();return new Promise((res,rej)=>{const tx=db.transaction('clips','readwrite');tx.objectStore('clips').delete(key);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function getAllClips(){const db=await audioDb();return new Promise((res,rej)=>{const store=db.transaction('clips').objectStore('clips');const keys=store.getAllKeys(), vals=store.getAll();let k,v;keys.onsuccess=()=>{k=keys.result;if(v)res(k.map((x,i)=>[x,v[i]]))};vals.onsuccess=()=>{v=vals.result;if(k)res(k.map((x,i)=>[x,v[i]]))};keys.onerror=vals.onerror=()=>rej(keys.error||vals.error)})}

function AudioStudio(){
 const [kind,setKind]=useState('word'),[idx,setIdx]=useState(0),[recording,setRecording]=useState(false),[preview,setPreview]=useState(null),[saved,setSaved]=useState(false),[query,setQuery]=useState(''),[status,setStatus]=useState('');
 const rec=useRef(null), chunks=useRef([]), stream=useRef(null); const pool=kind==='word'?vocab:sentences, item=pool[idx]||pool[0], key=(kind==='word'?'W':'S')+String(idx+1).padStart(4,'0');
 useEffect(()=>{let url;getClip(key).then(b=>{setSaved(!!b);if(b){url=URL.createObjectURL(b);setPreview(url)}else setPreview(null)});return()=>url&&URL.revokeObjectURL(url)},[key]);
 const start=async()=>{try{stream.current=await navigator.mediaDevices.getUserMedia({audio:true});chunks.current=[];const r=new MediaRecorder(stream.current);rec.current=r;r.ondataavailable=e=>e.data.size&&chunks.current.push(e.data);r.onstop=()=>{const b=new Blob(chunks.current,{type:r.mimeType||'audio/webm'});setPreview(URL.createObjectURL(b));rec.current.blob=b;stream.current?.getTracks().forEach(t=>t.stop())};r.start();setRecording(true)}catch(e){setStatus('Microfoontoegang is nodig om op te nemen.')}};
 const stop=()=>{rec.current?.stop();setRecording(false)};
 const approve=async()=>{if(rec.current?.blob){await saveClip(key,rec.current.blob);setSaved(true);setStatus(`${key} opgeslagen`);setIdx(i=>Math.min(pool.length-1,i+1))}};
 const skip=()=>setIdx(i=>Math.min(pool.length-1,i+1));
 const findItem=()=>{const q=query.toLowerCase().trim();if(!q)return;const i=pool.findIndex(x=>(x.dutch||'').toLowerCase().includes(q)||(x.spoken||'').toLowerCase().includes(q));if(i>=0)setIdx(i)};
 const remove=async()=>{await deleteClip(key);setSaved(false);setPreview(null);setStatus(`${key} verwijderd`)};
 const exportZip=async()=>{setStatus('ZIP wordt gemaakt…');const clips=await getAllClips();const zip=new JSZip();for(const [k,b] of clips)zip.file(`${k}.${b.type.includes('mp4')?'m4a':'webm'}`,b);zip.file('README.txt','W = woorden, S = zinnen. Bestandsnummer correspondeert met de volgorde in Afghan Fluent.');const out=await zip.generateAsync({type:'blob'});const a=document.createElement('a');a.href=URL.createObjectURL(out);a.download='afghan-fluent-audio.zip';a.click();setStatus(`${clips.length} opnames geëxporteerd`)};
 return <div className="audio-studio"><div className="studio-head"><div><small>ADMIN · AUDIO STUDIO</small><h2>Uitspraak opnemen</h2><p>Opnames blijven op dit apparaat tot je ze als ZIP exporteert.</p></div><button className="export-btn" onClick={exportZip}><Download/> Download ZIP</button></div><div className="segmented studio-tabs"><button className={kind==='word'?'active':''} onClick={()=>{setKind('word');setIdx(0)}}>Woorden · 1000</button><button className={kind==='sentence'?'active':''} onClick={()=>{setKind('sentence');setIdx(0)}}>Zinnen · 400</button></div><div className="studio-search"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&findItem()} placeholder="Zoek een woord of zin…"/><button onClick={findItem}><Search/></button></div><section className="record-card"><div className="record-meta"><span>{idx+1} / {pool.length}</span><b>{key}</b>{saved&&<em><Check/> Opgenomen</em>}</div><h2>{item.dutch}</h2><p>{item.spoken||item.latin}</p>{recording?<button className="record-stop" onClick={stop}><Square/> Stop opname</button>:<button className="record-start" onClick={start}><Mic/> Opnemen</button>}{preview&&<audio className="audio-preview" src={preview} controls/>}<div className="record-actions"><button onClick={()=>setIdx(i=>Math.max(0,i-1))}><ChevronLeft/> Vorige</button><button onClick={skip}><SkipForward/> Skip</button><button className="approve" disabled={!rec.current?.blob} onClick={approve}><Check/> Goed & volgende</button></div>{saved&&<button className="replace-note" onClick={remove}><Trash2/> Bestaande opname verwijderen</button>}</section>{status&&<div className="studio-status">{status}</div>}</div>
}

function Profile({app,mode,setMode,contentStatus,refreshContent}){const [admin,setAdmin]=useState(false);const last=contentStatus?.lastSync?new Date(contentStatus.lastSync).toLocaleString('nl-NL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'Nog niet gesynchroniseerd';return <div className="screen"><PageHead eyebrow="JOUW VOORTGANG" title="Profiel" sub="Alles wat je leert blijft op dit apparaat bewaard." badge={<UserRound/>}/><div className="profile-hero"><div className="big-avatar">A</div><div><h2>Afshan</h2><p>Afghan Fluent learner</p><span><Flame/> {app.progress.streak||1} dagen streak</span></div></div><div className="profile-stats"><StatCard icon={<Layers3/>} value={app.knownIds.size} label="Woorden beheerst"/><StatCard icon={<Heart/>} value={app.favorites.size} label="Favorieten"/><StatCard icon={<MessageCircle/>} value={contentStatus?.sentenceCount||sentences.length} label="Zinnen beschikbaar"/></div><SectionTitle title="Leerinstellingen"/><div className="settings-card"><div><div className="setting-icon"><UserRound/></div><div><b>Weergave</b><span>Kies een rustige volwassen of extra speelse kinderweergave.</span></div></div><div className="segmented"><button className={mode==='family'?'active':''} onClick={()=>setMode('family')}>Volwassen</button><button className={mode==='kids'?'active':''} onClick={()=>setMode('kids')}>Kids</button></div></div><div className="settings-card content-source-card"><div><div className="setting-icon"><RefreshCw className={contentStatus?.state==='syncing'?'spin':''}/></div><div><b>OneDrive Excel</b><span>{contentStatus?.state==='error'?`Synchronisatie mislukt · ${contentStatus.error}`:`${contentStatus?.vocabularyCount||vocab.length} woorden · ${contentStatus?.sentenceCount||sentences.length} zinnen · ${last}`}</span></div></div><button className="sync-now" onClick={refreshContent} disabled={contentStatus?.state==='syncing'}>{contentStatus?.state==='syncing'?'Bezig…':'Nu synchroniseren'}</button></div><div className="sync-note"><ShieldCheck/><span>OneDrive is de masterbron. Als synchroniseren niet lukt, gebruikt de app automatisch de laatst opgeslagen versie.</span></div><SectionTitle title="Beheer"/><div className="settings-card admin-entry" onClick={()=>setAdmin(a=>!a)}><div><div className="setting-icon"><Mic/></div><div><b>Admin Audio Studio</b><span>Neem officiële uitspraak op voor woorden en zinnen.</span></div></div><ChevronRight/></div>{admin&&<AudioStudio/>}</div>}
function StatCard({icon,value,label}){return <div className="stat-card"><span>{icon}</span><b>{value}</b><small>{label}</small></div>}
function BottomNav({tab,go}){const x=[['today',Home,'Vandaag'],['path',BookOpen,'Leerpad'],['words',Layers3,'Woorden'],['sentences',MessageCircle,'Zinnen'],['profile',UserRound,'Profiel']];return <nav className="bottom-nav">{x.map(([id,I,l])=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)}><I/><span>{l}</span></button>)}</nav>}

createRoot(document.getElementById('root')).render(<App/>);

import {SUIT_LABELS, rankName, createGame, isExposed, availableMatches, adjacent, moveCard, drawCard, gameStatus} from './engine.js';

const $ = id => document.getElementById(id);
const store = {get(key, fallback) {try {return localStorage.getItem(key) ?? fallback;} catch {return fallback;}}, set(key,value) {try {localStorage.setItem(key,String(value));} catch {}}};
const suitChars = {spades:'♠', hearts:'♥', clubs:'♣', diamonds:'♦'};
const shapes = {
  hearts:'<path d="M50 83 C43 77 17 60 17 41 C17 24 38 20 50 36 C62 20 83 24 83 41 C83 60 57 77 50 83Z"/>',
  diamonds:'<path d="M50 12 L78 50 L50 88 L22 50Z"/>',
  spades:'<path d="M50 11 C45 20 18 37 18 55 C18 69 34 75 45 65 C45 74 41 80 36 85 L64 85 C59 80 55 74 55 65 C66 75 82 69 82 55 C82 37 55 20 50 11Z"/>',
  clubs:'<path d="M50 17 C37 17 32 29 37 38 C24 33 15 42 17 53 C19 64 32 68 43 61 C43 72 40 79 35 85 L65 85 C60 79 57 72 57 61 C68 68 81 64 83 53 C85 42 76 33 63 38 C68 29 63 17 50 17Z"/>'
};
function backHTML(){return '<span class="back-inner"><span class="back-star">✦</span><span class="back-detail">✧ &nbsp; ✧</span></span>';}
function faceHTML(card){
  const symbol=suitChars[card.suit], rank=rankName(card.rank);
  return `<span class="card-corner">${rank}<small>${symbol}</small></span><span class="card-center"><svg class="suit-medallion" viewBox="0 0 100 120" aria-hidden="true"><path d="M50 3 Q88 20 89 60 Q88 100 50 117 Q12 100 11 60 Q12 20 50 3Z" fill="none" stroke="#c6ad75" stroke-width="1.2" opacity=".65"/><path d="M50 9 Q82 24 83 60 Q82 96 50 111 Q18 96 17 60 Q18 24 50 9Z" fill="none" stroke="#c6ad75" stroke-width=".7" opacity=".6"/><g transform="translate(15 25) scale(.7)" fill="currentColor">${shapes[card.suit]}</g><path d="M50 14v6 M50 100v6 M20 60h6 M74 60h6" stroke="#c6ad75" stroke-width="1.3"/><circle cx="50" cy="14" r="2" fill="#c6ad75"/><circle cx="50" cy="106" r="2" fill="#c6ad75"/></svg></span><span class="face-detail">✧</span><span class="card-corner bottom">${rank}<small>${symbol}</small></span>`;
}

class GardenAudio {
  constructor(){this.musicOn=store.get('sg-music','1')==='1';this.soundOn=store.get('sg-sound','1')==='1';this.ctx=null;this.scheduler=null;this.step=0;this.next=0;}
  async unlock(){
    if (!this.musicOn && !this.soundOn) return;
    if (!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx=new C();this.musicGain=this.ctx.createGain();this.musicGain.gain.value=this.musicOn ? .18 : 0;this.musicGain.connect(this.ctx.destination);this.fxGain=this.ctx.createGain();this.fxGain.gain.value=.33;this.fxGain.connect(this.ctx.destination);}
    if(this.ctx.state==='suspended'){try{await this.ctx.resume();}catch{return;}}
    if(this.musicOn&&!this.scheduler)this.start();
  }
  note(midi,at,duration,volume,bus,type='sine'){
    if(!this.ctx || midi==null)return;
    const osc=this.ctx.createOscillator(), gain=this.ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(440*Math.pow(2,(midi-69)/12),at);
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.018);
    gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    osc.connect(gain);gain.connect(bus);osc.start(at);osc.stop(at+duration+.02);
  }
  start(){
    if(!this.ctx || this.scheduler)return;
    this.next=this.ctx.currentTime+.05;
    const tune=[
      76,79,81,79,76,74, 72,null,76,79,77,76, 74,77,81,79,77,74, 71,null,74,79,76,null,
      76,79,84,83,81,79, 77,76,74,null,76,77, 79,76,74,72,71,69, 72,null,76,null,72,null,
      81,84,88,86,84,81, 79,null,83,84,81,79, 77,81,84,81,77,76, 74,null,77,79,76,null,
      76,79,81,84,83,79, 77,76,74,76,77,74, 72,76,79,76,74,71, 69,null,72,null,69,null
    ];
    const chords=[[57,60,64],[53,57,60],[48,52,55],[55,59,62],[53,57,60],[50,53,57],[55,59,62],[52,56,59], [57,60,64],[52,56,59],[53,57,60],[50,53,57],[57,60,64],[53,57,60],[55,59,62],[57,60,64]];
    const schedule=()=>{
      if(!this.ctx || !this.musicOn)return;
      if(this.next < this.ctx.currentTime-.5) this.next=this.ctx.currentTime+.05;
      while(this.next < this.ctx.currentTime+.25){
        const idx=this.step%tune.length,beat=this.step%6, chord=chords[Math.floor(idx/6)%chords.length];
        this.note(tune[idx],this.next,.52,.16,this.musicGain,'sine');
        if(beat===0)this.note(chord[0]-12,this.next,1.0,.20,this.musicGain,'sine');
        const harmony=chord[[0,1,2,1,2,1][beat]];
        this.note(harmony,this.next,.65,.07,this.musicGain,'triangle');
        this.next+=.31;this.step++;
      }
    };
    schedule();this.scheduler=setInterval(schedule,100);
  }
  toggleMusic(){this.musicOn=!this.musicOn;store.set('sg-music',this.musicOn?'1':'0');if(this.ctx){this.musicGain.gain.setTargetAtTime(this.musicOn ? .18 : 0,this.ctx.currentTime,.05);if(this.musicOn){this.start();}else{clearInterval(this.scheduler);this.scheduler=null;}}if(this.musicOn)this.unlock();}
  toggleSound(){this.soundOn=!this.soundOn;store.set('sg-sound',this.soundOn?'1':'0');if(this.soundOn){this.unlock();this.fx('click');}}
  fx(kind){
    if(!this.soundOn || !this.ctx || this.ctx.state!=='running')return;
    const t=this.ctx.currentTime;
    const notes={click:[[76,0,.12,.19]],draw:[[55,0,.1,.15],[64,.045,.18,.11]],move:[[79,0,.17,.2],[86,.055,.24,.15]],star:[[76,0,.2,.18],[83,.08,.2,.18],[88,.16,.4,.17]],undo:[[76,0,.12,.14],[69,.07,.18,.13]],bad:[[50,0,.18,.12]],win:[[72,0,.25,.18],[76,.12,.25,.18],[79,.24,.25,.18],[84,.36,.7,.2]]};
    for(const [pitch,offset,dur,vol] of notes[kind]||[])this.note(pitch,t+offset,dur,vol,this.fxGain,kind==='bad'?'triangle':'sine');
  }
}
const audio=new GardenAudio();
for(const eventName of ['pointerdown','keydown'])document.addEventListener(eventName,()=>audio.unlock(),{passive:true});

function validGame(value){
  return !!value && Array.isArray(value.tableau) && value.tableau.length===28 && Array.isArray(value.stock) &&
    value.tableau.every(slot=>slot && slot.card && Number.isInteger(slot.row) && Number.isInteger(slot.col) && typeof slot.removed==='boolean') &&
    !!value.waste && Number.isFinite(value.waste.rank) && Number.isFinite(value.score) && Number.isFinite(value.combo) && Number.isFinite(value.stars);
}
function readSavedGame(){
  try {
    const saved=JSON.parse(store.get('sg-progress','null'));
    if(saved?.version===1 && validGame(saved.state) && validGame(saved.initial) && Array.isArray(saved.history) && saved.history.every(validGame) && Number.isFinite(saved.elapsed) && saved.elapsed>=0)return saved;
  } catch {}
  return null;
}
const saved=readSavedGame();
let state=saved?.state ?? createGame(), initial=saved?.initial ?? structuredClone(state), history=saved?.history ?? [], hintIndices=[], wildArmed=false;
let startedAt=Date.now()-(saved?.elapsed ?? 0), finishElapsed=saved?.completed ? saved.elapsed : null, best=Number(store.get('sg-best','0'))||0;
function saveProgress(){
  try {store.set('sg-progress',JSON.stringify({version:1,state,initial,history,elapsed:finishElapsed??(Date.now()-startedAt),completed:gameStatus(state)==='won'}));}catch{}
}
window.addEventListener('pagehide',saveProgress);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveProgress();});
let toastTimer;
let theme=store.get('sg-theme','garden');
function toast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
function formatTime(ms){const s=Math.floor(ms/1000),m=Math.floor(s/60);return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function updateTimer(){$('timer').textContent=formatTime(finishElapsed??(Date.now()-startedAt));}
setInterval(updateTimer,1000);
function updateAudioButtons(){
  $('musicBtn').setAttribute('aria-pressed',String(audio.musicOn));$('musicBtn').setAttribute('aria-label',audio.musicOn?'關閉背景音樂':'開啟背景音樂');$('musicBtn').title=audio.musicOn?'關閉背景音樂':'開啟背景音樂';
  $('soundBtn').setAttribute('aria-pressed',String(audio.soundOn));$('soundBtn').setAttribute('aria-label',audio.soundOn?'關閉遊戲音效':'開啟遊戲音效');$('soundBtn').title=audio.soundOn?'關閉遊戲音效':'開啟遊戲音效';
}
function updateTheme(){document.body.classList.remove('theme-garden','theme-rose','theme-night');document.body.classList.add(`theme-${theme}`);}
function cardLabel(card){return `${SUIT_LABELS[card.suit]} ${rankName(card.rank)}`;}
function render(){
  const tableau=$('tableau'); tableau.innerHTML='';
  state.tableau.forEach((slot,index)=>{
    if(slot.removed)return;
    const open=isExposed(state,index),card=slot.card,button=document.createElement('button');
    button.className=`card ${open?'card-face is-open':'card-back'} ${open&&['hearts','diamonds'].includes(card.suit)?'red':''}`;
    if(hintIndices.includes(index))button.classList.add('hinted');
    if(wildArmed&&open)button.classList.add('star-target');
    button.style.setProperty('--row',slot.row);button.style.setProperty('--col',slot.col);button.style.zIndex=String(slot.row+1);
    button.setAttribute('aria-label',open?`${cardLabel(card)}，可選取`:'尚未翻開的牌');button.disabled=!open;
    button.dataset.index=String(index);button.innerHTML=open?faceHTML(card):backHTML();
    if(open)button.addEventListener('click', e=>play(index,e.detail===0));
    tableau.appendChild(button);
  });
  const waste=$('waste');waste.innerHTML='';const face=document.createElement('div');face.className=`card card-face ${['hearts','diamonds'].includes(state.waste.suit)?'red':''}`;face.innerHTML=faceHTML(state.waste);face.setAttribute('aria-label',`目前的牌：${cardLabel(state.waste)}`);waste.appendChild(face);
  $('score').textContent=state.score.toLocaleString();$('combo').textContent=String(state.combo);$('stockCount').textContent=String(state.stock.length);$('stockBtn').disabled=!state.stock.length;$('stockBtn').setAttribute('aria-label',`抽取下一張牌，剩餘 ${state.stock.length} 張`);
  $('undoBtn').disabled=!history.length;$('starBtn').disabled=!state.stars;$('starBtn').classList.toggle('active',wildArmed);$('starBtn').setAttribute('aria-pressed',String(wildArmed));$('starCount').textContent=String(state.stars);
  const cleared=state.tableau.filter(x=>x.removed).length;$('clearedCount').textContent=String(cleared);$('progressBar').style.width=`${cleared/28*100}%`;$('bestScore').textContent=best.toLocaleString();
  const matches=availableMatches(state),status=gameStatus(state);
  if(status==='won')$('statusLine').textContent='恭喜完成！星光花園因你而閃耀 ✦';
  else if(wildArmed)$('statusLine').textContent='星光已啟動，選擇任意一張亮面牌';
  else if(status==='stuck')$('statusLine').textContent='目前沒有接法，試試復原或重新開始';
  else if(!matches.length && state.stock.length)$('statusLine').textContent='目前沒有可接的牌，從抽牌堆翻一張吧';
  else if(!matches.length && state.stars)$('statusLine').textContent='試試星光百搭，讓旅程繼續';
  else $('statusLine').textContent='選擇比下方牌大或小 1 點的牌';
  updateTimer();updateAudioButtons();updateTheme();
}
function commit(next){history.push(state);if(history.length>100)history.shift();state=next;hintIndices=[];wildArmed=false;if(state.score>best){best=state.score;store.set('sg-best',best);}render();saveProgress();}
function play(index,keyboard){
  const wasStar=wildArmed, oldCombo=state.combo, oldStars=state.stars;
  const next=moveCard(state,index,wasStar);
  if(!next){audio.fx('bad');toast('請選擇與目前牌相差 1 點的牌');return;}
  commit(next);audio.fx(wasStar?'star':'move');
  if(next.combo%5===0 && next.stars>oldStars-(wasStar?1:0))toast('連擊 5 次！獲得一顆星光百搭 ✦');
  else if(next.combo>oldCombo && next.combo>=3)toast(`${next.combo} 連擊！繼續保持 ✦`);
  if(gameStatus(state)==='won'){
    finishElapsed=Date.now()-startedAt;saveProgress();$('finalScore').textContent=state.score.toLocaleString();audio.fx('win');$('winDialog').showModal();
  } else if(keyboard){
    const first=availableMatches(state)[0];const target=first==null?$('stockBtn'):document.querySelector(`[data-index="${first}"]`);target?.focus({preventScroll:true});
  }
}
function newGame(replay=false){state=replay?structuredClone(initial):createGame();if(!replay)initial=structuredClone(state);history=[];hintIndices=[];wildArmed=false;startedAt=Date.now();finishElapsed=null;render();saveProgress();audio.fx('draw');}
$('stockBtn').addEventListener('click',()=>{const next=drawCard(state);if(!next)return;commit(next);audio.fx('draw');});
$('undoBtn').addEventListener('click',()=>{if(!history.length)return;state=history.pop();wildArmed=false;hintIndices=[];finishElapsed=null;render();saveProgress();audio.fx('undo');toast('已復原上一步');});
$('hintBtn').addEventListener('click',()=>{
  hintIndices=wildArmed?state.tableau.map((_,i)=>i).filter(i=>isExposed(state,i)):availableMatches(state);
  render();audio.fx('click');
  if(hintIndices.length)toast(wildArmed?'可以選擇任意一張發亮的牌':'發光的牌可以接上');
  else if(state.stock.length)toast('目前沒有接法，試試抽一張牌');
  else if(state.stars)toast('試試使用星光百搭');
  else toast('沒有可接的牌，試試復原');
});
$('starBtn').addEventListener('click',()=>{if(!state.stars)return;wildArmed=!wildArmed;hintIndices=[];render();audio.fx('star');toast(wildArmed?'選一張亮面牌使用百搭':'已取消使用百搭');});
$('themeBtn').addEventListener('click',()=>{const themes=['garden','rose','night'];theme=themes[(themes.indexOf(theme)+1)%themes.length];store.set('sg-theme',theme);updateTheme();audio.fx('click');toast(`牌背已換成${{garden:'翡翠花園',rose:'玫瑰暮光',night:'靜謐星夜'}[theme]}`);});
$('musicBtn').addEventListener('click',()=>{audio.toggleMusic();updateAudioButtons();toast(audio.musicOn?'背景音樂已開啟':'背景音樂已關閉');});
$('soundBtn').addEventListener('click',()=>{audio.toggleSound();updateAudioButtons();toast(audio.soundOn?'遊戲音效已開啟':'遊戲音效已關閉');});
$('rulesBtn').addEventListener('click',()=>$('rulesDialog').showModal());$('rulesLink').addEventListener('click',()=>$('rulesDialog').showModal());$('newGameBtn').addEventListener('click',()=>$('newDialog').showModal());
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
$('replayBtn').addEventListener('click',()=>{$('newDialog').close();newGame(true);});$('freshBtn').addEventListener('click',()=>{$('newDialog').close();newGame(false);});$('winNewBtn').addEventListener('click',()=>{$('winDialog').close();newGame(false);});
let installPrompt=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
window.addEventListener('appinstalled',()=>{installPrompt=null;toast('已將星光花園加入裝置');});
$('installBtn').addEventListener('click',async()=>{
  if(installPrompt){const prompt=installPrompt;installPrompt=null;try{await prompt.prompt();await prompt.userChoice;}catch{$('installDialog').showModal();}}
  else $('installDialog').showModal();
});
if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1')){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Service worker registration failed:',error)));
}
render();

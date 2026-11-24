import './scene-loading.css';
import pictures from '../shared/loading-art.json';

export const LOAD_STEPS=['art','module','terrain','textures','trees','bridges','buildings','character','inhabitants','scene','session','avatar','gpu','ready'] as const;
export type LoadStep=typeof LOAD_STEPS[number];
let lastPicture=-1;

/** Completed preparation tasks, not simulated time or a claim about downloaded bytes. */
export function mountSceneLoading(host:HTMLElement,thai:boolean,field:boolean){
  const screen=document.createElement('section');screen.className='scene-loading';
  screen.setAttribute('aria-label',thai?'กำลังโหลดแผนที่':'Loading map');
  const image=document.createElement('img');image.alt='';image.className='scene-loading-art';
  lastPicture=lastPicture<0?Math.floor(Math.random()*pictures.length):(lastPicture+1+Math.floor(Math.random()*(pictures.length-1)))%pictures.length;
  image.src=pictures[lastPicture].path;image.fetchPriority='high';
  const bottom=document.createElement('div');bottom.className='scene-loading-bottom';
  const heading=document.createElement('h1');
  heading.textContent=field?(thai?'ทุ่งชายแดนตะวันตก':'West March'):(thai?'เมืองมิธราเวน':'Mythraven');
  const row=document.createElement('div'),label=document.createElement('span'),percent=document.createElement('output');
  row.className='scene-loading-row';label.textContent=thai?'กำลังเตรียมการเดินทาง':'Preparing your journey';percent.textContent='0%';
  row.append(label,percent);
  const bar=document.createElement('progress');bar.max=100;bar.value=0;
  bar.setAttribute('aria-label',thai?'ความคืบหน้าการโหลด':'Loading progress');
  const tip=document.createElement('p');tip.textContent=thai?'เมื่อเข้าแผนที่ คุณจะได้รับการคุ้มครอง 15 วินาที':'You are protected for 15 seconds after entering the map.';
  bottom.append(heading,row,bar,tip);screen.append(image,bottom);host.append(screen);
  host.dataset.loading='true';host.setAttribute('aria-busy','true');
  const done=new Set<LoadStep>();
  const labels:Record<LoadStep,[string,string]>={
    art:['ภาพการเดินทาง','Journey artwork'],module:['ระบบแผนที่','Map engine'],terrain:['พื้นดิน','Terrain'],
    textures:['พื้นผิว','Textures'],trees:['ต้นไม้','Trees'],bridges:['ประตูและสะพาน','Gates and bridges'],
    buildings:['สิ่งก่อสร้าง','Buildings'],character:['โมเดลตัวละคร','Character models'],inhabitants:['NPC และมอนสเตอร์','NPCs and monsters'],
    scene:['องค์ประกอบฉาก','Scene objects'],session:['เชื่อมต่อแผนที่','Map connection'],avatar:['ตัวละครพร้อม','Character ready'],
    gpu:['ภาพพร้อมแสดง','Rendering ready'],ready:['พร้อมเดินทาง','Ready']
  };
  const blockKeys=(event:KeyboardEvent)=>event.stopImmediatePropagation();
  window.addEventListener('keydown',blockKeys,true);
  function complete(step:LoadStep){
    if(!screen.isConnected || done.has(step))return;
    done.add(step);const value=Math.floor(done.size/LOAD_STEPS.length*100);
    bar.value=value;percent.textContent=value+'%';screen.dataset.completed=[...done].join(',');
    label.textContent=labels[step][thai?0:1];
    bar.setAttribute('aria-valuetext',`${value}% · ${done.size}/${LOAD_STEPS.length}`);
  }
  const artworkReady=image.decode().then(()=>complete('art'));
  return {complete,artworkReady,finish(){
    screen.remove();delete host.dataset.loading;host.removeAttribute('aria-busy');
    window.removeEventListener('keydown',blockKeys,true);
  }};
}

import './player-vitals.css';

export function createFootVitals(){
  const element=document.createElement('div');
  element.className='foot-vitals';
  element.hidden=true;
  element.setAttribute('aria-hidden','true'); // The main HUD already exposes HP and MP.
  const hpFill=document.createElement('i'),mpFill=document.createElement('i');
  element.append(hpFill,mpFill);
  return {element,update(hp:number,maxHp:number,mp:number,maxMp:number){
    const ratio=(value:number,max:number)=>max>0?Math.max(0,Math.min(1,value/max)):0;
    const health=ratio(hp,maxHp);
    hpFill.style.width=100*health+'%';
    mpFill.style.width=100*ratio(mp,maxMp)+'%';
    element.toggleAttribute('data-low-hp',health<.3);
  }};
}

export function createPlayerVitals(name:HTMLElement,jobName:string){
  const element=document.createElement('section');
  element.className='combat-vitals';
  element.innerHTML=`
    <div class="vital-artwork">
      <span class="vital-job"></span>
      <div class="vital-portrait"></div>
      <div class="vital-frame" aria-hidden="true"></div>
      <strong class="vital-level"></strong>
      ${['hp','mp','exp'].map(stat=>`
        <div class="vital-track vital-${stat}">
          <progress class="sr-only ${stat}-meter" aria-label="${stat.toUpperCase()}"></progress>
          <i class="vital-fill" aria-hidden="true"></i>
          <span class="${stat}-caption" aria-hidden="true"></span>
        </div>
      `).join('')}
    </div>
    <small class="arrival-protection" hidden></small>`;
  element.querySelector('.vital-artwork')!.append(name);
  element.querySelector('.vital-job')!.textContent=jobName;
  const rank=element.querySelector('strong')!;
  const protection=element.querySelector<HTMLElement>('.arrival-protection')!;
  const portrait=element.querySelector<HTMLElement>('.vital-portrait')!;
  const rows=Array.from(element.querySelectorAll('.vital-track'),row=>({
    meter:row.querySelector('progress')!,
    fill:row.querySelector('i')!,
    caption:row.querySelector('span')!,
  }));
  return {element,portrait,protection,update(level:number,hp:number,maxHp:number,mp:number,maxMp:number,exp:number,maxExp:number){
    rank.textContent='Lv. '+level;
    const percent=Math.floor(1000*exp/maxExp)/10;
    const values=[
      {value:hp,max:maxHp,label:`${hp} / ${maxHp}`},
      {value:mp,max:maxMp,label:`${mp} / ${maxMp}`},
      {value:exp,max:maxExp,label:`${exp} / ${maxExp} · ${percent}%`},
    ];
    rows.forEach(({meter,fill,caption},index)=>{
      const {max,value,label}=values[index];
      meter.max=max;
      meter.value=value;
      fill.style.width=`${100*meter.position}%`;
      meter.setAttribute('aria-valuetext',label);
      caption.textContent=label;
    });
  }};
}

/// <reference types="vite/client" />
import master from '../../shared/character-master.json' with {type:'json'};
import {combatStats,points,stats,type Command,type Job,type ProfileStore,type Stat,type StatAllocation,type Weapon} from './character-profile';
import type {createEquipmentPortrait} from './equipment-portrait';
import './character-panels.css';

type Panel = 'bag'|'sheet';
export function mountCharacterPanels(host:HTMLElement,store:ProfileStore,job:Job,thai:boolean,
  portrait:ReturnType<typeof createEquipmentPortrait>){
  const tr=(th:string,en:string)=>thai?th:en;
  const titles={bag:tr('กระเป๋า','Inventory'),sheet:tr('สถานะตัวละคร','Character status')};
  const equip=tr('สวมใส่','Equip'),remove=tr('ถอดอาวุธ','Unequip');
  const names:Record<string,string>={weapon:tr('อาวุธ','Weapon'),head:tr('ศีรษะ','Head'),body:tr('ลำตัว','Body'),arms:tr('ปลอกแขน','Arms')};
  const labels:Record<Stat,string>={STR:tr('พละกำลัง','Strength'),AGI:tr('ความคล่องตัว','Agility'),DEX:tr('ความแม่นยำ','Dexterity'),INT:tr('สติปัญญา','Intelligence'),VIT:tr('ความอดทน','Vitality'),LUK:tr('โชค','Luck')};
  const itemName=(id:Weapon)=>master.items[id][thai?'th':'en'];
  const shell=document.createElement('div');shell.className='character-hud';
  const keys:Panel[]=['bag','sheet'];
  shell.innerHTML='<nav class="journal-launch" aria-label="'+tr('ตัวละคร','Character controls')+'">'+
    keys.map((k,i)=>`<button data-toggle="${k}" aria-controls="journal-${k}" aria-expanded="false">${titles[k]} <kbd>${i?'C':'I'}</kbd></button>`).join('')+'</nav>'+
    keys.map(k=>`<section id="journal-${k}" data-panel="${k}" class="adventure-journal" role="dialog" aria-labelledby="title-${k}" tabindex="-1" hidden>
      <header><div><small class="journal-job"></small><h2 id="title-${k}">${titles[k]}</h2></div>
      <button class="journal-close" aria-label="${tr('ปิด','Close')} ${titles[k]}">×</button></header>
      <div class="journal-content"></div><p role="alert" class="journal-error" hidden></p></section>`).join('');
  host.append(shell);
  const launch=shell.querySelector<HTMLElement>('.journal-launch')!;
  const menu=host.querySelector<HTMLElement>('#settings-menu')!;
  menu.prepend(launch);
  launch.onclick=event=>{
    const button=(event.target as HTMLElement).closest<HTMLElement>('[data-toggle]');
    if(!button)return;
    const key=button.dataset.toggle as Panel;
    menu.hidePopover();show(key,true);
  };
  const panels={bag:shell.querySelector<HTMLElement>('#journal-bag')!,sheet:shell.querySelector<HTMLElement>('#journal-sheet')!};
  const {capacity,slotsPerPage}=master.inventory;
  const pages=Math.ceil(capacity/slotsPerPage);
  let front:Panel='bag',page=0,selected=0;
  let draft:StatAllocation={},saving=false;
  let repeatTimer:number|undefined;
  const battleLabels={physical:tr('โจมตีกายภาพ','Physical ATK'),magic:tr('โจมตีเวท','Magic ATK'),defense:tr('ป้องกัน','Defense'),
    hp:'HP',mp:'MP',attackSpeed:tr('ความเร็วโจมตี','Attack speed'),dodgeChance:tr('โอกาสหลบ','Dodge chance'),criticalChance:tr('โอกาสคริติคอล','Critical chance')};
  const battleKeys=Object.keys(battleLabels) as (keyof typeof battleLabels)[];
  function battleValue(key:keyof typeof battleLabels,n:number){
    if(key==='attackSpeed')return n.toFixed(2);
    if(key==='dodgeChance' || key==='criticalChance')return (n*100).toFixed(1)+'%';
    return String(n);
  }
  function reserved(){return Object.values(draft).reduce((total,n)=>total+n,0);}
  function stopRepeat(){
    window.clearTimeout(repeatTimer);
    repeatTimer=undefined;
  }
  function updateDraft(){
    const panel=panels.sheet;
    if(panel.hidden)return;
    const total=reserved(),available=points(store.value)-total;
    for(const stat of stats){
      const preview=panel.querySelector<HTMLElement>(`[data-preview="${stat}"]`)!;
      preview.textContent=draft[stat]?` +${draft[stat]}`:'';
      panel.querySelector<HTMLButtonElement>(`[data-action="raise-${stat}"]`)!.disabled=saving || available<=0;
    }
    panel.querySelector<HTMLElement>('[data-points]')!.textContent=String(available);
    const profile=store.value,projected={...profile.stats};
    for(const stat of stats)projected[stat]+=draft[stat]??0;
    const current=combatStats(profile),after=combatStats({...profile,stats:projected});
    for(const key of battleKeys){
      const value=battleValue(key,after[key]);
      panel.querySelector<HTMLElement>(`[data-battle-preview="${key}"]`)!.textContent=value!==battleValue(key,current[key])?' → '+value:'';
    }
    panel.querySelector<HTMLElement>('.allocation-actions')!.hidden=!total;
    for(const button of panel.querySelectorAll<HTMLButtonElement>('.allocation-actions button'))button.disabled=saving || !total;
  }
  function reserve(stat:Stat){
    if(saving || panels.sheet.hidden || reserved()>=points(store.value))return false;
    draft[stat]=(draft[stat]??0)+1;
    updateDraft();
    return reserved()<points(store.value);
  }
  panels.sheet.addEventListener('pointerdown',event=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-stat]');
    if(!button || button.disabled || !event.isPrimary || event.button!==0)return;
    stopRepeat();
    const stat=button.dataset.stat as Stat;
    panels.sheet.setPointerCapture(event.pointerId);
    const repeat=()=>{if(reserve(stat))repeatTimer=window.setTimeout(repeat,85);};
    if(reserve(stat))repeatTimer=window.setTimeout(repeat,350);
  });
  for(const end of ['pointerup','pointercancel','lostpointercapture'])panels.sheet.addEventListener(end,stopRepeat);
  window.addEventListener('blur',stopRepeat);
  function canEquip(item:Weapon){return master.classes[job].weapons.includes(item);}
  function raise(key:Panel){
    front=key;
    for(const k of keys)panels[k].classList.toggle('journal-front',k===key);
  }
  function inventory(){
    const bag=store.value.bag;
    const start=page*slotsPerPage,end=Math.min(start+slotsPerPage,capacity);
    if(selected<start || selected>=end || !bag[selected])selected=start;
    const id=bag[selected],cells:string[]=[];
    for(let index=start;index<end;index++){
      const item=bag[index];
      if(!item){cells.push('<span class="bag-cell vacant" aria-hidden="true"></span>');continue;}
      cells.push(`<button class="bag-cell bag-item" draggable="${canEquip(item)}" data-item="${item}" data-index="${index}" aria-pressed="${selected===index}" aria-label="${itemName(item)}" aria-describedby="tip-${index}">
        <img src="${master.items[item].icon}" alt="" draggable="false">
        <span class="item-tip" role="tooltip" id="tip-${index}">${itemName(item)} · ATK +${master.items[item].attack}</span></button>`);
    }
    const navigation=Array.from({length:pages},(_,i)=>`<button data-page="${i}" aria-pressed="${i===page}" aria-controls="bag-slots">${1+i*slotsPerPage}–${Math.min(capacity,(i+1)*slotsPerPage)}</button>`).join('');
    return `<div class="journal-section"><nav class="bag-pages" aria-label="${tr('หน้ากระเป๋า','Bag pages')}">${navigation}</nav>
      <span class="bag-count">${bag.length} / ${capacity}</span></div>
      <div id="bag-slots" class="bag-scroll" tabindex="0" aria-label="${tr('ช่องกระเป๋า','Inventory slots')}"><div class="bag-grid">${cells.join('')}</div></div>`+
      (id?`<div class="bag-detail"><div><strong>${itemName(id)}</strong><small>${names.weapon} · ATK +${master.items[id].attack}</small></div>
        <button data-action="equip-${id}" ${canEquip(id)?'':'disabled'}>${equip}</button></div>`:
        `<p class="journal-empty">${tr('หน้านี้ว่าง','This page is empty.')}</p>`);
  }
  function gearSlot(slot:string){
    const worn=slot==='weapon' && store.value.weapon;
    const full=store.value.bag.length>=capacity;
    const desc=worn?itemName(worn):tr('ว่าง','Empty');
    const content=worn?`<img class="worn-icon" src="${master.items[worn].icon}" alt="">`:'<span aria-hidden="true">—</span>';
    const cell=slot==='weapon'?`<button class="gear-cell" data-weapon-slot draggable="${Boolean(worn && !full)}" ${worn?'data-action="unequip"':'data-open-bag'}
      ${worn && full?'disabled':''} title="${worn && full?tr('กระเป๋าเต็ม','Bag full'):desc}" aria-label="${names[slot]} · ${worn?remove+' '+desc:equip}">${content}</button>`:
      `<span class="gear-cell">${content}</span>`;
    return `<div class="gear-slot">${cell}<small>${names[slot]}</small></div>`;
  }
  function sheet(){
    const p=store.value,battle=combatStats(p),free=points(p);
    return `<div class="equipment-stage">
      <div class="gear-rail">${gearSlot('head')}${gearSlot('weapon')}</div>
      <div class="paper-doll"></div>
      <div class="gear-rail">${gearSlot('body')}${gearSlot('arms')}</div></div>
      ${p.weapon?`<div class="worn-detail"><strong>${itemName(p.weapon)}</strong>
        <button data-action="unequip" ${p.bag.length>=capacity?'disabled':''}>${remove}</button></div>`:''}
      <div class="sheet-columns"><div><h3>${tr('ค่าสถานะ','Attributes')}</h3><div class="journal-stats">`+
      stats.map(s=>`<div><abbr title="${labels[s]}">${s}</abbr><b>${p.stats[s]}<span data-preview="${s}"></span></b><button data-stat="${s}" data-action="raise-${s}" aria-label="+1 ${s}">+</button></div>`).join('')+
      `</div></div><div><h3>${tr('ค่าพลัง','Combat stats')}</h3><dl>`+
      battleKeys.map(key=>`<div><dt>${battleLabels[key]}</dt><dd><span data-battle="${key}">${battleValue(key,battle[key])}</span><span data-battle-preview="${key}"></span>${key==='attackSpeed'?' '+tr('ครั้ง/วิ','/s'):''}</dd></div>`).join('')+
      `</dl></div></div><div class="sheet-balance">${tr('แต้มที่ยังจัดได้','Points to allocate')} <b data-points>${free}</b></div>
      <div class="allocation-actions" hidden><button data-action="confirm-stats">${tr('ตกลง','OK')}</button>
      <button data-action="cancel-stats">${tr('ยกเลิก','Cancel')}</button></div>`+
      (import.meta.env.DEV?`<button class="journal-test" data-action="level">${tr('ทดสอบเลเวลอัป','Test level up')} (+${master.pointsPerLevel})</button>
        <button class="journal-test" data-action="reset-level" ${p.level===master.startingLevel && !p.exp?'disabled':''}>${tr('รีเซ็ตเลเวล','Reset level')}</button>`:'');
  }
  function render(key:Panel){
    const panel=panels[key];if(panel.hidden)return;
    const active=panel.contains(document.activeElement)?document.activeElement as HTMLElement:null;
    const {action,index,page:activePage}=active?.dataset??{};
    const scroll=panel.querySelector('.bag-scroll')?.scrollTop??0;
    panel.querySelector('.journal-job')!.textContent=job.toUpperCase()+'  ·  Lv. '+store.value.level;
    panel.querySelector('.journal-content')!.innerHTML=key==='bag'?inventory():sheet();
    if(key==='sheet'){
      if(reserved()>points(store.value))draft={};
      updateDraft();
      panel.querySelector('.paper-doll')!.append(portrait.canvas);
      void portrait.update(store.value.weapon);
    }else panel.querySelector('.bag-scroll')!.scrollTop=scroll;
    const focus=action?'[data-action="'+action+'"]':index!==undefined?'[data-index="'+index+'"]':
      activePage!==undefined?'[data-page="'+page+'"]':null;
    if(focus)panel.querySelector<HTMLElement>(focus)?.focus({preventScroll:true});
    clampMoved(panel);
  }
  function place(panel:HTMLElement,x:number,y:number){
    panel.style.left=Math.max(0,Math.min(innerWidth-panel.offsetWidth,x))+'px';
    panel.style.top=Math.max(0,Math.min(innerHeight-panel.offsetHeight,y))+'px';
    panel.style.right='auto';
  }
  function clampMoved(panel:HTMLElement){
    if(!panel.hidden && panel.style.left)place(panel,parseFloat(panel.style.left),parseFloat(panel.style.top));
  }
  function show(key:Panel,visible:boolean){
    const panel=panels[key];
    panel.hidden=!visible;
    const button=launch.querySelector<HTMLButtonElement>('[data-toggle="'+key+'"]')!;
    button.setAttribute('aria-expanded',String(visible));
    if(visible){render(key);raise(key);panel.focus({preventScroll:true});}
    else{
      if(key==='sheet'){stopRepeat();draft={};}
      const other=key==='sheet'?'bag':'sheet';
      if(!panels[other].hidden){raise(other);panels[other].focus();}else host.querySelector<HTMLButtonElement>('#settings-toggle')?.focus();
    }
  }
  for(const key of keys){
    const panel=panels[key],handle=panel.querySelector('header')!;
    panel.onpointerdown=()=>raise(key);
    panel.addEventListener('focusin',()=>raise(key));
    let drag:{id:number;x:number;y:number}|undefined;
    handle.onpointerdown=e=>{
      if(!e.isPrimary || e.button!==0 || (e.target as HTMLElement).closest('button'))return;
      e.preventDefault();raise(key);
      const rect=panel.getBoundingClientRect();
      drag={id:e.pointerId,x:e.clientX-rect.left,y:e.clientY-rect.top};handle.setPointerCapture(e.pointerId);
    };
    handle.onpointermove=e=>{if(drag?.id===e.pointerId)place(panel,e.clientX-drag.x,e.clientY-drag.y);};
    handle.onlostpointercapture=()=>{drag=undefined;};
  }
  const resize=()=>keys.forEach(key=>clampMoved(panels[key]));
  function turnPage(next:number,fromEnd=false){
    if(next<0 || next>=pages || next===page)return;
    page=next;
    render('bag');
    const scroll=panels.bag.querySelector('.bag-scroll')!;
    scroll.scrollTop=fromEnd?scroll.scrollHeight:0;
  }
  let lastWheel=0;
  panels.bag.addEventListener('wheel',event=>{
    const grid=(event.target as HTMLElement).closest('.bag-scroll');
    if(!grid || !event.deltaY || event.ctrlKey)return;
    const up=event.deltaY<0;
    if(up?grid.scrollTop>1:grid.scrollTop+grid.clientHeight<grid.scrollHeight-1)return;
    event.preventDefault();
    const now=performance.now();
    if(now-lastWheel>220)turnPage(page+(up?-1:1),up);
    lastWheel=now;
  },{passive:false});
  async function change(key:Panel,command:Command){
    const error=panels[key].querySelector<HTMLElement>('.journal-error')!;
    try{await store.change(command);error.hidden=true;return true;}
    catch{error.textContent=tr('บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง','Could not save. Please try again.');error.hidden=false;return false;}
  }
  async function confirmStats(){
    if(saving || !reserved())return;
    stopRepeat();
    const increases=draft;
    saving=true;draft={};updateDraft();
    const saved=await change('sheet',{kind:'allocate',increases});
    if(!saved && !panels.sheet.hidden)draft=increases;
    saving=false;
    if(reserved()>points(store.value))draft={};
    updateDraft();
  }
  shell.oncontextmenu=event=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-index],[data-action="unequip"]');
    if(!button)return;
    event.preventDefault();
    if(button.disabled)return;
    if(button.dataset.index!==undefined){
      void change('bag',{kind:'equip',item:button.dataset.item as Weapon,index:Number(button.dataset.index)});
    }else void change('sheet',{kind:'unequip'});
  };
  let dragCommand:Command|undefined;
  shell.ondragstart=event=>{
    const source=(event.target as HTMLElement).closest<HTMLElement>('[draggable="true"]');
    if(!source || !event.dataTransfer)return;
    dragCommand=source.hasAttribute('data-weapon-slot')?{kind:'unequip'}:
      {kind:'equip',item:source.dataset.item as Weapon,index:Number(source.dataset.index)};
    event.dataTransfer.effectAllowed='move';
    event.dataTransfer.setData('text/plain',source.getAttribute('aria-label')??'');
  };
  function dropTarget(event:DragEvent){
    if(!dragCommand)return null;
    return (event.target as HTMLElement).closest(dragCommand.kind==='equip'?'[data-weapon-slot]':'#bag-slots');
  }
  shell.ondragover=event=>{if(dropTarget(event))event.preventDefault();};
  shell.ondrop=event=>{
    if(!dropTarget(event) || !dragCommand)return;
    event.preventDefault();
    void change(dragCommand.kind==='equip'?'sheet':'bag',dragCommand);
    dragCommand=undefined;
  };
  shell.ondragend=()=>{dragCommand=undefined;};
  portrait.canvas.addEventListener('portraiterror',()=>{
    portrait.canvas.replaceWith(document.createTextNode(tr('โหลดภาพตัวละครไม่สำเร็จ','Character preview unavailable')));
  });
  shell.onclick=event=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
    const key=button.closest<HTMLElement>('[data-panel]')?.dataset.panel as Panel|undefined;if(!key)return;
    if(button.classList.contains('journal-close')){show(key,false);return;}
    if(button.hasAttribute('data-open-bag')){show('bag',true);return;}
    if(button.dataset.page!==undefined){turnPage(Number(button.dataset.page));return;}
    if(button.dataset.index!==undefined){selected=Number(button.dataset.index);render('bag');return;}
    const action=button.dataset.action;
    let command:Command;
    if(action==='unequip')command={kind:'unequip'};
    else if(action?.startsWith('equip-'))command={kind:'equip',item:action.slice(6) as Weapon,index:selected};
    else if(button.dataset.stat){if(event.detail===0)reserve(button.dataset.stat as Stat);return;}
    else if(action==='cancel-stats'){stopRepeat();draft={};updateDraft();return;}
    else if(action==='confirm-stats'){void confirmStats();return;}
    else if(import.meta.env.DEV && (action==='level' || action==='reset-level'))command={kind:action};
    else return;
    void change(key,command);
  };
  function keydown(e:KeyboardEvent){
    if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.isComposing||document.querySelector('dialog[open]')||
      (e.target as HTMLElement)?.closest?.('input,textarea,select,[contenteditable=true]'))return;
    const key=e.code==='KeyI'?'bag':e.code==='KeyC'?'sheet':undefined;
    if(key){e.preventDefault();show(key,panels[key].hidden);}
    else if(e.key==='Escape'&&!panels[front].hidden){e.preventDefault();show(front,false);}
  }
  store.subscribe(()=>keys.forEach(render));
  window.addEventListener('resize',resize);window.addEventListener('keydown',keydown);
  return {destroy(){stopRepeat();window.removeEventListener('blur',stopRepeat);window.removeEventListener('resize',resize);window.removeEventListener('keydown',keydown);portrait.destroy();launch.remove();shell.remove();}};
}

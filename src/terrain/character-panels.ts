/// <reference types="vite/client" />
import master from '../../shared/character-master.json' with {type:'json'};
import {bagItemCount,combatStats,points,stats,type Command,type Job,type ProfileStore,type Stat,type StatAllocation,type Weapon} from './character-profile';
import type {createEquipmentPortrait} from './equipment-portrait';
import './character-panels.css';
import './inventory.css';
import './character-sheet.css';

type Panel = 'bag'|'sheet';
type BattleValue = number | readonly [min:number,max:number];
const sheetArt='/assets/ui/character-sheet/v3/';
export function mountCharacterPanels(host:HTMLElement,store:ProfileStore,job:Job,thai:boolean,
  portrait:ReturnType<typeof createEquipmentPortrait>){
  const tr=(th:string,en:string)=>thai?th:en;
  const titles={bag:tr('กระเป๋า','Inventory'),sheet:tr('สถานะตัวละคร','Character status')};
  const equip=tr('สวมใส่','Equip'),remove=tr('คลิกขวาเพื่อถอด','Right-click to unequip');
  const equipped=tr('สวมใส่อยู่','Equipped');
  const names={weapon:tr('อาวุธ','Weapon'),head:tr('ศีรษะ','Head'),body:tr('ลำตัว','Body'),arms:tr('ปลอกแขน','Arms'),
    offhand:tr('มือรอง','Off hand'),pants:tr('กางเกง','Pants'),feet:tr('รองเท้า','Feet'),ring:tr('แหวน','Ring'),neck:tr('สร้อย','Neck'),
    cloak:tr('เสื้อคลุม','Cloak')};
  const labels:Record<Stat,string>={STR:tr('พละกำลัง','Strength'),AGI:tr('ความคล่องตัว','Agility'),DEX:tr('ความแม่นยำ','Dexterity'),INT:tr('สติปัญญา','Intelligence'),VIT:tr('ความอดทน','Vitality'),LUK:tr('โชค','Luck')};
  const itemName=(id:Weapon)=>master.items[id][thai?'th':'en'];
  const shell=document.createElement('div');shell.className='character-hud';
  const keys:Panel[]=['bag','sheet'];
  const icons={bag:'inventory',sheet:'character'}, shortcuts={bag:'I',sheet:'C'};
  shell.innerHTML='<div class="journal-launch">'+
    keys.map(k=>`<button type="button" data-toggle="${k}" aria-label="${titles[k]}" aria-controls="journal-${k}" aria-expanded="false" aria-keyshortcuts="${shortcuts[k]}">
      <img src="/assets/ui/menu/${icons[k]}.webp" alt="" width="36" height="36">
      <kbd class="menu-shortcut" aria-hidden="true">${shortcuts[k]}</kbd>
      <span class="menu-tooltip" aria-hidden="true">${titles[k]}</span>
    </button>`).join('')+'</div>'+
    keys.map(k=>`<section id="journal-${k}" data-panel="${k}" class="adventure-journal" role="dialog" aria-labelledby="title-${k}" tabindex="-1" hidden>
      <header><div>${k==='sheet'?`<img class="sheet-title-icon" src="${sheetArt}class-icon.webp" alt="">`:'<img class="bag-title-icon" src="/assets/ui/inventory/inventory.webp" alt="" width="30" height="30">'}<h2 id="title-${k}">${titles[k]}</h2></div>
      <button type="button" class="journal-close" aria-label="${tr('ปิด','Close')} ${titles[k]}"></button></header>
      <div class="journal-content"></div><p role="alert" class="journal-error" hidden></p></section>`).join('');
  host.append(shell);
  const launch=shell.querySelector<HTMLElement>('.journal-launch')!;
  const menu=host.querySelector<HTMLElement>('#settings-menu')!;
  menu.prepend(launch);
  launch.onclick=event=>{
    const button=(event.target as HTMLElement).closest<HTMLElement>('[data-toggle]');
    if(!button)return;
    const key=button.dataset.toggle as Panel;
    show(key,true);
  };
  const panels={bag:shell.querySelector<HTMLElement>('#journal-bag')!,sheet:shell.querySelector<HTMLElement>('#journal-sheet')!};
  const {slotsPerPage,maxCapacity}=master.inventory;
  const categories=[
    ['all','ทั้งหมด','All'], ['consumables','ของใช้','Consumables'], ['ammo','กระสุน','Ammo'],
    ['equipment','อุปกรณ์','Equipment'], ['materials','วัสดุ','Materials'],
  ] as const;
  let bagCategory='all',bagQuery='';
  let drag:{source:HTMLElement;item:Weapon;from:number}|undefined;
  let parkedContent:HTMLElement|undefined;
  let hoverPage:number|undefined,hoverTimer:number|undefined;
  let front:Panel='bag',page=0,selected=0;
  let draft:StatAllocation={},saving=false;
  let wardrobe:'equipment'|'costume'='equipment';
  let repeatTimer:number|undefined;
  const battleLabels={physical:tr('โจมตีกายภาพ','Physical ATK'),magic:tr('โจมตีเวท','Magic ATK'),defense:tr('ป้องกันกายภาพ','Physical DEF'),
    magicDefense:tr('ป้องกันเวท','Magic DEF'),hp:'HP',mp:'MP',attackSpeed:tr('ความเร็วโจมตี','Attack speed'),
    flee:'FLEE',hit:'HIT',
    criticalChance:tr('โอกาสคริติคอล','Critical chance'),criticalDamage:tr('ดาเมจคริติคอล','Critical damage')
  } satisfies Record<keyof ReturnType<typeof combatStats>,string>;
  const battleKeys=Object.keys(battleLabels) as (keyof typeof battleLabels)[];
  function formatBattleNumber(key:keyof typeof battleLabels,n:number){
    if(key==='attackSpeed')return n.toFixed(2);
    if(key==='criticalChance' || key==='criticalDamage')return (n*100).toFixed(1)+'%';
    return String(n);
  }
  function battleValue(key:keyof typeof battleLabels,value:BattleValue){
    if(typeof value==='number')return formatBattleNumber(key,value);
    const [min,max]=value;
    return min===max?formatBattleNumber(key,min):`${formatBattleNumber(key,min)}–${formatBattleNumber(key,max)}`;
  }
  function reserved(){return Object.values(draft).reduce((total,n)=>total+n,0);}
  function availableFor(stat:Stat){
    return Math.max(0,Math.min(points(store.value)-reserved(),master.statCap-store.value.stats[stat]-(draft[stat]??0)));
  }
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
      const disabled=saving || availableFor(stat)===0;
      panel.querySelector<HTMLButtonElement>(`[data-action="raise-${stat}"]`)!.disabled=disabled;
      panel.querySelector<HTMLButtonElement>(`[data-action="max-${stat}"]`)!.disabled=disabled;
    }
    panel.querySelector<HTMLElement>('[data-points]')!.textContent=String(available);
    const profile=store.value,projected={...profile.stats};
    for(const stat of stats)projected[stat]+=draft[stat]??0;
    const current=combatStats(profile),after=combatStats({...profile,stats:projected});
    for(const key of battleKeys){
      const value=battleValue(key,after[key]);
      const preview=panel.querySelector<HTMLElement>(`[data-battle-preview="${key}"]`)!;
      preview.textContent=value!==battleValue(key,current[key])?' → '+value:'';
      preview.parentElement!.title=preview.parentElement!.textContent??'';
    }
    panel.querySelector<HTMLElement>('.allocation-actions')!.hidden=!total;
    for(const button of panel.querySelectorAll<HTMLButtonElement>('.allocation-actions button'))button.disabled=saving || !total;
  }
  function reserve(stat:Stat,max=false){
    if(saving || panels.sheet.hidden)return false;
    const available=availableFor(stat);
    if(!available)return false;
    draft[stat]=(draft[stat]??0)+(max?available:1);
    updateDraft();
    return availableFor(stat)>0;
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
    const {bag,bagCapacity:capacity,gold}=store.value;
    const used=bagItemCount(store.value);
    const pages=Math.ceil(capacity/slotsPerPage);
    page=Math.min(page,pages-1);
    const start=page*slotsPerPage,end=Math.min(start+slotsPerPage,capacity);
    const query=bagQuery.trim().normalize('NFC').toLowerCase();
    const filtered=bagCategory!=='all'||Boolean(query);
    const matches=Array.from({length:end-start},(_,i)=>start+i).filter(index=>{
      if(!filtered)return true;
      const id=bag[index];
      if(!id)return false;
      const item=master.items[id];
      return item && (bagCategory==='all'||item.category===bagCategory) &&
        (!query||[item.en,item.th].some(name=>name.normalize('NFC').toLowerCase().includes(query)));
    });
    if(!matches.includes(selected)||!bag[selected])selected=matches[0]??start;
    const cells:string[]=[];
    for(const index of matches){
      const item=bag[index];
      if(!item){cells.push(`<span class="bag-cell vacant" data-slot="${index}" aria-hidden="true"></span>`);continue;}
      cells.push(`<button class="bag-cell bag-item" draggable="true" data-item="${item}" data-index="${index}" data-slot="${index}" aria-pressed="${selected===index}" aria-label="${itemName(item)}" aria-describedby="tip-${index}">
        <img src="${master.items[item].icon}" alt="" draggable="false">
        <span class="item-tip" role="tooltip" id="tip-${index}">${itemName(item)} · ATK +${master.items[item].attack}</span></button>`);
    }
    const navigation=Array.from({length:pages},(_,i)=>`<button data-page="${i}" aria-pressed="${i===page}" aria-controls="bag-slots">${1+i*slotsPerPage}–${Math.min(capacity,(i+1)*slotsPerPage)}</button>`).join('');
    return `<div class="bag-toolbar">
        <nav class="bag-pages" tabindex="0" aria-label="${tr('หน้ากระเป๋า','Bag pages')}">${navigation}</nav>
        <button type="button" class="bag-expand" data-action="expand-bag" data-bag-expand
          aria-label="${tr('เพิ่ม 100 ช่อง','Add 100 slots')}" ${capacity>=maxCapacity?'disabled':''}></button>
      </div>
      <div class="bag-categories" role="group" aria-label="${tr('หมวดไอเท็ม','Item categories')}">
        ${categories.map(([key,th,en])=>`<button type="button" data-bag-category="${key}" aria-label="${tr(th,en)}" title="${tr(th,en)}" aria-pressed="${bagCategory===key}">
          <img src="/assets/ui/inventory/category-${key}.webp" alt="">${key==='all'?'All':''}</button>`).join('')}
      </div>
      <div id="bag-slots" class="bag-scroll" tabindex="0" aria-label="${tr('ช่องกระเป๋า','Inventory slots')}"><div class="bag-grid">${cells.join('')}</div></div>
      <div class="bag-summary">
        <output class="bag-count" aria-label="${tr('ความจุกระเป๋า','Bag capacity')}">${used} / ${capacity}</output>
        ${filtered&&!matches.length?`<p class="bag-no-results">${tr('ไม่พบไอเท็มในหน้านี้','No matching items on this page.')}</p>`:''}
        <button type="button" class="bag-sort" data-action="sort-bag" ${used===0?'disabled':''}>${tr('จัดเรียง','Sort items')}</button>`+
      `</div><div class="bag-footer">
        <div class="bag-search">
          <input id="bag-search" type="search" maxlength="80" aria-label="${tr('ค้นหาไอเท็มในหน้านี้','Search items on this page')}"
            placeholder="${tr('ค้นหาในหน้านี้','Search this page')}">
          <button type="button" data-bag-clear aria-label="${tr('ล้างการค้นหา','Clear search')}"></button>
        </div>
        <output class="bag-gold" aria-label="${tr('เหรียญทอง','Gold coins')}">
          <img src="/assets/ui/inventory/gold.webp" alt="">${gold.toLocaleString(thai?'th-TH':'en-US')}
        </output>
      </div>`;
  }
  function gearSlot(slot:keyof typeof names,ringNumber?:number){
    const interactive=slot==='weapon' && wardrobe==='equipment';
    const worn=interactive && store.value.weapon;
    const full=bagItemCount(store.value)>=store.value.bagCapacity;
    const desc=worn?itemName(worn):tr('ว่าง','Empty');
    const content=worn?`<img class="worn-icon" src="${master.items[worn].icon}" alt="" draggable="false"><span class="gear-equipped-check" aria-hidden="true">✓</span>`:slot==='pants'?
      '<span class="gear-placeholder gear-pants" aria-hidden="true"></span>':
      `<img class="gear-placeholder" src="${sheetArt}gear-${slot}.webp" alt="" draggable="false">`;
    const name=names[slot]+(ringNumber?' '+ringNumber:'');
    const position=`data-gear="${slot}" data-gear-position="${slot}${ringNumber??''}"`;
    const hint=worn?`${equipped} · ${desc} · ${full?tr('กระเป๋าเต็ม','Bag full'):remove}`:equip;
    return interactive?`<button type="button" class="gear-cell" ${position} data-weapon-slot ${worn?'data-equipped data-unequip':'data-open-bag'} ${worn && full?'disabled':''}
      title="${hint}" aria-label="${name} · ${hint}">${content}</button>`:
      `<span class="gear-cell" ${position} role="img" title="${name}" aria-label="${name} · ${desc}">${content}</span>`;
  }
  function gearSlots(){
    return gearSlot('head')+gearSlot('weapon')+gearSlot('offhand')+gearSlot('ring',1)+gearSlot('ring',2)+gearSlot('neck')+
      gearSlot('body')+gearSlot('cloak')+gearSlot('pants')+gearSlot('feet')+gearSlot('arms');
  }
  function changeWardrobe(tab:typeof wardrobe){
    if(tab===wardrobe)return;
    wardrobe=tab;
    const panel=panels.sheet;
    panel.querySelector('.gear-slots')!.innerHTML=gearSlots();
    for(const button of panel.querySelectorAll<HTMLButtonElement>('[data-wardrobe]')){
      button.setAttribute('aria-pressed',String(button.dataset.wardrobe===wardrobe));
    }
  }
  const battleIcons:Partial<Record<keyof typeof battleLabels,string>>={physical:'atk',magic:'int',defense:'def',magicDefense:'def',hp:'vit',mp:'int',
    attackSpeed:'aspd',flee:'flee',hit:'hit',criticalChance:'crit',criticalDamage:'crit'};
  const statIcon=(name:string)=>`<img class="sheet-stat-icon" alt="" src="${sheetArt}stat-${name.toLowerCase()}.webp">`;
  function sheet(){
    const p=store.value,battle=combatStats(p),free=points(p);
    return `<div class="wardrobe-tabs" role="group" aria-label="${tr('ชุดสวมใส่','Wardrobe')}">
      <button type="button" data-wardrobe="equipment" aria-pressed="${wardrobe==='equipment'}" aria-controls="sheet-gear">${tr('อุปกรณ์','Equipment')}</button>
      <button type="button" data-wardrobe="costume" aria-pressed="${wardrobe==='costume'}" aria-controls="sheet-gear">${tr('คอสตูม','Costume')}</button>
      </div><div class="equipment-stage">
      <div class="gear-slots" id="sheet-gear">${gearSlots()}</div>
      <div class="paper-doll">
        <button type="button" data-sheet-turn="left" aria-label="${tr('หมุนซ้าย','Turn left')}"></button>
        <button type="button" data-sheet-turn="right" aria-label="${tr('หมุนขวา','Turn right')}"></button>
      </div>
      </div>
      <div class="sheet-columns"><div><h3>${tr('ค่าสถานะ','Attributes')}</h3><div class="journal-stats">`+
      stats.map(s=>`<div>${statIcon(s)}<abbr title="${labels[s]}">${s}</abbr><b>${p.stats[s]}<span data-preview="${s}"></span></b>
        <button data-stat="${s}" data-action="raise-${s}" aria-label="+1 ${s}">+</button>
        <button class="stat-max" data-max-stat="${s}" data-action="max-${s}" aria-label="MAX ${s}" title="${tr('ลงแต้มสูงสุด','Allocate maximum')} ${s}">MAX</button></div>`).join('')+
      `</div></div><div><h3>${tr('ค่าพลัง','Combat stats')}</h3><dl>`+
      battleKeys.map(key=>`<div><dt title="${battleLabels[key]}">${battleIcons[key]?statIcon(battleIcons[key]):''}<span>${battleLabels[key]}</span></dt><dd><span data-battle="${key}">${battleValue(key,battle[key])}</span><span data-battle-preview="${key}"></span>${key==='attackSpeed'?' '+tr('/วิ','/s'):''}</dd></div>`).join('')+
      `</dl></div></div><div class="sheet-footer">
      <div class="allocation-actions" hidden><button data-action="confirm-stats"><img src="${sheetArt}confirm-icon.webp" alt="">${tr('ตกลง','OK')}</button>
      <button data-action="cancel-stats"><img src="${sheetArt}reset-icon.webp" alt="">${tr('ยกเลิก','Cancel')}</button></div>
      <div class="sheet-balance">${statIcon('status_point')}${tr('แต้มที่ยังจัดได้','Available points')} <b data-points>${free}</b></div></div>`+
      (import.meta.env.DEV?`<button class="journal-test" data-action="level">${tr('ทดสอบเลเวลอัป','Test level up')} (+${master.pointsPerLevel})</button>
        <button class="journal-test" data-action="reset-level" ${p.level===master.startingLevel && !p.exp?'disabled':''}>${tr('รีเซ็ตเลเวล','Reset level')}</button>`:'');
  }
  function render(key:Panel){
    const panel=panels[key];if(panel.hidden)return;
    const active=panel.contains(document.activeElement)?document.activeElement as HTMLElement:null;
    const {action,index,page:activePage}=active?.dataset??{};
    const searchStart=active instanceof HTMLInputElement && active.id==='bag-search'?active.selectionStart:null;
    const searchEnd=active instanceof HTMLInputElement && active.id==='bag-search'?active.selectionEnd:null;
    const selectedCategory=active?.hasAttribute('data-bag-category');
    const scroll=panel.querySelector('.bag-scroll')?.scrollTop??0;
    const tabScroll=panel.querySelector('.bag-pages')?.scrollLeft??0;
    let content=panel.querySelector<HTMLElement>('.journal-content')!;
    if(drag && content.contains(drag.source)){
      // Keep the native drag source connected when changing pages during a drag.
      parkedContent=content;
      parkedContent.hidden=true;
      parkedContent.className='';
      for(const node of parkedContent.querySelectorAll('[id]'))node.removeAttribute('id');
      content=document.createElement('div');
      content.className='journal-content';
      parkedContent.before(content);
    }
    content.innerHTML=key==='bag'?inventory():sheet();
    if(key==='sheet'){
      if(reserved()>points(store.value))draft={};
      updateDraft();
      panel.querySelector('.paper-doll')!.append(portrait.canvas);
      void portrait.update(store.value.weapon);
    }else{
      panel.querySelector('.bag-scroll')!.scrollTop=scroll;
      panel.querySelector('.bag-pages')!.scrollLeft=tabScroll;
      const search=panel.querySelector<HTMLInputElement>('#bag-search')!;
      search.value=bagQuery;
      if(searchStart!==null && searchEnd!==null){
        search.focus({preventScroll:true});
        search.setSelectionRange(searchStart,searchEnd);
      }
    }
    const focus=action?'[data-action="'+action+'"]':index!==undefined?'[data-index="'+index+'"]':
      activePage!==undefined?'[data-page="'+page+'"]':selectedCategory?'[data-bag-category][aria-pressed="true"]':null;
    if(focus)panel.querySelector<HTMLElement>(focus)?.focus({preventScroll:true});
    fitPanel(panel);
  }
  function place(panel:HTMLElement,x:number,y:number){
    const zoom=Number(getComputedStyle(panel).zoom)||1;
    const {width,height}=panel.getBoundingClientRect();
    panel.style.left=Math.max(8,Math.min(innerWidth-width-8,x))/zoom+'px';
    panel.style.top=Math.max(8,Math.min(innerHeight-height-8,y))/zoom+'px';
    panel.style.right='auto';
  }
  function fitPanel(panel:HTMLElement){
    if(panel.hidden)return;
    const {left,top}=panel.getBoundingClientRect();
    const preferred=Number(getComputedStyle(panel).getPropertyValue('--ui-scale'))||1;
    // Measure at a fixed zoom so fractional rounding cannot change the next fit.
    panel.style.setProperty('--journal-zoom','1');
    const box=panel.getBoundingClientRect();
    const width=Math.ceil(box.width),height=Math.ceil(box.height);
    // Keep the bag footer above the bottom-right shortcut menu by default.
    const bottom=panel===panels.bag?Math.min(137*preferred,innerHeight*.35):8;
    const zoom=Math.min(preferred,Math.max(1,innerWidth-16)/width,Math.max(1,innerHeight-bottom-8)/height);
    panel.style.setProperty('--journal-zoom',String(zoom));
    panel.style.setProperty('--journal-height',height*zoom+'px');
    panel.style.setProperty('--journal-bottom',bottom+'px');
    if(panel.style.left)place(panel,left,top);
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
  const resize=()=>keys.forEach(key=>fitPanel(panels[key]));
  const panelSize=new ResizeObserver(resize);
  for(const panel of Object.values(panels))panelSize.observe(panel);
  function turnPage(next:number){
    const pages=Math.ceil(store.value.bagCapacity/slotsPerPage);
    if(next<0 || next>=pages || next===page)return;
    page=next;
    render('bag');
    const scroll=panels.bag.querySelector('.bag-scroll')!;
    scroll.scrollTop=0;
  }
  function filterBag(){
    render('bag');
    panels.bag.querySelector('.bag-scroll')!.scrollTop=0;
  }
  function updateBagQuery(event:Event){
    const input=event.target;
    if(!(input instanceof HTMLInputElement)||input.id!=='bag-search'||
      (event instanceof InputEvent && event.isComposing)||bagQuery===input.value)return;
    bagQuery=input.value;
    filterBag();
  }
  panels.bag.addEventListener('input',updateBagQuery);
  panels.bag.addEventListener('compositionend',updateBagQuery);
  panels.bag.addEventListener('wheel',event=>{
    const tabs=(event.target as HTMLElement).closest<HTMLElement>('.bag-pages');
    if(!tabs || event.ctrlKey || event.shiftKey || Math.abs(event.deltaX)>=Math.abs(event.deltaY) ||
      tabs.scrollWidth<=tabs.clientWidth)return;
    const unit=event.deltaMode===1?16:event.deltaMode===2?tabs.clientWidth:1;
    tabs.scrollLeft+=event.deltaY*unit;
    event.preventDefault();
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
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-index],[data-unequip]');
    if(!button)return;
    event.preventDefault();
    if(button.disabled)return;
    if(button.dataset.index!==undefined){
      void change('bag',{kind:'equip',item:button.dataset.item as Weapon,index:Number(button.dataset.index)});
    }else void change('sheet',{kind:'unequip'});
  };
  shell.ondragstart=event=>{
    const source=(event.target as HTMLElement).closest<HTMLElement>('[data-index][draggable="true"]');
    if(!source || !event.dataTransfer)return;
    const item=source.dataset.item as Weapon|undefined;
    if(!item)return;
    drag={source,item,from:Number(source.dataset.index)};
    event.dataTransfer.effectAllowed='move';
    event.dataTransfer.setData('text/plain',source.getAttribute('aria-label')??'');
  };
  function clearDrag(){
    drag=undefined;
    clearTimeout(hoverTimer);hoverPage=undefined;
    parkedContent?.remove();parkedContent=undefined;
  }
  function dropCommand(target:HTMLElement):Command|undefined{
    if(!drag)return;
    const slot=target.closest<HTMLElement>('[data-slot]')?.dataset.slot;
    if(slot!==undefined)return {kind:'move-bag',item:drag.item,from:drag.from,to:Number(slot)};
    if(target.closest('[data-weapon-slot]') && canEquip(drag.item))return {kind:'equip',item:drag.item,index:drag.from};
  }
  function acceptDrag(event:DragEvent){
    if(!drag)return;
    const target=event.target as HTMLElement;
    const tab=target.closest<HTMLElement>('[data-page]');
    const next=tab?Number(tab.dataset.page):undefined;
    if(next!==hoverPage){
      clearTimeout(hoverTimer);hoverPage=next;
      if(next!==undefined && next!==page)hoverTimer=window.setTimeout(()=>turnPage(next),500);
    }
    if(tab||dropCommand(target))event.preventDefault();
  }
  shell.ondragenter=acceptDrag;
  shell.ondragover=acceptDrag;
  shell.ondragleave=event=>{
    const tab=(event.target as HTMLElement).closest<HTMLElement>('[data-page]');
    if(!tab || Number(tab.dataset.page)!==hoverPage)return;
    clearTimeout(hoverTimer);hoverPage=undefined;
  };
  shell.ondrop=event=>{
    const command=dropCommand(event.target as HTMLElement);
    clearDrag();
    if(!command)return;
    event.preventDefault();
    if(command.kind==='move-bag')selected=command.to;
    void change(command.kind==='equip'?'sheet':'bag',command);
  };
  shell.ondragend=clearDrag;
  portrait.canvas.addEventListener('portraiterror',()=>{
    portrait.canvas.replaceWith(document.createTextNode(tr('โหลดภาพตัวละครไม่สำเร็จ','Character preview unavailable')));
  });
  shell.onclick=event=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
    const key=button.closest<HTMLElement>('[data-panel]')?.dataset.panel as Panel|undefined;if(!key)return;
    if(button.classList.contains('journal-close')){show(key,false);return;}
    if(button.dataset.wardrobe){changeWardrobe(button.dataset.wardrobe as typeof wardrobe);return;}
    if(button.dataset.sheetTurn){portrait.rotate(button.dataset.sheetTurn==='left'?-Math.PI/4:Math.PI/4);return;}
    if(button.hasAttribute('data-open-bag')){show('bag',true);return;}
    if(button.dataset.bagCategory){bagCategory=button.dataset.bagCategory;filterBag();return;}
    if(button.hasAttribute('data-bag-clear')){bagQuery='';filterBag();panels.bag.querySelector<HTMLElement>('#bag-search')!.focus();return;}
    if(button.dataset.page!==undefined){turnPage(Number(button.dataset.page));return;}
    if(button.dataset.index!==undefined){selected=Number(button.dataset.index);render('bag');return;}
    const action=button.dataset.action;
    let command:Command;
    if(action==='expand-bag')command={kind:'expand-bag'};
    else if(action==='sort-bag')command={kind:'sort-bag'};
    else if(button.dataset.stat){if(event.detail===0)reserve(button.dataset.stat as Stat);return;}
    else if(button.dataset.maxStat){reserve(button.dataset.maxStat as Stat,true);return;}
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
  host.addEventListener('mythraven:ui-scale',resize);
  return {destroy(){clearDrag();stopRepeat();panelSize.disconnect();window.removeEventListener('blur',stopRepeat);window.removeEventListener('resize',resize);window.removeEventListener('keydown',keydown);host.removeEventListener('mythraven:ui-scale',resize);portrait.destroy();launch.remove();shell.remove();}};
}

import {createWorldSurroundings} from './world-surroundings';
import {createViewDistance,VIEW_DISTANCE} from './view-distance';
import {createBowProjectiles} from './bow-projectiles';
import {createCombatFeedback} from './combat-feedback';
import {createRouteLights} from './route-lights';
import {attackInterval,swingDuration,weaponRange} from '../../shared/battle-stats.mjs';
import {createCombatImpact} from './combat-impact';
import {ELRA_ID,loadElra} from './elra';
import {buildWestMarch, mapPortal, PORTAL_RADIUS, type Area} from '../../shared/west-march.mjs';
import {loadFrontierWildlife} from './frontier-wildlife';
import {createGroundPicker} from './ground-picker';
import monsters from '../../shared/monster-master.json';
import {openCharacterProfile,combatStats,expRequired,type Job,type Weapon} from './character-profile';
import {mountCharacterPanels} from './character-panels';
import {createEquipmentPortrait} from './equipment-portrait';
import {weaponsFor} from './skinned-player';
import * as THREE from 'three';
import { locale } from '../i18n';
import { loadTerrainData, TERRAIN } from './terrain-data';
import { createTerrain, createWater } from './terrain-mesh';
import { TerrainMovement, terrainHeight } from './terrain-movement';
import { createCharacterAssets, type CharacterAssets, type PlayerAvatar } from './character-assets';
import { DEFAULT_CHARACTER_ID, characterById } from '../../shared/character-catalog.mjs';
import { createPlayerHighlight } from './player-highlight';
import { playerApproachPoint, PLAYER_APPROACH_DISTANCE } from './player-approach';
import { TerrainClient,type TerrainPlayer } from '../network/terrain-client';
import { TerrainPrediction } from '../network/terrain-prediction';
import { createTerrainMinimap } from './terrain-minimap';
import { loadTerrainTiles } from './terrain-materials';
import { createBankGrass } from './bank-grass';
import { loadCityTrees } from './city-trees';
import { loadCityFortifications } from './city-fortifications';
import {loadCityBuildings} from './city-buildings';
import { createOrbitCamera } from './orbit-camera';
import { createDaylight } from './daylight';
import { mountEnvironmentSettings } from './environment-settings';
import { MAX_SPEED_LEVEL, DEFAULT_SPEED_LEVEL, speedMultiplier, turnTowards } from '../../shared/terrain-movement.mjs';
import './terrain.css';
import type {LoadStep} from '../scene-loading';

type WalkHit = {point: THREE.Vector3; normal: THREE.Vector3};

export interface TerrainWorld {
  destroy: (removeCanvas?: boolean) => void;
  ready?: Promise<void>;
  inspect?: () => any;
}

export async function mountTerrainWorld(host: HTMLElement, displayName = '', characterId = DEFAULT_CHARACTER_ID,
  preparedCharacters?: CharacterAssets, area: Area = 'city', fromWest = false,
  onWarp?: (area:Area)=>void, ownerId=displayName,onLoad:(step:LoadStep)=>void=()=>{},hairColor=''): Promise<TerrainWorld> {
  const thai = locale() === 'th';
  const field = area === 'west-march';
  const data = field ? buildWestMarch() : await loadTerrainData();
  onLoad('terrain');
  const portal = mapPortal(data);
  if (!host.isConnected) { preparedCharacters?.dispose(); return { destroy() {} }; }
  const tiles = await loadTerrainTiles();
  onLoad('textures');
  if (!host.isConnected) { preparedCharacters?.dispose(); tiles.dispose(); return { destroy() {} }; }
  let groves: Awaited<ReturnType<typeof loadCityTrees>>;
  try { groves = await loadCityTrees(data); } catch (error) { preparedCharacters?.dispose(); tiles.dispose(); throw error; }
  onLoad('trees');
  if (!host.isConnected) { preparedCharacters?.dispose(); groves.dispose(); tiles.dispose(); return { destroy() {} }; }
  let fortifications: Awaited<ReturnType<typeof loadCityFortifications>>;
  try { fortifications=await loadCityFortifications(data,tiles.cityStone); }
  catch(error){preparedCharacters?.dispose();groves.dispose();tiles.dispose();throw error;}
  onLoad('bridges');
  if(!host.isConnected){preparedCharacters?.dispose();fortifications.dispose();groves.dispose();tiles.dispose();return {destroy(){}};}
  let buildings:Awaited<ReturnType<typeof loadCityBuildings>>;
  try{buildings=await loadCityBuildings(data);}catch(error){preparedCharacters?.dispose();fortifications.dispose();groves.dispose();tiles.dispose();throw error;}
  onLoad('buildings');
  if(!host.isConnected){preparedCharacters?.dispose();buildings.dispose();fortifications.dispose();groves.dispose();tiles.dispose();return {destroy(){}};}
  const characters = preparedCharacters ?? createCharacterAssets();
  try {
    const chosen = characterById(characterId);
    if (!chosen) throw new Error('Unknown character');
    await characters.ensure(chosen);
    onLoad('character');
  } catch (error) { characters.dispose(); buildings.dispose(); fortifications.dispose(); groves.dispose(); tiles.dispose(); throw error; }
  if (!host.isConnected) { characters.dispose(); buildings.dispose(); fortifications.dispose(); groves.dispose(); tiles.dispose(); return { destroy() {} }; }
  const navigation = new TerrainMovement(data);
  let elra: Awaited<ReturnType<typeof loadElra>> | undefined;
  let wildlife: Awaited<ReturnType<typeof loadFrontierWildlife>> | undefined;
  try {
    if (field) wildlife = await loadFrontierWildlife(data,navigation);
    else elra = await loadElra();
  }
  catch (error) { characters.dispose(); buildings.dispose(); fortifications.dispose(); groves.dispose(); tiles.dispose(); throw error; }
  onLoad('inhabitants');
  if (!host.isConnected) { wildlife?.dispose(); elra?.dispose(); characters.dispose(); buildings.dispose(); fortifications.dispose(); groves.dispose(); tiles.dispose(); return {destroy(){}}; }
  const prediction = new TerrainPrediction(data);
  const renderer = new THREE.WebGLRenderer({ antialias: true, stencil:field, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement; canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', thai ? 'เมืองสามมิติ คลิกซ้ายบนพื้นเพื่อเดิน' : '3D town. Left-click the ground to walk.');
  if (field) canvas.setAttribute('aria-label',thai?'ทุ่งชายแดนตะวันตก คลิกซ้ายบนพื้นเพื่อเดิน':'West March. Left-click the ground to walk.');
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#c3d2cd');
  const daylight = createDaylight(scene);
  const sun = daylight.sun;
  sun.shadow.mapSize.setScalar(Math.min(4096,renderer.capabilities.maxTextureSize));
  scene.add(groves.group);
  scene.add(fortifications.group);
  scene.add(buildings.group);
  // Beside the southeast provisions stall, facing west towards the plaza.
  if (elra) {
  elra.group.position.set(29,terrainHeight(data,29,20),20);
  elra.group.rotation.y = -Math.PI/2;
  scene.add(elra.group);
  }
  if (wildlife) scene.add(wildlife.group);
  const warp = new THREE.Group();
  warp.position.set(portal.x,terrainHeight(data,portal.x,portal.z)+.15,portal.z);
  for (const radius of [PORTAL_RADIUS,PORTAL_RADIUS*.72]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius,.09,8,64),
      new THREE.MeshBasicMaterial({color:0x95ffe7,transparent:true,opacity:.9,depthWrite:false}));
    ring.rotation.x=Math.PI/2; warp.add(ring);
  }
  scene.add(warp);
  const warpLabel=document.createElement('span');
  warpLabel.className='world-player-name'; warpLabel.hidden=true; host.append(warpLabel);
  warpLabel.textContent=field?(thai?'กลับเมืองหลัก':'To the city'):(thai?'ไปทุ่งชายแดนตะวันตก':'To West March');
  const warpScreen=new THREE.Vector3();
  const elraLabel = document.createElement('span');
  elraLabel.className = 'world-player-name';
  elraLabel.textContent = thai ? 'เอลรา · แม่ค้าเสบียง' : 'Elra · Provisioner';
  elraLabel.hidden = true; host.append(elraLabel);
  const elraScreen = new THREE.Vector3();
  const targetLabel=document.createElement('span');
  targetLabel.className='world-player-name monster-name';targetLabel.hidden=true;host.append(targetLabel);
  const targetScreen=new THREE.Vector3();
  const terrain = createTerrain(data, tiles); scene.add(terrain);
  const ground = terrain.getObjectByName('continuous-terrain')!;
  const pickGround = createGroundPicker((ground as THREE.Mesh).geometry, data.side - 1);
  const surroundings=createWorldSurroundings(data,tiles,(ground as THREE.Mesh).geometry);scene.add(surroundings);
  const water = createWater(data); scene.add(water.mesh);
  const bankGrass = createBankGrass(data); scene.add(bankGrass.group);
  const viewDistance=createViewDistance(scene);
  for(const root of [terrain,surroundings,groves.group,fortifications.group,buildings.group,bankGrass.group,water.mesh])viewDistance.addStatic(root);
  if(elra)viewDistance.materials(elra.group);
  const marker = new THREE.Mesh(new THREE.RingGeometry(.42, .56, 32),
    new THREE.MeshBasicMaterial({ color: '#f1d480', transparent: true, opacity: .9, depthWrite: false, side: THREE.DoubleSide }));
  // Blended bridge materials draw in the transparent pass. Draw the ring after
  // them while keeping depth testing so nearby rails and characters occlude it.
  marker.renderOrder = 1; marker.visible = false; scene.add(marker);
  const routeLights=createRouteLights(prediction.movement);
  scene.add(routeLights.lights);
  const ringNormal = new THREE.Vector3(0, 0, 1);
  const mobName=document.createElement('span'),mobHp=document.createElement('progress');
  mobHp.setAttribute('aria-label',thai?'HP มอนสเตอร์':'Monster HP');
  targetLabel.append(mobName,mobHp);
  let markedPoint: THREE.Vector3 | undefined;
  const orbit = createOrbitCamera(data), camera = orbit.camera;
  const focus = new THREE.Vector3(navigation.spawn.x, navigation.height, navigation.spawn.z);
  const views = new Map<string, { mesh: THREE.Group; avatar: PlayerAvatar; weapon?:Weapon; swing:number; swingStart:number; label: HTMLSpanElement; highlight: ReturnType<typeof createPlayerHighlight> }>();
  let hoveredPlayer: string | undefined, selectedPlayer: string | undefined;
  let approach: { id: string; lastTarget?: { x: number; z: number }; sentAt: number; firstStroke?:number } | undefined;
  let hoverPoint: { x: number; y: number } | undefined;
  const minimap = createTerrainMinimap(host, data, thai);
  let portalTravel=false;
  const portalTravelLabel=minimap.travelButton.textContent;
  function setPortalTravel(active:boolean){
    portalTravel=active;
    minimap.travelButton.setAttribute('aria-pressed',String(active));
    minimap.travelButton.textContent=active?(thai?'ยกเลิกเดินไปวาร์ป':'Cancel portal travel'):portalTravelLabel;
  }
  setPortalTravel(false);
  minimap.travelButton.hidden=!onWarp;
  let minimapUpdatedAt = -Infinity;
  const disposeObject = (object: THREE.Object3D) => object.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      (Array.isArray(child.material) ? child.material : [child.material]).forEach(material => material.dispose());
    }
  });
  const removeViews = () => {
    setPortalTravel(false);
    prediction.reset();
    for (const view of views.values()) { view.highlight.dispose(); view.avatar.dispose(); view.label.remove(); }
    views.clear(); markedPoint = undefined; marker.visible = false;
    hoveredPlayer = selectedPlayer = undefined; approach = undefined; hoverPoint = undefined; delete canvas.dataset.playerHover;
    minimap.update(new Map(), undefined, []);
  };

  let disposed = false, lost = false, frame = 0, hintUntil = 0;
  let resolveReady!:()=>void,rejectReady!:(error:Error)=>void;
  const ready=new Promise<void>((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  let revealed=false,compiling=false,gpuPrepared=false,readySent=false,initialModelsReady=false;
  const status = document.createElement('p'); status.className = 'terrain-status'; status.setAttribute('role', 'status'); status.hidden = true;
  const hint = document.createElement('div'); hint.className = 'terrain-move-hint'; hint.setAttribute('role', 'status'); hint.hidden = true;
  const panel = document.createElement('div'); panel.id = 'network-status'; panel.className = 'terrain-network';
  const label = document.createElement('span'), retry = document.createElement('button');
  label.setAttribute('role', 'status'); retry.type = 'button'; retry.hidden = true;
  retry.textContent = thai ? 'เชื่อมต่อใหม่' : 'Reconnect';
  panel.append(label, retry);
  const speedControl = document.createElement('label'); speedControl.className = 'terrain-speed settings-range';
  const speedText = document.createElement('span'), speedValue = document.createElement('output');
  const speedSlider = document.createElement('input'); speedSlider.type = 'range'; speedSlider.id = 'walk-speed';
  speedSlider.min = '1'; speedSlider.max = String(MAX_SPEED_LEVEL); speedSlider.step = '1'; speedSlider.value = String(DEFAULT_SPEED_LEVEL); speedSlider.disabled = true;
  speedText.textContent = thai ? 'ความเร็วเดิน' : 'Walking speed';
  speedSlider.setAttribute('aria-label', speedText.textContent);
  const speedHeading = document.createElement('span'); speedHeading.className = 'terrain-speed-heading';
  speedHeading.append(speedText, speedValue); speedControl.append(speedHeading, speedSlider);
  const settingsControls = host.parentElement!.querySelector('#settings-controls')!;
  settingsControls.append(speedControl);
  const wheelZoom = (event:WheelEvent) => {
    event.preventDefault();
    const unit=event.deltaMode===1 ? 16 : event.deltaMode===2 ? canvas.clientHeight : 1;
    camera.zoom=THREE.MathUtils.clamp(camera.zoom * 2**(-event.deltaY*unit/600),.5,2);
    camera.updateProjectionMatrix();
    minimapUpdatedAt = -Infinity;
  };
  canvas.addEventListener('wheel',wheelZoom,{passive:false});
  const environmentSettings = mountEnvironmentSettings(settingsControls, thai,
    (hour, bearing) => daylight.configure(hour, bearing), () => { orbit.reset(); minimapUpdatedAt = -Infinity; });
  const showSpeed = () => {
    const level = Number(speedSlider.value), multiplier = speedMultiplier(level).toFixed(2).replace(/\.00$/, '');
    speedValue.textContent = `${level}/10 · ${multiplier}×`;
    speedSlider.setAttribute('aria-valuetext', thai ? `ระดับ ${level} ความเร็ว ${multiplier} เท่า` : `Level ${level}, ${multiplier} times speed`);
  };
  showSpeed();
  const rejected = () => {
    if(portalTravel)stopMovement();
    hint.textContent = thai ? 'เดินไปตรงนั้นไม่ได้' : 'That ground cannot be reached';
    hint.hidden = false; hintUntil = performance.now() + 1600;
  };
  const notice=(message:string)=>{
    hint.textContent=message;hint.hidden=false;hintUntil=performance.now()+2400;
  };
  const feedback=createCombatFeedback(host);
  const impacts=createCombatImpact(scene);
  const projectiles=createBowProjectiles(scene);
  const network = new TerrainClient(displayName, state => {
    if (disposed) return;
    panel.dataset.connected = String(state === 'online'); retry.hidden = state !== 'offline';
    speedSlider.disabled = state !== 'online';
    if (state === 'online') label.textContent = thai ? 'ออนไลน์ · ' + network.players.size + ' คน' : 'Online · ' + network.players.size + ' players';
    else {
      readySent=false;
      if(state==='offline' && !revealed)rejectReady(new Error('Map connection failed'));
      label.textContent = state === 'connecting' ? (thai ? 'กำลังเชื่อมต่อเมือง…' : 'Connecting to the city…')
        : (thai ? 'ขาดการเชื่อมต่อ' : 'Disconnected');
      projectiles.clear();removeViews();
    }
  }, rejected, player => prediction.accept(player), characterId, area, fromWest, (kind,amount)=>{
    if(kind!=='rabbit' && kind!=='wolf')return;
    const level=profile.value.level;
    void profile.change({kind:'experience',amount}).then(()=>{
      if(!disposed)notice('+'+amount+' EXP'+(profile.value.level>level?' · Lv. '+profile.value.level:''));
    }).catch(()=>{if(!disposed)notice(thai?'บันทึก EXP ไม่สำเร็จ':'Could not save EXP');});
  },event=>{
    if(document.hidden)return;
    const animal=wildlife?.targets.get(event.mob);
    if(!animal)return;
    if(event.to==='monster'){
      projectiles.impact(event.shotId);
      animal.react(event.lethal?'n_die':'n_take_attack');
      feedback.show(event,animal.position,animal.height+.3);
      impacts.show({...event,weapon:event.weapon??network.players.get(event.player)?.weapon},animal.position,animal.height,focus,animal.model);
    }else{
      // The monster's attack clip started with the server wind-up.
      const victim=views.get(event.player);
      if(victim){
        feedback.show(event,victim.mesh.position,2.85);
        impacts.show(event,victim.mesh.position,2.8,focus,victim.mesh);
      }
    }
  },hairColor);
  network.bowShot=shot=>{
    const target=wildlife?.targets.get(shot.mob);
    if(target && !document.hidden)projectiles.launch(shot,target,views.get(shot.player)?.avatar.bowRelease());
  };
  network.monsterSwing=id=>wildlife?.targets.get(id)?.react('n_attack');
  speedSlider.oninput = () => { showSpeed(); network.setSpeedLevel(Number(speedSlider.value)); prediction.movement.setSpeedLevel(Number(speedSlider.value)); };
  retry.onclick = () => { void network.connect(); };
  network.sceneAccepted=()=>{
    onLoad('ready');revealed=true;
    // Present a fully populated frame before the loading cover is removed.
    requestAnimationFrame(()=>{if(!disposed)resolveReady();});
  };
  host.querySelector('.loading')?.remove(); host.append(canvas, status, hint, panel);
  host.dataset.renderer = 'three'; host.dataset.terrainSize = String(TERRAIN.size);
  host.dataset.area=area;
  host.parentElement?.querySelector('.game-footer')?.remove();
  const pendingModels = new Set<string>(), failedModels = new Set<string>();
  const weaponAssets=new Map<Weapon,Awaited<ReturnType<CharacterAssets['loadWeapon']>>>();
  const job=characterById(characterId)!.classId as Job;
  const profile=openCharacterProfile(ownerId,job);
  const vitals=document.createElement('div');
  vitals.className='combat-vitals';
  vitals.innerHTML='<strong></strong><span class="hp-caption"></span><progress class="hp-meter" aria-label="HP"></progress><span class="exp-caption"></span><progress class="exp-meter" aria-label="EXP"></progress>';
  const header=host.parentElement!.querySelector<HTMLElement>('.game-header')!;
  const playerName=header.querySelector<HTMLElement>('#player-name')!;
  const heading=document.createElement('div');heading.className='vital-heading';
  heading.append(playerName,vitals.querySelector('strong')!);vitals.prepend(heading);
  const hp=vitals.querySelector('.hp-meter')!;
  hp.insertAdjacentHTML('afterend','<span class="mp-caption"></span><progress class="mp-meter" aria-label="MP"></progress>');
  const mpText=vitals.querySelector('.mp-caption')!,mpMeter=vitals.querySelector<HTMLProgressElement>('.mp-meter')!;
  const protection=document.createElement('small');protection.className='arrival-protection';protection.hidden=true;vitals.append(protection);
  const controls=document.createElement('div');controls.className='combat-controls';controls.append(panel);
  const autoButton=document.createElement('button');
  autoButton.className='auto-combat';autoButton.type='button';autoButton.setAttribute('aria-pressed','false');
  const huntButton=document.createElement('button'),huntPanel=document.createElement('section');
  huntButton.type='button';huntButton.className='hunt-launch';
  const huntTitle=thai?'โจมตีอัตโนมัติ':'Auto attack';
  const huntControls=document.createElement('div');huntControls.className='hunt-controls';
  autoButton.setAttribute('aria-keyshortcuts','Control+A');
  huntButton.textContent='▾';
  huntButton.title=thai?'ตั้งค่าการโจมตีอัตโนมัติ':'Auto attack settings';
  huntButton.setAttribute('aria-label',huntButton.title);
  huntPanel.id='auto-hunt-panel';huntPanel.className='hunt-panel';huntPanel.popover='auto';
  huntPanel.setAttribute('aria-label',huntTitle);
  huntButton.popoverTargetElement=huntPanel;huntButton.setAttribute('aria-controls',huntPanel.id);
  huntControls.append(autoButton,huntButton);host.parentElement!.append(huntControls,huntPanel);
  header.replaceChildren(vitals,controls);header.classList.add('player-hud');
  let auto=false,recoverUntil=0;
  const anchor=new THREE.Vector2();
  const rangeControl=document.createElement('label');
  rangeControl.className='settings-range hunt-range';
  const rangeLabel=document.createElement('span'),rangeInput=document.createElement('input');
  rangeInput.type='range';rangeInput.min='10';rangeInput.max='110';rangeInput.step='10';
  const savedRange=Number(localStorage.getItem('mr.auto-radius'));
  rangeInput.value=String(savedRange>=10 && savedRange<=110?savedRange:110);
  rangeControl.append(rangeLabel,rangeInput);
  const kinds=new Set(Array.from(wildlife?.targets.values()??[],animal=>animal.kind));
  const speciesKey='mr.auto-species.'+area;
  const savedSpecies=localStorage.getItem(speciesKey)?.split(',');
  const selectedKinds=new Set([...kinds].filter(kind=>!savedSpecies || savedSpecies.includes(kind)));
  const speciesField=document.createElement('fieldset'),legend=document.createElement('legend');
  legend.textContent=thai?'มอนสเตอร์เป้าหมาย':'Target monsters';speciesField.append(legend);
  for(const kind of kinds){
    const check=document.createElement('input'),label=document.createElement('label');
    check.type='checkbox';check.value=kind;check.checked=selectedKinds.has(kind);
    label.append(check,monsters[kind][thai?'th':'en']);speciesField.append(label);
    check.onchange=()=>{
      if(check.checked)selectedKinds.add(kind);else selectedKinds.delete(kind);
      localStorage.setItem(speciesKey,[...selectedKinds].join(','));
      if(!selectedKinds.size && auto)setAuto(false);
      else if(auto)network.hunt(true,radius(),[...selectedKinds]);
      updateHuntButton();
    };
  }
  const huntHint=document.createElement('small');huntHint.setAttribute('role','status');
  rangeControl.hidden=!field;speciesField.hidden=!field;
  huntPanel.append(rangeControl,speciesField,huntHint);
  const weaponHint=thai?'สวมอาวุธก่อนโจมตี':'Equip a weapon to attack';
  function updateHuntButton(){
    const reason=!field?(thai?'เมืองนี้ไม่มีมอนสเตอร์ให้ล่า':'No monsters to hunt in town'):!profile.value.weapon?weaponHint:!selectedKinds.size?(thai?'เลือกมอนสเตอร์อย่างน้อยหนึ่งชนิด':'Select at least one monster'):'';
    autoButton.disabled=!!reason && !auto;
    huntHint.hidden=!reason;huntHint.textContent=reason;
    autoButton.textContent=auto?(thai?'หยุดล่า':'Stop hunting'):huntTitle;
    autoButton.title=reason || autoButton.textContent+' (Ctrl+A)';
  }
  const radius=()=>rangeInput.valueAsNumber===110?Infinity:rangeInput.valueAsNumber;
  const withinHunt=(p:{x:number;z:number})=>!auto || Math.hypot(p.x-anchor.x,p.z-anchor.y)<=radius();
  const ringPositions=new THREE.BufferAttribute(new Float32Array(96*3),3);
  const ringGeometry=new THREE.BufferGeometry().setAttribute('position',ringPositions);
  const huntRing=new THREE.LineLoop(ringGeometry,new THREE.LineBasicMaterial({color:0xffdb80,transparent:true,opacity:.9,depthTest:false}));
  huntRing.frustumCulled=false;huntRing.renderOrder=3;huntRing.visible=false;
  if(field)scene.add(huntRing);
  function showRange(){
    const r=radius(),text=isFinite(r)?r+(thai?' เมตร':' m'):(thai?'ทั่วแมพ':'Whole map');
    rangeLabel.textContent=(thai?'รัศมีล่า · ':'Hunting radius · ')+text;
    rangeInput.setAttribute('aria-valuetext',text);
    const center=auto?{x:anchor.x,z:anchor.y}:prediction.position;
    const visible=field && isFinite(r) && (auto || huntPanel.matches(':popover-open'));
    minimap.huntingRange(center,visible?r:0);
    huntRing.visible=visible;
    if(!visible)return;
    for(let i=0;i<ringPositions.count;i++){
      const angle=2*Math.PI*i/ringPositions.count;
      const x=center.x+r*Math.cos(angle),z=center.z+r*Math.sin(angle);
      ringPositions.setXYZ(i,x,terrainHeight(data,x,z)+.16,z);
    }
    ringPositions.needsUpdate=true;
  }
  rangeInput.oninput=()=>{
    localStorage.setItem('mr.auto-radius',rangeInput.value);
    if(auto)network.hunt(true,radius(),[...selectedKinds]);
    showRange();
  };
  showRange();
  function setAuto(value:boolean){
    if(value && !auto)anchor.set(prediction.position.x,prediction.position.z);
    auto=value;autoButton.setAttribute('aria-pressed',String(value));showRange();updateHuntButton();
    network.hunt(value,radius(),[...selectedKinds]);
  }
  autoButton.onclick=()=>{
    stopMovement();selectedPlayer=undefined;
    setAuto(!auto);
  };
  const huntShortcut=(event:KeyboardEvent)=>{
    if(!event.ctrlKey || event.code!=='KeyA' || event.altKey || event.metaKey || event.shiftKey || event.isComposing ||
      document.querySelector('dialog[open]') || (event.target as HTMLElement)?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable=false])'))return;
    event.preventDefault();
    if(!event.repeat)autoButton.click();
  };
  window.addEventListener('keydown',huntShortcut);
  let sheetStats=combatStats(profile.value);
  profile.subscribe(()=>{sheetStats=combatStats(profile.value);});
  const rank=vitals.querySelector('strong')!,hpText=vitals.querySelector('.hp-caption')!,xpText=vitals.querySelector('.exp-caption')!;
  const hpMeter=vitals.querySelector<HTMLProgressElement>('.hp-meter')!,xpMeter=vitals.querySelector<HTMLProgressElement>('.exp-meter')!;
  let lastVitals='';
  const updateVitals=(mine?:TerrainPlayer)=>{
    const remaining=Math.max(0,Math.ceil((mine?.protectedUntil??0)-(Date.now()/1000+network.clockOffset)));
    protection.hidden=!remaining;
    const protectionText=thai?`คุ้มครองหลังเข้าแมพ · ${remaining} วินาที`:`Arrival protection · ${remaining}s`;
    if(protection.textContent!==protectionText)protection.textContent=protectionText;
    const p=profile.value,max=mine?.maxHp??sheetStats.hp,hp=mine?.hp??max,maxMp=mine?.maxMp??sheetStats.mp,mp=mine?.mp??maxMp;
    const key=[p.level,p.exp,hp,max,mp,maxMp].join('/');
    if(key===lastVitals)return;
    lastVitals=key;
    rank.textContent='Lv. '+p.level;
    hpText.textContent='HP '+hp+' / '+max;hpMeter.max=max;hpMeter.value=hp;
    mpText.textContent='MP '+mp+' / '+maxMp;mpMeter.max=maxMp;mpMeter.value=mp;
    const needed=expRequired(p.level);
    xpText.textContent='EXP '+p.exp+' / '+needed+' · '+(Math.floor(1000*p.exp/needed)/10)+'%';
    xpMeter.max=needed;xpMeter.value=p.exp;
    if(hp===0)notice(thai?'หมดสติ · กำลังกลับจุดเกิด':'Defeated · Returning to the landing');
  };
  const syncEquipment=()=>{
    network.setWeapon(profile.value.weapon??'');network.setBuild(profile.value);
    if(!profile.value.weapon && (auto || (approach && wildlife?.targets.has(approach.id)))){
      stopMovement();selectedPlayer=undefined;setAuto(false);
    }
    updateHuntButton();
  };
  syncEquipment();profile.subscribe(syncEquipment);
  const modelStatus = document.createElement('div'); modelStatus.className = 'terrain-asset-status'; modelStatus.hidden = true;
  const modelStatusText = document.createElement('span'), modelRetry = document.createElement('button');
  modelStatusText.setAttribute('role', 'status'); modelRetry.type = 'button';
  modelRetry.textContent = thai ? 'ลองโหลดอีกครั้ง' : 'Retry models';
  modelRetry.onclick = () => failedModels.clear(); modelStatus.append(modelStatusText, modelRetry); host.append(modelStatus);
  const ensureRemoteModel = (character: NonNullable<ReturnType<typeof characterById>>) => {
    if (pendingModels.has(character.model) || failedModels.has(character.model)) return;
    pendingModels.add(character.model);
    void characters.ensure(character).catch(() => { if (!disposed) failedModels.add(character.model); })
      .finally(() => pendingModels.delete(character.model));
  };
  const syncView = (delta: number) => {
    if(auto){
      const target=network.players.get(network.room?.sessionId??'')?.huntTarget || undefined;
      selectedPlayer=target;
      if(approach?.id!==target)approach=target?{id:target,sentAt:-Infinity}:undefined;
    }
    prediction.update(delta);
    for (const [id, view] of views) if (!network.players.has(id)) {
      view.highlight.dispose(); view.avatar.dispose(); view.label.remove(); views.delete(id);
    }
    let missingModel = false, failedModel = false;
    for (const [id, player] of network.players) {
      const character = characterById(player.characterId); if (!character) continue;
      const factory = characters.get(character);
      if (!factory) { missingModel = true; failedModel ||= failedModels.has(character.model); ensureRemoteModel(character); continue; }
      const mine = id === network.room?.sessionId;
      let view = views.get(id);
      if (!view) {
        const avatar = factory.create(mine, character.hairStyle, player.hairColor), mesh = avatar.group, name = document.createElement('span');
        mesh.rotation.y = player.heading;
        mesh.position.set(player.x, player.y, player.z); scene.add(mesh);viewDistance.materials(mesh);
        name.className = 'world-player-name'; name.dataset.playerId = id; name.dataset.mine = String(mine);
        name.textContent = player.name + (mine ? (thai ? ' · คุณ' : ' · You') : '');
        host.append(name); view = { mesh, avatar,swing:player.swing??0,swingStart:player.swingStartedAt??0, label: name, highlight: createPlayerHighlight(mesh) }; views.set(id, view);
      }
      view.avatar.setHairStyle(player.hairStyle);
      const item=(mine ? profile.value.weapon : player.weapon) || undefined;
      const weapon=weaponsFor(character.model as Job).find(id=>id===item);
      if(weapon!==view.weapon){
        if(weapon && !weaponAssets.has(weapon)){
          missingModel=true;failedModel ||= failedModels.has(weapon);
          if(!pendingModels.has(weapon) && !failedModels.has(weapon)){
            pendingModels.add(weapon);
            void characters.loadWeapon(weapon).then(asset=>{if(!disposed)weaponAssets.set(weapon,asset);})
              .catch(()=>{if(!disposed)failedModels.add(weapon);}).finally(()=>pendingModels.delete(weapon));
          }
        }else{
          view.highlight.dispose();
          view.avatar.setWeapon(weapon,weapon && weaponAssets.get(weapon));viewDistance.materials(view.mesh);
          view.weapon=weapon;view.highlight=createPlayerHighlight(view.mesh);
        }
      }
      view.avatar.setLighting(daylight.paintedBrightness);
      // Predict our own input immediately; other players interpolate authoritative snapshots.
      const point = mine && prediction.ready ? prediction.position : player;
      const alpha = mine || !player.moving ? 1 : 1 - Math.exp(-Math.min(delta, .1) / .045);
      view.mesh.position.x += (point.x - view.mesh.position.x) * alpha;
      view.mesh.position.z += (point.z - view.mesh.position.z) * alpha;
      view.mesh.position.y = terrainHeight(data, view.mesh.position.x, view.mesh.position.z);
      const movement = mine && prediction.ready ? prediction.movement : player;
      const serverTime=Date.now()/1000+network.clockOffset;
      const interval=mine?attackInterval(sheetStats.attackSpeed):(player.attackInterval??1);
      const duration=swingDuration(interval);
      if(player.swing!==undefined && player.swing!==view.swing){
        view.swing=player.swing;
        view.swingStart=player.swingStartedAt||serverTime;
        if(mine && approach?.id===player.hitTarget)
          recoverUntil=performance.now()+1000*Math.max(0,view.swingStart+duration-serverTime);
      }
      const opponent=mine && approach ? wildlife?.targets.get(approach.id) : undefined;
      const inReach=opponent?.alive && Math.hypot(point.x-opponent.position.x,point.z-opponent.position.z)<=weaponRange(view.weapon??null).reach;
      let start=view.swingStart;
      const confirmed=!!player.hitTarget && (!mine || approach?.id===player.hitTarget);
      if(mine && opponent && approach){
        if(!inReach || !view.weapon || !player.hp || movement.moving)approach.firstStroke=undefined;
        else if(approach.firstStroke===undefined && prediction.movement.clearLine(point,opponent.position))
          approach.firstStroke=confirmed && serverTime-view.swingStart<duration ? view.swingStart : Math.max(serverTime,view.swingStart+interval);
        if(approach.firstStroke!==undefined && (!confirmed || start<approach.firstStroke))
          start=approach.firstStroke;
      }
      const opening=mine && approach?.firstStroke===start;
      const elapsed=serverTime-start;
      // Sample the stroke between 50 ms server patches, including multiple swings per patch.
      const continuing=!!player.hitTarget && (network.monsters?.get(player.hitTarget)?.hp??0)>0;
      const striking=!!view.weapon && !!player.hp && elapsed>=0 && (mine?!movement.moving:!player.moving)
        && (opening || confirmed) && (!mine || inReach)
        && (elapsed<duration || ((opening || continuing) && elapsed<.1 && interval<=.1));
      const enemy=striking?(opponent??wildlife?.targets.get(player.hitTarget??'')):undefined;
      const heading=enemy?Math.atan2(enemy.position.x-point.x,enemy.position.z-point.z):movement.heading;
      view.mesh.rotation.y = turnTowards(view.mesh.rotation.y,heading,Math.min(delta,.05));
      if(striking)view.avatar.strike(Math.min(1,(elapsed%interval)/duration));
      else view.avatar.update(delta, (movement.moving || (mine && prediction.settling)) && !movement.turning,
        mine && prediction.ready ? prediction.movement.speedLevel : player.speedLevel);
      if (mine) {
        focus.copy(view.mesh.position);
        const destination = prediction.destination;
        marker.visible = !!destination && !selectedPlayer && !!markedPoint &&
          Math.hypot(destination.x-markedPoint.x,destination.z-markedPoint.z)<.01;
      }
    }
    modelStatus.hidden = !missingModel; modelRetry.hidden = !failedModel;
    initialModelsReady=!missingModel && !!views.get(network.room?.sessionId??'');
    if(!revealed && failedModel)rejectReady(new Error('Character model failed to load'));
    const loadingMessage = failedModel ? (thai ? 'โหลดตัวละครผู้เล่นอื่นไม่สำเร็จ' : 'Could not load another character')
      : (thai ? 'กำลังโหลดตัวละครผู้เล่นอื่น…' : 'Loading other characters…');
    if (modelStatusText.textContent !== loadingMessage) modelStatusText.textContent = loadingMessage;
    orbit.update(focus);
    if (elra) {
    elra.update(delta);
    elraScreen.copy(elra.group.position); elraScreen.y += 3.25; elraScreen.project(camera);
    elraLabel.hidden = !network.connected || Math.abs(elraScreen.x)>1 || Math.abs(elraScreen.y)>1 || Math.abs(elraScreen.z)>1;
    if (!elraLabel.hidden) {
      elraLabel.style.left = ((elraScreen.x+1)*width/2)+'px';
      elraLabel.style.top = ((1-elraScreen.y)*height/2)+'px';
    }
    }
    const mine=network.players.get(network.room?.sessionId??'');
    updateVitals(mine);
    if(wildlife && network.monsters){
      for(const [id,animal] of wildlife.targets){
        animal.combat=network.monsters.get(id);animal.alive=(animal.combat?.hp??1)>0;
      }
      if(selectedPlayer && (wildlife.targets.get(selectedPlayer)?.alive===false || mine?.hp===0)){
        selectedPlayer=undefined;if(!auto)stopMovement();
      }
    }
    wildlife?.update(Date.now()/1000+network.clockOffset,Math.min(delta,.1),focus,camera,(kind,position)=>impacts.step(kind,position,focus));
    feedback.update(camera);
    projectiles.update(Date.now()/1000+network.clockOffset);
    impacts.update(camera,focus);
    const target=selectedPlayer ? wildlife?.targets.get(selectedPlayer) : undefined;
    wildlife?.showSelection(network.connected ? target : undefined,width,height);
    if(!target || !network.connected)targetLabel.hidden=true;
    if(target && network.connected){
      targetScreen.copy(target.position);targetScreen.y+=target.height+.85;targetScreen.project(camera);
      targetLabel.hidden=Math.max(Math.abs(targetScreen.x),Math.abs(targetScreen.y),Math.abs(targetScreen.z))>1;
      const spec=monsters[target.kind],hp=network.monsters?.get(selectedPlayer!)?.hp??spec.hp;
      const caption='Lv. '+spec.level+' '+(thai?target.th:target.en)+' · '+hp+'/'+spec.hp;
      if(mobName.textContent!==caption){mobName.textContent=caption;mobHp.max=spec.hp;mobHp.value=hp;}
      targetLabel.style.left=((targetScreen.x+1)*width/2)+'px';
      targetLabel.style.top=((1-targetScreen.y)*height/2)+'px';
    }
    const wave=(1+Math.sin(performance.now()*.0025))*.5;
    warp.children[1].position.y=reducedMotion.matches ? .1 : .1+wave*.65;
    warpScreen.copy(warp.position); warpScreen.y+=2; warpScreen.project(camera);
    warpLabel.hidden=!network.connected || focus.distanceToSquared(warp.position)>70**2 ||
      Math.max(Math.abs(warpScreen.x),Math.abs(warpScreen.y),Math.abs(warpScreen.z))>1;
    if(!warpLabel.hidden){
      warpLabel.style.left=((warpScreen.x+1)*width/2)+'px';
      warpLabel.style.top=((1-warpScreen.y)*height/2)+'px';
    }
    for (const view of views.values()) {
      view.mesh.visible=view.mesh.position.distanceToSquared(focus)<VIEW_DISTANCE**2;
      const p = view.mesh.position.clone(); p.y += 3.3; p.project(camera);
      view.label.hidden = !view.mesh.visible || p.z < -1 || p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1;
      view.label.style.left = ((p.x + 1) / 2 * width) + 'px';
      view.label.style.top = ((1 - p.y) / 2 * height) + 'px';
    }
    const now = performance.now();
    if (now - minimapUpdatedAt >= 100) {
      if(field)showRange();
      minimap.update(network.players, network.room?.sessionId, orbit.footprint(),wildlife?.targets,selectedPlayer);
      minimapUpdatedAt = now;
    }
  };
  let width=1,height=1;
  const resize = () => {
    width = Math.max(1, host.clientWidth); height = Math.max(1, host.clientHeight);
    orbit.resize(width, height); renderer.setSize(width, height);
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const hitVolume=new THREE.Sphere(), hitPoint=new THREE.Vector3();
  const bodyBase=new THREE.Vector3(),bodyTop=new THREE.Vector3();
  const aimPointer = (x: number, y: number) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.set((x - bounds.left) / bounds.width * 2 - 1, 1 - (y - bounds.top) / bounds.height * 2);
    raycaster.setFromCamera(pointer, camera);
  };
  const pickPlayer = () => {
    const surfaces: THREE.Mesh[] = [];
    const owners = new Map<THREE.Object3D, string>();
    let closest=Infinity,id:string|undefined;
    for (const [playerId, view] of views) {
      if(field){
        bodyBase.copy(view.mesh.position);bodyBase.y+=.55;
        bodyTop.copy(bodyBase);bodyTop.y+=1.75;
        const distanceSq=raycaster.ray.distanceSqToSegment(bodyBase,bodyTop,hitPoint);
        if(distanceSq<.55**2){
          const depth=hitPoint.distanceTo(raycaster.ray.origin)-Math.sqrt(.55**2-distanceSq);
          if(depth<closest){closest=depth;id=playerId;}
        }
        continue;
      }
      // Skinning and intersecting the full avatar is only needed near its body.
      hitVolume.center.copy(view.mesh.position);hitVolume.center.y+=1.5;hitVolume.radius=4;
      if(!raycaster.ray.intersectsSphere(hitVolume))continue;
      view.mesh.updateWorldMatrix(true, true);
      for (const surface of view.highlight.surfaces) {
        if (!surface.visible) continue;
        surfaces.push(surface); owners.set(surface, playerId);
      }
    }
    for (const surface of elra?.highlight.surfaces ?? []) {
      surfaces.push(surface); owners.set(surface,ELRA_ID);
    }
    const hit = raycaster.intersectObjects(surfaces, false)[0];
    if(hit && hit.distance<closest){closest=hit.distance;id=owners.get(hit.object);}
    // A forgiving body-sized hit volume remains selectable between hop poses.
    if(wildlife) for(const [animalId,a] of wildlife.targets){
      if(!a.alive || !a.model) continue;
      hitVolume.center.copy(a.position);hitVolume.center.y+=a.height*.62;hitVolume.radius=a.height*.9;
      if(raycaster.ray.intersectSphere(hitVolume,hitPoint)){
        const distance=hitPoint.distanceTo(raycaster.ray.origin);
        if(distance<closest){closest=distance;id=animalId;}
      }
    }
    return id;
  };
  let nextHoverPick=0;
  const updateHighlights = () => {
    if (selectedPlayer && selectedPlayer !== ELRA_ID && !views.has(selectedPlayer) && !wildlife?.targets.has(selectedPlayer)) selectedPlayer = undefined;
    if(orbitPress || !hoverPoint)hoveredPlayer=undefined;
    else if(performance.now()>=nextHoverPick){
      nextHoverPick=performance.now()+50;
      hoveredPlayer=undefined;
      if(document.elementFromPoint(hoverPoint.x,hoverPoint.y)===canvas){
        aimPointer(hoverPoint.x,hoverPoint.y);hoveredPlayer=pickPlayer();
      }
    }
    if (hoveredPlayer) canvas.dataset.playerHover = 'true'; else delete canvas.dataset.playerHover;
    elra?.highlight.update(hoveredPlayer === ELRA_ID,selectedPlayer === ELRA_ID,width,height);
    for (const [id, view] of views) view.highlight.update(id === hoveredPlayer, id === selectedPlayer, width, height);
  };
  let orbitPress: { id: number; x: number; y: number } | undefined;
  const pointermove = (event: PointerEvent) => {
    if (orbitPress?.id === event.pointerId) {
      if (!(event.buttons & 2)) { cancelPress(); return; }
      orbit.drag(event.clientX - orbitPress.x, event.clientY - orbitPress.y);
      orbitPress.x = event.clientX; orbitPress.y = event.clientY;
      minimapUpdatedAt = -Infinity; event.preventDefault(); return;
    }
    if (event.pointerType !== 'touch') hoverPoint = { x: event.clientX, y: event.clientY };
  };
  const pointerleave = () => { hoverPoint = undefined; hoveredPlayer = undefined; delete canvas.dataset.playerHover; };
  let press: { id: number; x: number; y: number; player?: string; target?: WalkHit } | undefined;
  const updateApproach = (force = false) => {
    if (auto || !approach) return;
    const animal=wildlife?.targets.get(approach.id);
    const other = approach.id === ELRA_ID ? elra?.group.position : animal?.position ?? network.players.get(approach.id);
    if (!other || !network.connected) { stopMovement(); selectedPlayer = undefined; return; }
    const position = prediction.position;
    if (animal) {
      if(!withinHunt(animal.position)){stopMovement();selectedPlayer=undefined;return;}
      if(performance.now()<recoverUntil)return;
      const destination=animal.position;
      const command=approach.lastTarget;
      const gap=Math.hypot(position.x-animal.position.x,position.z-animal.position.z);
      const range=weaponRange(profile.value.weapon), moving=prediction.movement.moving;
      if(gap<=(moving?range.settle:range.reach)
        && prediction.movement.clearLine(position,animal.position)){
        // A predicted footstep can lead the server. Let the existing route finish closing
        // that gap before sending a stop, or the acknowledged position may be out of reach.
        const mine=network.players.get(network.room!.sessionId);
        if(moving && mine && Math.hypot(mine.x-animal.position.x,mine.z-animal.position.z)<=range.reach
          && prediction.movement.clearLine(mine,animal.position)){
          prediction.stop(network.nextInputSeq);network.stop();
        }
        return;
      }
      // Keep following the current corridor until the target has moved meaningfully.
      if(!force && command && (prediction.awaitingRoute || (moving &&
        Math.hypot(command.x-destination.x,command.z-destination.z)<Math.max(.9,Math.min(5,gap*.12)))))return;
      const now=performance.now();
      if(!force && now-approach.sentAt<120) return;
      approach.sentAt=now;
      const point=playerApproachPoint(prediction.movement,destination,range.approach);
      if(point && !moving && Math.hypot(point.x-prediction.movement.position.x,point.z-prediction.movement.position.z)<.02)return;
      if(point && prediction.move(network.nextInputSeq,point.x,point.z,true)){
        approach.lastTarget={x:destination.x,z:destination.z};
        hint.hidden=true; network.move(point.x,point.z);
      }
      return;
    }
    if (Math.hypot(position.x - other.x, position.z - other.z) <= PLAYER_APPROACH_DISTANCE + .05) {
      const destination = prediction.movement.destination;
      if (destination && Math.hypot(destination.x - other.x, destination.z - other.z) > PLAYER_APPROACH_DISTANCE + .05) {
        // A target moved into range: finish at our predicted safe position. A stop
        // message here would halt the server early because prediction runs ahead.
        const point = { ...prediction.movement.position };
        if (prediction.move(network.nextInputSeq, point.x, point.z)) network.move(point.x, point.z);
      }
      if (!prediction.movement.moving && !network.players.get(network.room!.sessionId)?.moving) {
        if (approach.id === ELRA_ID) elra?.greet();
        approach = undefined;
      }
      return;
    }
    const now = performance.now();
    if (!force && now - approach.sentAt < 150) return;
    const previous = approach.lastTarget;
    if (!force && previous && Math.hypot(previous.x - other.x, previous.z - other.z) < .35
      && (prediction.movement.moving || network.players.get(network.room!.sessionId)?.moving)) return;
    const point = playerApproachPoint(prediction.movement, other);
    if (!point || !prediction.move(network.nextInputSeq, point.x, point.z)) {
      stopMovement(); rejected(); return;
    }
    approach.lastTarget = { x: other.x, z: other.z }; approach.sentAt = now;
    hint.hidden = true; network.move(point.x, point.z);
  };
  const selectPlayer = (id: string) => {
    if (id === network.room?.sessionId || (id !== ELRA_ID && !views.has(id) && !wildlife?.targets.has(id))) return;
    setPortalTravel(false);
    const monster=wildlife?.targets.has(id);
    if(monster && !profile.value.weapon){
      stopMovement();selectedPlayer=id;notice(weaponHint);return;
    }
    if(approach?.id===id)return;
    if(auto)setAuto(false);
    network.fight(monster?id:'');
    if(monster && !network.monsters)notice(thai?'ห้องนี้ใช้เซิร์ฟเวอร์รุ่นก่อนระบบต่อสู้':'Combat requires the updated game server');
    selectedPlayer = id; approach = { id, sentAt: -Infinity }; updateApproach(true);
  };
  const moveToPoint = ({point,normal}: WalkHit,serverDetour=field) => {
    setPortalTravel(false);
    if(auto)setAuto(false);
    if(approach || selectedPlayer)network.fight('');
    selectedPlayer = undefined; approach = undefined;
    if (prediction.move(network.nextInputSeq, point.x, point.z,serverDetour)) {
      markedPoint = point;
      marker.position.copy(point).addScaledVector(normal,.09);
      marker.quaternion.setFromUnitVectors(ringNormal,normal);
      hint.hidden = true; network.move(point.x, point.z);
      return true;
    } else {rejected();return false;}
  };
  minimap.travelButton.onclick=()=>{
    if(portalTravel){stopMovement();return;}
    if(!onWarp || lost || !network.connected || !prediction.ready || !network.players.get(network.room?.sessionId??'')?.hp)return;
    stopMovement();
    // Reuse authoritative pathfinding, bridge clearance and the existing arrival warp.
    const point=new THREE.Vector3(portal.x,terrainHeight(data,portal.x,portal.z),portal.z);
    if(moveToPoint({point,normal:new THREE.Vector3(0,1,0)},true))setPortalTravel(true);
  };
  const pointerdown = (event: PointerEvent) => {
    if (event.button === 2 && event.isPrimary && !lost) {
      event.preventDefault(); press = undefined; hoverPoint = undefined;
      orbitPress = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId); canvas.dataset.orbiting = 'true';
      canvas.focus({ preventScroll: true }); return;
    }
    if (orbitPress) return;
    if (event.button !== 0 || !event.isPrimary || lost || !revealed || !network.connected || network.players.get(network.room?.sessionId??'')?.hp===0) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    // Pick the ground the player actually pressed, before the following camera moves.
    aimPointer(event.clientX, event.clientY);
    const player = pickPlayer();
    const floor = player ? undefined : pickGround(raycaster.ray);
    const surface = player ? undefined : fortifications.pickWalkSurface(raycaster);
    const eye = raycaster.ray.origin;
    const target = surface && (!floor || eye.distanceToSquared(surface.point) < eye.distanceToSquared(floor.point)) ? surface : floor;
    if (event.pointerType !== 'touch') {
      // Mouse/pen presses are commands, not drag candidates. Moving the hand before
      // release must never cancel a direction change or wait for the next click.
      press = undefined;
      if (player) selectPlayer(player); else if (target) moveToPoint(target);
      return;
    }
    // Touch still distinguishes a tap from a swipe.
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, player, target };
    canvas.setPointerCapture(event.pointerId);
  };
  const pointerup = (event: PointerEvent) => {
    if (orbitPress?.id === event.pointerId && event.button === 2) { cancelPress(); return; }
    const start = press; press = undefined;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (!start || start.id !== event.pointerId || event.button !== 0 || lost || !network.connected
      || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) return;
    if (start.player) selectPlayer(start.player); else if (start.target) moveToPoint(start.target);
  };
  const cancelPress = () => {
    const id = orbitPress?.id ?? press?.id;
    press = undefined; orbitPress = undefined; delete canvas.dataset.orbiting;
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  };
  const contextmenu = (event: Event) => event.preventDefault();
  canvas.addEventListener('pointerdown', pointerdown); canvas.addEventListener('pointerup', pointerup);
  canvas.addEventListener('pointermove', pointermove); canvas.addEventListener('pointerleave', pointerleave);
  canvas.addEventListener('pointercancel', cancelPress); canvas.addEventListener('lostpointercapture', cancelPress);
  canvas.addEventListener('contextmenu', contextmenu);
  const startedAt = performance.now(); let previousFrame = startedAt;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animate = () => {
    if (disposed || lost || document.hidden) return;
    const now = performance.now(), delta = (now - previousFrame) / 1000; previousFrame = now;
    syncView(delta);
    const mine=network.players.get(network.room?.sessionId ?? '');
    minimap.travelButton.disabled=!revealed || !network.connected || !prediction.ready || !mine?.hp;
    if(portalTravel && !mine?.hp)setPortalTravel(false);
    if(revealed && onWarp && mine && Math.hypot(mine.x-portal.x,mine.z-portal.z)<=PORTAL_RADIUS) {
      onWarp(field?'city':'west-march'); return;
    }
    updateApproach();
    routeLights.update(reducedMotion.matches?0:(now-startedAt)/1000,renderer.getPixelRatio());
    updateHighlights();
    if (!hint.hidden && now >= hintUntil) hint.hidden = true;
    water.update(reducedMotion.matches ? 0 : (now - startedAt) / 1000);
    bankGrass.update(camera, network.connected ? focus : undefined, reducedMotion.matches ? 0 : (now - startedAt) / 1000);
    groves.update(camera, network.connected ? focus : undefined, reducedMotion.matches ? 0 : (now - startedAt) / 1000);
    if(network.connected)fortifications.update(camera,focus,reducedMotion.matches ? 0 : (now-startedAt)/1000);
    daylight.update(camera, focus,environmentSettings.automatic?network.serverNow:undefined);
    environmentSettings.update(daylight.inspect().hour);
    if(network.connected)buildings.update(camera,focus,daylight.paintedBrightness,reducedMotion.matches ? 0 : (now-startedAt)/1000);
    viewDistance.update(focus);
    renderer.render(scene, camera); canvas.dataset.ready = 'true'; frame = requestAnimationFrame(animate);
    if(network.connected && network.clockReady && !readySent){
      onLoad('session');
      if(initialModelsReady && prediction.ready){
        onLoad('avatar');
        if(!gpuPrepared && !compiling){
          compiling=true;
          void renderer.compileAsync(scene,camera).then(()=>{
            if(!disposed){gpuPrepared=true;onLoad('gpu');}
          }).catch(error=>{if(!disposed)rejectReady(error);});
        }else if(gpuPrepared){readySent=true;network.readyForScene();}
      }
    }
  };
  const stopMovement = () => { setPortalTravel(false);network.fight('');approach = undefined; prediction.stop(network.nextInputSeq); network.stop(); marker.visible = false; };
  network.combatBlocked=id=>{
    if(auto)return; // Server auto hunting immediately searches for an eligible target instead.
    if(approach?.id!==id)return;
    stopMovement();selectedPlayer=undefined;
    notice(thai?'มีผู้เล่นอื่นกำลังต่อสู้กับมอนสเตอร์ตัวนี้':'Another player is fighting this monster');
  };
  const stop = () => { cancelAnimationFrame(frame); cancelPress(); stopMovement(); };
  const contextLost = (event: Event) => {
    event.preventDefault(); lost = true; stop(); status.hidden = false;
    status.textContent = thai ? 'กำลังกู้คืนภาพสามมิติ…' : 'Restoring the 3D view…';
  };
  const contextRestored = () => { lost = false; sun.shadow.needsUpdate = true; status.hidden = true; previousFrame = performance.now(); animate(); };
  const visibility = () => {
    cancelAnimationFrame(frame);cancelPress();pointerleave();
    if(!document.hidden){
      // Re-enter at the latest authoritative location, not the old hidden-tab drawing position.
      const mine=network.players.get(network.room?.sessionId??'');
      prediction.reset();if(mine)prediction.accept(mine);
      previousFrame=performance.now();animate();
    }
  };
  const blur = () => { cancelPress(); pointerleave(); };
  const portrait=createEquipmentPortrait(characterById(characterId)!,characters,thai,hairColor);
  const journal=mountCharacterPanels(host.parentElement!,profile,job,thai,portrait);
  host.addEventListener('mythraven:settings-open', blur);
  canvas.addEventListener('webglcontextlost', contextLost); canvas.addEventListener('webglcontextrestored', contextRestored);
  document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', blur);
  const destroy = () => {
    if (disposed) return; disposed = true; stop(); network.dispose(); observer.disconnect();
    if(!revealed)rejectReady(new Error('Map loading cancelled'));
    journal.destroy();profile.destroy();
    canvas.removeEventListener('pointerdown', pointerdown); canvas.removeEventListener('pointerup', pointerup);
    canvas.removeEventListener('pointermove', pointermove); canvas.removeEventListener('pointerleave', pointerleave);
    canvas.removeEventListener('pointercancel', cancelPress); canvas.removeEventListener('lostpointercapture', cancelPress);
    canvas.removeEventListener('contextmenu', contextmenu);
    canvas.removeEventListener('webglcontextlost', contextLost); canvas.removeEventListener('webglcontextrestored', contextRestored);
    document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); window.removeEventListener('pagehide', pagehide);
    host.removeEventListener('mythraven:settings-open', blur); speedControl.remove(); canvas.removeEventListener('wheel',wheelZoom); environmentSettings.destroy();
    window.removeEventListener('keydown',huntShortcut);
    routeLights.dispose();huntRing.removeFromParent();ringGeometry.dispose();huntRing.material.dispose();huntControls.remove();huntPanel.remove();
    projectiles.destroy();impacts.destroy();feedback.destroy();controls.remove();vitals.remove();targetLabel.remove(); warpLabel.remove(); wildlife?.dispose(); elraLabel.remove(); elra?.dispose(); removeViews(); characters.dispose(); minimap.destroy(); bankGrass.dispose(); buildings.dispose(); fortifications.dispose(); groves.dispose(); daylight.dispose(); disposeObject(scene); tiles.dispose(); renderer.dispose(); renderer.forceContextLoss();
    canvas.remove(); modelStatus.remove(); status.remove(); hint.remove(); panel.remove(); delete host.dataset.renderer; delete host.dataset.terrainSize;
  };
  const pagehide = (event: PageTransitionEvent) => { if (!event.persisted) destroy(); };
  window.addEventListener('pagehide', pagehide);onLoad('scene'); animate(); void network.connect();
  return { destroy, ready, inspect: () => {
    const screen = focus.clone().project(camera), mine = network.players.get(network.room?.sessionId ?? '');
    return { player: { x: focus.x, y: focus.y, z: focus.z }, moving: prediction.movement.moving || prediction.settling || (mine?.moving ?? false),
      destination: prediction.destination ?? (mine?.moving ? { x: mine.targetX, z: mine.targetZ } : undefined),
      camera: camera.position.toArray(), rotation: camera.quaternion.toArray(), zoom: camera.zoom,
      orbit: orbit.inspect(), lighting: daylight.inspect(),
      hoveredPlayer, selectedPlayer,
      avatars: Object.fromEntries([...views].map(([id, view]) => [id, { ...view.avatar.inspect(), heading: view.mesh.rotation.y }])),
      turning: prediction.movement.turning, heading: prediction.movement.heading,
      screen: [(screen.x + 1) / 2 * width, (1 - screen.y) / 2 * height],
      id: network.room?.sessionId, room: network.room?.roomId, connected: network.connected, viewDistance:viewDistance.inspect(),
      players: Object.fromEntries(network.players), renderedPlayers: views.size, groves: groves.inspect(), fortifications:fortifications.inspect() };
  } };
}


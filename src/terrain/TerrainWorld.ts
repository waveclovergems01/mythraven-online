import {ELRA_ID,loadElra} from './elra';
import {buildWestMarch, mapPortal, PORTAL_RADIUS, type Area} from '../../shared/west-march.mjs';
import {loadFrontierWildlife} from './frontier-wildlife';
import {createGroundPicker} from './ground-picker';
import * as THREE from 'three';
import { locale } from '../i18n';
import { loadTerrainData, TERRAIN } from './terrain-data';
import { createTerrain, createWater } from './terrain-mesh';
import { TerrainMovement, terrainHeight } from './terrain-movement';
import { createCharacterAssets, type CharacterAssets, type PlayerAvatar } from './character-assets';
import { DEFAULT_CHARACTER_ID, characterById } from '../../shared/character-catalog.mjs';
import { createPlayerHighlight } from './player-highlight';
import { playerApproachPoint, PLAYER_APPROACH_DISTANCE } from './player-approach';
import { TerrainClient } from '../network/terrain-client';
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

type WalkHit = {point: THREE.Vector3; normal: THREE.Vector3};

export interface TerrainWorld {
  destroy: (removeCanvas?: boolean) => void;
  inspect?: () => any;
}

export async function mountTerrainWorld(host: HTMLElement, displayName = '', characterId = DEFAULT_CHARACTER_ID,
  preparedCharacters?: CharacterAssets, area: Area = 'city', fromWest = false,
  onWarp?: (area:Area)=>void): Promise<TerrainWorld> {
  const thai = locale() === 'th';
  const field = area === 'west-march';
  const data = field ? buildWestMarch() : await loadTerrainData();
  const portal = mapPortal(data);
  if (!host.isConnected) { preparedCharacters?.dispose(); return { destroy() {} }; }
  const tiles = await loadTerrainTiles();
  if (!host.isConnected) { preparedCharacters?.dispose(); tiles.dispose(); return { destroy() {} }; }
  let groves: Awaited<ReturnType<typeof loadCityTrees>>;
  try { groves = await loadCityTrees(data); } catch (error) { preparedCharacters?.dispose(); tiles.dispose(); throw error; }
  if (!host.isConnected) { preparedCharacters?.dispose(); groves.dispose(); tiles.dispose(); return { destroy() {} }; }
  let fortifications: Awaited<ReturnType<typeof loadCityFortifications>>;
  try { fortifications=await loadCityFortifications(data,tiles.cityStone); }
  catch(error){preparedCharacters?.dispose();groves.dispose();tiles.dispose();throw error;}
  if(!host.isConnected){preparedCharacters?.dispose();fortifications.dispose();groves.dispose();tiles.dispose();return {destroy(){}};}
  let buildings:Awaited<ReturnType<typeof loadCityBuildings>>;
  try{buildings=await loadCityBuildings(data);}catch(error){preparedCharacters?.dispose();fortifications.dispose();groves.dispose();tiles.dispose();throw error;}
  if(!host.isConnected){preparedCharacters?.dispose();buildings.dispose();fortifications.dispose();groves.dispose();tiles.dispose();return {destroy(){}};}
  const characters = preparedCharacters ?? createCharacterAssets();
  try {
    const chosen = characterById(characterId);
    if (!chosen) throw new Error('Unknown character');
    await characters.ensure(chosen);
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
  const water = createWater(data); scene.add(water.mesh);
  const bankGrass = createBankGrass(data); scene.add(bankGrass.group);
  const marker = new THREE.Mesh(new THREE.RingGeometry(.42, .56, 32),
    new THREE.MeshBasicMaterial({ color: '#f1d480', transparent: true, opacity: .9, depthWrite: false, side: THREE.DoubleSide }));
  // Blended bridge materials draw in the transparent pass. Draw the ring after
  // them while keeping depth testing so nearby rails and characters occlude it.
  marker.renderOrder = 1; marker.visible = false; scene.add(marker);
  const ringNormal = new THREE.Vector3(0, 0, 1);
  let markedPoint: THREE.Vector3 | undefined;
  const orbit = createOrbitCamera(data), camera = orbit.camera;
  const focus = new THREE.Vector3(navigation.spawn.x, navigation.height, navigation.spawn.z);
  const views = new Map<string, { mesh: THREE.Group; avatar: PlayerAvatar; label: HTMLSpanElement; highlight: ReturnType<typeof createPlayerHighlight> }>();
  let hoveredPlayer: string | undefined, selectedPlayer: string | undefined;
  let approach: { id: string; lastTarget?: { x: number; z: number }; sentAt: number } | undefined;
  let hoverPoint: { x: number; y: number } | undefined;
  const minimap = createTerrainMinimap(host, data, thai);
  let minimapUpdatedAt = -Infinity;
  const disposeObject = (object: THREE.Object3D) => object.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      (Array.isArray(child.material) ? child.material : [child.material]).forEach(material => material.dispose());
    }
  });
  const removeViews = () => {
    prediction.reset();
    for (const view of views.values()) { view.highlight.dispose(); view.avatar.dispose(); view.label.remove(); }
    views.clear(); markedPoint = undefined; marker.visible = false;
    hoveredPlayer = selectedPlayer = undefined; approach = undefined; hoverPoint = undefined; delete canvas.dataset.playerHover;
    minimap.update(new Map(), undefined, []);
  };

  let disposed = false, lost = false, frame = 0, hintUntil = 0;
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
    hint.textContent = thai ? 'เดินไปตรงนั้นไม่ได้' : 'That ground cannot be reached';
    hint.hidden = false; hintUntil = performance.now() + 1600;
  };
  const network = new TerrainClient(displayName, state => {
    if (disposed) return;
    panel.dataset.connected = String(state === 'online'); retry.hidden = state !== 'offline';
    speedSlider.disabled = state !== 'online';
    if (state === 'online') label.textContent = thai ? 'ออนไลน์ · ' + network.players.size + ' คน' : 'Online · ' + network.players.size + ' players';
    else {
      label.textContent = state === 'connecting' ? (thai ? 'กำลังเชื่อมต่อเมือง…' : 'Connecting to the city…')
        : (thai ? 'ขาดการเชื่อมต่อ' : 'Disconnected');
      removeViews();
    }
  }, rejected, player => prediction.accept(player), characterId, area, fromWest);
  speedSlider.oninput = () => { showSpeed(); network.setSpeedLevel(Number(speedSlider.value)); prediction.movement.setSpeedLevel(Number(speedSlider.value)); };
  retry.onclick = () => { void network.connect(); };
  host.querySelector('.loading')?.remove(); host.append(canvas, status, hint, panel);
  host.dataset.renderer = 'three'; host.dataset.terrainSize = String(TERRAIN.size);
  host.dataset.area=area;
  const footer = host.parentElement?.querySelector('.game-footer');
  if (footer) {
    footer.children[0].textContent = thai ? 'คลิกซ้ายเพื่อเดิน · ลากคลิกขวาเพื่อหมุนกล้อง · หมุนล้อเมาส์เพื่อซูม' : 'Left-click to walk · Right-drag to orbit · Scroll to zoom';
    footer.children[1].textContent = thai ? 'เมืองออนไลน์ · ผู้เล่นร่วมฉาก' : 'Online city · Shared world';
    if(field) footer.children[1].textContent=thai?'ทุ่งชายแดนตะวันตก':'West March';
  }
  const pendingModels = new Set<string>(), failedModels = new Set<string>();
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
        const avatar = factory.create(mine, character.hairStyle), mesh = avatar.group, name = document.createElement('span');
        mesh.rotation.y = player.heading;
        mesh.position.set(player.x, player.y, player.z); scene.add(mesh);
        name.className = 'world-player-name'; name.dataset.playerId = id; name.dataset.mine = String(mine);
        name.textContent = player.name + (mine ? (thai ? ' · คุณ' : ' · You') : '');
        host.append(name); view = { mesh, avatar, label: name, highlight: createPlayerHighlight(mesh) }; views.set(id, view);
      }
      view.avatar.setHairStyle(player.hairStyle);
      view.avatar.setLighting(daylight.paintedBrightness);
      // Predict our own input immediately; other players interpolate authoritative snapshots.
      const point = mine && prediction.ready ? prediction.position : player;
      const alpha = mine || !player.moving ? 1 : 1 - Math.exp(-Math.min(delta, .1) / .045);
      view.mesh.position.x += (point.x - view.mesh.position.x) * alpha;
      view.mesh.position.z += (point.z - view.mesh.position.z) * alpha;
      view.mesh.position.y = terrainHeight(data, view.mesh.position.x, view.mesh.position.z);
      const movement = mine && prediction.ready ? prediction.movement : player;
      view.mesh.rotation.y = turnTowards(view.mesh.rotation.y, movement.heading, Math.min(delta, .1));
      view.avatar.update(delta, movement.moving && !movement.turning,
        mine && prediction.ready ? prediction.movement.speedLevel : player.speedLevel);
      if (mine) {
        focus.copy(view.mesh.position);
        const destination = prediction.movement.destination;
        marker.visible = !!destination && !selectedPlayer && !!markedPoint &&
          Math.hypot(destination.x-markedPoint.x,destination.z-markedPoint.z)<.01;
      }
    }
    modelStatus.hidden = !missingModel; modelRetry.hidden = !failedModel;
    const loadingMessage = failedModel ? (thai ? 'โหลดตัวละครผู้เล่นอื่นไม่สำเร็จ' : 'Could not load another character')
      : (thai ? 'กำลังโหลดตัวละครผู้เล่นอื่น…' : 'Loading other characters…');
    if (modelStatusText.textContent !== loadingMessage) modelStatusText.textContent = loadingMessage;
    orbit.update(focus);
    if (elra) {
    elra.update(delta);
    elraScreen.copy(elra.group.position); elraScreen.y += 3.25; elraScreen.project(camera);
    elraLabel.hidden = !network.connected || Math.abs(elraScreen.x)>1 || Math.abs(elraScreen.y)>1 || Math.abs(elraScreen.z)>1;
    if (!elraLabel.hidden) {
      elraLabel.style.left = ((elraScreen.x+1)*host.clientWidth/2)+'px';
      elraLabel.style.top = ((1-elraScreen.y)*host.clientHeight/2)+'px';
    }
    }
    wildlife?.update(Date.now()/1000,Math.min(delta,.1),focus);
    const target=selectedPlayer ? wildlife?.targets.get(selectedPlayer) : undefined;
    wildlife?.showSelection(network.connected ? target : undefined,host.clientWidth,host.clientHeight);
    targetLabel.hidden=true;
    if(target && network.connected){
      targetScreen.copy(target.position);targetScreen.y+=target.height+.85;targetScreen.project(camera);
      targetLabel.hidden=Math.max(Math.abs(targetScreen.x),Math.abs(targetScreen.y),Math.abs(targetScreen.z))>1;
      targetLabel.textContent=thai?target.th:target.en;
      targetLabel.style.left=((targetScreen.x+1)*host.clientWidth/2)+'px';
      targetLabel.style.top=((1-targetScreen.y)*host.clientHeight/2)+'px';
    }
    const wave=(1+Math.sin(performance.now()*.0025))*.5;
    warp.children[1].position.y=reducedMotion.matches ? .1 : .1+wave*.65;
    warpScreen.copy(warp.position); warpScreen.y+=2; warpScreen.project(camera);
    warpLabel.hidden=!network.connected || focus.distanceToSquared(warp.position)>70**2 ||
      Math.max(Math.abs(warpScreen.x),Math.abs(warpScreen.y),Math.abs(warpScreen.z))>1;
    if(!warpLabel.hidden){
      warpLabel.style.left=((warpScreen.x+1)*host.clientWidth/2)+'px';
      warpLabel.style.top=((1-warpScreen.y)*host.clientHeight/2)+'px';
    }
    for (const view of views.values()) {
      const p = view.mesh.position.clone(); p.y += 3.3; p.project(camera);
      view.label.hidden = p.z < -1 || p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1;
      view.label.style.left = ((p.x + 1) / 2 * host.clientWidth) + 'px';
      view.label.style.top = ((1 - p.y) / 2 * host.clientHeight) + 'px';
    }
    const now = performance.now();
    if (now - minimapUpdatedAt >= 100) {
      minimap.update(network.players, network.room?.sessionId, orbit.footprint(),wildlife?.targets,selectedPlayer);
      minimapUpdatedAt = now;
    }
  };
  const resize = () => {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    orbit.resize(width, height); renderer.setSize(width, height);
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const hitVolume=new THREE.Sphere(), hitPoint=new THREE.Vector3();
  const aimPointer = (x: number, y: number) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.set((x - bounds.left) / bounds.width * 2 - 1, 1 - (y - bounds.top) / bounds.height * 2);
    raycaster.setFromCamera(pointer, camera);
  };
  const pickPlayer = () => {
    const surfaces: THREE.Mesh[] = [];
    const owners = new Map<THREE.Object3D, string>();
    for (const [id, view] of views) {
      view.mesh.updateWorldMatrix(true, true);
      for (const surface of view.highlight.surfaces) {
        if (!surface.visible) continue;
        surfaces.push(surface); owners.set(surface, id);
      }
    }
    for (const surface of elra?.highlight.surfaces ?? []) {
      surfaces.push(surface); owners.set(surface,ELRA_ID);
    }
    const hit = raycaster.intersectObjects(surfaces, false)[0];
    let closest=hit?.distance??Infinity, id=hit?owners.get(hit.object):undefined;
    // A forgiving body-sized hit volume remains selectable between hop poses.
    if(wildlife) for(const [animalId,a] of wildlife.targets){
      if(a.position.distanceToSquared(focus)>155**2) continue;
      hitVolume.center.copy(a.position);hitVolume.center.y+=a.height*.62;hitVolume.radius=a.height*.9;
      if(raycaster.ray.intersectSphere(hitVolume,hitPoint)){
        const distance=hitPoint.distanceTo(raycaster.ray.origin);
        if(distance<closest){closest=distance;id=animalId;}
      }
    }
    return id;
  };
  const updateHighlights = () => {
    if (selectedPlayer && selectedPlayer !== ELRA_ID && !views.has(selectedPlayer) && !wildlife?.targets.has(selectedPlayer)) selectedPlayer = undefined;
    hoveredPlayer = undefined;
    if (!orbitPress && hoverPoint && document.elementFromPoint(hoverPoint.x, hoverPoint.y) === canvas) {
      aimPointer(hoverPoint.x, hoverPoint.y); hoveredPlayer = pickPlayer();
    }
    if (hoveredPlayer) canvas.dataset.playerHover = 'true'; else delete canvas.dataset.playerHover;
    elra?.highlight.update(hoveredPlayer === ELRA_ID,selectedPlayer === ELRA_ID,host.clientWidth,host.clientHeight);
    for (const [id, view] of views) view.highlight.update(id === hoveredPlayer, id === selectedPlayer, host.clientWidth, host.clientHeight);
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
    if (!approach) return;
    const animal=wildlife?.targets.get(approach.id);
    const other = approach.id === ELRA_ID ? elra?.group.position : animal?.position ?? network.players.get(approach.id);
    if (!other || !network.connected) { stopMovement(); selectedPlayer = undefined; return; }
    const position = prediction.position;
    if (animal) {
      // Commit to one approach per patrol leg. Chasing the instantaneous body
      // position makes a fast player finish a succession of half-steps.
      const destination=animal.destination ?? animal.position, command=approach.lastTarget;
      if(!force && command?.x===destination.x && command.z===destination.z) return;
      const gap=Math.hypot(position.x-animal.position.x,position.z-animal.position.z);
      const startDistance=PLAYER_APPROACH_DISTANCE+(animal.destination ? 1.4 : .05);
      if(gap<=startDistance && !prediction.movement.moving) return;
      const now=performance.now();
      if(!force && now-approach.sentAt<120) return;
      approach.sentAt=now;
      const point=playerApproachPoint(prediction.movement,destination);
      if(point && prediction.move(network.nextInputSeq,point.x,point.z)){
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
    selectedPlayer = id; approach = { id, sentAt: -Infinity }; updateApproach(true);
  };
  const moveToPoint = ({point,normal}: WalkHit) => {
    selectedPlayer = undefined; approach = undefined;
    if (prediction.move(network.nextInputSeq, point.x, point.z)) {
      markedPoint = point;
      marker.position.copy(point).addScaledVector(normal,.09);
      marker.quaternion.setFromUnitVectors(ringNormal,normal);
      hint.hidden = true; network.move(point.x, point.z);
    } else rejected();
  };
  const pointerdown = (event: PointerEvent) => {
    if (event.button === 2 && event.isPrimary && !lost) {
      event.preventDefault(); press = undefined; hoverPoint = undefined;
      orbitPress = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId); canvas.dataset.orbiting = 'true';
      canvas.focus({ preventScroll: true }); return;
    }
    if (orbitPress) return;
    if (event.button !== 0 || !event.isPrimary || lost || !network.connected) return;
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
    if(onWarp && mine && Math.hypot(mine.x-portal.x,mine.z-portal.z)<=PORTAL_RADIUS) {
      onWarp(field?'city':'west-march'); return;
    }
    updateApproach();
    updateHighlights();
    if (!hint.hidden && now >= hintUntil) hint.hidden = true;
    water.update(reducedMotion.matches ? 0 : (now - startedAt) / 1000);
    bankGrass.update(camera, network.connected ? focus : undefined, reducedMotion.matches ? 0 : (now - startedAt) / 1000);
    groves.update(camera, network.connected ? focus : undefined, reducedMotion.matches ? 0 : (now - startedAt) / 1000);
    if(network.connected)fortifications.update(camera,focus,reducedMotion.matches ? 0 : (now-startedAt)/1000);
    daylight.update(camera, focus);
    if(network.connected)buildings.update(camera,focus,daylight.paintedBrightness,reducedMotion.matches ? 0 : (now-startedAt)/1000);
    renderer.render(scene, camera); canvas.dataset.ready = 'true'; frame = requestAnimationFrame(animate);
  };
  const stopMovement = () => { approach = undefined; prediction.stop(network.nextInputSeq); network.stop(); marker.visible = false; };
  const stop = () => { cancelAnimationFrame(frame); cancelPress(); stopMovement(); };
  const contextLost = (event: Event) => {
    event.preventDefault(); lost = true; stop(); status.hidden = false;
    status.textContent = thai ? 'กำลังกู้คืนภาพสามมิติ…' : 'Restoring the 3D view…';
  };
  const contextRestored = () => { lost = false; sun.shadow.needsUpdate = true; status.hidden = true; previousFrame = performance.now(); animate(); };
  const visibility = () => { stop(); if (!document.hidden) { previousFrame = performance.now(); animate(); } };
  const blur = () => { cancelPress(); pointerleave(); stopMovement(); };
  host.addEventListener('mythraven:settings-open', blur);
  canvas.addEventListener('webglcontextlost', contextLost); canvas.addEventListener('webglcontextrestored', contextRestored);
  document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', blur);
  const destroy = () => {
    if (disposed) return; disposed = true; stop(); network.dispose(); observer.disconnect();
    canvas.removeEventListener('pointerdown', pointerdown); canvas.removeEventListener('pointerup', pointerup);
    canvas.removeEventListener('pointermove', pointermove); canvas.removeEventListener('pointerleave', pointerleave);
    canvas.removeEventListener('pointercancel', cancelPress); canvas.removeEventListener('lostpointercapture', cancelPress);
    canvas.removeEventListener('contextmenu', contextmenu);
    canvas.removeEventListener('webglcontextlost', contextLost); canvas.removeEventListener('webglcontextrestored', contextRestored);
    document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); window.removeEventListener('pagehide', pagehide);
    host.removeEventListener('mythraven:settings-open', blur); speedControl.remove(); canvas.removeEventListener('wheel',wheelZoom); environmentSettings.destroy();
    targetLabel.remove(); warpLabel.remove(); wildlife?.dispose(); elraLabel.remove(); elra?.dispose(); removeViews(); characters.dispose(); minimap.destroy(); bankGrass.dispose(); buildings.dispose(); fortifications.dispose(); groves.dispose(); daylight.dispose(); disposeObject(scene); tiles.dispose(); renderer.dispose(); renderer.forceContextLoss();
    canvas.remove(); modelStatus.remove(); status.remove(); hint.remove(); panel.remove(); delete host.dataset.renderer; delete host.dataset.terrainSize;
  };
  const pagehide = (event: PageTransitionEvent) => { if (!event.persisted) destroy(); };
  window.addEventListener('pagehide', pagehide); animate(); void network.connect();
  return { destroy, inspect: () => {
    const screen = focus.clone().project(camera), mine = network.players.get(network.room?.sessionId ?? '');
    return { player: { x: focus.x, y: focus.y, z: focus.z }, moving: prediction.movement.moving || (mine?.moving ?? false),
      destination: prediction.movement.destination ?? (mine?.moving ? { x: mine.targetX, z: mine.targetZ } : undefined),
      camera: camera.position.toArray(), rotation: camera.quaternion.toArray(), zoom: camera.zoom,
      orbit: orbit.inspect(), lighting: daylight.inspect(),
      hoveredPlayer, selectedPlayer,
      avatars: Object.fromEntries([...views].map(([id, view]) => [id, { ...view.avatar.inspect(), heading: view.mesh.rotation.y }])),
      turning: prediction.movement.turning, heading: prediction.movement.heading,
      screen: [(screen.x + 1) / 2 * host.clientWidth, (1 - screen.y) / 2 * host.clientHeight],
      id: network.room?.sessionId, room: network.room?.roomId, connected: network.connected,
      players: Object.fromEntries(network.players), renderedPlayers: views.size, groves: groves.inspect(), fortifications:fortifications.inspect() };
  } };
}


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
import { loadRiversideOak } from './riverside-oak';
import { MAX_SPEED_LEVEL, DEFAULT_SPEED_LEVEL, speedMultiplier, turnTowards } from '../../shared/terrain-movement.mjs';
import './terrain.css';

export interface TerrainWorld {
  destroy: (removeCanvas?: boolean) => void;
  inspect?: () => any;
}

export async function mountTerrainWorld(host: HTMLElement, displayName = '', characterId = DEFAULT_CHARACTER_ID,
  preparedCharacters?: CharacterAssets): Promise<TerrainWorld> {
  const thai = locale() === 'th';
  const data = await loadTerrainData();
  if (!host.isConnected) { preparedCharacters?.dispose(); return { destroy() {} }; }
  const tiles = await loadTerrainTiles();
  if (!host.isConnected) { preparedCharacters?.dispose(); tiles.dispose(); return { destroy() {} }; }
  let oak: Awaited<ReturnType<typeof loadRiversideOak>>;
  try { oak = await loadRiversideOak(data); } catch(error) { preparedCharacters?.dispose(); tiles.dispose(); throw error; }
  if (!host.isConnected) { preparedCharacters?.dispose(); oak.dispose(); tiles.dispose(); return { destroy() {} }; }
  const characters = preparedCharacters ?? createCharacterAssets();
  try {
    const chosen = characterById(characterId);
    if (!chosen) throw new Error('Unknown character');
    await characters.ensure(chosen);
  } catch (error) { characters.dispose(); oak.dispose(); tiles.dispose(); throw error; }
  if (!host.isConnected) { characters.dispose(); oak.dispose(); tiles.dispose(); return { destroy() {} }; }
  const navigation = new TerrainMovement(data);
  const prediction = new TerrainPrediction(data);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement; canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', thai ? 'เมืองสามมิติ คลิกซ้ายบนพื้นเพื่อเดิน' : '3D town. Left-click the ground to walk.');
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#c3d2cd');
  scene.add(new THREE.HemisphereLight('#f2f5e6', '#718478', 2.15));
  const sun = new THREE.DirectionalLight('#fff0d0', 2.5); sun.position.set(-240, 360, -150); scene.add(sun);
  sun.position.add(oak.group.position); sun.target.position.copy(oak.group.position); scene.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-11,right:11,top:11,bottom:-11,near:1,far:800});
  sun.shadow.normalBias=.035; sun.shadow.bias=-.00008; sun.shadow.radius=2;
  sun.shadow.autoUpdate=false; sun.shadow.needsUpdate=true;
  scene.add(oak.group);
  const terrain = createTerrain(data, tiles); scene.add(terrain);
  const ground = terrain.getObjectByName('continuous-terrain')!;
  (ground as THREE.Mesh).receiveShadow = true;
  const water = createWater(data); scene.add(water.mesh);
  const bankGrass = createBankGrass(data); scene.add(bankGrass.group);
  const marker = new THREE.Mesh(new THREE.RingGeometry(.42, .56, 32),
    new THREE.MeshBasicMaterial({ color: '#f1d480', transparent: true, opacity: .9, depthWrite: false, side: THREE.DoubleSide }));
  marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);
  const camera = new THREE.OrthographicCamera(-30, 30, 20, -20, .1, 1200);
  const cameraOffset = new THREE.Vector3(0, 45, 55);
  const focus = new THREE.Vector3(navigation.spawn.x, navigation.height, navigation.spawn.z);
  const target = new THREE.Vector3();
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
    views.clear(); marker.visible = false;
    hoveredPlayer = selectedPlayer = undefined; approach = undefined; hoverPoint = undefined; delete canvas.dataset.playerHover;
    minimap.update(new Map(), undefined, { x: 0, z: 0, width: 0, depth: 0 });
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
  const zoomControl = document.createElement('div'); zoomControl.className = 'terrain-zoom settings-range';
  const zoomHeading = document.createElement('div'); zoomHeading.className = 'settings-range-heading';
  const zoomText = document.createElement('label'); zoomText.htmlFor = 'camera-zoom';
  zoomText.textContent = thai ? 'ซูมกล้อง' : 'Camera zoom';
  const zoomValue = document.createElement('output'); zoomValue.setAttribute('for', 'camera-zoom');
  const zoomSlider = document.createElement('input'); zoomSlider.type = 'range'; zoomSlider.id = 'camera-zoom';
  zoomSlider.min = '50'; zoomSlider.max = '200'; zoomSlider.step = '5'; zoomSlider.value = '100';
  const zoomEnds = document.createElement('div'); zoomEnds.className = 'settings-range-ends';
  const zoomOut = document.createElement('span'), zoomIn = document.createElement('span');
  zoomOut.textContent = thai ? 'ซูมออก' : 'Zoom out'; zoomIn.textContent = thai ? 'ซูมเข้า' : 'Zoom in';
  const resetZoom = document.createElement('button'); resetZoom.type = 'button'; resetZoom.className = 'settings-reset';
  resetZoom.textContent = thai ? 'ระยะเดิม' : 'Reset zoom';
  const updateZoom = () => {
    camera.zoom = Number(zoomSlider.value) / 100; camera.updateProjectionMatrix();
    zoomValue.textContent = `${zoomSlider.value}%`;
    zoomSlider.setAttribute('aria-valuetext', `${zoomSlider.value}%`);
    minimapUpdatedAt = -Infinity;
  };
  zoomSlider.oninput = updateZoom;
  resetZoom.onclick = () => { zoomSlider.value = '100'; updateZoom(); };
  zoomHeading.append(zoomText, zoomValue); zoomEnds.append(zoomOut, resetZoom, zoomIn);
  zoomControl.append(zoomHeading, zoomSlider, zoomEnds); settingsControls.append(zoomControl); updateZoom();
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
  }, rejected, player => prediction.accept(player), characterId);
  speedSlider.oninput = () => { showSpeed(); network.setSpeedLevel(Number(speedSlider.value)); prediction.movement.setSpeedLevel(Number(speedSlider.value)); };
  retry.onclick = () => { void network.connect(); };
  host.querySelector('.loading')?.remove(); host.append(canvas, status, hint, panel);
  host.dataset.renderer = 'three'; host.dataset.terrainSize = String(TERRAIN.size);
  const footer = host.parentElement?.querySelector('.game-footer');
  if (footer) {
    footer.children[0].textContent = thai ? 'คลิกซ้ายบนพื้นเพื่อเดิน · กล้องติดตามตัวละคร' : 'Left-click the ground to walk · Camera follows your character';
    footer.children[1].textContent = thai ? 'เมืองออนไลน์ · ผู้เล่นร่วมฉาก' : 'Online city · Shared world';
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
        marker.visible = !!destination;
        if (destination) marker.position.set(destination.x, terrainHeight(data, destination.x, destination.z) + .09, destination.z);
      }
    }
    modelStatus.hidden = !missingModel; modelRetry.hidden = !failedModel;
    const loadingMessage = failedModel ? (thai ? 'โหลดตัวละครผู้เล่นอื่นไม่สำเร็จ' : 'Could not load another character')
      : (thai ? 'กำลังโหลดตัวละครผู้เล่นอื่น…' : 'Loading other characters…');
    if (modelStatusText.textContent !== loadingMessage) modelStatusText.textContent = loadingMessage;
    target.copy(focus); target.y += 1;
    camera.position.copy(target).add(cameraOffset); camera.lookAt(target); camera.updateMatrixWorld();
    for (const view of views.values()) {
      const p = view.mesh.position.clone(); p.y += 3.3; p.project(camera);
      view.label.hidden = p.z < -1 || p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1;
      view.label.style.left = ((p.x + 1) / 2 * host.clientWidth) + 'px';
      view.label.style.top = ((1 - p.y) / 2 * host.clientHeight) + 'px';
    }
    const now = performance.now();
    if (now - minimapUpdatedAt >= 100) {
      minimap.update(network.players, network.room?.sessionId, {
        x: focus.x, z: focus.z + cameraOffset.z / cameraOffset.y,
        width: (camera.right - camera.left) / camera.zoom,
        depth: (camera.top - camera.bottom) / camera.zoom * cameraOffset.length() / cameraOffset.y,
      });
      minimapUpdatedAt = now;
    }
  };
  const resize = () => {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    const aspect = width / height, span = Math.max(36, 26 / aspect);
    camera.left = -span * aspect / 2; camera.right = span * aspect / 2;
    camera.top = span / 2; camera.bottom = -span / 2; camera.updateProjectionMatrix(); renderer.setSize(width, height);
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
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
    const hit = raycaster.intersectObjects(surfaces, false)[0];
    return hit ? owners.get(hit.object) : undefined;
  };
  const updateHighlights = () => {
    if (selectedPlayer && !views.has(selectedPlayer)) selectedPlayer = undefined;
    hoveredPlayer = undefined;
    if (hoverPoint && document.elementFromPoint(hoverPoint.x, hoverPoint.y) === canvas) {
      aimPointer(hoverPoint.x, hoverPoint.y); hoveredPlayer = pickPlayer();
    }
    if (hoveredPlayer) canvas.dataset.playerHover = 'true'; else delete canvas.dataset.playerHover;
    for (const [id, view] of views) view.highlight.update(id === hoveredPlayer, id === selectedPlayer, host.clientWidth, host.clientHeight);
  };
  const pointermove = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') hoverPoint = { x: event.clientX, y: event.clientY };
  };
  const pointerleave = () => { hoverPoint = undefined; hoveredPlayer = undefined; delete canvas.dataset.playerHover; };
  let press: { id: number; x: number; y: number; player?: string; target?: { x: number; z: number } } | undefined;
  const updateApproach = (force = false) => {
    if (!approach) return;
    const other = network.players.get(approach.id);
    if (!other || !network.connected) { stopMovement(); selectedPlayer = undefined; return; }
    const position = prediction.position;
    if (Math.hypot(position.x - other.x, position.z - other.z) <= PLAYER_APPROACH_DISTANCE + .05) {
      const destination = prediction.movement.destination;
      if (destination && Math.hypot(destination.x - other.x, destination.z - other.z) > PLAYER_APPROACH_DISTANCE + .05) {
        // A target moved into range: finish at our predicted safe position. A stop
        // message here would halt the server early because prediction runs ahead.
        const point = { ...prediction.movement.position };
        if (prediction.move(network.nextInputSeq, point.x, point.z)) network.move(point.x, point.z);
      }
      if (!prediction.movement.moving && !network.players.get(network.room!.sessionId)?.moving) approach = undefined;
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
    if (id === network.room?.sessionId || !views.has(id)) return;
    selectedPlayer = id; approach = { id, sentAt: -Infinity }; updateApproach(true);
  };
  const moveToPoint = (point: { x: number; z: number }) => {
    selectedPlayer = undefined; approach = undefined;
    if (prediction.move(network.nextInputSeq, point.x, point.z)) {
      hint.hidden = true; network.move(point.x, point.z);
    } else rejected();
  };
  const pointerdown = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary || lost || !network.connected) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    // Pick the ground the player actually pressed, before the following camera moves.
    aimPointer(event.clientX, event.clientY);
    const player = pickPlayer();
    const hit = raycaster.intersectObject(ground, false)[0];
    const target = hit ? { x: hit.point.x, z: hit.point.z } : undefined;
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
    const start = press; press = undefined;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (!start || start.id !== event.pointerId || event.button !== 0 || lost || !network.connected
      || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) return;
    if (start.player) selectPlayer(start.player); else if (start.target) moveToPoint(start.target);
  };
  const cancelPress = () => { press = undefined; };
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
    updateApproach();
    updateHighlights();
    if (!hint.hidden && now >= hintUntil) hint.hidden = true;
    water.update(reducedMotion.matches ? 0 : (now - startedAt) / 1000);
    bankGrass.update(camera, network.connected ? focus : undefined, reducedMotion.matches ? 0 : (now - startedAt) / 1000);
    oak.update(camera, network.connected ? focus : undefined, reducedMotion.matches ? 0 : (now - startedAt) / 1000, delta);
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
    host.removeEventListener('mythraven:settings-open', blur); speedControl.remove(); zoomControl.remove();
    removeViews(); characters.dispose(); minimap.destroy(); bankGrass.dispose(); oak.dispose(); sun.shadow.dispose(); disposeObject(scene); tiles.dispose(); renderer.dispose(); renderer.forceContextLoss();
    canvas.remove(); modelStatus.remove(); status.remove(); hint.remove(); panel.remove(); delete host.dataset.renderer; delete host.dataset.terrainSize;
  };
  const pagehide = (event: PageTransitionEvent) => { if (!event.persisted) destroy(); };
  window.addEventListener('pagehide', pagehide); animate(); void network.connect();
  return { destroy, inspect: () => {
    const screen = focus.clone().project(camera), mine = network.players.get(network.room?.sessionId ?? '');
    return { player: { x: focus.x, y: focus.y, z: focus.z }, moving: prediction.movement.moving || (mine?.moving ?? false),
      destination: prediction.movement.destination ?? (mine?.moving ? { x: mine.targetX, z: mine.targetZ } : undefined),
      camera: camera.position.toArray(), rotation: camera.quaternion.toArray(), zoom: camera.zoom,
      hoveredPlayer, selectedPlayer,
      avatars: Object.fromEntries([...views].map(([id, view]) => [id, { ...view.avatar.inspect(), heading: view.mesh.rotation.y }])),
      turning: prediction.movement.turning, heading: prediction.movement.heading,
      screen: [(screen.x + 1) / 2 * host.clientWidth, (1 - screen.y) / 2 * host.clientHeight],
      id: network.room?.sessionId, room: network.room?.roomId, connected: network.connected,
      players: Object.fromEntries(network.players), renderedPlayers: views.size, tree: oak.inspect() };
  } };
}


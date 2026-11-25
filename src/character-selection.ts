import * as THREE from 'three';
import { CHARACTERS, DEFAULT_CHARACTER_ID, characterById, type CharacterDefinition } from '../shared/character-catalog.mjs';
import { normalizeAppearanceColor } from '../shared/appearance-color.mjs';
import { createCharacterAssets, type CharacterAssets, type PlayerAvatar } from './terrain/character-assets';
import {weaponsFor, type PlayerClass, type Weapon, type PreviewMotion} from './terrain/skinned-player';
import './character-selection.css';

export type PreparedCharacters = CharacterAssets;

const classIds = [...new Set(CHARACTERS.map(character => character.classId))];
const hairStyles = [...new Set(CHARACTERS.map(character => character.hairStyle))].sort((a, b) => a - b);

const hairPresets = [
  ['', 'สีเดิม', 'Original'],
  ['#29252f', 'ดำ', 'Black'],
  ['#895139', 'น้ำตาล', 'Brown'],
  ['#d4dbe8', 'เงิน', 'Silver'],
  ['#79c9ef', 'ฟ้า', 'Sky blue'],
  ['#c93244', 'แดง', 'Red'],
  ['#f7d479', 'ทอง', 'Gold'],
  ['#e77a35', 'ส้ม', 'Orange'],
  ['#a177d1', 'ม่วง', 'Purple'],
];
function hairColorControls(thai: boolean) {
  const label = thai ? 'สีผม' : 'Hair color';
  const customLabel = thai ? 'เลือกสีเอง' : 'Custom color';
  return `<fieldset class="character-options-group hair-colors">
    <legend>${label}</legend>
    <div class="hair-color-options">
      <div>
        <div class="hair-color-heading" id="hair-presets-heading">${thai ? 'พรีเซ็ต' : 'Presets'}</div>
        <div class="hair-swatches" role="group" aria-labelledby="hair-presets-heading">
          ${hairPresets.map(([hex, th, en]) => `<button type="button" data-hair-color="${hex}" aria-pressed="false"
            aria-label="${thai ? th : en}" title="${thai ? th : en}" style="--swatch:${hex || '#243a31'}">${hex ? '' : '<span aria-hidden="true">↺</span>'}</button>`).join('')}
        </div>
      </div>
      <div class="hair-custom-color">
        <div class="hair-color-heading" id="hair-custom-heading">${customLabel}</div>
        <div class="hair-picker">
          <span class="hair-picker-swatch" aria-hidden="true"></span>
          <input id="hair-color" type="color" value="${hairPresets[2][0]}" aria-labelledby="hair-custom-heading">
          <output for="hair-color"></output><span aria-hidden="true">▾</span>
        </div>
      </div>
    </div>
  </fieldset>`;
}

/** The preview owns its assets until explicit selection transfers them to the city. */
export function mountCharacterSelection(host: HTMLElement, username: string, thai: boolean,
  enter: (character: CharacterDefinition, assets: PreparedCharacters, hairColor: string) => Promise<void>,
  exit: () => Promise<void>) {
  host.innerHTML = `<main class="character-page" aria-labelledby="character-title">
    <header class="character-header"><div class="mini-brand">MYTHRAVEN <span>ONLINE</span></div>
      <div class="character-account"><span id="character-account-name"></span><button id="character-logout" type="button">${thai ? 'ออกจากระบบ' : 'Sign out'}</button></div></header>
    <div class="character-heading"><p>${thai ? 'เริ่มต้นการผจญภัย' : 'YOUR JOURNEY BEGINS'}</p><h1 id="character-title">${thai ? 'เลือกตัวละคร' : 'Choose your character'}</h1>
      <span>${thai ? 'เลือกนักผจญภัยของคุณ ก่อนเข้าสู่เมือง Mythraven' : 'Choose your adventurer before entering Mythraven.'}</span></div>
    <div class="character-layout"><section class="character-options" aria-label="${thai ? 'ตัวละครที่เลือกได้' : 'Available characters'}">
      <div class="character-filters" role="group" aria-label="${thai ? 'เพศตัวละคร' : 'Character gender'}">
        <button type="button" data-gender="all" aria-pressed="true">${thai ? 'ทั้งหมด' : 'All'}</button>
        <button type="button" data-gender="male" aria-pressed="false">${thai ? 'ชาย' : 'Male'}</button>
        <button type="button" data-gender="female" aria-pressed="false">${thai ? 'หญิง' : 'Female'}</button>
      </div>
      <div class="character-customization">
        <fieldset class="character-options-group">
          <legend>${thai ? 'อาชีพ' : 'Class'}</legend>
          <div class="character-class-grid">${classIds.map(job => `<label class="character-option character-class">
            <input type="radio" name="character-class" value="${job}">
            <span>${job[0].toUpperCase() + job.slice(1)}</span>
          </label>`).join('')}</div>
        </fieldset>
        <fieldset class="character-options-group">
          <legend>${thai ? 'ทรงผม' : 'Hairstyle'}</legend>
          <div class="character-hair-grid">${hairStyles.map(style => `<label class="character-option hairstyle-tile">
            <input type="radio" name="character-hair" value="${style}" aria-label="${thai ? 'ทรงผม' : 'Hairstyle'} ${style}">
            <img class="hairstyle-thumbnail" src="/assets/ui/hairstyles/style-${String(style).padStart(2, '0')}.webp" alt="" width="192" height="192" decoding="async" draggable="false">
            <span class="character-check" aria-hidden="true">✓</span>
          </label>`).join('')}</div>
        </fieldset>
        ${hairColorControls(thai)}
      </div>
      <p id="character-empty" hidden>${thai ? 'ยังไม่มีโมเดลตัวละครหญิงให้เลือก' : 'No female character models are available yet.'}</p>
    </section><section class="character-stage" aria-label="${thai ? 'ตัวอย่างตัวละครสามมิติ' : '3D character preview'}">
      <div id="character-preview" tabindex="0" aria-describedby="preview-rotate-hint"></div>
      <div class="character-preview-caption"><span id="preview-rotate-hint">${thai ? 'ลากหรือกด ← → เพื่อหมุน' : 'Drag or use ← → to rotate'}</span><strong id="character-preview-name">Novice</strong></div>
      <p id="character-load-status" role="status">${thai ? 'กำลังโหลดตัวละคร…' : 'Loading character…'}</p>
      <button id="character-retry" type="button" hidden>${thai ? 'ลองโหลดอีกครั้ง' : 'Retry loading'}</button>
    </section></div>
    <div class="preview-controls">
      <label>${thai?'อาวุธในพรีวิว':'Preview weapon'} <select id="preview-weapon" disabled></select></label>
      <label>${thai?'ท่าพรีวิว':'Preview motion'} <select id="preview-motion" disabled>
        <option value="idle">${thai?'ยืน':'Idle'}</option><option value="slow">${thai?'ก้าวช้า (คลิปวิ่ง)':'Slow stride (run clip)'}</option>
        <option value="run">${thai?'วิ่ง':'Run'}</option><option value="attack" disabled>${thai?'โจมตี':'Attack'}</option>
      </select></label>
    </div>
    <footer class="character-footer"><p id="character-selection-hint" aria-live="polite">${thai ? 'เลือกตัวละครหนึ่งแบบเพื่อเริ่มต้น' : 'Select a character to begin.'}</p>
      <button id="enter-city" type="button" disabled>${thai ? 'เข้าสู่เมือง' : 'Enter city'} <span aria-hidden="true">→</span></button></footer>
    <p id="character-error" class="error" role="alert"></p>
  </main>`;
  host.querySelector('.character-page')!.addEventListener('contextmenu', event => event.preventDefault());
  host.querySelector('#character-account-name')!.textContent = username;
  const previewHost = host.querySelector<HTMLElement>('#character-preview')!;
  const submit = host.querySelector<HTMLButtonElement>('#enter-city')!;
  const status = host.querySelector<HTMLElement>('#character-load-status')!;
  const retry = host.querySelector<HTMLButtonElement>('#character-retry')!;
  const error = host.querySelector<HTMLElement>('#character-error')!;
  const name = host.querySelector<HTMLElement>('#character-preview-name')!;
  const hint = host.querySelector<HTMLElement>('#character-selection-hint')!;
  const gear = host.querySelector<HTMLSelectElement>('#preview-weapon')!;
  const motion = host.querySelector<HTMLSelectElement>('#preview-motion')!;
  const attack = motion.querySelector<HTMLOptionElement>('[value="attack"]')!;
  const weaponNames = thai ? {dagger:'มีดสั้น',longsword:'ดาบยาว',bow:'ธนู'} : {dagger:'Dagger',longsword:'Longsword',bow:'Bow'};
  let selected: CharacterDefinition | undefined;
  const assets = createCharacterAssets();
  let previewCharacter: CharacterDefinition | undefined;
  let avatar: PlayerAvatar | undefined;
  function bindHairColor() {
    const field = host.querySelector<HTMLFieldSetElement>('.hair-colors')!;
    const picker = field.querySelector<HTMLInputElement>('input')!;
    const pickerBox = field.querySelector<HTMLElement>('.hair-picker')!;
    const colorValue = field.querySelector('output')!;
    const attribute = `data-hair-color`;
    const swatches = field.querySelectorAll<HTMLButtonElement>(`[${attribute}]`);
    let color = '';
    function select(value: string) {
      color = normalizeAppearanceColor(value);
      picker.value = color || picker.defaultValue;
      pickerBox.style.setProperty('--picked-color', picker.value);
      colorValue.value = color.toUpperCase();
      for (const swatch of swatches) {
        swatch.setAttribute('aria-pressed', String(swatch.getAttribute(attribute) === color));
      }
      avatar?.setHairColor(color);
    }
    for (const swatch of swatches) swatch.onclick = () => select(swatch.getAttribute(attribute) ?? '');
    picker.oninput = picker.onchange = () => select(picker.value);
    select('');
    return {get color() { return color; }};
  }
  const hair = bindHairColor();
  let renderer: THREE.WebGLRenderer | undefined, observer: ResizeObserver | undefined;
  let disposed = false, transferred = false, busy = false, previewVersion = 0, frame = 0, previous = 0;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#f2f5e6', '#718478', 2.15));
  const light = new THREE.DirectionalLight('#fff0d0', 2.5); light.position.set(-4, 6, 5); scene.add(light);
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, .1, 50);
  camera.position.set(0, 2.5, Math.hypot(3, 7)); camera.lookAt(0, 1.35, 0);
  let previewYaw = 0;
  let rotationDrag: { pointerId: number; x: number } | undefined;
  function rotatePreview(delta: number) {
    previewYaw = (previewYaw + delta) % (Math.PI * 2);
    if (avatar) avatar.group.rotation.y = previewYaw;
  }
  previewHost.addEventListener('pointerdown', event => {
    if (!avatar || event.button !== 0 || rotationDrag) return;
    rotationDrag = { pointerId: event.pointerId, x: event.clientX };
    previewHost.setPointerCapture(event.pointerId);
    previewHost.classList.add('is-rotating');
  });
  previewHost.addEventListener('pointermove', event => {
    if (!rotationDrag || event.pointerId !== rotationDrag.pointerId) return;
    rotatePreview((event.clientX - rotationDrag.x) * Math.PI / 180);
    rotationDrag.x = event.clientX;
  });
  previewHost.addEventListener('lostpointercapture', event => {
    if (rotationDrag?.pointerId !== event.pointerId) return;
    rotationDrag = undefined;
    previewHost.classList.remove('is-rotating');
  });
  previewHost.addEventListener('keydown', event => {
    if (!avatar || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    rotatePreview(event.key === 'ArrowLeft' ? -Math.PI / 12 : Math.PI / 12);
  });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animate = (now: number) => {
    if (disposed || !renderer) return;
    if (!document.hidden) {
      avatar?.preview(reducedMotion.matches && motion.value==='idle' ? 0 : Math.min((now-previous)/1000,.05),motion.value as PreviewMotion);
      renderer.render(scene, camera);
    }
    previous = now; frame = requestAnimationFrame(animate);
  };
  const clearPreview = () => {
    cancelAnimationFrame(frame); observer?.disconnect(); observer = undefined;
    avatar?.dispose(); avatar = undefined;
    renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove(); renderer = undefined;
  };
  const load = async (character: CharacterDefinition) => {
    if (disposed) return;
    previewCharacter = character;
    const version = ++previewVersion;
    gear.disabled=motion.disabled=true;
    const allowed=weaponsFor(character.model as PlayerClass);
    const item=allowed.find(w=>w===gear.value);
    gear.replaceChildren(new Option(thai?'มือเปล่า':'Unarmed',''),...allowed.map(w=>new Option(weaponNames[w],w)));
    gear.value=item??'';
    submit.disabled = true; retry.hidden = true; status.hidden = false;
    delete previewHost.dataset.ready; delete previewHost.dataset.characterId;
    // Remove the previous model while a different class loads; keep one canvas.
    avatar?.dispose(); avatar = undefined;
    status.textContent = thai ? 'กำลังโหลดตัวละคร…' : 'Loading character…';
    try {
      const [factory,weaponAsset] = await Promise.all([assets.ensure(character),item?assets.loadWeapon(item):undefined]);
      if (disposed || version !== previewVersion) return;
      if (!renderer) {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
        renderer.domElement.setAttribute('aria-label', thai ? 'ตัวอย่างตัวละครสามมิติ' : '3D character preview');
        previewHost.append(renderer.domElement);
        const resize = () => {
          const width = Math.max(1, previewHost.clientWidth), height = Math.max(1, previewHost.clientHeight), aspect = width/height;
          const span = Math.max(3.8, 2.6/aspect);
          camera.left = -span*aspect/2; camera.right = span*aspect/2; camera.top = span/2; camera.bottom = -span/2;
          camera.updateProjectionMatrix(); renderer!.setSize(width, height);
        };
        observer = new ResizeObserver(resize); observer.observe(previewHost); resize();
        previous = performance.now(); frame = requestAnimationFrame(animate);
      }
      avatar = factory.create(true, character.hairStyle, hair.color);
      avatar.group.rotation.y = previewYaw;
      scene.add(avatar.group);
      if(item) avatar.setWeapon(item,weaponAsset);
      attack.disabled=!item || !avatar.canPreviewAttack(item);
      if(attack.disabled && motion.value==='attack') motion.value='idle';
      gear.disabled=motion.disabled=false;
      status.hidden = true; previewHost.dataset.ready = 'true'; previewHost.dataset.characterId = character.id;
      submit.disabled = selected?.id !== character.id || busy;
    } catch {
      if (!disposed && version === previewVersion) {
        status.textContent = thai ? 'โหลดตัวละครไม่สำเร็จ กรุณาลองอีกครั้ง' : 'Could not load the character. Please retry.';
        retry.hidden = false;
      }
    }
  };
  gear.onchange=()=>{if(previewCharacter) void load(previewCharacter);};
  const customization = host.querySelector<HTMLElement>('.character-customization')!;
  const empty = host.querySelector<HTMLElement>('#character-empty')!;
  const classOptions = host.querySelectorAll<HTMLInputElement>('input[name="character-class"]');
  const hairOptions = host.querySelectorAll<HTMLInputElement>('input[name="character-hair"]');
  let available: readonly CharacterDefinition[] = CHARACTERS;
  const choose = (character: CharacterDefinition) => {
    selected = character;
    for (const option of classOptions) option.checked = option.value === character.classId;
    for (const option of hairOptions) {
      option.checked = Number(option.value) === character.hairStyle;
      option.disabled = !available.some(c => c.classId === character.classId && c.hairStyle === Number(option.value));
    }
    name.textContent = thai ? character.nameTh : character.nameEn;
    hint.textContent = thai ? `เลือกแล้ว: ${character.nameTh}` : `Selected: ${character.nameEn}`;
    if(avatar && previewCharacter?.model===character.model){
      avatar.setHairStyle(character.hairStyle);previewCharacter=character;
      previewHost.dataset.characterId=character.id;submit.disabled=busy;
    } else void load(character);
  };
  classOptions.forEach(input => input.addEventListener('change', () => {
    const character = available.find(c => c.classId === input.value && c.hairStyle === selected?.hairStyle)
      ?? available.find(c => c.classId === input.value);
    if (character) choose(character);
  }));
  hairOptions.forEach(input => input.addEventListener('change', () => {
    const character = available.find(c => c.classId === selected?.classId && c.hairStyle === Number(input.value));
    if (character) choose(character);
  }));
  host.querySelectorAll<HTMLButtonElement>('[data-gender]').forEach(button => button.addEventListener('click', () => {
    const gender = button.dataset.gender;
    host.querySelectorAll('[data-gender]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    available = CHARACTERS.filter(c => gender === 'all' || c.gender === gender);
    customization.hidden = available.length === 0;
    empty.hidden = available.length > 0;
    previewHost.style.visibility = available.length ? 'visible' : 'hidden';
    for (const option of classOptions) option.disabled = !available.some(c => c.classId === option.value);
    if (!selected || !available.includes(selected)) {
      const first = available.find(character => character.id === DEFAULT_CHARACTER_ID) ?? available[0];
      if (first) choose(first);
      else {
        selected = undefined; submit.disabled = true;
        hint.textContent = thai ? 'เลือกตัวละครหนึ่งแบบเพื่อเริ่มต้น' : 'Select a character to begin.';
        ++previewVersion; previewCharacter = undefined; avatar?.dispose(); avatar = undefined;
        gear.disabled = motion.disabled = true; status.hidden = true; retry.hidden = true;
        delete previewHost.dataset.ready; delete previewHost.dataset.characterId;
        name.textContent = thai ? 'ยังไม่มีตัวละครในหมวดนี้' : 'No characters in this category';
      }
    }
  }));
  retry.onclick = () => { if (previewCharacter) void load(previewCharacter); };
  submit.onclick = async () => {
    if (busy || !selected || !avatar || previewHost.dataset.characterId !== selected.id) return;
    busy = true; submit.disabled = true; transferred = true;
    clearPreview(); disposed = true;
    await enter(selected, assets, hair.color);
  };
  host.querySelector<HTMLButtonElement>('#character-logout')!.onclick = async event => {
    const button = event.currentTarget as HTMLButtonElement; button.disabled = true;
    try { await exit(); } catch { button.disabled = false; error.textContent = thai ? 'ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง' : 'Could not sign out. Please retry.'; }
  };
  choose(characterById(DEFAULT_CHARACTER_ID)!);
  return { destroy() { disposed = true; clearPreview(); if (!transferred) assets?.dispose(); } };
}

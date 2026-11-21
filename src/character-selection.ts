import * as THREE from 'three';
import { CHARACTERS, type CharacterDefinition } from '../shared/character-catalog.mjs';
import { createCharacterAssets, type CharacterAssets, type PlayerAvatar } from './terrain/character-assets';
import {equipment, type PlayerClass, type Weapon, type PreviewMotion} from './terrain/skinned-player';
import './character-selection.css';

export type PreparedCharacters = CharacterAssets;

/** The preview owns its assets until explicit selection transfers them to the city. */
export function mountCharacterSelection(host: HTMLElement, username: string, thai: boolean,
  enter: (character: CharacterDefinition, assets: PreparedCharacters) => Promise<void>, exit: () => Promise<void>) {
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
      </div><p class="character-availability">${thai ? `ตัวละครที่พร้อมให้เลือก ${CHARACTERS.length} แบบ` : `${CHARACTERS.length} characters available`}</p>
      <fieldset class="character-cards"><legend class="sr-only">${thai ? 'เลือกโมเดลตัวละคร' : 'Select a character model'}</legend>
        ${Object.keys(equipment).map(job=>`<fieldset class="class-hairstyles" data-character-gender="male"><legend>${job[0].toUpperCase()+job.slice(1)}</legend>
          ${CHARACTERS.filter(c=>c.classId===job).map(c=>`<label class="character-card">
          <input type="radio" name="character" value="${c.id}" aria-label="${thai?c.nameTh:c.nameEn}"><strong>${thai?'ทรงผม':'Hairstyle'} ${c.hairStyle}</strong><span class="character-check" aria-hidden="true">✓</span></label>`).join('')}</fieldset>`).join('')}
      </fieldset><p id="character-empty" hidden>${thai ? 'ยังไม่มีโมเดลตัวละครหญิงให้เลือก' : 'No female character models are available yet.'}</p>
    </section><section class="character-stage" aria-label="${thai ? 'ตัวอย่างตัวละครสามมิติ' : '3D character preview'}">
      <div id="character-preview"></div><div class="character-preview-caption"><span>${thai ? 'ตัวอย่างตัวละคร' : 'CHARACTER PREVIEW'}</span><strong id="character-preview-name">Novice</strong></div>
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
  let previewCharacter: CharacterDefinition | undefined = CHARACTERS[0];
  let avatar: PlayerAvatar | undefined;
  let renderer: THREE.WebGLRenderer | undefined, observer: ResizeObserver | undefined;
  let disposed = false, transferred = false, busy = false, previewVersion = 0, frame = 0, previous = 0;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#f2f5e6', '#718478', 2.15));
  const light = new THREE.DirectionalLight('#fff0d0', 2.5); light.position.set(-4, 6, 5); scene.add(light);
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, .1, 50);
  camera.position.set(3, 2.5, 7); camera.lookAt(0, 1.35, 0);
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
    const allowed:readonly Weapon[]=equipment[character.model as PlayerClass];
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
      avatar = factory.create(true, character.hairStyle); scene.add(avatar.group);
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
  const choose = (character: CharacterDefinition) => {
    selected = character;
    name.textContent = thai ? character.nameTh : character.nameEn;
    hint.textContent = thai ? `เลือกแล้ว: ${character.nameTh}` : `Selected: ${character.nameEn}`;
    if(avatar && previewCharacter?.model===character.model){
      avatar.setHairStyle(character.hairStyle);previewCharacter=character;
      previewHost.dataset.characterId=character.id;submit.disabled=busy;
    } else void load(character);
  };
  host.querySelectorAll<HTMLInputElement>('input[name="character"]').forEach(input => input.addEventListener('change', () => {
    const character = CHARACTERS.find(c => c.id === input.value); if (character) choose(character);
  }));
  host.querySelectorAll<HTMLButtonElement>('[data-gender]').forEach(button => button.addEventListener('click', () => {
    const gender = button.dataset.gender;
    host.querySelectorAll('[data-gender]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    host.querySelectorAll<HTMLElement>('[data-character-gender]').forEach(card => { card.hidden = gender !== 'all' && card.dataset.characterGender !== gender; });
    const available = CHARACTERS.filter(c => gender === 'all' || c.gender === gender);
    host.querySelector<HTMLElement>('#character-empty')!.hidden = available.length > 0;
    previewHost.style.visibility = available.length ? 'visible' : 'hidden';
    if (selected && gender !== 'all' && selected.gender !== gender) {
      selected = undefined; submit.disabled = true;
      host.querySelectorAll<HTMLInputElement>('input[name="character"]').forEach(input => { input.checked = false; });
      hint.textContent = thai ? 'เลือกตัวละครหนึ่งแบบเพื่อเริ่มต้น' : 'Select a character to begin.';
    }
    if (!selected) {
      const preview = available[0];
      if (preview) void load(preview);
      else { ++previewVersion; previewCharacter = undefined; avatar?.dispose(); avatar = undefined; gear.disabled=motion.disabled=true; status.hidden = true; retry.hidden = true; delete previewHost.dataset.ready; delete previewHost.dataset.characterId; }
      name.textContent = preview ? (thai ? preview.nameTh : preview.nameEn) : (thai ? 'ยังไม่มีตัวละครในหมวดนี้' : 'No characters in this category');
    }
  }));
  retry.onclick = () => { if (previewCharacter) void load(previewCharacter); };
  submit.onclick = async () => {
    if (busy || !selected || !avatar || previewHost.dataset.characterId !== selected.id) return;
    busy = true; submit.disabled = true; transferred = true;
    clearPreview(); disposed = true;
    await enter(selected, assets);
  };
  host.querySelector<HTMLButtonElement>('#character-logout')!.onclick = async event => {
    const button = event.currentTarget as HTMLButtonElement; button.disabled = true;
    try { await exit(); } catch { button.disabled = false; error.textContent = thai ? 'ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง' : 'Could not sign out. Please retry.'; }
  };
  void load(CHARACTERS[0]);
  return { destroy() { disposed = true; clearPreview(); if (!transferred) assets?.dispose(); } };
}

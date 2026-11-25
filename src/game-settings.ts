import './game-settings.css';
import {audioSettings, type VolumeChannel} from './audio-settings';

const uiScaleKey = 'mythraven.ui-scale';
const footVitalsKey = 'mythraven.foot-vitals';
const defaultUiScale = 100, minUiScale = 85, maxUiScale = 125;

function savedUiScale() {
  try {
    const saved = Number(localStorage.getItem(uiScaleKey));
    if (saved >= minUiScale && saved <= maxUiScale) return saved;
  } catch { /* The setting still works for the current session. */ }
  return defaultUiScale;
}

/** Native popover/dialog keep focus, Escape and world-click isolation in the browser. */
export function mountGameSettings(root: HTMLElement, thai: boolean) {
  const settings = thai ? 'ตั้งค่า' : 'Settings', close = thai ? 'ปิด' : 'Close';
  const volumeRow = (channel: VolumeChannel, label: string) => `
    <label class="audio-volume">
      <span class="settings-range-heading"><span>${label}</span><output for="${channel}-volume"></output></span>
      <input id="${channel}-volume" data-volume="${channel}" type="range" min="0" max="100" step="1">
    </label>`;
  const shell = document.createElement('div'); shell.className = 'game-settings';
  shell.innerHTML = `
    <button id="settings-toggle" class="settings-gear" type="button" popovertarget="settings-menu" aria-label="${settings}" title="${settings}">
      <img src="/assets/ui/menu/settings.webp" alt="" width="30" height="30">
    </button>
    <div id="settings-menu" class="settings-menu" popover="manual" role="group" aria-label="${thai?'เมนูเกม':'Game menu'}">
      <button id="open-settings" type="button" aria-label="${settings}" aria-haspopup="dialog" aria-controls="settings-dialog">
        <img src="/assets/ui/menu/settings.webp" alt="" width="36" height="36">
        <span class="menu-tooltip" aria-hidden="true">${settings}</span>
      </button>
    </div>
    <dialog id="settings-dialog" class="settings-dialog" aria-labelledby="settings-title">
      <header><h2 id="settings-title">${settings}</h2><button id="close-settings" class="settings-close" type="button" aria-label="${close}">×</button></header>
      <div class="settings-categories" role="group" aria-label="${thai ? 'หมวดตั้งค่า' : 'Settings categories'}">
        <button type="button" aria-controls="settings-controls" aria-pressed="true">${thai ? 'ทั่วไป' : 'General'}</button>
        <button type="button" aria-controls="settings-audio" aria-pressed="false">${thai ? 'เสียง' : 'Audio'}</button>
      </div>
      <div id="settings-controls" class="settings-controls">
        <label class="settings-range">
          <span class="settings-range-heading"><span>${thai ? 'ขนาด UI' : 'UI scale'}</span><output for="ui-scale"></output></span>
          <input id="ui-scale" type="range" min="${minUiScale}" max="${maxUiScale}" step="5">
        </label>
        <small id="ui-scale-fit" hidden></small>
        <button class="settings-reset" id="reset-ui-scale" type="button">${thai ? 'คืนขนาดเดิม' : 'Reset UI size'}</button>
        <label class="settings-foot-vitals">
          <input id="show-foot-vitals" type="checkbox" checked>
          ${thai ? 'แสดงแถบ HP / MP ใต้เท้าตัวละคร' : 'Show HP / MP beneath your character'}
        </label>
        <div class="orbit-help">
          <p>${thai ? 'กดคลิกขวาค้างแล้วลากเพื่อหมุนกล้อง เมื่อถึงพื้น กล้องจะเลื่อนเข้าหาตัวละคร ลากย้อนกลับเพื่อถอยคืน' : 'Hold right mouse and drag to orbit. At ground level the camera slides toward your character; drag back to pull away.'}</p>
          <button id="reset-camera" class="settings-reset" type="button">${thai ? 'กลับมุมกล้องเดิม' : 'Reset camera angle'}</button>
        </div>
      </div>
      <div id="settings-audio" class="settings-controls" hidden>
        ${volumeRow('master', thai ? 'เสียงทั้งหมด' : 'Master volume')}
        <div class="audio-group">
          <label class="audio-toggle"><input id="music-enabled" type="checkbox"> ${thai ? 'เปิดเพลงประกอบ' : 'Enable music'}</label>
          ${volumeRow('music', thai ? 'เพลงประกอบ' : 'Music volume')}
        </div>
        <div class="audio-group">
          <label class="audio-toggle"><input id="effects-enabled" type="checkbox"> ${thai ? 'เปิดเสียงเอฟเฟกต์' : 'Enable sound effects'}</label>
          ${volumeRow('self', thai ? 'เอฟเฟกต์ของตัวเอง' : 'Your effects')}
          ${volumeRow('others', thai ? 'เอฟเฟกต์ของคนอื่นและเสียงรอบตัว' : 'Other players and world effects')}
        </div>
      </div>
      <footer class="settings-footer"></footer>
    </dialog>`;
  root.append(shell);
  const footVitals = shell.querySelector<HTMLInputElement>('#show-foot-vitals')!;
  try { footVitals.checked = localStorage.getItem(footVitalsKey) !== 'false'; }
  catch { /* Keep the default when storage is unavailable. */ }
  root.toggleAttribute('data-hide-foot-vitals', !footVitals.checked);
  footVitals.onchange = () => {
    root.toggleAttribute('data-hide-foot-vitals', !footVitals.checked);
    try { localStorage.setItem(footVitalsKey, String(footVitals.checked)); }
    catch { /* The current choice still applies. */ }
  };
  const scaleInput=shell.querySelector<HTMLInputElement>('#ui-scale')!;
  const scaleOutput=shell.querySelector<HTMLOutputElement>('output[for="ui-scale"]')!;
  const fitNote=shell.querySelector<HTMLElement>('#ui-scale-fit')!;
  scaleInput.value=String(savedUiScale());
  function applyUiScale(){
    const requested=scaleInput.valueAsNumber;
    const width=root.clientWidth,height=root.clientHeight;
    // Leave room for the HUD, stacked minimap, and bottom controls on compact screens.
    let scale=Math.min(requested/100,Math.max(minUiScale/100,(width-12)/304));
    if(width<=540*scale) scale=Math.min(scale,Math.max(minUiScale/100,(height-16)/430));
    const percentage=Math.floor(scale*100+1e-7);
    const applied=String(percentage/100);
    root.toggleAttribute('data-ui-stacked',width<=540*Number(applied));
    scaleOutput.value=requested+'%';
    fitNote.hidden=percentage===requested;
    fitNote.textContent=thai?`แสดงที่ ${percentage}% เพื่อให้พอดีกับหน้าจอ`:`Displayed at ${percentage}% to fit this screen.`;
    if(root.style.getPropertyValue('--ui-scale')===applied)return;
    root.style.setProperty('--ui-scale',applied);
    root.dispatchEvent(new Event('mythraven:ui-scale'));
  }
  function changeUiScale(){
    try { localStorage.setItem(uiScaleKey,scaleInput.value); } catch { /* Keep the live setting. */ }
    applyUiScale();
  }
  scaleInput.oninput=changeUiScale;
  shell.querySelector<HTMLButtonElement>('#reset-ui-scale')!.onclick=()=>{
    scaleInput.value=String(defaultUiScale);
    changeUiScale();
  };
  const uiResize=new ResizeObserver(applyUiScale);
  uiResize.observe(root);
  applyUiScale();
  const categories = shell.querySelectorAll<HTMLButtonElement>('.settings-categories button');
  for (const button of categories) button.onclick = () => {
    for (const tab of categories) {
      const selected = tab === button;
      tab.setAttribute('aria-pressed', String(selected));
      shell.querySelector<HTMLElement>('#' + tab.getAttribute('aria-controls'))!.hidden = !selected;
    }
  };
  for (const input of shell.querySelectorAll<HTMLInputElement>('[data-volume]')) {
    const channel = input.dataset.volume as VolumeChannel;
    const percentage = shell.querySelector<HTMLOutputElement>(`output[for="${input.id}"]`)!;
    const showVolume = () => { percentage.value = input.value + '%'; };
    input.value = String(Math.round(audioSettings.value[channel] * 100));
    showVolume();
    input.oninput = () => {
      audioSettings.setVolume(channel, input.valueAsNumber / 100);
      showVolume();
    };
  }
  for (const [id, key] of [['music-enabled', 'musicEnabled'], ['effects-enabled', 'effectsEnabled']] as const) {
    const toggle = shell.querySelector<HTMLInputElement>('#' + id)!;
    toggle.checked = audioSettings.value[key];
    toggle.onchange = () => audioSettings.setEnabled(key, toggle.checked);
  }
  const dialog=shell.querySelector<HTMLDialogElement>('#settings-dialog')!;
  const menu=shell.querySelector<HTMLElement>('#settings-menu')!;
  const gear=shell.querySelector<HTMLButtonElement>('#settings-toggle')!;
  root.addEventListener('click',event=>{
    const target=event.target;
    if(menu.matches(':popover-open') && target instanceof Element &&
      !target.closest('#settings-toggle, #settings-menu, #settings-dialog, .adventure-journal')){
      menu.hidePopover();
    }
  },true);
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape' && !dialog.open && menu.matches(':popover-open') &&
      !root.querySelector('.adventure-journal:not([hidden])')){
      event.preventDefault();
      menu.hidePopover();
      gear.focus();
    }
  });
  dialog.querySelector('.settings-footer')!.append(root.querySelector('#logout')!);
  const error=root.querySelector('#game-error'); if(error)dialog.querySelector('.settings-footer')!.prepend(error);
  shell.querySelector('#open-settings')!.addEventListener('click',()=>{
    dialog.showModal();
    root.querySelector('#game')?.dispatchEvent(new Event('mythraven:settings-open'));
  });
  shell.querySelector('#close-settings')!.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>gear.focus());
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const box=dialog.getBoundingClientRect();
    if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom){
      menu.hidePopover();
      dialog.close();
    }
  });
  return ()=>uiResize.disconnect();
}

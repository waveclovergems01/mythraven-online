import './game-settings.css';

/** Native popover/dialog keep focus, Escape and world-click isolation in the browser. */
export function mountGameSettings(root: HTMLElement, thai: boolean) {
  const settings = thai ? 'ตั้งค่า' : 'Settings', close = thai ? 'ปิด' : 'Close';
  const shell = document.createElement('div'); shell.className = 'game-settings';
  shell.innerHTML = `
    <button id="settings-toggle" class="settings-gear" type="button" popovertarget="settings-menu" aria-label="${settings}" title="${settings}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
        <path d="m9 3 .6-2h4.8l.6 2 1.6.9 2-.5 2.4 4.2-1.4 1.5v1.8L21 12.4l-2.4 4.2-2-.5-1.6.9-.6 2H9.6L9 17l-1.6-.9-2 .5L3 12.4l1.4-1.5V9.1L3 7.6l2.4-4.2 2 .5Z" transform="translate(0 2)"/>
        <circle cx="12" cy="12" r="3.2"/>
      </svg>
    </button>
    <div id="settings-menu" class="settings-menu" popover>
      <button id="open-settings" type="button">${settings}<span aria-hidden="true">›</span></button>
    </div>
    <dialog id="settings-dialog" class="settings-dialog" aria-labelledby="settings-title">
      <header><h2 id="settings-title">${settings}</h2><button id="close-settings" class="settings-close" type="button" aria-label="${close}">×</button></header>
      <div id="settings-controls" class="settings-controls"></div>
      <footer class="settings-footer"></footer>
    </dialog>`;
  root.append(shell);
  const dialog=shell.querySelector<HTMLDialogElement>('#settings-dialog')!;
  const menu=shell.querySelector<HTMLElement>('#settings-menu')!;
  const gear=shell.querySelector<HTMLButtonElement>('#settings-toggle')!;
  dialog.querySelector('.settings-footer')!.append(root.querySelector('#logout')!);
  const error=root.querySelector('#game-error'); if(error)dialog.querySelector('.settings-footer')!.prepend(error);
  shell.querySelector('#open-settings')!.addEventListener('click',()=>{
    menu.hidePopover(); dialog.showModal();
    root.querySelector('#game')?.dispatchEvent(new Event('mythraven:settings-open'));
  });
  shell.querySelector('#close-settings')!.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>gear.focus());
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const box=dialog.getBoundingClientRect();
    if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();
  });
}

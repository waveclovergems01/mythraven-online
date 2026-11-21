/** Local view settings; world time is not yet a server-owned day/night cycle. */
export function mountEnvironmentSettings(parent: Element, thai: boolean,
  change: (hour: number, bearing: number) => void, resetCamera: () => void) {
  const section = document.createElement('section'); section.className = 'settings-range environment-settings';
  section.innerHTML = `
    <div class="settings-range-heading"><label for="world-time">${thai ? 'ช่วงเวลา' : 'Time of day'}</label><output for="world-time"></output></div>
    <div class="time-presets" role="group" aria-label="${thai ? 'เลือกช่วงเวลา' : 'Time presets'}">
      <button type="button" data-hour="7">${thai ? 'เช้า' : 'Morning'}</button>
      <button type="button" data-hour="12">${thai ? 'เที่ยง' : 'Noon'}</button>
      <button type="button" data-hour="17">${thai ? 'เย็น' : 'Evening'}</button>
      <button type="button" data-hour="22">${thai ? 'กลางคืน' : 'Night'}</button>
    </div>
    <input id="world-time" type="range" min="0" max="23.75" step="0.25" value="9">
    <div class="settings-range-heading light-heading"><label for="sun-direction">${thai ? 'หมุนทิศแสง' : 'Light bearing'}</label><output for="sun-direction"></output></div>
    <input id="sun-direction" type="range" min="0" max="360" step="5" value="180">
    <p class="settings-help">${thai ? 'ตั้งค่าแสงเฉพาะหน้าจอของคุณ' : 'Lighting applies to your view.'}</p>
    <div class="orbit-help"><p>${thai ? 'กดคลิกขวาค้างแล้วลากเพื่อหมุนกล้อง เมื่อถึงพื้น กล้องจะเลื่อนเข้าหาตัวละคร ลากย้อนกลับเพื่อถอยคืน' : 'Hold right mouse and drag to orbit. At ground level the camera slides toward your character; drag back to pull away.'}</p>
      <button id="reset-camera" class="settings-reset" type="button">${thai ? 'กลับมุมกล้องเดิม' : 'Reset camera angle'}</button></div>`;
  const time = section.querySelector<HTMLInputElement>('#world-time')!;
  const bearing = section.querySelector<HTMLInputElement>('#sun-direction')!;
  const update = () => {
    const hour = Number(time.value), degrees = Number(bearing.value);
    const formatted = `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.round(hour % 1 * 60)).padStart(2, '0')}`;
    section.querySelector('output[for="world-time"]')!.textContent = formatted;
    section.querySelector('output[for="sun-direction"]')!.textContent = `${degrees}°`;
    time.setAttribute('aria-valuetext', formatted);
    section.querySelectorAll<HTMLButtonElement>('[data-hour]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.hour) === hour)));
    change(hour, degrees);
  };
  time.oninput = bearing.oninput = update;
  section.querySelectorAll<HTMLButtonElement>('[data-hour]').forEach(button => button.onclick = () => { time.value = button.dataset.hour!; update(); });
  section.querySelector<HTMLButtonElement>('#reset-camera')!.onclick = resetCamera;
  parent.append(section); update();
  return { destroy() { section.remove(); } };
}

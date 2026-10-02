export const input = {
  x: 0, y: 0, boost: false, fire: false,
  touchX: 0, touchY: 0, touchActive: false, touchBoost: false, touchFire: false,
  touchAccel: false, touchBrake: false, pedalMode: false,
  itemPresses: 0, dashPresses: 0, jumpPresses: 0, active: false,
};
const keys = new Set<string>();
const edges = Array.from({ length: 4 }, () => ({ itemPresses: 0, dashPresses: 0, jumpPresses: 0 }));
let playerCount = 1;
const layouts = [
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', fire: 'Space', jump: 'KeyQ', boost: 'ShiftLeft', item: 'KeyE', dash: 'KeyF' },
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', fire: 'Enter', jump: 'Period', boost: 'ShiftRight', item: 'KeyM', dash: 'Slash' },
  { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', fire: 'KeyU', jump: 'KeyY', boost: 'KeyO', item: 'KeyP', dash: 'KeyH' },
  { up: 'Numpad8', down: 'Numpad5', left: 'Numpad4', right: 'Numpad6', fire: 'Numpad0', jump: 'NumpadAdd', boost: 'Numpad9', item: 'Numpad7', dash: 'NumpadDecimal' },
];
export function configureInput(count = 1, active = true) { playerCount = Math.max(1, Math.min(4, count)); input.active = active; resetInput(); }
function keyboardControl(i: number) {
  const k = layouts[i];
  const solo = i === 0 && playerCount === 1;
  const x = Number(keys.has(k.right) || solo && keys.has('ArrowRight')) - Number(keys.has(k.left) || solo && keys.has('ArrowLeft'));
  const up = keys.has(k.up) || solo && keys.has('ArrowUp');
  const down = keys.has(k.down) || solo && keys.has('ArrowDown');
  const y = down ? -1 : up ? 1 : 0;
  return { x, y, fire: keys.has(k.fire) || solo && keys.has('KeyJ'), boost: keys.has(k.boost), ...edges[i] };
}
function recompute() {
  const k = keyboardControl(0);
  input.x = input.touchActive ? input.touchX : k.x;
  // The mobile stick's Y axis is the throttle: forward accelerates, back brakes/reverses.
  input.y = input.pedalMode
    ? input.touchBrake ? -1 : input.touchAccel ? 1 : k.y
    : input.touchActive ? input.touchY : k.y;
  input.boost = k.boost || input.touchBoost;
  input.fire = k.fire || input.touchFire;
}
export function getControl(index = 0) {
  return index === 0
    ? { x: input.x, y: input.y, boost: input.boost, fire: input.fire, itemPresses: input.itemPresses, dashPresses: input.dashPresses, jumpPresses: input.jumpPresses }
    : keyboardControl(index);
}
export function resetInput() {
  keys.clear();
  Object.assign(input, { x: 0, y: 0, boost: false, fire: false, touchX: 0, touchY: 0, touchActive: false, touchBoost: false, touchFire: false, touchAccel: false, touchBrake: false });
  recompute();
}
let bound = false;
export function bindKeyboard() {
  if (bound) return;
  bound = true;
  window.addEventListener('keydown', (e) => {
    if (!input.active) return;
    if ((e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (!e.repeat) {
      layouts.forEach((layout, i) => {
        if (e.code === layout.item) { edges[i].itemPresses++; if (i === 0) input.itemPresses++; }
        if (e.code === layout.jump) { edges[i].jumpPresses++; if (i === 0) input.jumpPresses++; }
        if (e.code === layout.dash || i === 0 && !input.pedalMode && e.code === 'ShiftLeft') {
          edges[i].dashPresses++; if (i === 0) input.dashPresses++;
        }
      });
    }
    recompute();
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.code); recompute(); });
  window.addEventListener('blur', resetInput);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetInput(); });
}
export function pressItem() { input.itemPresses++; }
export function pressDash() { input.dashPresses++; }
export function pressJump() { input.jumpPresses++; }
export function setTouchStick(x: number, y: number, active: boolean) {
  input.touchX = x; input.touchY = y; input.touchActive = active; recompute();
}
export function setTouchBoost(v: boolean) { input.touchBoost = v; recompute(); }
export function setTouchFire(v: boolean) { input.touchFire = v; recompute(); }
export function setTouchAccel(v: boolean) { input.touchAccel = v; recompute(); }
export function setTouchBrake(v: boolean) { input.touchBrake = v; recompute(); }
export function setPedalMode(v: boolean) { resetInput(); input.pedalMode = v; recompute(); }
export const isTouchDevice = () => typeof window !== 'undefined' && (navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches);
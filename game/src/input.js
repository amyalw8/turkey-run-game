// Gobble Run — keyboard and mouse input. Keys are tracked as a held set
// plus edge-triggered presses (jump, dash, hide, pause, mute, start),
// so the game never misses a tap. Mouse clicks land as a "confirm".
const KEYMAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  ArrowDown: 'hide',
  KeyS: 'hide',
  Space: 'dash',
  Enter: 'confirm',
  KeyP: 'pause',
  KeyM: 'mute',
};

export function createInput() {
  const held = new Set();
  const pressed = new Set();
  let click = false;
  let clickX = 0;
  let clickY = 0;

  function onKeyDown(event) {
    const action = KEYMAP[event.code];
    if (!action) return;
    event.preventDefault();
    if (!event.repeat) pressed.add(action);
    held.add(action);
  }

  function onKeyUp(event) {
    const action = KEYMAP[event.code];
    if (!action) return;
    held.delete(action);
  }

  function onMouseDown(event) {
    click = true;
    clickX = event.clientX;
    clickY = event.clientY;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);

  return {
    held(action) {
      return held.has(action);
    },
    /** True once, on the frame the key went down. */
    pressed(action) {
      return pressed.has(action);
    },
    /** True once, on the frame a mouse button went down. */
    clicked() {
      return click;
    },
    clickPosition() {
      return { x: clickX, y: clickY };
    },
    /** Call at the end of each frame: edges are one frame wide. */
    endFrame() {
      pressed.clear();
      click = false;
    },
  };
}

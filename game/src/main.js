// Gobble Run — the game loop and the screens. Title, run, pause, caught
// and escaped live here; the world simulates in world.js, the canvas is
// painted by render.js and hud.js. A ?shot=start|run|kitchen|caught|
// escaped query stages one frozen frame for a screenshot instead.
import { VIEW } from './config.js';
import { createWorld, EVENT_HIT, EVENT_CAUGHT, EVENT_ESCAPED, EVENT_STAGE, EVENT_PICKUP, EVENT_BONUS, EVENT_HIDE, EVENT_DASH, EVENT_LUNGE, EVENT_SEARCH } from './world.js';
import { drawWorld } from './render.js';
import { drawHud, drawTitle, drawPaused, drawEnd, drawBanner } from './hud.js';
import { createInput } from './input.js';
import { sounds, unlockAudio, toggleMuted } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const input = createInput();
const world = createWorld(1);
const STEP = 1 / 60;

// The best escape survives a reload: the title screen shows it, and the
// end screen shows whether this run beat it.
let best = 0;
try {
  best = Number(window.localStorage.getItem('gobble-run-best') || 0) || 0;
} catch {
  best = 0;
}

let screen = 'title';
let banner = null;
let alarmOn = false;
let lastTime = 0;
let accumulator = 0;

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

function startRun() {
  world.reset((Math.random() * 1e9) | 0);
  screen = 'play';
  banner = null;
  alarmOn = false;
  unlockAudio();
  sounds.gobble();
  announce('The turkey is running. The farmer is behind you.');
}

function endRun() {
  screen = 'over';
  best = Math.max(best, world.state.score);
  try {
    window.localStorage.setItem('gobble-run-best', String(best));
  } catch {
    // Private mode or file:// with no storage: the run still counts.
  }
  announce(world.state.escaped ? 'Escaped! The turkey made it to the forest.' : 'Caught! The farmer got his turkey.');
}

function handleEvents(events) {
  if (events & EVENT_HIT) sounds.hit();
  if (events & EVENT_PICKUP) sounds.pickup();
  if (events & EVENT_BONUS) sounds.bonus();
  if (events & EVENT_HIDE) sounds.hide();
  if (events & EVENT_DASH) sounds.dash();
  if (events & EVENT_LUNGE) sounds.lunge();
  if (events & EVENT_SEARCH) sounds.search();
  if (events & EVENT_STAGE) {
    const stage = world.state.stage;
    banner = {
      text: `STAGE ${stage + 1} — ${['THE FARMYARD', 'THE BARNYARD', 'THE KITCHEN'][stage]}`,
      subtext: ['Run! The farmer is right behind you.', 'Through the barnyard — keep moving!', 'The kitchen! Dodge the oven and the knives!'][stage],
      until: world.state.time + 2.6,
    };
    sounds.bonus();
  }
  if (events & EVENT_ESCAPED) {
    sounds.win();
    endRun();
  } else if (events & EVENT_CAUGHT) {
    sounds.caught();
    endRun();
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min(0.1, (now - lastTime) / 1000 || 0);
  lastTime = now;
  const time = now / 1000;

  if (input.pressed('mute')) toggleMuted();
  if (screen === 'title') {
    if (input.pressed('confirm') || input.clicked()) {
      sounds.click();
      startRun();
    }
  } else if (screen === 'play') {
    if (input.pressed('pause')) {
      screen = 'paused';
      announce('Paused.');
    } else {
      if (input.pressed('jump')) sounds.jump();
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const controls = {
          left: input.held('left'),
          right: input.held('right'),
          jump: input.pressed('jump'),
          dash: input.pressed('dash'),
          hide: input.pressed('hide'),
        };
        handleEvents(world.step(STEP, controls));
        if (screen !== 'play') break;
      }
      // The farmer-close alarm, once per approach.
      if (world.state.farmerClose && !alarmOn) {
        alarmOn = true;
        sounds.alarm();
      } else if (!world.state.farmerClose) {
        alarmOn = false;
      }
      if (banner && world.state.time > banner.until) banner = null;
    }
  } else if (screen === 'paused') {
    if (input.pressed('pause') || input.pressed('confirm')) {
      screen = 'play';
      announce('Running again.');
    }
  } else if (screen === 'over') {
    if (input.pressed('confirm') || input.clicked()) {
      sounds.click();
      startRun();
    }
  }

  // --- draw ---
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawWorld(ctx, world.state, world.cameraX(), time);
  if (screen === 'play' || screen === 'paused') {
    drawHud(ctx, world.state, world.gap(), time);
    if (banner) drawBanner(ctx, banner.text, banner.subtext);
    if (screen === 'paused') drawPaused(ctx);
  } else if (screen === 'title') {
    drawTitle(ctx, best, time);
  } else if (screen === 'over') {
    drawEnd(ctx, world.state, best, time);
  }
  input.endFrame();
}

// A live read-out for play-testing: window.__gobbleRun always reflects
// the current screen, score, distance and lives.
Object.defineProperty(window, '__gobbleRun', {
  get() {
    return {
      screen,
      score: world.state.score,
      distance: Math.floor(world.state.distance),
      lives: world.state.lives,
      stage: world.state.stage,
      escaped: world.state.escaped,
      combo: world.state.player.combo,
      farmerMode: world.state.farmer.mode,
    };
  },
});

// --- screenshot mode: one frozen frame, no loop ---
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const staged = stageShot(shot, world);
  screen = staged.screen;
  best = staged.best;
  const time = 0.5;
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawWorld(ctx, world.state, world.cameraX(), time);
  if (screen === 'play') {
    drawHud(ctx, world.state, world.gap(), time);
  } else if (screen === 'title') {
    drawTitle(ctx, best, time);
  } else if (screen === 'over') {
    drawEnd(ctx, world.state, best, time);
  }
  document.title = `Gobble Run — shot ${shot}`;
} else {
  requestAnimationFrame(frame);
}

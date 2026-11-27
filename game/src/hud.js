// Gobble Run — the HUD (score, distance, lives, dash, farmer meter) and
// the title, pause and end screens. All text is drawn on the canvas so
// the screenshots show the whole game, menus included.
import { VIEW, WORLD, TURKEY } from './config.js';

function panel(ctx, x, y, w, h, alpha = 0.82) {
  ctx.fillStyle = `rgba(20, 12, 8, ${alpha})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 200, 100, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function heart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = filled ? '#ff2e4d' : 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.moveTo(0, size * 0.4);
  ctx.bezierCurveTo(-size, -size * 0.4, -size * 0.45, -size, 0, -size * 0.35);
  ctx.bezierCurveTo(size * 0.45, -size, size, -size * 0.4, 0, size * 0.4);
  ctx.fill();
  ctx.restore();
}

/** The in-play HUD: score, distance with stage marks, lives, dash, farmer. */
export function drawHud(ctx, state, gap, time) {
  const metres = Math.floor(state.distance);
  // Top bar.
  panel(ctx, 16, 14, VIEW.width - 32, 74, 0.66);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`SCORE ${state.score}`, 34, 48);
  ctx.fillStyle = '#fff3d6';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`${metres} m  /  ${WORLD.escapeMetres} m`, 34, 74);

  // Distance progress with stage marks.
  const barX = 330;
  const barW = 420;
  const barY = 34;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundBar(ctx, barX, barY, barW, 16);
  ctx.fill();
  ctx.fillStyle = '#ff9f1c';
  roundBar(ctx, barX, barY, barW * Math.min(1, metres / WORLD.escapeMetres), 16);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  for (const bound of WORLD.stageBounds.slice(1, 3)) {
    ctx.fillRect(barX + (barW * bound) / WORLD.escapeMetres - 1, barY - 4, 2, 24);
  }
  ctx.fillStyle = '#fff3d6';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(WORLD.stageNames[state.stage], barX, 74);

  // Lives.
  for (let i = 0; i < TURKEY.lives; i += 1) {
    heart(ctx, 800 + i * 34, 52, 15, i < state.lives);
  }
  // Dash readiness.
  const dashReady = state.player.dashCooldown <= 0;
  ctx.fillStyle = dashReady ? '#7ee081' : 'rgba(255,255,255,0.25)';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(dashReady ? 'DASH READY' : `DASH ${Math.ceil(state.player.dashCooldown)}s`, 920, 54);

  // Farmer meter: how far behind he is. Red and flashing when close.
  const meterX = 1080;
  const meterW = 150;
  const closeness = Math.max(0, Math.min(1, 1 - gap / 600));
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundBar(ctx, meterX, barY, meterW, 16);
  ctx.fill();
  const flashing = closeness > 0.75 && Math.floor(time * 6) % 2 === 0;
  ctx.fillStyle = flashing ? '#ff2e2e' : closeness > 0.5 ? '#ff9f1c' : '#7ee081';
  roundBar(ctx, meterX, barY, meterW * closeness, 16);
  ctx.fill();
  ctx.fillStyle = '#fff3d6';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('FARMER', meterX, 74);
  if (closeness > 0.75) {
    ctx.fillStyle = '#ff2e2e';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("HE'S RIGHT BEHIND YOU!", VIEW.width / 2, 128);
    ctx.textAlign = 'left';
  }
}

function roundBar(ctx, x, y, w, h) {
  const r = Math.min(8, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function centred(ctx, text, y, font, colour) {
  ctx.fillStyle = colour;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.fillText(text, VIEW.width / 2, y);
}

function controlsBlock(ctx, y) {
  const lines = [
    '← →  or  A / D — slow down / push ahead',
    '↑  or  W — jump     SPACE — dash',
    '↓  or  S — hide in a haystack (when close to one)',
    'P — pause     M — sound     ENTER — start / restart',
    'Mouse — click to start, too',
  ];
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#ffe9b0';
  ctx.textAlign = 'center';
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, y + i * 30));
  ctx.textAlign = 'left';
}

/** Title screen, drawn over the farmyard at dawn. */
export function drawTitle(ctx, best, time) {
  ctx.fillStyle = 'rgba(20, 8, 20, 0.45)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const bob = Math.sin(time * 2) * 6;
  centred(ctx, 'GOBBLE RUN', 168 + bob, 'bold 92px sans-serif', '#ffd60a');
  ctx.strokeStyle = 'rgba(20,12,8,0.8)';
  ctx.lineWidth = 8;
  ctx.strokeText('GOBBLE RUN', VIEW.width / 2, 168 + bob);
  centred(ctx, 'GOBBLE RUN', 168 + bob, 'bold 92px sans-serif', '#ffd60a');
  centred(ctx, 'The Great Turkey Escape', 224, 'bold 34px sans-serif', '#fff3d6');
  centred(ctx, 'Thanksgiving is tomorrow. The farmer has the carving knife.', 272, '22px sans-serif', '#ffe9b0');
  centred(ctx, `Run ${WORLD.escapeMetres} metres — farmyard, barnyard, kitchen — and reach the forest.`, 304, '22px sans-serif', '#ffe9b0');
  controlsBlock(ctx, 360);
  if (best > 0) {
    centred(ctx, `Best escape so far: ${best} points`, 548, 'bold 22px sans-serif', '#7ee081');
  }
  const pulse = 0.65 + 0.35 * Math.sin(time * 4);
  ctx.globalAlpha = pulse;
  centred(ctx, 'PRESS ENTER OR CLICK TO RUN', 620, 'bold 30px sans-serif', '#ffffff');
  ctx.globalAlpha = 1;
}

/** Pause overlay. */
export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(20, 8, 20, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  centred(ctx, 'PAUSED', 300, 'bold 72px sans-serif', '#ffd60a');
  centred(ctx, 'The turkey catches its breath. The farmer does not.', 360, '22px sans-serif', '#ffe9b0');
  centred(ctx, 'Press P or Enter to keep running', 410, 'bold 24px sans-serif', '#ffffff');
}

/** End screen: caught or escaped. */
export function drawEnd(ctx, state, best, time) {
  ctx.fillStyle = 'rgba(20, 8, 20, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  if (state.escaped) {
    centred(ctx, 'ESCAPED!', 190, 'bold 88px sans-serif', '#7ee081');
    centred(ctx, 'The turkey made it to the forest. Thanksgiving is cancelled.', 250, '26px sans-serif', '#fff3d6');
    centred(ctx, 'The farmer is still looking in the haystacks.', 288, '22px sans-serif', '#ffe9b0');
  } else {
    centred(ctx, 'CAUGHT!', 190, 'bold 88px sans-serif', '#ff2e4d');
    centred(ctx, 'The farmer got his turkey after all.', 250, '26px sans-serif', '#fff3d6');
    centred(ctx, 'Next time: jump the fences, dash past the knives, hide in the hay.', 288, '22px sans-serif', '#ffe9b0');
  }
  panel(ctx, VIEW.width / 2 - 260, 330, 520, 150);
  centred(ctx, `SCORE  ${state.score}`, 384, 'bold 40px sans-serif', '#ffd60a');
  centred(
    ctx,
    `Distance ${Math.floor(state.distance)} m  ·  Best ${Math.max(best, state.score)}`,
    428,
    '22px sans-serif',
    '#fff3d6',
  );
  const pulse = 0.65 + 0.35 * Math.sin(time * 4);
  ctx.globalAlpha = pulse;
  centred(ctx, 'PRESS ENTER OR CLICK TO RUN AGAIN', 560, 'bold 28px sans-serif', '#ffffff');
  ctx.globalAlpha = 1;
}

/** A short banner across the top (stage changes, warnings). */
export function drawBanner(ctx, text, subtext) {
  panel(ctx, VIEW.width / 2 - 330, 104, 660, 84, 0.78);
  centred(ctx, text, 140, 'bold 32px sans-serif', '#ffd60a');
  if (subtext) centred(ctx, subtext, 172, '20px sans-serif', '#fff3d6');
}

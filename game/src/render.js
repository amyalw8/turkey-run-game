// Gobble Run — every pixel the game shows, drawn with the canvas 2D
// API: the autumn farmyard and the kitchen, the turkey, the farmer and
// everything he throws at it. No images, no fonts from the network.
import { VIEW, WORLD, TURKEY, FARMER } from './config.js';

const GROUND = VIEW.groundY;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function stageOf(state) {
  return state.stage;
}

function drawSky(ctx, camX, stage) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  if (stage === 2) {
    sky.addColorStop(0, '#3a2a1e');
    sky.addColorStop(0.55, '#6b4226');
    sky.addColorStop(1, '#2a1a12');
  } else {
    sky.addColorStop(0, '#2e1a4e');
    sky.addColorStop(0.45, '#b34a6b');
    sky.addColorStop(0.75, '#ff8a3d');
    sky.addColorStop(1, '#ffc46b');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  if (stage === 2) {
    // Kitchen window: a cold blue night outside, warm inside.
    ctx.fillStyle = '#101c33';
    roundRect(ctx, 880, 90, 300, 220, 14);
    ctx.fill();
    ctx.fillStyle = '#f5ead0';
    ctx.beginPath();
    ctx.arc(1080, 160, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d9c9a3';
    ctx.fillRect(1022, 88, 10, 224);
    ctx.fillRect(878, 194, 304, 10);
    ctx.fillStyle = '#7a5a34';
    roundRect(ctx, 868, 78, 324, 244, 16);
    ctx.stroke();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#7a5a34';
    ctx.stroke();
    // A hanging lamp, warm light pooling below it. It hangs low enough
    // to clear the HUD bar at the top of the screen.
    ctx.strokeStyle = '#2a1a12';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(430, 92);
    ctx.lineTo(430, 132);
    ctx.stroke();
    ctx.fillStyle = '#3d2a18';
    ctx.beginPath();
    ctx.moveTo(396, 132);
    ctx.lineTo(464, 132);
    ctx.lineTo(448, 162);
    ctx.lineTo(412, 162);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 190, 90, 0.16)';
    ctx.beginPath();
    ctx.ellipse(430, 280, 150, 120, 0, 0, Math.PI * 2);
    ctx.fill();
    // A shelf with plates, and copper pans hanging by the window.
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(90, 300, 260, 12);
    ctx.fillStyle = '#f5ead0';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(130 + i * 80, 286, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9c9a3';
      ctx.beginPath();
      ctx.arc(130 + i * 80, 286, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f5ead0';
    }
    for (let i = 0; i < 3; i += 1) {
      const px = 560 + i * 74;
      ctx.strokeStyle = '#2a1a12';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, 190);
      ctx.lineTo(px, 214);
      ctx.stroke();
      ctx.fillStyle = '#b56a2e';
      ctx.beginPath();
      ctx.arc(px, 238, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a4a1e';
      ctx.beginPath();
      ctx.arc(px, 238, 15, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // Low autumn sun and drifting clouds. The sun sits on the left so it
  // never hides behind the centred title text.
  const sunX = 180 - (camX * 0.05) % 1400;
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(sunX, 150, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 220, 150, 0.35)';
  ctx.beginPath();
  ctx.arc(sunX, 150, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 235, 220, 0.5)';
  for (let i = 0; i < 4; i += 1) {
    const cx = ((i * 430 - camX * 0.12) % 1500 + 1500) % 1500 - 100;
    const cy = 70 + i * 42;
    ellipse(ctx, cx, cy, 90, 20);
    ctx.fill();
    ellipse(ctx, cx + 50, cy + 8, 60, 16);
    ctx.fill();
  }
}

function drawHills(ctx, camX, stage) {
  if (stage === 2) return;
  ctx.fillStyle = '#5c2a52';
  ctx.beginPath();
  ctx.moveTo(0, 470);
  for (let x = 0; x <= VIEW.width; x += 80) {
    const hill = Math.sin((x + camX * 0.25) * 0.004) * 46 + Math.sin((x + camX * 0.25) * 0.011) * 18;
    ctx.lineTo(x, 470 + hill);
  }
  ctx.lineTo(VIEW.width, VIEW.height);
  ctx.lineTo(0, VIEW.height);
  ctx.closePath();
  ctx.fill();
  // Bare autumn trees on the ridge. They ride the SAME parallax as the
  // hills (0.25) and stand on the hill line itself: the old trees used a
  // different parallax and a guessed height, so they floated in mid-air.
  const hillY = (x) => 470 + Math.sin((x + camX * 0.25) * 0.004) * 46 + Math.sin((x + camX * 0.25) * 0.011) * 18;
  ctx.strokeStyle = '#3d1c38';
  ctx.lineWidth = 7;
  for (let i = 0; i < 5; i += 1) {
    const tx = ((i * 337 - camX * 0.25) % 1500 + 1500) % 1500 - 80;
    const ty = hillY(tx);
    ctx.fillStyle = '#4a2138';
    ellipse(ctx, tx, ty + 2, 34, 8);
    ctx.fill();
    ctx.strokeStyle = '#3d1c38';
    ctx.beginPath();
    ctx.moveTo(tx, ty + 2);
    ctx.lineTo(tx, ty - 58);
    ctx.moveTo(tx, ty - 40);
    ctx.lineTo(tx - 26, ty - 72);
    ctx.moveTo(tx, ty - 48);
    ctx.lineTo(tx + 24, ty - 78);
    ctx.stroke();
  }
}

function drawBarn(ctx, camX, stage) {
  if (stage === 2) return;
  // A red barn and a farmhouse drift past in the distance.
  const bx = 420 - (camX * 0.45) % 2600;
  if (bx > -260 && bx < VIEW.width + 260) {
    ctx.fillStyle = '#7e2f26';
    ctx.fillRect(bx, 380, 220, 130);
    ctx.beginPath();
    ctx.moveTo(bx - 12, 382);
    ctx.lineTo(bx + 110, 318);
    ctx.lineTo(bx + 232, 382);
    ctx.closePath();
    ctx.fillStyle = '#5e211c';
    ctx.fill();
    ctx.fillStyle = '#f5ead0';
    ctx.fillRect(bx + 88, 430, 44, 80);
    ctx.fillStyle = '#2e1a4e';
    ctx.fillRect(bx + 30, 410, 34, 34);
    ctx.fillRect(bx + 156, 410, 34, 34);
  }
  const hx = 1500 - (camX * 0.45) % 2600;
  if (hx > -260 && hx < VIEW.width + 260) {
    ctx.fillStyle = '#e8d9b0';
    ctx.fillRect(hx, 420, 170, 90);
    ctx.fillStyle = '#8a4a2b';
    ctx.beginPath();
    ctx.moveTo(hx - 10, 422);
    ctx.lineTo(hx + 85, 360);
    ctx.lineTo(hx + 180, 422);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2e1a4e';
    ctx.fillRect(hx + 28, 448, 30, 30);
    ctx.fillRect(hx + 112, 448, 30, 30);
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(hx + 70, 460, 32, 50);
  }
}

function drawGround(ctx, camX, stage) {
  if (stage === 2) {
    // Kitchen floor: warm wood planks and a rug.
    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(0, GROUND, VIEW.width, VIEW.height - GROUND);
    ctx.strokeStyle = '#54371f';
    ctx.lineWidth = 3;
    for (let y = GROUND + 26; y < VIEW.height; y += 26) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW.width, y);
      ctx.stroke();
    }
    // A rug on the kitchen floor, pinned to the world so it scrolls past
    // like the floorboards instead of sitting fixed on the screen.
    const rugX = 240 - ((camX % 1100) + 1100) % 1100;
    ctx.fillStyle = '#a33327';
    roundRect(ctx, rugX, GROUND + 22, 420, 46, 10);
    ctx.fill();
    ctx.fillStyle = '#c98a2e';
    roundRect(ctx, rugX + 20, GROUND + 32, 380, 26, 8);
    ctx.fill();
    return;
  }
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(0, GROUND, VIEW.width, VIEW.height - GROUND);
  ctx.fillStyle = '#5d9b4a';
  ctx.fillRect(0, GROUND - 6, VIEW.width, 12);
  // Dirt speckles and grass tufts, pinned to the world.
  ctx.fillStyle = '#8f6538';
  for (let x = -((camX % 90) + 90) % 90; x < VIEW.width; x += 90) {
    ellipse(ctx, x + 30, GROUND + 40, 26, 7);
    ctx.fill();
    ellipse(ctx, x + 66, GROUND + 84, 20, 6);
    ctx.fill();
  }
  ctx.strokeStyle = '#4c7a38';
  ctx.lineWidth = 3;
  for (let x = -((camX % 130) + 130) % 130; x < VIEW.width; x += 130) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND - 4);
    ctx.lineTo(x - 6, GROUND - 18);
    ctx.moveTo(x + 8, GROUND - 4);
    ctx.lineTo(x + 12, GROUND - 16);
    ctx.stroke();
  }
}

function drawTurkey(ctx, player, time) {
  const x = player.x;
  const y = player.y;
  const w = TURKEY.width;
  const h = TURKEY.height;
  const legSwing = player.onGround ? Math.sin(player.runPhase) * 10 : 0;
  const blink = player.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.35;

  ctx.save();
  ctx.translate(x, y);
  // Fanned tail, behind the body: five feathers spreading up and back.
  const tailColors = ['#b57708', '#d99a16', '#8a5a2b', '#e8b93e', '#a8641a'];
  for (let i = 0; i < 5; i += 1) {
    const tilt = (i - 2) * 0.3; // fan spread across the rear
    ctx.save();
    ctx.translate(2, -42);
    ctx.rotate(tilt - 0.35); // lean the whole fan back a little
    ctx.fillStyle = tailColors[i];
    ctx.beginPath();
    ctx.ellipse(0, -24, 8, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d3a12';
    ctx.beginPath();
    ctx.ellipse(0, -44, 4.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Legs, mid-stride.
  ctx.strokeStyle = '#e8912d';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(8, -14);
  ctx.lineTo(8 + legSwing, 0);
  ctx.moveTo(26, -14);
  ctx.lineTo(26 - legSwing, 0);
  ctx.stroke();
  // Body.
  ctx.fillStyle = '#8a5a2b';
  ellipse(ctx, 14, -30, 32, 24);
  ctx.fill();
  ctx.fillStyle = '#a06a33';
  ellipse(ctx, 20, -36, 22, 16);
  ctx.fill();
  // Wing, flapping with the run.
  ctx.fillStyle = '#6e451f';
  ctx.save();
  ctx.translate(6, -32);
  ctx.rotate(Math.sin(player.runPhase * 1.4) * 0.5 - 0.3);
  ellipse(ctx, 0, 0, 20, 11);
  ctx.fill();
  ctx.restore();
  // Head, beak, wattle, eye.
  ctx.fillStyle = '#8a5a2b';
  ctx.beginPath();
  ctx.arc(42, -56, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff9f1c';
  ctx.beginPath();
  ctx.moveTo(52, -60);
  ctx.lineTo(66, -54);
  ctx.lineTo(52, -50);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d92038';
  ctx.beginPath();
  ctx.ellipse(50, -44, 5, 9, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d1d1d';
  ctx.beginPath();
  ctx.arc(45, -60, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(46, -61, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawFarmer(ctx, farmer, time, gap) {
  const x = farmer.x;
  const y = GROUND;
  const legSwing = Math.sin(farmer.runPhase) * 12;
  ctx.save();
  ctx.translate(x, y);
  // Legs in overalls.
  ctx.strokeStyle = '#2f4d7a';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-6, -44);
  ctx.lineTo(-6 + legSwing, 0);
  ctx.moveTo(14, -44);
  ctx.lineTo(14 - legSwing, 0);
  ctx.stroke();
  // Plaid shirt.
  ctx.fillStyle = '#c0392b';
  roundRect(ctx, -14, -86, 56, 46, 8);
  ctx.fill();
  ctx.strokeStyle = '#7e241a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-14, -70);
  ctx.lineTo(42, -70);
  ctx.moveTo(-14, -56);
  ctx.lineTo(42, -56);
  ctx.moveTo(4, -86);
  ctx.lineTo(4, -40);
  ctx.moveTo(24, -86);
  ctx.lineTo(24, -40);
  ctx.stroke();
  // Overalls straps and pocket.
  ctx.fillStyle = '#2f4d7a';
  ctx.fillRect(-2, -86, 8, 30);
  ctx.fillRect(20, -86, 8, 30);
  ctx.fillRect(-8, -58, 44, 18);
  // Head with straw hat.
  ctx.fillStyle = '#f0c297';
  ctx.beginPath();
  ctx.arc(16, -98, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c93e';
  ellipse(ctx, 16, -108, 30, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(16, -112, 13, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#8a6d1f';
  ctx.fillRect(3, -112, 26, 5);
  // Angry brows, eyes, moustache.
  ctx.strokeStyle = '#3a2410';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(6, -104);
  ctx.lineTo(14, -101);
  ctx.moveTo(26, -101);
  ctx.lineTo(20, -104);
  ctx.stroke();
  ctx.fillStyle = '#1d1d1d';
  ctx.beginPath();
  ctx.arc(11, -98, 2.4, 0, Math.PI * 2);
  ctx.arc(23, -98, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6b4226';
  ctx.beginPath();
  ctx.ellipse(17, -90, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pitchfork, raised and ready.
  ctx.save();
  ctx.translate(44, -80);
  ctx.rotate(-0.5 + Math.sin(farmer.runPhase * 0.7) * 0.08);
  ctx.strokeStyle = '#7a5230';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 80);
  ctx.lineTo(0, -30);
  ctx.stroke();
  ctx.strokeStyle = '#c8c8c8';
  ctx.lineWidth = 4;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 8, -30);
    ctx.lineTo(i * 8, -46);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
  // "!" when he is closing in.
  if (gap < 170) {
    ctx.fillStyle = '#ff2e2e';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', x + 20, y - 150 + Math.sin(time * 8) * 6);
  }
}

function drawObstacle(ctx, obstacle, time) {
  const { kind, x, width, height } = obstacle;
  const top = GROUND - height;
  if (kind === 'fence') {
    ctx.fillStyle = '#8a6a42';
    ctx.fillRect(x, top, 10, height);
    ctx.fillRect(x + width - 10, top, 10, height);
    ctx.fillStyle = '#a8845a';
    ctx.fillRect(x - 4, top + 10, width + 8, 10);
    ctx.fillRect(x - 4, top + 34, width + 8, 10);
  } else if (kind === 'bale') {
    ctx.fillStyle = '#d9a83e';
    ctx.beginPath();
    ctx.arc(x + width / 2, GROUND - height / 2 + 8, height / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a67c1e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + width / 2, GROUND - height / 2 + 8, height / 2 - 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + width / 2, GROUND - height / 2 + 8, height / 2 - 22, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 'mud') {
    ctx.fillStyle = '#5a3a22';
    ellipse(ctx, x + width / 2, GROUND - 4, width / 2, 10);
    ctx.fill();
    ctx.fillStyle = '#7a5230';
    ellipse(ctx, x + width / 2 - 18, GROUND - 6, 22, 5);
    ctx.fill();
  } else if (kind === 'oven') {
    // A big farmhouse oven, door glowing, chimney puffing.
    ctx.fillStyle = 'rgba(255, 123, 28, 0.18)';
    ellipse(ctx, x + width / 2, top + 52, width, 70);
    ctx.fill();
    ctx.fillStyle = '#3d3d3d';
    roundRect(ctx, x, top, width, height + 4, 8);
    ctx.fill();
    ctx.fillStyle = '#ff7b1c';
    roundRect(ctx, x + 22, top + 30, width - 44, 44, 6);
    ctx.fill();
    ctx.fillStyle = '#ffd60a';
    roundRect(ctx, x + 32, top + 40, width - 64, 24, 4);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 14, top + 8, width - 28, 12);
    ctx.fillStyle = '#c8c8c8';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(x + 34 + i * 22, top + 14, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#3d3d3d';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(x + width - 30, top);
    ctx.lineTo(x + width - 30, top - 46);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 240, 200, ${0.25 + 0.15 * Math.sin(time * 6)})`;
    ellipse(ctx, x + width - 30, top - 58, 26, 12);
    ctx.fill();
  }
}

function drawPickup(ctx, pickup, time) {
  const bob = Math.sin(time * 4 + pickup.phase) * 6;
  const x = pickup.x;
  const y = pickup.y + bob;
  if (pickup.kind === 'gold') {
    // Golden corn: bright gold, with a sparkle — it hangs high for a reason.
    ctx.fillStyle = '#ffd60a';
    ellipse(ctx, x, y, 15, 27);
    ctx.fill();
    ctx.fillStyle = '#fff3b0';
    ellipse(ctx, x - 4, y - 8, 5, 10);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 240, 170, ${0.6 + 0.4 * Math.sin(time * 6 + pickup.phase)})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const a = (i * Math.PI) / 2 + time * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20);
      ctx.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30);
      ctx.stroke();
    }
    return;
  }
  if (pickup.kind === 'corn') {
    // A corn cob: yellow kernels in rows, green husk leaves at the base.
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 16);
    ctx.quadraticCurveTo(x - 20, y + 34, x - 24, y + 44);
    ctx.quadraticCurveTo(x - 8, y + 40, x - 2, y + 22);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 16);
    ctx.quadraticCurveTo(x + 20, y + 34, x + 24, y + 44);
    ctx.quadraticCurveTo(x + 8, y + 40, x + 2, y + 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd60a';
    ellipse(ctx, x, y, 13, 24);
    ctx.fill();
    ctx.fillStyle = '#d9a400';
    for (let row = -2; row <= 2; row += 1) {
      for (let col = -1; col <= 1; col += 1) {
        ctx.beginPath();
        ctx.arc(x + col * 6, y + row * 9, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    ctx.fillStyle = '#ff7b1c';
    ellipse(ctx, x, y + 8, 24, 20);
    ctx.fill();
    ctx.strokeStyle = '#d95d00';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.ellipse(x + i * 8, y + 8, 5, 18, i * 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#4c7a38';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 4, y - 22);
    ctx.stroke();
  }
}

function drawHaystack(ctx, haystack, hidden, time) {
  const { x, width, height } = haystack;
  ctx.fillStyle = '#e8b93e';
  ctx.beginPath();
  ctx.moveTo(x, GROUND);
  ctx.quadraticCurveTo(x + width / 2, GROUND - height * 1.5, x + width, GROUND);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#b8892a';
  ctx.lineWidth = 3;
  for (let i = 1; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + (width * i) / 5, GROUND - 8);
    ctx.quadraticCurveTo(x + (width * i) / 5 + 8, GROUND - height * 0.6, x + (width * i) / 5, GROUND - height * 0.9);
    ctx.stroke();
  }
  if (hidden) {
    // Tail feathers poking out of the hay — the farmer never notices.
    ctx.fillStyle = '#b57708';
    ctx.save();
    ctx.translate(x + width / 2, GROUND - height * 0.85);
    ctx.rotate(Math.sin(time * 3) * 0.1);
    ellipse(ctx, -8, -16, 6, 18);
    ctx.fill();
    ellipse(ctx, 8, -16, 6, 18);
    ctx.fill();
    ctx.restore();
  }
}

function drawKnife(ctx, knife) {
  ctx.save();
  ctx.translate(knife.x, knife.y);
  ctx.rotate(knife.angle);
  ctx.fillStyle = '#dfe6ee';
  ctx.beginPath();
  ctx.moveTo(-26, -5);
  ctx.lineTo(14, -5);
  ctx.lineTo(28, 0);
  ctx.lineTo(14, 5);
  ctx.lineTo(-26, 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5a3a22';
  ctx.fillRect(-38, -5, 14, 10);
  ctx.restore();
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.colour;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCornRow(ctx, camX, stage) {
  if (stage === 2) return;
  // A midground row of corn stalks: fills the empty band between the
  // hills and the ground, and sells the speed as it scrolls past.
  const step = 170;
  const offset = -((camX * 0.55) % step + step) % step;
  for (let x = offset - step; x < VIEW.width + step; x += step) {
    const sway = Math.sin((x + camX) * 0.01) * 4;
    ctx.strokeStyle = '#3f6b2a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, GROUND - 4);
    ctx.quadraticCurveTo(x + sway, GROUND - 44, x + sway * 2, GROUND - 78);
    ctx.stroke();
    ctx.strokeStyle = '#557d33';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, GROUND - 34);
    ctx.quadraticCurveTo(x - 16, GROUND - 44, x - 26, GROUND - 30);
    ctx.moveTo(x, GROUND - 52);
    ctx.quadraticCurveTo(x + 16, GROUND - 62, x + 26, GROUND - 48);
    ctx.stroke();
    ctx.fillStyle = '#e8b93e';
    ellipse(ctx, x + sway * 2 + 6, GROUND - 62, 6, 12);
    ctx.fill();
  }
}

/** Draw the running world. The HUD and screens are drawn by hud.js. */
export function drawWorld(ctx, state, camX, time) {
  const stage = stageOf(state);
  drawSky(ctx, camX, stage);
  drawHills(ctx, camX, stage);
  drawBarn(ctx, camX, stage);
  drawGround(ctx, camX, stage);
  drawCornRow(ctx, camX, stage);

  ctx.save();
  ctx.translate(-camX, 0);
  for (const haystack of state.haystacks) {
    const hidden = state.player.hidden && Math.abs(haystack.x + haystack.width / 2 - (state.player.x + TURKEY.width / 2)) < 130;
    drawHaystack(ctx, haystack, hidden, time);
  }
  for (const obstacle of state.obstacles) drawObstacle(ctx, obstacle, time);
  for (const pickup of state.pickups) {
    if (!pickup.taken) drawPickup(ctx, pickup, time);
  }
  for (const knife of state.knives) drawKnife(ctx, knife);
  drawFarmer(ctx, state.farmer, time, state.player.x - state.farmer.x);
  if (!state.player.hidden) {
    drawTurkey(ctx, state.player, time);
  } else {
    // Hidden in the hay: only a faint rustle shows where he is.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('...', state.player.x + 30, GROUND - 110);
  }
  drawParticles(ctx, state.particles);
  ctx.restore();
}

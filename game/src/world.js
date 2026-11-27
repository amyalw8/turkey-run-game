// Gobble Run — the world: the turkey, the farmer chasing it, the
// obstacles and pickups ahead, the three stages from farmyard to kitchen.
// Everything here is pure simulation: no drawing, no sound, no input —
// step(dt, controls) advances it one frame and reports what happened.
import { VIEW, WORLD, TURKEY, FARMER, SCORING, SPAWN } from './config.js';
import { makeRandom } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1 << 0;
export const EVENT_CAUGHT = 1 << 1;
export const EVENT_ESCAPED = 1 << 2;
export const EVENT_STAGE = 1 << 3;
export const EVENT_PICKUP = 1 << 4;
export const EVENT_BONUS = 1 << 5;
export const EVENT_HIDE = 1 << 6;
export const EVENT_DASH = 1 << 7;

const GROUND = VIEW.groundY;

function stageAt(metres) {
  if (metres >= WORLD.stageBounds[2]) return 2;
  if (metres >= WORLD.stageBounds[1]) return 1;
  return 0;
}

/** A fresh run. `seed` fixes every spawn, so a screenshot replays exactly. */
export function createWorld(seed = 1) {
  // `let`, not `const`: reset() re-seeds this same generator, so a new
  // run really is a new layout instead of continuing the old sequence.
  let rng = makeRandom(seed);
  const state = {
    time: 0,
    seed,
    distance: 0, // metres run
    score: 0,
    bonusScore: 0,
    lives: TURKEY.lives,
    stage: 0,
    over: false,
    escaped: false,
    player: {
      x: 0,
      y: GROUND,
      vy: 0,
      onGround: true,
      runPhase: 0,
      dashTimer: 0,
      dashCooldown: 0,
      hideTimer: 0,
      hideCooldown: 0,
      invulnerable: 0,
      hidden: false,
      inMud: false,
    },
    farmer: {
      x: -FARMER.respawnGap,
      throwTimer: FARMER.throwEvery,
      stumbleTimer: 0,
      runPhase: 0,
    },
    obstacles: [],
    pickups: [],
    haystacks: [],
    knives: [],
    particles: [],
    spawnCursor: SPAWN.firstGap,
    alarmRaised: false,
  };

  function spawnAhead() {
    const ahead = state.player.x + VIEW.width + 500;
    while (state.spawnCursor < ahead) {
      const x = state.spawnCursor;
      const stage = stageAt(x / WORLD.pxPerMetre);
      const roll = rng.next();
      if (stage === 2) {
        // The kitchen: ovens to jump, knives raining, little cover.
        // No fences in a kitchen — the hazards are the oven and the knives.
        if (roll < 0.40) {
          state.obstacles.push({ kind: 'oven', x, width: 150, height: 96, passed: false });
        } else if (roll < 0.62) {
          state.knives.push({ kind: 'falling', x: x + rng.range(0, 160), y: -30, vx: rng.range(-40, 40), vy: rng.range(260, 330), spin: rng.range(-9, 9), angle: 0 });
        } else if (roll < 0.74) {
          state.pickups.push({ kind: 'corn', x, y: GROUND - 120, taken: false, phase: rng.range(0, 6) });
        } else if (roll < 0.86) {
          state.obstacles.push({ kind: 'mud', x, width: 130, height: 18, passed: false });
        } else {
          state.pickups.push({ kind: 'pumpkin', x, y: GROUND - 44, taken: false, phase: rng.range(0, 6) });
        }
      } else {
        // Farmyard and barnyard: fences, bales, mud, corn, haystacks.
        if (roll < 0.26) {
          state.obstacles.push({ kind: 'fence', x, width: 56, height: 62, passed: false });
        } else if (roll < 0.46) {
          state.obstacles.push({ kind: 'bale', x, width: 84, height: 70, passed: false });
        } else if (roll < 0.58) {
          state.obstacles.push({ kind: 'mud', x, width: 130, height: 18, passed: false });
        } else if (roll < 0.74) {
          state.pickups.push({ kind: 'corn', x, y: GROUND - 120, taken: false, phase: rng.range(0, 6) });
        } else if (roll < 0.86) {
          state.pickups.push({ kind: 'pumpkin', x, y: GROUND - 44, taken: false, phase: rng.range(0, 6) });
        } else {
          state.haystacks.push({ kind: 'haystack', x, width: 130, height: 92, used: false });
        }
      }
      const gap = rng.range(SPAWN.minGap, SPAWN.maxGap) * (stage === 2 ? 0.95 : 1);
      state.spawnCursor += gap;
    }
  }

  function burst(x, y, colour, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = rng.range(0, Math.PI * 2);
      const v = rng.range(speed * 0.4, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 120,
        life: rng.range(0.4, 0.9),
        maxLife: 0.9,
        colour,
        size: rng.range(3, 7),
      });
    }
  }

  function hurtPlayer(events) {
    const player = state.player;
    if (player.invulnerable > 0 || state.over) return events;
    state.lives -= 1;
    player.invulnerable = TURKEY.invulnerableSeconds;
    state.farmer.x += FARMER.stumbleGain;
    burst(player.x + 20, player.y - 30, '#fff3d6', 14, 260);
    burst(player.x + 20, player.y - 30, '#8a5a2b', 10, 200);
    if (state.lives <= 0) {
      state.over = true;
      return events | EVENT_HIT | EVENT_CAUGHT;
    }
    return events | EVENT_HIT;
  }

  function step(dt, controls) {
    if (state.over) return EVENT_NONE;
    let events = EVENT_NONE;
    const player = state.player;
    const farmer = state.farmer;
    state.time += dt;

    // --- the turkey's own speed, before the world pushes back ---
    const speed = Math.min(
      TURKEY.maxSpeed,
      TURKEY.baseSpeed + state.distance * TURKEY.speedGain,
    );
    let pace = 1;
    if (controls.left) pace = TURKEY.slowFactor;
    if (controls.right) pace = TURKEY.pushFactor;
    if (player.inMud) pace *= 0.7;

    // --- hide in a haystack: hold still, the farmer loses the trail ---
    if (player.hideTimer > 0) {
      player.hideTimer -= dt;
      player.hidden = true;
      if (player.hideTimer <= 0) {
        player.hidden = false;
        farmer.x -= 160;
        player.hideCooldown = TURKEY.hideCooldown;
      }
    } else if (controls.hide && player.hideCooldown <= 0 && player.onGround) {
      const near = state.haystacks.find(
        (h) => !h.used && Math.abs(h.x + h.width / 2 - (player.x + TURKEY.width / 2)) < 130,
      );
      if (near) {
        near.used = true;
        player.hideTimer = TURKEY.hideSeconds;
        player.hidden = true;
        events |= EVENT_HIDE;
      }
    }

    // --- jump and dash ---
    if (controls.jump && player.onGround && !player.hidden) {
      player.vy = TURKEY.jumpVelocity;
      player.onGround = false;
    }
    if (controls.dash && player.dashCooldown <= 0 && !player.hidden) {
      player.dashTimer = TURKEY.dashSeconds;
      player.dashCooldown = TURKEY.dashCooldown;
      events |= EVENT_DASH;
    }

    // --- move the turkey ---
    const dashing = player.dashTimer > 0;
    if (player.dashTimer > 0) player.dashTimer -= dt;
    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    if (player.hideCooldown > 0) player.hideCooldown -= dt;
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (!player.hidden) {
      player.x += (dashing ? TURKEY.dashSpeed : speed * pace) * dt;
      player.runPhase += dt * (dashing ? 26 : 16);
    }
    if (!player.onGround) {
      player.vy += TURKEY.gravity * dt;
      player.y += player.vy * dt;
      if (player.y >= GROUND) {
        player.y = GROUND;
        player.vy = 0;
        player.onGround = true;
      }
    }

    // --- the farmer: he runs at a share of your speed, faster when you
    // pull away, slower when he is on your tail, and he throws knives ---
    const ratio = state.stage === 2 ? FARMER.kitchenRatio : FARMER.baseRatio;
    const gap = player.x - farmer.x;
    let farmerSpeed = speed * ratio;
    if (gap > FARMER.catchupGap) farmerSpeed *= FARMER.catchupFactor;
    if (gap < FARMER.closeGap) farmerSpeed *= FARMER.closeFactor;
    if (player.hidden) farmerSpeed *= 0.25;
    if (farmer.stumbleTimer > 0) {
      farmer.stumbleTimer -= dt;
      farmerSpeed *= 0.4;
    }
    farmer.x += farmerSpeed * dt;
    farmer.runPhase += dt * 14;
    farmer.throwTimer -= dt;
    if (farmer.throwTimer <= 0 && gap < 760 && gap > 60) {
      farmer.throwTimer = FARMER.throwEvery * (state.stage === 2 ? 0.7 : 1);
      state.knives.push({
        kind: 'thrown',
        x: farmer.x + FARMER.width,
        y: GROUND - 150,
        vx: 360,
        vy: -260,
        spin: 12,
        angle: 0,
      });
    }
    // The farmer trips over anything you jumped: comic, and it buys room.
    for (const obstacle of state.obstacles) {
      if (!obstacle.passed && obstacle.x + obstacle.width < farmer.x) {
        obstacle.passed = true;
        if ((obstacle.kind === 'fence' || obstacle.kind === 'bale') && rng.chance(0.5)) {
          farmer.stumbleTimer = 0.6;
        }
      }
    }

    // --- caught? A catch cannot land while the turkey is flashing
    // invulnerable from a stumble, so one mistake never costs two lives. ---
    if (player.invulnerable <= 0 && farmer.x + FARMER.width >= player.x + 6) {
      state.lives -= 1;
      burst(player.x + 20, player.y - 30, '#fff3d6', 16, 280);
      if (state.lives <= 0) {
        state.over = true;
        return events | EVENT_CAUGHT;
      }
      farmer.x = player.x - FARMER.respawnGap;
      player.invulnerable = 2;
      events |= EVENT_CAUGHT;
    }

    // --- distance, stage, score ---
    state.distance = player.x / WORLD.pxPerMetre;
    const stage = stageAt(state.distance);
    if (stage !== state.stage) {
      state.stage = stage;
      state.bonusScore += SCORING.stageBonus;
      events |= EVENT_STAGE | EVENT_BONUS;
    }
    state.score = Math.floor(state.distance) * SCORING.perMetre + state.bonusScore;
    if (state.distance >= WORLD.escapeMetres) {
      state.escaped = true;
      state.over = true;
      state.bonusScore += SCORING.escapeBonus + state.lives * SCORING.lifeBonus;
      state.score = Math.floor(state.distance) * SCORING.perMetre + state.bonusScore;
      return events | EVENT_ESCAPED;
    }

    // --- spawn what lies ahead, drop what fell behind ---
    spawnAhead();
    const camX = player.x - 300;
    const keep = (list) => list.filter((e) => e.x + (e.width ?? 60) > camX - 260);
    state.obstacles = keep(state.obstacles);
    state.pickups = keep(state.pickups);
    state.haystacks = keep(state.haystacks);
    state.knives = state.knives.filter((k) => k.y < VIEW.height + 80 && k.x > camX - 260 && k.x < player.x + VIEW.width + 400);

    // --- knives fly ---
    for (const knife of state.knives) {
      knife.x += knife.vx * dt;
      knife.angle += knife.spin * dt;
      if (knife.kind === 'thrown') {
        knife.vy += 900 * dt;
        knife.y += knife.vy * dt;
      } else {
        knife.y += knife.vy * dt;
        knife.x += Math.sin(state.time * 2 + knife.x * 0.01) * 20 * dt;
      }
      // A knife that meets the turkey costs a life.
      if (
        player.invulnerable <= 0 && !player.hidden &&
        knife.x > player.x - 8 && knife.x < player.x + TURKEY.width + 8 &&
        knife.y > player.y - TURKEY.height - 6 && knife.y < player.y + 6
      ) {
        knife.y = VIEW.height + 999;
        events = hurtPlayer(events);
      }
    }
    state.knives = state.knives.filter((k) => k.y < VIEW.height + 80);

    // --- obstacles: jump them or stumble ---
    player.inMud = false;
    const feet = player.y;
    const top = player.y - TURKEY.height;
    for (const obstacle of state.obstacles) {
      const overlapX = obstacle.x < player.x + TURKEY.width - 10 && obstacle.x + obstacle.width > player.x + 10;
      if (!overlapX) continue;
      if (obstacle.kind === 'mud') {
        if (player.onGround) player.inMud = true;
        continue;
      }
      const obstacleTop = GROUND - obstacle.height;
      // Forgiving edge: clipping the top of an obstacle still clears it.
      if (feet > obstacleTop + 22 && top < GROUND) {
        // The turkey's feet are below the top: it ran into the obstacle.
        if (player.invulnerable <= 0 && !player.hidden) {
          events = hurtPlayer(events);
          player.x = obstacle.x + obstacle.width + 12;
        }
      }
    }

    // --- pickups ---
    for (const pickup of state.pickups) {
      if (pickup.taken) continue;
      const dx = pickup.x - (player.x + TURKEY.width / 2);
      const dy = pickup.y - (player.y - TURKEY.height / 2);
      if (Math.abs(dx) < 52 && Math.abs(dy) < 58) {
        pickup.taken = true;
        if (pickup.kind === 'pumpkin') {
          // A pumpkin is a feast: points, and a life back if one is missing.
          state.bonusScore += SCORING.pumpkin;
          if (state.lives < TURKEY.lives) state.lives += 1;
        } else {
          state.bonusScore += SCORING.corn;
        }
        farmer.x -= 120; // a snack buys a little daylight
        burst(pickup.x, pickup.y, pickup.kind === 'pumpkin' ? '#ff9f1c' : '#ffd60a', 10, 160);
        events |= EVENT_PICKUP;
      }
    }

    // --- particles ---
    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 500 * dt;
      particle.life -= dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);

    // --- the farmer-close alarm (the HUD flashes on it) ---
    const close = player.x - farmer.x < 150;
    if (close && !state.alarmRaised) state.alarmRaised = true;
    if (!close) state.alarmRaised = false;
    state.farmerClose = close;

    return events;
  }

  function reset(seed = 1) {
    const fresh = createWorld(seed);
    // Re-seed the generator this world actually steps with: without this,
    // a reset run would keep spawning from the previous run's sequence.
    rng = makeRandom(seed);
    Object.assign(state, fresh);
  }

  return {
    state,
    step,
    reset,
    cameraX() {
      return state.player.x - 300;
    },
    gap() {
      return state.player.x - state.farmer.x;
    },
  };
}

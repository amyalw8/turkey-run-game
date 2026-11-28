// Gobble Run — the world: the turkey, the farmer chasing it, the
// obstacles and pickups ahead, the three stages from farmyard to kitchen.
// Everything here is pure simulation: no drawing, no sound, no input —
// step(dt, controls) advances it one frame and reports what happened.
import { VIEW, WORLD, TURKEY, FARMER, COMBO, SCORING, SPAWN } from './config.js';
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
export const EVENT_LUNGE = 1 << 8; // the farmer wound up a lunge
export const EVENT_SEARCH = 1 << 9; // the farmer started searching the hay

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
      dustTimer: 0,
      combo: 0, // chained pickups: 0, 1, 2, 3 — the score multiplier
      comboTimer: 0, // seconds left to keep the chain alive
    },
    farmer: {
      x: -FARMER.respawnGap,
      throwTimer: FARMER.throwEvery,
      stumbleTimer: 0,
      runPhase: 0,
      mode: 'chase', // chase | search — searching the wrong haystack
      searchTimer: 0,
      searchX: 0, // the wrong haystack he walks to
      lungeWindup: 0, // telegraph, standing still
      lungeTimer: 0, // the burst itself
      lungeCooldown: 0,
      recoverTimer: 0, // winded after a missed lunge: standing still
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
    // Sometimes two fences or bales stand close together: one jump clears
    // the first and lands the turkey on the second, so the player has to
    // jump again or dash through. A jump-only player has to think.
    function maybeDouble(kind, width, height) {
      if (!rng.chance(0.25)) return;
      const x2 = state.spawnCursor + rng.range(180, 260);
      state.obstacles.push({ kind, x: x2, width, height, passed: false });
    }
    while (state.spawnCursor < ahead) {
      const x = state.spawnCursor;
      const stage = stageAt(x / WORLD.pxPerMetre);
      const roll = rng.next();
      if (stage === 2) {
        // The kitchen: ovens to jump, knives raining, little cover.
        // No fences in a kitchen — the hazards are the oven and the knives.
        if (roll < 0.38) {
          state.obstacles.push({ kind: 'oven', x, width: 150, height: 96, passed: false });
        } else if (roll < 0.68) {
          // A falling knife: most are aimed where the turkey will be when
          // they land (fall time ~2.1s), so the player has to change pace
          // — slow down and let it land ahead, or dash past it. A few
          // still fall at random, for variety.
          const vy = rng.range(260, 330);
          const fallTime = (GROUND + 30) / vy;
          const turkeySpeed = Math.min(TURKEY.maxSpeed, TURKEY.baseSpeed + state.distance * TURKEY.speedGain);
          const aimed = rng.chance(0.35);
          const kx = aimed
            ? state.player.x + turkeySpeed * fallTime + rng.range(-60, 60)
            : x + rng.range(0, 160);
          state.knives.push({ kind: 'falling', x: kx, y: -30, vx: rng.range(-40, 40), vy, spin: rng.range(-9, 9), angle: 0 });
        } else if (roll < 0.80) {
          state.pickups.push({ kind: 'corn', x, y: GROUND - 120, taken: false, phase: rng.range(0, 6) });
        } else if (roll < 0.90) {
          state.obstacles.push({ kind: 'mud', x, width: 130, height: 18, passed: false });
        } else {
          state.pickups.push({ kind: 'pumpkin', x, y: GROUND - 44, taken: false, phase: rng.range(0, 6) });
        }
      } else {
        // Farmyard and barnyard: fences, bales, mud, corn, haystacks.
        if (roll < 0.26) {
          state.obstacles.push({ kind: 'fence', x, width: 56, height: 62, passed: false });
          maybeDouble('fence', 56, 62);
        } else if (roll < 0.46) {
          state.obstacles.push({ kind: 'bale', x, width: 84, height: 70, passed: false });
          maybeDouble('bale', 84, 70);
        } else if (roll < 0.58) {
          state.obstacles.push({ kind: 'mud', x, width: 130, height: 18, passed: false });
        } else if (roll < 0.70) {
          state.pickups.push({ kind: 'corn', x, y: GROUND - 120, taken: false, phase: rng.range(0, 6) });
        } else if (roll < 0.76) {
          // Golden corn hangs high: worth a jump, and it buys daylight.
          state.pickups.push({ kind: 'gold', x, y: GROUND - 190, taken: false, phase: rng.range(0, 6) });
        } else if (roll < 0.84) {
          state.pickups.push({ kind: 'pumpkin', x, y: GROUND - 44, taken: false, phase: rng.range(0, 6) });
        } else {
          state.haystacks.push({ kind: 'haystack', x, width: 130, height: 92, used: false });
        }
      }
      // The run gets denser as the stages go on: the farmyard is a warm-up,
      // the barnyard pushes, the kitchen crowds.
      const stageFactor = stage === 0 ? 1 : stage === 1 ? 0.9 : 0.88;
      const gap = rng.range(SPAWN.minGap, SPAWN.maxGap) * stageFactor;
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
    player.combo = 0;
    player.comboTimer = 0;
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
        // The farmer loses the trail and searches the WRONG haystack:
        // the nearest other one behind the turkey's, so he walks away
        // from the hiding spot while he looks. If there is none close
        // by, he turns back and peers into the hay behind him.
        const ownCentre = near.x + near.width / 2;
        let wrong = null;
        let wrongDist = Infinity;
        for (const h of state.haystacks) {
          if (h === near) continue;
          const centre = h.x + h.width / 2;
          if (centre >= ownCentre) continue; // never ahead of the turkey
          const d = Math.abs(centre - farmer.x);
          if (d < wrongDist && d < FARMER.searchReach) {
            wrongDist = d;
            wrong = h;
          }
        }
        farmer.mode = 'search';
        farmer.searchTimer = FARMER.searchSeconds;
        farmer.searchX = wrong
          ? wrong.x + wrong.width / 2
          : farmer.x - 120;
        farmer.lungeWindup = 0;
        farmer.lungeTimer = 0;
        events |= EVENT_SEARCH;
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
    // The combo chain only lives while pickups keep coming.
    if (player.comboTimer > 0) {
      player.comboTimer -= dt;
      if (player.comboTimer <= 0) player.combo = 0;
    }
    if (!player.hidden) {
      player.x += (dashing ? TURKEY.dashSpeed : speed * pace) * dt;
      player.runPhase += dt * (dashing ? 26 : 16);
    }
    // Dust at the turkey's feet while it runs: speed you can see.
    if (player.onGround && !player.hidden) {
      player.dustTimer -= dt;
      if (player.dustTimer <= 0) {
        player.dustTimer = 0.12;
        state.particles.push({
          x: player.x + rng.range(-6, 10),
          y: GROUND - rng.range(0, 6),
          vx: rng.range(-90, -40),
          vy: rng.range(-60, -10),
          life: rng.range(0.3, 0.55),
          maxLife: 0.55,
          colour: '#c9a06a',
          size: rng.range(2.5, 5),
        });
      }
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

    // --- the farmer: he chases, searches the hay, and lunges to corner
    // the turkey when he gets close. He never throws while searching or
    // winding up a lunge — his hands are busy. ---
    const ratio = state.stage === 2 ? FARMER.kitchenRatio : FARMER.baseRatio;
    const gap = player.x - farmer.x;
    let farmerSpeed = speed * ratio;
    if (gap > FARMER.catchupGap) farmerSpeed *= FARMER.catchupFactor;
    if (gap < FARMER.closeGap) farmerSpeed *= FARMER.closeFactor;
    if (farmer.lungeCooldown > 0) farmer.lungeCooldown -= dt;

    if (farmer.mode === 'search') {
      // Walk to the wrong haystack, then stand there looking around.
      // He gives up when the search runs out and chases again — unless
      // the turkey is still hidden, in which case he keeps looking.
      const toTarget = farmer.searchX - farmer.x;
      if (Math.abs(toTarget) > 14) {
        farmerSpeed = speed * FARMER.searchSpeed * Math.sign(toTarget);
      } else {
        farmerSpeed = 0;
      }
      farmer.searchTimer -= dt;
      if (farmer.searchTimer <= 0) {
        if (player.hidden) {
          farmer.searchTimer = FARMER.searchSeconds;
          farmer.searchX = farmer.x - 120;
        } else {
          farmer.mode = 'chase';
        }
      }
    } else if (farmer.lungeWindup > 0) {
      // The telegraph: planted feet, winding up. The turkey has this
      // long to dash away or jump.
      farmerSpeed = 0;
      farmer.lungeWindup -= dt;
      if (farmer.lungeWindup <= 0) farmer.lungeTimer = FARMER.lungeSeconds;
    } else if (farmer.lungeTimer > 0) {
      // The burst: far faster than the turkey's run, so only a dash or
      // a jump over him saves the bird.
      farmerSpeed = speed * FARMER.lungeFactor;
      farmer.lungeTimer -= dt;
      if (farmer.lungeTimer <= 0) {
        // A missed lunge leaves him winded: he stops, bent over,
        // while the turkey runs past. A caught turkey never sees this.
        farmer.recoverTimer = FARMER.recoverSeconds;
        farmer.lungeCooldown = FARMER.lungeCooldown;
      }
    } else if (farmer.recoverTimer > 0) {
      // Winded: standing still, catching his breath.
      farmerSpeed = 0;
      farmer.recoverTimer -= dt;
    } else if (
      gap < FARMER.lungeGap && gap > 40 &&
      player.onGround && !player.hidden && player.invulnerable <= 0
    ) {
      // Close enough to corner the turkey: wind up the lunge.
      farmer.lungeWindup = FARMER.lungeWindup;
      farmerSpeed = 0;
      events |= EVENT_LUNGE;
    }
    if (farmer.stumbleTimer > 0) {
      farmer.stumbleTimer -= dt;
      farmerSpeed *= 0.4;
    }
    farmer.x += farmerSpeed * dt;
    farmer.runPhase += dt * (farmerSpeed === 0 ? 0 : 14);
    farmer.throwTimer -= dt;
    if (
      farmer.throwTimer <= 0 && gap < 900 && gap > 60 &&
      farmer.mode === 'chase' && farmer.lungeWindup <= 0 &&
      farmer.lungeTimer <= 0 && farmer.recoverTimer <= 0
    ) {
      farmer.throwTimer = FARMER.throwEvery * (state.stage === 2 ? 0.7 : 1);
      // A thrown knife has to outrun the turkey: it flies at the turkey's
      // speed plus a margin, flat and fast, so it arrives where the turkey
      // will be — a knife at the old speed (360) could never catch a turkey
      // running at 430.
      state.knives.push({
        kind: 'thrown',
        x: farmer.x + FARMER.width,
        y: GROUND - 150,
        vx: speed + 280,
        vy: -120,
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
    // invulnerable from a stumble, so one mistake never costs two lives.
    // And it cannot land while the turkey is hidden in a haystack: the
    // whole point of hiding is that the farmer loses the trail. A lunge
    // never catches a turkey in the air, either — jumping clean over him
    // is the other way out of a corner — and a winded farmer, bent over
    // after a missed lunge, cannot catch anything at all. ---
    if (
      !player.hidden && player.invulnerable <= 0 && farmer.recoverTimer <= 0 &&
      farmer.x + FARMER.width >= player.x + 6 &&
      (farmer.lungeTimer <= 0 || player.onGround)
    ) {
      state.lives -= 1;
      player.combo = 0;
      player.comboTimer = 0;
      burst(player.x + 20, player.y - 30, '#fff3d6', 16, 280);
      if (state.lives <= 0) {
        state.over = true;
        return events | EVENT_CAUGHT;
      }
      farmer.x = player.x - FARMER.respawnGap;
      farmer.mode = 'chase';
      farmer.lungeWindup = 0;
      farmer.lungeTimer = 0;
      farmer.recoverTimer = 0;
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
    const camX = player.x - 520;
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
        // Flat and fast: a thrown blade arcs gently down onto the turkey.
        knife.vy += 500 * dt;
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

    // --- pickups: chained inside the combo window, each one pays its
    // value times the chain (x1, x2, x3). A hit anywhere breaks it. ---
    for (const pickup of state.pickups) {
      if (pickup.taken) continue;
      const dx = pickup.x - (player.x + TURKEY.width / 2);
      const dy = pickup.y - (player.y - TURKEY.height / 2);
      if (Math.abs(dx) < 52 && Math.abs(dy) < 58) {
        pickup.taken = true;
        player.combo = Math.min(player.combo + 1, COMBO.maxMultiplier);
        player.comboTimer = COMBO.windowSeconds;
        const mult = player.combo;
        if (pickup.kind === 'pumpkin') {
          // A pumpkin is a feast: points, and a life back if one is missing.
          state.bonusScore += SCORING.pumpkin * mult;
          if (state.lives < TURKEY.lives) state.lives += 1;
        } else if (pickup.kind === 'gold') {
          // Golden corn hangs high and pays like a pumpkin, no life back.
          state.bonusScore += SCORING.goldCorn * mult;
        } else {
          state.bonusScore += SCORING.corn * mult;
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
    // Copy the FRESH STATE's fields into the live state object (whose
    // reference the step function closes over). The old code did
    // Object.assign(state, fresh) — but fresh is the wrapper {state, step,
    // reset, ...}, so it only added a nested state.state and left the old
    // run's score, distance, lives and over flag in place: pressing Enter
    // after being caught started a "new run" that was frozen on the dead
    // run's numbers with 0 lives.
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, fresh.state);
  }

  return {
    state,
    step,
    reset,
    cameraX() {
      return state.player.x - 520;
    },
    gap() {
      return state.player.x - state.farmer.x;
    },
  };
}

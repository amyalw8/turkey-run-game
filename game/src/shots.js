// Gobble Run — the screenshot scenes behind ?shot=start|run|kitchen|
// caught|escaped. Each one plays the real rules forward from a fresh
// world with a fixed seed, steered by a simple autopilot, so the frame
// is what a short game really looks like and the same seed always gives
// the same frame. The autopilot only presses the keys a player can.
import { VIEW, TURKEY, FARMER } from './config.js';

const STEP = 1 / 60;
const START_SECONDS = 4;
const RUN_SECONDS = 14;
const KITCHEN_EXTRA_SECONDS = 7;
const LIMIT_SECONDS = 150;

/** What the autopilot would do this frame: jump, dash or hold its pace.
 * `lookahead` is unused by the timing now (the jump trigger is computed
 * from the turkey's current speed) and kept only for the call signature.
 * `slow` makes it dawdle (hold Left, never dash): the farmer closes in,
 * which is how the run screenshot gets the chase into the frame.
 * Exported so the build's balance checks can drive the real policy. */
export function autopilot(world, lookahead, slow = false) {
  const { player, farmer, obstacles, knives, pickups } = world.state;
  const controls = { left: false, right: false, jump: false, dash: false, hide: false };
  if (!player.onGround) return controls;

  // The nearest solid thing ahead of the turkey's beak.
  let nearest = null;
  let nearestDist = Infinity;
  for (const obstacle of world.state.obstacles) {
    if (obstacle.kind === 'mud') continue;
    const dist = obstacle.x - (player.x + TURKEY.width);
    if (dist >= -10 && dist < nearestDist) {
      nearestDist = dist;
      nearest = obstacle;
    }
  }
  // A knife already in the air, coming at the turkey.
  let knifeThreat = false;
  for (const knife of world.state.knives) {
    const dx = knife.x - player.x;
    if (dx > -30 && dx < 320 && knife.y > player.y - TURKEY.height - 90) knifeThreat = true;
  }
  // A falling knife aimed at the turkey's path: it lands where the turkey
  // will be, so the turkey has to change pace — dash past it if there is
  // time, otherwise slow down and let it land ahead. Slowing lets the
  // farmer close in, so this is a real trade, not a free dodge.
  let knifeDodge = 'none';
  const base = Math.min(TURKEY.maxSpeed, TURKEY.baseSpeed + world.state.distance * TURKEY.speedGain);
  for (const knife of world.state.knives) {
    if (knife.kind !== 'falling' || knife.vy <= 0) continue;
    const tImpact = (600 - knife.y) / knife.vy;
    if (tImpact < 0 || tImpact > 2.2) continue;
    const predX = player.x + base * tImpact;
    if (Math.abs(knife.x - predX) > 100) continue;
    knifeDodge = tImpact > 0.5 ? 'dash' : 'slow';
    break;
  }
  // A corn cob just ahead with a clear run to it: push on.
  for (const pickup of world.state.pickups) {
    if (!pickup.taken && pickup.x > player.x && pickup.x - player.x < 220) {
      controls.right = true;
    }
  }
  if (slow) {
    // Dawdle: hold Left, never dash. The jump timing below reads these
    // same controls, so it still lands its jumps while moving slowly.
    controls.right = false;
    controls.left = true;
    controls.dash = false;
  }
  const gap = player.x - farmer.x;
  // Dash only on open ground: dashing into a fence is worse than walking.
  const clearAhead = nearest === null || nearestDist > 320;
  if (gap < 110 && player.dashCooldown <= 0 && clearAhead) controls.dash = true;
  if (knifeThreat && player.dashCooldown <= 0 && gap < 200 && clearAhead) controls.dash = true;
  if (knifeDodge === 'dash' && player.dashCooldown <= 0 && clearAhead) controls.dash = true;
  // A lunge winding up (or already bursting): dash away on open ground,
  // otherwise jump clean over him — a lunge never catches a turkey in
  // the air.
  if (farmer.lungeWindup > 0 || farmer.lungeTimer > 0) {
    if (player.dashCooldown <= 0 && clearAhead) controls.dash = true;
    else controls.jump = true;
  }
  // Hide when the farmer is breathing down the turkey's neck and a
  // haystack is right there: he will search the wrong one and lose
  // ground. Never while dawdling for a screenshot — the dawdle wants
  // him close in the frame.
  if (!slow && player.onGround && player.hideCooldown <= 0 && gap < 180) {
    const nearHay = world.state.haystacks.find(
      (h) => !h.used && Math.abs(h.x + h.width / 2 - (player.x + TURKEY.width / 2)) < 130,
    );
    if (nearHay) controls.hide = true;
  }
  // Slow only when the farmer is far enough back that slowing down will
  // not feed the turkey to him: a knife costs one life, a catch too.
  if (knifeDodge === 'slow' && !nearest && gap > 300) {
    controls.left = true;
    controls.right = false;
  }
  // A falling knife about to land just ahead: jump over the impact point.
  // The blade hits the ground where the turkey would have been, and the
  // turkey sails over it — jumping is the knife dodge, not just the
  // fence dodge. The jump is timed to the impact: too early and the
  // turkey lands on the blade, so it only jumps once the impact is
  // under 0.75s away. Thrown knives get the same treatment: jump when
  // the blade is close and at body height.
  let knifeJump = false;
  for (const knife of world.state.knives) {
    if (knife.kind === 'falling' && knife.vy > 0) {
      const tImpact = (600 - knife.y) / knife.vy;
      if (tImpact < 0.2 || tImpact > 0.75) continue;
      const impactX = knife.x + knife.vx * tImpact;
      if (impactX > player.x + 10 && impactX < player.x + 320) knifeJump = true;
    } else if (knife.kind === 'thrown') {
      const relSpeed = knife.vx - base;
      if (relSpeed <= 0) continue;
      const tReach = (player.x + 32 - knife.x) / relSpeed;
      if (tReach < 0.15 || tReach > 0.8) continue;
      const yAtReach = knife.y + knife.vy * tReach + 250 * tReach * tReach;
      if (yAtReach > player.y - 130 && yAtReach < player.y + 10) knifeJump = true;
    }
    if (knifeJump) break;
  }
  if (knifeJump) controls.jump = true;
  if (nearest) {
    // Jump so the turkey's tail clears the far edge while it is still
    // high enough: the jump carries vx * airtime, and the rear must be
    // past the obstacle before the descent drops below its top. The
    // trigger therefore depends on the turkey's current speed (which
    // grows with distance and drops in mud) — a fixed distance jumps
    // too early at speed and lands inside wide obstacles.
    let pace = 1;
    if (controls.left) pace = TURKEY.slowFactor;
    else if (controls.right) pace = TURKEY.pushFactor;
    if (player.inMud) pace *= 0.7;
    const vx = player.dashTimer > 0 ? TURKEY.dashSpeed : base * pace;
    const airtime = (2 * Math.abs(TURKEY.jumpVelocity)) / TURKEY.gravity;
    const carry = vx * airtime * 0.92;
    const trigger = nearest.kind === 'oven'
      ? 180 // ovens are too wide to jump alone: jump early and dash through
      : carry - TURKEY.width - nearest.width - 15;
    if (nearestDist < trigger) {
      controls.jump = true;
      if (nearest.kind === 'oven' && player.dashCooldown <= 0) controls.dash = true;
    }
  } else if (knifeThreat) {
    controls.jump = true;
  }
  // Dawdling never dashes, even when the gap logic above asked for one.
  if (slow) controls.dash = false;
  return controls;
}

/** The autopilot that never jumps: a hurried player, caught out fast. */
function carelessAutopilot(world) {
  const gap = world.state.player.x - world.state.farmer.x;
  const controls = { left: false, right: false, jump: false, dash: false, hide: false };
  if (gap < 110 && world.state.player.dashCooldown <= 0) controls.dash = true;
  return controls;
}

function runFor(world, seconds, pilot) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    // A farmer catch that costs a life is not the end: only stop when
    // the world itself is over (caught for good, or escaped).
    world.step(STEP, pilot(world));
    if (world.state.over) return;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it
 * plus the best score to show. Unknown names stage the title scene.
 */
export function stageShot(name, world) {
  world.reset(7);
  if (name === 'run') {
    // Mid-game, in the barnyard: play well for a while, then dawdle so
    // the farmer closes in for a dramatic frame. If the dawdle gets the
    // turkey caught (or it escapes), fall back to the frame before it.
    runFor(world, RUN_SECONDS, (w) => autopilot(w, 165));
    if (!world.state.over) {
      const snapshot = JSON.parse(JSON.stringify(world.state));
      for (let i = 0; i < 8 * 60; i += 1) {
        const gap = world.state.player.x - world.state.farmer.x;
        if (gap < 300) break; // the farmer is fully on screen
        if (world.state.distance >= 950) break; // stay in the barnyard
        world.step(STEP, autopilot(world, 165, true));
        if (world.state.over) {
          Object.assign(world.state, JSON.parse(JSON.stringify(snapshot)));
          break;
        }
      }
    }
    return { screen: 'play', best: 0 };
  }
  if (name === 'kitchen') {
    // Play well until the kitchen, then a few seconds inside it.
    for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
      if (world.state.stage === 2) break;
      world.step(STEP, autopilot(world, 165));
      if (world.state.over) break;
    }
    runFor(world, KITCHEN_EXTRA_SECONDS, (w) => autopilot(w, 165));
    return { screen: world.state.over ? 'over' : 'play', best: 0 };
  }
  if (name === 'search') {
    // The turkey only hides when a haystack is near while the farmer is
    // close, which does not happen on every seed: try seeds until one
    // stages a mid-hide frame, the farmer walking to the wrong haystack
    // with a "?". (A verification scene, not an entry shot.)
    for (const seed of [2, 42, 1, 3, 7]) {
      world.reset(seed);
      let staged = false;
      for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
        const s = world.state;
        const controls = autopilot(world, 165);
        if (!s.player.hidden && !s.over) {
          const gap = s.player.x - s.farmer.x;
          const near = s.haystacks.find((h) => !h.used && Math.abs(h.x + h.width / 2 - (s.player.x + 32)) < 130);
          if (near && gap < 250 && s.player.onGround) controls.hide = true;
        }
        world.step(STEP, controls);
        if (world.state.over) break;
        if (world.state.player.hidden && world.state.farmer.mode === 'search') {
          // Let him walk a second into the search, then freeze the frame.
          runFor(world, 1.0, () => ({ left: false, right: false, jump: false, dash: false, hide: false }));
          staged = true;
          break;
        }
      }
      if (staged) break;
    }
    return { screen: world.state.over ? 'over' : 'play', best: 0 };
  }
  if (name === 'lunge') {
    // Dawdle so the farmer closes in, and freeze the frame the moment
    // he winds up a lunge ("!!"). (A verification scene, not an entry shot.)
    for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
      world.step(STEP, autopilot(world, 165, true));
      if (world.state.over) break;
      if (world.state.farmer.lungeWindup > 0) break;
    }
    return { screen: world.state.over ? 'over' : 'play', best: 0 };
  }
  if (name === 'caught') {
    runFor(world, LIMIT_SECONDS, carelessAutopilot);
    return { screen: 'over', best: world.state.score };
  }
  if (name === 'escaped') {
    // The autopilot does not escape every seed (seed 7 dies 20m short),
    // so try seeds until one escapes: the shot must show the win screen.
    for (const seed of [1, 2, 3, 42, 7]) {
      world.reset(seed);
      runFor(world, LIMIT_SECONDS, (w) => autopilot(w, 165));
      if (world.state.escaped) break;
    }
    return { screen: 'over', best: world.state.score };
  }
  // Title: a few seconds in, so the farmyard is alive behind the menu.
  runFor(world, START_SECONDS, (w) => autopilot(w, 165));
  return { screen: 'title', best: 0 };
}

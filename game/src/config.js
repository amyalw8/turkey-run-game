// Gobble Run — tuning constants. Every number the game balances on lives
// in this one file, so a tweak here retunes the whole escape.
export const VIEW = { width: 1280, height: 720, groundY: 600 };

export const WORLD = {
  pxPerMetre: 8,
  escapeMetres: 1500,
  // Stage bounds in metres: the farmyard, the barnyard, then the kitchen.
  stageBounds: [0, 500, 1000, 1500],
  stageNames: ['THE FARMYARD', 'THE BARNYARD', 'THE KITCHEN'],
  stageHint: [
    'Run! The farmer is right behind you.',
    'Through the barnyard — keep moving!',
    'The kitchen! Dodge the oven and the knives!',
  ],
};

export const TURKEY = {
  width: 64,
  height: 58,
  baseSpeed: 300, // px/s at the start line
  speedGain: 0.12, // extra px/s for every metre run
  maxSpeed: 430,
  slowFactor: 0.55, // holding Left / A
  pushFactor: 1.15, // holding Right / D
  jumpVelocity: -880,
  gravity: 2000,
  dashSpeed: 660, // px/s while dashing
  dashSeconds: 0.55,
  dashCooldown: 3.0,
  hideSeconds: 2.5,
  hideCooldown: 6.0,
  invulnerableSeconds: 1.8,
  lives: 3,
};

export const FARMER = {
  width: 70,
  height: 98,
  baseRatio: 0.88, // of the turkey's speed
  kitchenRatio: 0.94,
  catchupGap: 340, // beyond this gap he speeds up
  catchupFactor: 1.12,
  closeGap: 90, // inside this gap he eases off
  closeFactor: 0.8,
  stumbleGain: 200, // px he gains when the turkey stumbles
  respawnGap: 620, // px behind after a catch
  throwEvery: 9.0, // seconds between thrown knives
};

export const SCORING = {
  perMetre: 10,
  corn: 50,
  pumpkin: 150,
  stageBonus: 500,
  escapeBonus: 1000,
  lifeBonus: 250,
};

export const SPAWN = {
  firstGap: 520, // px ahead before the first obstacle
  minGap: 320, // closest two obstacles may spawn
  maxGap: 640,
  cornChance: 0.34,
  pumpkinChance: 0.12,
  haystackChance: 0.16,
  mudChance: 0.18,
};

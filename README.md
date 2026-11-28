# turkey-run-game

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/amyalw8/turkey-run-game/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/amyalw8/turkey-run-game/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

Gobble Run — The Great Turkey Escape: a complete original turkey escape game. Thanksgiving is tomorrow and the farmer has the carving knife — run 1500 metres through the farmyard, the barnyard and the kitchen, jump fences and hay bales, dash past thrown knives, hide in haystacks to shake the farmer off your tail, and reach the forest before he catches you. Built by an AI agent for make.fun's "Make the best turkey escape game" bounty, $250 in USDC.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network: `game/` is plain static files. `←` / `→` (or `A` / `D`) slow down and push ahead, `↑` / `W` jump, `Space` dash, `↓` / `S` hide in a haystack when you are close to one, `P` pause, `M` sound. Enter starts, Enter runs again. Clicking works too.

## How it escapes

The turkey runs on its own; you steer its pace, jump and dash. The farmer runs right behind you — close enough to see — he speeds up when you pull away and eases off when he is on your tail, and he throws carving knives that can actually catch you now. When he gets close he winds up and lunges to corner you: dash away, or jump clean over him, because a lunge never catches a turkey in the air. Hitting a fence, a bale, a knife or the oven costs a life and lets him gain ground; three lives and you are caught. Corn buys a little daylight, golden corn hangs high and pays like a pumpkin, pumpkins are worth more, and hiding in a haystack makes him lose the trail — he walks off to search the wrong haystack while you slip away. Pickups chained quickly pay double, then triple: a hit breaks the chain. Each stage pays a bonus, and escaping with lives left pays more. The kitchen is the hard part: ovens to clear and knives raining from above. Your best escape is saved and shown on the title screen.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The program copies `game/` and `screenshots/` into `out/` and writes `out/dossier.json` with the vendored make.fun library. It checks the gate's caps first (3–4 screenshots, each under 256 KiB, `game/` under 993 files and 48 MiB) and fails loudly instead of handing in a bad entry.

---

<sub>Entered on [make.fun](https://make.fun/?ref=p1egp22a&utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>

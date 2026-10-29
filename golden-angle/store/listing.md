# Google Play listing draft

## App name (max 30 characters)

**Golden Angle**

Alternatives, if the name is taken: *Golden Angle: Sunflower* (23), *137.5° Golden Angle* (19).

## Short description (max 80 characters)

> Turn the crown, dodge the shadows, grow a perfect sunflower. Endless and ad-free.

(80 characters)

## Full description (max 4,000 characters)

> **Every sunflower solves a puzzle. Now you can too.**
>
> Sunflowers place each new seed 137.5° round from the last, the golden angle. It's the one angle that packs seeds perfectly, with no gaps and no wasted space, and it's why sunflower heads spiral in Fibonacci numbers.
>
> Golden Angle turns that bit of maths into a fast, endless game built for your watch's crown.
>
> **How to play**
> • Turn the crown to aim. A new seed buds on every beat.
> • Miss the red shadows cast by the seeds you've just planted.
> • Hit the gold spot, one golden angle on from your last seed, and your multiplier climbs the Fibonacci sequence: ×2, ×3, ×5, ×8, ×13, ×21.
> • You have three petals. Bloom to the next stage to win one back.
>
> Play well and you'll draw a perfect sunflower spiral. Play badly and your flower shows it.
>
> **Made for your wrist**
> • Designed for round screens, with a playfield that fills the whole circle
> • Crown-first controls, with a gentle haptic "click" when you hit gold (you can also drag round the rim with a finger)
> • 1–3 minute rounds and instant replay: perfect for queues, buses and rest days
> • Always-on friendly: pauses into a low-power screen and waits for you
> • Grow from Seedling to Sprout, Daisy, Marigold… all the way to Golden Sunflower
>
> **Fair and simple**
> • Pay once. No ads, no in-app purchases, no account.
> • No internet access, no tracking, no data collected.
> • Runs on the watch on its own; no phone app needed.
>
> Optimised for Pixel Watch 4 and Pixel Watch 5, and works on Wear OS 3 or later.

## Category and tags

- **Category:** Games › Arcade (or Puzzle; Arcade fits the endless score-chasing better)
- **Tags to pick in the Play Console:** Arcade, Casual, Single player, Offline, Abstract
- **Content rating:** answer the IARC questionnaire with "no" throughout (no violence, no user content, no purchases, no location). Expect PEGI 3 / Everyone.

## Graphics (in `store/art/`)

| Asset | File | Play requirement |
|---|---|---|
| App icon | `icon-512.png` | 512×512 PNG, 32-bit |
| Feature graphic | `feature-1024x500.png` | 1024×500 JPEG or 24-bit PNG |
| Wear OS screenshots | `screenshots/*-456.png` (and `*-384.png`) | Square, at least 384×384. Upload 4–6 |

Suggested screenshot order: `3-golden-streak` (the hero image: a real sunflower spiral), `2-first-seeds`, `5-game-over`, `4-bruise`, `1-ready`.

These screenshots were rendered from real bot-played games through the game's own scene code. Once you have the watch, swap in real device captures with `adb exec-out screencap -p > shot.png`.

## What's new (version 1.0)

> First release. Grow your first sunflower!

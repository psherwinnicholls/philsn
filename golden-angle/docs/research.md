# Research: what to build for 69p on a Pixel Watch

*October 2026. Limits up front: web search worked, but this cloud session's network couldn't open most store and review pages directly. The findings below come from search-result summaries of those pages, not from browsing the stores, and the sources are listed at the end. Treat any download or price figure as indicative.*

## 1. What's in the smartwatch game stores

### Google Play (Wear OS)

- Google added a **Watch category to the Play Store's games section** with two curated shelves, "Relax with games for your watch" and "Challenging games on the go". At launch these held just over two dozen titles, including RPGs such as *Wearamon* and *Lifeline* (PhoneArena).
- The games that keep appearing in "best Wear OS games" lists are **ports and clones**: *2048*, *Infinity Loop* (free, with in-app purchases from $0.49), *Cactus Run* (a Chrome dino runner), *Jump Drive* (one-tap timing), *Combat Wear 2* (turn-based RPG) and solitaire and snake variants (Android Authority, Feb 2025; Tech Advisor; GearBrain).
- **Paid-upfront watch games are rare.** The one clearly priced example was *Watch Game Racer* at €1.39–1.79 (GoogleWatchBlog). Almost everything else is free with ads or in-app purchases.
- Android Central's Wear OS columnist sums the catalogue up as **"single-tap games and swipe games"**, and says the list of native games "isn't nearly as long as I'd like".
- Galaxy Watch 4 and later run Wear OS and use Google Play, so Samsung's own store no longer matters for new watch games.

### Apple Watch App Store

- Editors' lists (iMore, Beebom, iGeeksBlog 2026) feature **solitaire, chess, Trivia Crack, Wordle-likes (Snappy Word), racing (Touch Round) and text adventures (Lifeline)**. Apple doesn't publish a Watch-only games chart.
- The shape matches Wear OS: familiar formats shrunk down, and short sessions.

### Garmin Connect IQ

- Mostly watch faces, data fields and fitness widgets. **Paid apps only arrived in August 2024** (via Garmin Pay), led by premium watch faces from brands like Disney and Porsche. Games are a niche of a niche.

## 2. Gaps in the Google Play Wear OS games market

1. **Almost nothing uses the crown as the main control.** The only crown- or bezel-driven game I found was a Redditor's unreleased Snake proof-of-concept for Galaxy Watch bezels (Android Authority). Pixel Watch 4 and 5 both have a rotating crown with haptics, and Google's own Compose docs push rotary input. Nearly every watch game ignores it and uses taps.
2. **Round-native design is rare.** Most games are square layouts letterboxed into a circle. A game whose playfield *is* the circle uses every pixel of a 456×456 round display.
3. **"Pay once, no ads" is almost empty.** Free-with-ads dominates, and ads on a 1.4-inch screen are miserable. A 69p no-ads, no-tracking, no-account game is a real difference, not just a cheaper price.
4. **Nothing clever.** The catalogue is arcade clones, trivia and RPGs. There's no game where the mechanic itself teaches something, the "huh, that's neat" that makes people show a friend their wrist.
5. **Session fit.** Watch play happens in queues, on the bus, between gym sets: 30 seconds to 3 minutes. Endless score-chasers fit. Long RPG sessions don't.

## 3. Famous scientific and mathematical puzzles, scored for a watch

The shortlist had to fit **one input** (crown, with touch as a fallback), a **round screen**, **endless play**, and **none of the mechanics Phil has already used** (colour matching, chase and evade like Duck and Fox, mazes).

| Idea | Mechanic it suggests | Crown | Round | Endless | Clash with past games | Verdict |
|---|---|---|---|---|---|---|
| **Golden angle / phyllotaxis** (Vogel 1979; Fibonacci spirals in sunflowers) | Place each seed so it doesn't crowd the last few; 137.5° is the best answer | ★★★ | ★★★ | ★★★ | none | **Chosen** |
| Three-gap theorem | Same family as above: rotating by a fixed angle splits a circle into at most three gap sizes | ★★ | ★★★ | ★★ | none | Folded into the chosen game: it's *why* the golden spot is always in the biggest gap |
| Tower of Hanoi | Move discs between pegs | ★ | ★ | ✗ (finite) | none | Not endless |
| Collatz conjecture | Steer a number up and down | ★ | ★ | ★★ | none | Deterministic, little skill |
| Langton's ant | Steer an ant on a grid | ★ | ✗ | ★★ | close to a maze | Square grid, and too maze-like |
| Buffon's needle | Drop needles across lines | ★ | ★ | ★★ | none | Luck, not skill |
| Monty Hall | Pick a door | ✗ | ★ | ★ | none | A one-off trick, not a loop |
| Orbital mechanics (Kepler, Hohmann transfers) | Burn to change orbit around a planet at the centre | ★★ | ★★★ | ★★ | dodging debris is chase/evade | Strong, but phones already have *Orbit*-style games, and it drifts into evade |
| Lissajous figures / harmonographs | Tune frequency ratios to match a figure | ★★ | ★★ | ★★ | matching | Too close to colour matching |
| Conway's Game of Life | Seed cells to keep a colony alive | ✗ | ✗ | ★★ | none | Square grid; slow to read on a watch |

## 4. The concept: Golden Angle

**Every sunflower solves a packing puzzle.** It adds each new seed 137.5° round from the last, the golden angle, 360° × (1 − 1/φ). That's the one angle that never lines seeds up into spokes, so they pack with no wasted space, and the famous Fibonacci spirals (21, 34, 55…) appear as a side effect.

**The game:** a seed buds every beat at the spot you aim with the crown. It must avoid the "shadows" of the last few seeds. One spot is gold, a golden angle on from the last seed. Hit it and your multiplier climbs the Fibonacci sequence: ×2, ×3, ×5, ×8, ×13, ×21. Play well and you **literally draw a sunflower**; play badly and your flower is a mess. The tempo tightens every "bloom", and blooms arrive at Fibonacci seed counts.

**Why it fits the gaps:**

- **Crown-first (gap 1).** Aiming round a circle is exactly what a crown is for. A haptic tick as you enter the gold zone makes the crown feel as if it has a detent at 137.5°. Touch players can drag round the rim instead.
- **Round-native (gap 2).** The playfield is the circle: aiming ring at the edge, flower in the middle, score in the flower's eye.
- **Worth 69p with no ads (gap 3).** No ads, no account, no network access, no data collected.
- **Clever (gap 4).** Players discover the golden angle with their thumb, and the game-over screen shows the flower they drew. It's a genuine "look at this" moment, and the store page can tell the sunflower story.
- **Short sessions (gap 5).** Bot playtests put typical runs at 1–3 minutes, with instant restart.
- **New for Phil.** No colour matching, no chase, no maze.

## 5. Target hardware

| | Pixel Watch 4 (2025) | Pixel Watch 5 (Aug 2026) |
|---|---|---|
| Sizes | 41mm, 45mm | 41mm, 45mm |
| Display | AMOLED LTPO, 320 ppi, 1–60Hz, up to 3,000 nits, domed | Same Actua 360 domed panel |
| Resolution | not confirmed from sources | 45mm: 456×456. 41mm: sources disagree (Wikipedia says 408×408) |
| Input | Rotating crown, side button, touch | Same |
| Chip and RAM | Snapdragon W5 Gen 2 | W5 Gen 2 "Accelerated", 2–3GB RAM |
| OS at launch | Wear OS 6 | Wear OS 7 |

What this means for the build:

- **Everything is drawn in resolution-independent units** of the watch radius, so any size works.
- **Dark-first palette** for AMOLED.
- **Always-on mode** shows a black, outline-only paused screen.
- **The screen is kept awake only while a round is live.**
- **Crown sensitivity can be switched** (slow, medium, fast) on the start screen. Crown pixel counts vary by device, and the default needs checking on a real Pixel Watch.

## Sources

- [PhoneArena: Finding games for your Wear OS watch just got easier](https://www.phonearena.com/news/finding-games-to-play-on-your-wear-os-smartwatch-just-became-easier_id146877)
- [Android Authority: Best Wear OS games](https://www.androidauthority.com/best-wear-os-games-android-wear-games-667988/)
- [Android Central: Android watches don't need sideloading gimmicks to play games](https://www.androidcentral.com/wearables/android-watches-dont-need-sideloading-gimmicks-to-play-games)
- [Tech Advisor: Best Android Wear games](https://www.techadvisor.com/article/730730/best-android-wear-games.html)
- [GearBrain: Best games for smartwatch](https://www.gearbrain.com/best-games-for-smartwatch-2669262919.html)
- [GoogleWatchBlog: Wear OS racing game](https://www.googlewatchblog.de/2023/04/wear-os-google-zocken/)
- [Android Authority: Snake for Galaxy Watch bezels (Reddit)](https://www.androidauthority.com/snake-galaxy-watch-wear-os-reddit-3635605)
- [Android Developers: Rotary input with Compose](https://developer.android.com/training/wearables/compose/rotary-input)
- [iMore: Best Apple Watch games](https://imore.com/best-apple-watch-games)
- [iGeeksBlog: Best Apple Watch games in 2026](https://www.igeeksblog.com/best-apple-watch-games/)
- [Beebom: Best Apple Watch games](https://beebom.com/best-apple-watch-games/amp/)
- [Garmin: Premium app purchases in the Connect IQ Store](https://www.garmin.com/en-AU/blog/?p=3061)
- [Wareable: Garmin Connect IQ app store guide](https://www.wareable.com/garmin/garmin-connect-iq-app-store-guide-7173)
- [Google Store: Pixel Watch 4 specs](https://store.google.com/product/pixel_watch_4_specs)
- [9to5Google: Pixel Watch 5 hands-on](https://9to5google.com/2026/08/12/google-pixel-watch-5-hands-on/)
- [GSMArena: Pixel Watch 5 specs](https://www.gsmarena.com/google_pixel_watch_5-14860.php)
- [Wikipedia: Pixel Watch 5](https://en.wikipedia.org/wiki/Pixel_Watch_5)
- H. Vogel (1979), "A better way to construct the sunflower head", *Mathematical Biosciences* 44: the r = c√n, θ = n × 137.5° model the game's flower uses.

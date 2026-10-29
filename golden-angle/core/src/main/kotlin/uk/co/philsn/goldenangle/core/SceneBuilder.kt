package uk.co.philsn.goldenangle.core

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/** Everything outside the game rules that changes what is drawn. */
data class View(
    val best: Int = 0,
    /** Highest bloom ever reached, for the start screen. */
    val bestBloom: Int = 0,
    val newBest: Boolean = false,
    val showHints: Boolean = false,
    val ambient: Boolean = false,
    /** Mid-game but frozen (the app was left or the screen dimmed); waits for a tap. */
    val paused: Boolean = false,
    /** Small print at the foot of the start screen, e.g. the crown speed setting. */
    val footer: String? = null,
    /** Seconds since the app opened; drives idle animation. */
    val clock: Double = 0.0,
)

object SceneBuilder {
    const val RING = 0.84
    private const val TRACK_WIDTH = 0.075
    private const val FLOWER_RADIUS = 0.7
    private const val EYE = 0.25
    private const val EYE_RING = 0.215
    private const val FADE_FROM = 0.72
    private const val FADE_TO = 0.79

    fun build(game: Game, fx: Effects, view: View): List<Shape> {
        val out = ArrayList<Shape>(game.seeds.size + 40)
        if (view.ambient) {
            ambient(game, view, out)
            return out
        }
        out += Shape.Disc(0.0, 0.0, 1.0, Palette.BACKGROUND)
        when (game.phase) {
            Phase.READY -> ready(view, out)
            Phase.PLAYING -> {
                playing(game, fx, view, out)
                if (view.paused) {
                    out += Shape.Disc(0.0, 0.0, 1.0, Palette.withAlpha(Palette.BACKGROUND, 0.7))
                    out += Shape.Text(0.0, -0.08, 0.09, "Paused", Palette.TEXT, bold = true)
                    out += Shape.Text(0.0, 0.12, 0.058, "Tap to carry on", Palette.TEXT_DIM)
                }
            }
            Phase.OVER -> over(game, view, out)
        }
        return out
    }

    private fun playing(game: Game, fx: Effects, view: View, out: MutableList<Shape>) {
        flower(game.seeds, game.memory, 1.0, out)
        bloomWave(fx, out)

        out += Shape.Ring(0.0, 0.0, RING, TRACK_WIDTH, Palette.TRACK)
        val w = game.shadowHalfWidth
        for (s in game.shadowSeeds()) {
            out += Shape.Arc(RING, TRACK_WIDTH, s.angle - w, 2 * w, Palette.SHADOW)
            out += Shape.Arc(RING, TRACK_WIDTH, s.angle - w, 1.2, Palette.SHADOW_EDGE)
            out += Shape.Arc(RING, TRACK_WIDTH, s.angle + w - 1.2, 1.2, Palette.SHADOW_EDGE)
        }
        game.goldenSpot()?.let { spot ->
            val (x, y) = polar(spot, RING)
            out += Shape.Arc(RING, TRACK_WIDTH, spot - game.tuning.goldenTolerance, 2 * game.tuning.goldenTolerance, Palette.GOLD_GLOW)
            out += Shape.Disc(x, y, 0.022, Palette.GOLD)
        }

        petals(game.petals, game.tuning.petals, fx, out)
        effects(fx, out)
        bud(game, out)
        hud(game, view, out)
    }

    /**
     * The seed head. Vogel's model puts seed k at radius c·√k; here the newest
     * seed sits on the rim of the flower's eye (where the score lives) and
     * older seeds are pushed outwards: r = √(eye² + c²·age).
     */
    private fun flower(seeds: List<Seed>, recent: Int, alpha: Double, out: MutableList<Shape>) {
        val n = seeds.size
        if (n == 0) return
        val c = sqrt((FLOWER_RADIUS * FLOWER_RADIUS - EYE * EYE) / n.coerceIn(34, 233))
        for (i in 0 until n) {
            val age = n - 1 - i
            val r = sqrt(EYE * EYE + c * c * age)
            if (r > FADE_TO) continue
            val s = seeds[i]
            val (x, y) = polar(s.angle, r)
            val fade = if (r < FADE_FROM) 1.0 else 1.0 - (r - FADE_FROM) / (FADE_TO - FADE_FROM)
            val base = when {
                age < recent -> Palette.SEED_RECENT
                s.golden -> Palette.SEED_GOLDEN
                else -> Palette.SEED
            }
            // Teardrop seeds pointing away from the centre, larger towards the rim.
            val size = c * (0.75 + 0.3 * (r - EYE) / (FLOWER_RADIUS - EYE))
            out += Shape.Petal(x, y, size * 1.25, size * 0.8, s.angle, Palette.withAlpha(base, fade * alpha))
        }
    }

    private fun bud(game: Game, out: MutableList<Shape>) {
        val (x, y) = polar(game.aim, RING)
        val p = game.beatProgress
        val clear = game.clearance(game.aim)
        val color = when {
            game.isGolden(game.aim) -> Palette.GOLD
            clear < 0 -> Palette.BRUISE
            else -> Palette.BUD
        }
        out += Shape.Line(x * 0.9, y * 0.9, x * 0.8, y * 0.8, 0.012, Palette.withAlpha(color, 0.5))
        out += Shape.Ring(x, y, 0.062, 0.008, Palette.withAlpha(color, 0.25 + 0.5 * p))
        out += Shape.Disc(x, y, 0.026 + 0.03 * p, color)
    }

    private fun petals(left: Int, max: Int, fx: Effects, out: MutableList<Shape>) {
        val hurt = fx.active.firstOrNull { it.kind == Effects.Kind.BRUISE }
        for (i in 0 until max) {
            val angle = (i - (max - 1) / 2.0) * 14.0
            val (x, y) = polar(angle, 0.94)
            val alive = i < left
            var color = if (alive) Palette.PETAL else Palette.PETAL_LOST
            if (!alive && i == left && hurt != null) color = Palette.withAlpha(Palette.BRUISE, 1 - hurt.progress)
            out += Shape.Petal(x, y, 0.085, 0.04, angle, color)
        }
    }

    private fun hud(game: Game, view: View, out: MutableList<Shape>) {
        // The eye's rim fills up towards the next bloom.
        out += Shape.Ring(0.0, 0.0, EYE_RING, 0.012, Palette.TRACK)
        out += Shape.Arc(EYE_RING, 0.012, 0.0, 360.0 * game.bloomProgress, Palette.withAlpha(Palette.GOLD, 0.8), roundCaps = true)
        val text = game.score.toString()
        // Keep long scores inside the eye.
        val size = 0.12 * minOf(1.0, 4.0 / text.length)
        out += Shape.Text(0.0, -0.03, size, text, Palette.TEXT, bold = true)
        val m = game.multiplier
        if (m > 1) out += Shape.Text(0.0, 0.11, 0.055, "×$m", Palette.GOLD, bold = true)

        if (view.showHints) {
            val hint = when {
                game.planted == 0 -> "Turn the crown"
                game.planted < 3 -> "Miss the red shadows"
                game.planted < 8 -> "Gold dots score more"
                else -> null
            }
            if (hint != null) out += Shape.Text(0.0, 0.44, 0.06, hint, Palette.TEXT)
        }
    }

    private fun effects(fx: Effects, out: MutableList<Shape>) {
        for (e in fx.active) {
            val p = e.progress
            when (e.kind) {
                Effects.Kind.PLANT -> {
                    // The bud drops from the ring into the heart of the flower.
                    val r = RING * (1 - p) * (1 - p)
                    val (x, y) = polar(e.angle, r)
                    out += Shape.Disc(x, y, 0.04 * (1 - 0.5 * p), Palette.withAlpha(Palette.BUD, 1 - p))
                }
                Effects.Kind.GOLDEN -> {
                    val (x, y) = polar(e.angle, RING)
                    out += Shape.Ring(x, y, 0.05 + 0.12 * p, 0.012 * (1 - p) + 0.002, Palette.withAlpha(Palette.GOLD, 1 - p))
                    val (tx, ty) = polar(e.angle, RING - 0.17 - 0.06 * p)
                    out += Shape.Text(tx, ty, 0.065, "×${e.value}", Palette.withAlpha(Palette.GOLD, 1 - p * p), bold = true)
                }
                Effects.Kind.NEAR_MISS -> {
                    val (tx, ty) = polar(e.angle, RING - 0.16 - 0.05 * p)
                    // Golden-and-late reads "Just!"; dodging a shadow edge reads "Close!".
                    val (tx2, ty2) = if (e.value == 1) polar(e.angle, RING - 0.27 - 0.05 * p) else Pair(tx, ty)
                    out += Shape.Text(tx2, ty2, 0.05, if (e.value == 1) "Just!" else "Close!", Palette.withAlpha(Palette.TEXT, 1 - p))
                }
                Effects.Kind.BRUISE -> {
                    val (x, y) = polar(e.angle, RING)
                    out += Shape.Ring(x, y, 0.05 + 0.15 * p, 0.02 * (1 - p) + 0.002, Palette.withAlpha(Palette.BRUISE, 1 - p))
                    out += Shape.Ring(0.0, 0.0, 0.985, 0.03, Palette.withAlpha(Palette.BRUISE, 0.6 * (1 - p)))
                }
                Effects.Kind.BLOOM -> {}
            }
        }
    }

    private fun bloomWave(fx: Effects, out: MutableList<Shape>) {
        val e = fx.active.firstOrNull { it.kind == Effects.Kind.BLOOM } ?: return
        val p = e.progress
        out += Shape.Ring(0.0, 0.0, 0.2 + 0.8 * p, 0.05 * (1 - p) + 0.004, Palette.withAlpha(Palette.GOLD, 0.7 * (1 - p)))
        out += Shape.Text(0.0, -0.36, 0.07, "Bloom ${e.value + 1}", Palette.withAlpha(Palette.GOLD, 1 - p * p), bold = true)
    }

    private fun ready(view: View, out: MutableList<Shape>) {
        // A slowly turning golden sunflower as the attract screen.
        val demo = attractFlower(view.clock)
        flower(demo, 0, 0.5, out)
        out += Shape.Disc(0.0, 0.0, 1.0, Palette.withAlpha(Palette.BACKGROUND, 0.3))
        out += Shape.Disc(0.0, 0.05, 0.5, Palette.withAlpha(Palette.BACKGROUND, 0.75))
        for (i in 0 until 3) {
            val angle = (i - 1) * 14.0
            val (x, y) = polar(angle, 0.94)
            out += Shape.Petal(x, y, 0.085, 0.04, angle, Palette.PETAL)
        }
        out += Shape.Text(0.0, -0.24, 0.12, "Golden", Palette.GOLD, bold = true)
        out += Shape.Text(0.0, -0.08, 0.12, "Angle", Palette.GOLD, bold = true)
        out += Shape.Text(0.0, 0.08, 0.055, "137.5°", Palette.TEXT_DIM)
        if (view.best > 0) {
            out += Shape.Text(0.0, 0.25, 0.06, "Best ${view.best}", Palette.TEXT)
            out += Shape.Text(0.0, 0.34, 0.045, "Grew ${Tuning.DEFAULT.aBloom(view.bestBloom)}", Palette.TEXT_DIM)
        }
        val pulse = 0.55 + 0.45 * sin(view.clock * 3.0)
        out += Shape.Text(0.0, 0.45, 0.058, "Tap to play", Palette.withAlpha(Palette.TEXT, pulse))
        view.footer?.let { out += Shape.Text(0.0, 0.72, 0.045, it, Palette.TEXT_DIM) }
    }

    private fun over(game: Game, view: View, out: MutableList<Shape>) {
        flower(game.seeds, 0, 0.6, out)
        out += Shape.Disc(0.0, 0.0, 1.0, Palette.withAlpha(Palette.BACKGROUND, 0.3))
        out += Shape.Disc(0.0, 0.0, 0.58, Palette.withAlpha(Palette.BACKGROUND, 0.72))
        petals(0, game.tuning.petals, Effects(), out)
        out += Shape.Text(0.0, -0.42, 0.055, "You grew ${game.tuning.aBloom(game.bloom)}", Palette.GOLD)
        out += Shape.Text(0.0, -0.18, 0.2, game.score.toString(), Palette.TEXT, bold = true)
        if (view.newBest) {
            out += Shape.Text(0.0, 0.06, 0.065, "New best!", Palette.GOLD, bold = true)
        } else {
            out += Shape.Text(0.0, 0.06, 0.06, "Best ${view.best}", Palette.TEXT)
        }
        val pct = if (game.planted == 0) 0 else 100 * game.goldenCount / game.planted
        out += Shape.Text(0.0, 0.2, 0.046, "${game.planted} seeds · $pct% golden", Palette.TEXT_DIM)
        // "So close" is the strongest reason to press replay.
        val toGo = game.seedsToNextBloom
        if (toGo != null && toGo <= 8) {
            val next = game.tuning.aBloom(game.bloom + 1)
            out += Shape.Text(0.0, 0.31, 0.046, "$toGo ${if (toGo == 1) "seed" else "seeds"} from $next", Palette.GOLD)
        }
        out += Shape.Text(0.0, 0.5, 0.058, "Tap to replay", Palette.TEXT)
    }

    private fun ambient(game: Game, view: View, out: MutableList<Shape>) {
        // Always-on display: black, thin outlines, little lit area.
        out += Shape.Disc(0.0, 0.0, 1.0, 0xFF000000)
        out += Shape.Ring(0.0, 0.0, RING, 0.006, Palette.AMBIENT_DIM)
        val label = when (game.phase) {
            Phase.PLAYING -> "Paused"
            else -> "Golden Angle"
        }
        out += Shape.Text(0.0, -0.18, 0.06, label, Palette.AMBIENT_DIM)
        val number = if (game.phase == Phase.READY) view.best else game.score
        out += Shape.Text(0.0, 0.02, 0.15, number.toString(), Palette.AMBIENT)
    }

    fun attractFlower(clock: Double): List<Seed> {
        val turn = clock * 6.0
        return List(144) { i -> Seed(Angles.norm(turn + i * Angles.GOLDEN), golden = true) }
    }

    fun polar(angleDeg: Double, r: Double): Pair<Double, Double> {
        val a = angleDeg * PI / 180.0
        return Pair(r * sin(a), -r * cos(a))
    }
}

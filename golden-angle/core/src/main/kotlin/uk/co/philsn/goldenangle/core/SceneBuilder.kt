package uk.co.philsn.goldenangle.core

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/** Everything outside the game rules that changes what is drawn. */
data class View(
    val best: Int = 0,
    val newBest: Boolean = false,
    val showHints: Boolean = false,
    val ambient: Boolean = false,
    /** Seconds since the app opened; drives idle animation. */
    val clock: Double = 0.0,
)

object SceneBuilder {
    const val RING = 0.84
    private const val TRACK_WIDTH = 0.075
    private const val FLOWER_RADIUS = 0.66
    private const val FADE_FROM = 0.72
    private const val FADE_TO = 0.8

    fun build(game: Game, fx: Effects, view: View): List<Shape> {
        val out = ArrayList<Shape>(game.seeds.size + 40)
        if (view.ambient) {
            ambient(game, view, out)
            return out
        }
        out += Shape.Disc(0.0, 0.0, 1.0, Palette.BACKGROUND)
        when (game.phase) {
            Phase.READY -> ready(view, out)
            Phase.PLAYING -> playing(game, fx, view, out)
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
            out += Shape.Arc(RING, TRACK_WIDTH, s.angle - w, 0.8, Palette.SHADOW_EDGE)
            out += Shape.Arc(RING, TRACK_WIDTH, s.angle + w - 0.8, 0.8, Palette.SHADOW_EDGE)
        }
        for (spot in game.goldenSpots()) {
            if (game.clearance(spot) < 0) continue
            val (x, y) = polar(spot, RING)
            out += Shape.Arc(RING, TRACK_WIDTH, spot - game.tuning.goldenTolerance, 2 * game.tuning.goldenTolerance, Palette.GOLD_GLOW)
            out += Shape.Disc(x, y, 0.022, Palette.GOLD)
        }

        petals(game.petals, game.tuning.petals, fx, out)
        effects(fx, out)
        bud(game, out)
        hud(game, view, out)
    }

    /** The seed head: newest seeds at the centre, older ones pushed outwards. */
    private fun flower(seeds: List<Seed>, recent: Int, alpha: Double, out: MutableList<Shape>) {
        val n = seeds.size
        if (n == 0) return
        val c = FLOWER_RADIUS / sqrt(n.coerceIn(21, 233).toDouble())
        for (i in 0 until n) {
            val age = n - 1 - i
            val r = c * sqrt(age + 0.6)
            if (r > FADE_TO) continue
            val s = seeds[i]
            val (x, y) = polar(s.angle, r)
            val fade = if (r < FADE_FROM) 1.0 else 1.0 - (r - FADE_FROM) / (FADE_TO - FADE_FROM)
            val base = when {
                age < recent -> Palette.SEED_RECENT
                s.golden -> Palette.SEED_GOLDEN
                else -> Palette.SEED
            }
            val size = c * 0.5 * (0.8 + 0.35 * (age.coerceAtMost(89) / 89.0))
            out += Shape.Disc(x, y, size, Palette.withAlpha(base, fade * alpha))
        }
    }

    private fun bud(game: Game, out: MutableList<Shape>) {
        val (x, y) = polar(game.aim, RING)
        val p = game.beatProgress
        val clear = game.clearance(game.aim)
        val color = when {
            clear < 0 -> Palette.BRUISE
            game.isGolden(game.aim) -> Palette.GOLD
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
        out += Shape.Disc(0.0, 0.0, 0.2, Palette.withAlpha(Palette.BACKGROUND, 0.78))
        out += Shape.Text(0.0, -0.02, 0.15, game.score.toString(), Palette.TEXT, bold = true)
        val m = game.multiplier
        if (m > 1) out += Shape.Text(0.0, 0.13, 0.07, "×$m", Palette.GOLD, bold = true)

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
                    out += Shape.Text(tx, ty, 0.05, "close!", Palette.withAlpha(Palette.TEXT, 1 - p))
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
        flower(demo, 0, 0.55, out)
        out += Shape.Disc(0.0, 0.0, 1.0, Palette.withAlpha(Palette.BACKGROUND, 0.35))
        for (i in 0 until 3) {
            val angle = (i - 1) * 14.0
            val (x, y) = polar(angle, 0.94)
            out += Shape.Petal(x, y, 0.085, 0.04, angle, Palette.PETAL)
        }
        out += Shape.Text(0.0, -0.24, 0.12, "Golden", Palette.GOLD, bold = true)
        out += Shape.Text(0.0, -0.08, 0.12, "Angle", Palette.GOLD, bold = true)
        out += Shape.Text(0.0, 0.08, 0.055, "137.5°", Palette.TEXT_DIM)
        if (view.best > 0) out += Shape.Text(0.0, 0.25, 0.06, "Best ${view.best}", Palette.TEXT)
        val pulse = 0.55 + 0.45 * sin(view.clock * 3.0)
        out += Shape.Text(0.0, 0.45, 0.058, "Tap to play", Palette.withAlpha(Palette.TEXT, pulse))
    }

    private fun over(game: Game, view: View, out: MutableList<Shape>) {
        flower(game.seeds, 0, 0.5, out)
        out += Shape.Disc(0.0, 0.0, 1.0, Palette.withAlpha(Palette.BACKGROUND, 0.45))
        petals(0, game.tuning.petals, Effects(), out)
        out += Shape.Text(0.0, -0.4, 0.065, "Wilted", Palette.TEXT_DIM)
        out += Shape.Text(0.0, -0.16, 0.2, game.score.toString(), Palette.TEXT, bold = true)
        if (view.newBest) {
            out += Shape.Text(0.0, 0.08, 0.065, "New best!", Palette.GOLD, bold = true)
        } else {
            out += Shape.Text(0.0, 0.08, 0.06, "Best ${view.best}", Palette.TEXT)
        }
        val pct = if (game.planted == 0) 0 else 100 * game.goldenCount / game.planted
        out += Shape.Text(0.0, 0.24, 0.048, "${game.planted} seeds · $pct% golden", Palette.TEXT_DIM)
        out += Shape.Text(0.0, 0.45, 0.058, "Tap to replay", Palette.TEXT)
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

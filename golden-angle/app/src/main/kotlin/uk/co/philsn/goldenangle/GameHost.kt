package uk.co.philsn.goldenangle

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import uk.co.philsn.goldenangle.core.Effects
import uk.co.philsn.goldenangle.core.Game
import uk.co.philsn.goldenangle.core.GameEvent
import uk.co.philsn.goldenangle.core.Phase
import uk.co.philsn.goldenangle.core.SceneBuilder
import uk.co.philsn.goldenangle.core.Shape
import uk.co.philsn.goldenangle.core.View
import kotlin.math.atan2
import kotlin.math.hypot

/** Glue between Android input/lifecycle and the pure game: owns one Game and its effects. */
class GameHost(private val prefs: Prefs, private val haptics: Haptics) {
    val game = Game()
    private val fx = Effects()
    private var clock = 0.0
    private var overAt = 0.0
    private var newBest = false

    /** Bumped every frame so Compose redraws the canvas. */
    var frame by mutableLongStateOf(0L)
        private set
    var paused by mutableStateOf(false)
        private set
    var ambient by mutableStateOf(false)

    /** True while a round is live, so the activity can keep the screen on. */
    val playing: Boolean get() = game.phase == Phase.PLAYING && !paused && !ambient

    private val crownSpeed: CrownSpeed get() = CrownSpeed.entries[prefs.crownSpeed.coerceIn(0, CrownSpeed.entries.lastIndex)]

    fun tick(dt: Double) {
        clock += dt
        if (!paused && !ambient) {
            val events = game.update(dt)
            if (events.isNotEmpty()) onEvents(events)
            fx.update(dt)
        }
        frame++
    }

    private fun onEvents(events: List<GameEvent>) {
        fx.onEvents(events)
        haptics.play(events)
        for (e in events) if (e is GameEvent.Over) {
            overAt = clock
            newBest = e.score > prefs.best
            if (newBest) prefs.best = e.score
            if (game.bloom > prefs.bestBloom) prefs.bestBloom = game.bloom
            if (game.planted >= 8) prefs.hintsDone = true
        }
    }

    fun rotate(pixels: Float) {
        if (game.phase == Phase.PLAYING && !paused) game.rotate(pixels * crownSpeed.degreesPerPixel)
    }

    /** A finger on the screen, in pixels, inside a canvas of [w]×[h]. */
    fun touch(x: Float, y: Float, w: Int, h: Int, down: Boolean) {
        val half = minOf(w, h) / 2f
        val nx = (x - w / 2f) / half
        val ny = (y - h / 2f) / half
        if (game.phase == Phase.PLAYING && !paused) {
            // Touch play: the bud follows your finger round the rim.
            if (hypot(nx, ny) > 0.35f) game.aimAt(Math.toDegrees(atan2(nx.toDouble(), -ny.toDouble())))
            return
        }
        if (!down) return
        when {
            paused -> paused = false
            game.phase == Phase.READY && ny > 0.6f -> prefs.crownSpeed = (prefs.crownSpeed + 1) % CrownSpeed.entries.size
            game.phase == Phase.OVER && clock - overAt < 0.8 -> {} // don't restart by accident
            else -> start()
        }
    }

    private fun start() {
        fx.clear()
        newBest = false
        game.start()
    }

    /** The app lost the screen: freeze a live round until the player taps. */
    fun pause() {
        if (game.phase == Phase.PLAYING) paused = true
    }

    fun shapes(): List<Shape> = SceneBuilder.build(
        game,
        fx,
        View(
            best = prefs.best,
            bestBloom = prefs.bestBloom,
            newBest = newBest,
            showHints = !prefs.hintsDone,
            ambient = ambient,
            paused = paused,
            footer = "Crown speed: ${crownSpeed.label}",
            clock = clock,
        ),
    )
}

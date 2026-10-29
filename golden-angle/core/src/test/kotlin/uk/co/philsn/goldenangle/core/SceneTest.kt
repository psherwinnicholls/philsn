package uk.co.philsn.goldenangle.core

import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertTrue

class SceneTest {
    private fun inBounds(shapes: List<Shape>) = shapes.all { s ->
        when (s) {
            is Shape.Disc -> abs(s.x) <= 1.2 && abs(s.y) <= 1.2
            is Shape.Petal -> abs(s.x) <= 1.0 && abs(s.y) <= 1.0
            is Shape.Text -> abs(s.x) <= 1.0 && abs(s.y) <= 1.0 && s.text.isNotEmpty()
            else -> true
        }
    }

    @Test
    fun everyPhaseDrawsSomethingOnScreen() {
        val g = Game()
        val fx = Effects()
        val ready = SceneBuilder.build(g, fx, View(best = 10))
        assertTrue(ready.any { it is Shape.Text && it.text == "Best 10" })
        assertTrue(inBounds(ready))

        g.start()
        g.aimAt(0.0)
        repeat(400) {
            fx.onEvents(g.update(0.1))
            fx.update(0.1)
            g.goldenSpot()?.let { g.aimAt(it) }
            assertTrue(inBounds(SceneBuilder.build(g, fx, View())))
        }
        val playing = SceneBuilder.build(g, fx, View())
        assertTrue(playing.any { it is Shape.Text && it.text == g.score.toString() })

        while (g.phase == Phase.PLAYING) {
            g.aimAt(g.seeds.last().angle)
            g.update(0.1)
        }
        val over = SceneBuilder.build(g, fx, View(best = 5, newBest = true))
        assertTrue(over.any { it is Shape.Text && it.text == "New best!" })
    }

    @Test
    fun ambientIsMostlyBlack() {
        val g = Game()
        g.start()
        val shapes = SceneBuilder.build(g, Effects(), View(ambient = true))
        // No filled shapes apart from the black background: protects OLED and battery.
        assertTrue(shapes.filterIsInstance<Shape.Disc>().all { it.color == 0xFF000000 })
        assertTrue(shapes.none { it is Shape.Petal || it is Shape.Arc })
    }

    @Test
    fun hintsOnlyShowWhenAsked() {
        val g = Game()
        g.start()
        val without = SceneBuilder.build(g, Effects(), View(showHints = false))
        val with = SceneBuilder.build(g, Effects(), View(showHints = true))
        assertTrue(without.none { it is Shape.Text && it.text == "Turn the crown" })
        assertTrue(with.any { it is Shape.Text && it.text == "Turn the crown" })
    }

    @Test
    fun effectsExpire() {
        val fx = Effects()
        fx.onEvents(listOf(GameEvent.Planted(0.0, golden = true, nearMiss = true, points = 2, multiplier = 2), GameEvent.Bloomed(1, true)))
        assertTrue(fx.active.size == 4)
        fx.update(2.0)
        assertTrue(fx.active.isEmpty())
    }
}

package uk.co.philsn.goldenangle.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class GameTest {
    private val tuning = Tuning.DEFAULT

    /** Runs until the next beat resolves and returns its events. */
    private fun Game.nextBeat(): List<GameEvent> {
        val events = ArrayList<GameEvent>()
        while (phase == Phase.PLAYING) {
            events += update(1.0 / 60.0)
            if (events.any { it is GameEvent.Planted || it is GameEvent.Bruised }) break
        }
        return events
    }

    @Test
    fun startsReadyThenPlays() {
        val g = Game()
        assertEquals(Phase.READY, g.phase)
        assertTrue(g.update(1.0).isEmpty(), "nothing happens before start")
        g.start()
        assertEquals(Phase.PLAYING, g.phase)
        assertEquals(tuning.petals, g.petals)
    }

    @Test
    fun firstSeedWaitsForTheExtraDelay() {
        val g = Game()
        g.start()
        val first = tuning.intervalFor(0) + tuning.firstSeedDelay
        assertTrue(g.update(first - 0.05).isEmpty())
        val events = g.update(0.1)
        assertIs<GameEvent.Planted>(events.first())
        assertEquals(1, g.planted)
    }

    @Test
    fun perfectGoldenPlayNeverBruisesAndDrawsVogelSpiral() {
        val g = Game()
        g.start()
        g.aimAt(0.0)
        g.nextBeat()
        repeat(600) {
            g.aimAt(g.goldenSpot()!!)
            val e = g.nextBeat().filterIsInstance<GameEvent.Planted>().single()
            assertTrue(e.golden)
        }
        assertEquals(tuning.petals, g.petals)
        assertEquals(601, g.planted)
        assertEquals(tuning.maxMultiplier, g.multiplier)
        // Consecutive seeds are exactly one golden angle apart.
        val s = g.seeds.takeLast(3)
        assertEquals(Angles.GOLDEN, Angles.norm(s[2].angle - s[1].angle), 1e-6)
    }

    @Test
    fun plantingOnTopOfTheLastSeedBruises() {
        val g = Game()
        g.start()
        g.aimAt(90.0)
        g.nextBeat()
        val e = g.nextBeat()
        val bruise = e.filterIsInstance<GameEvent.Bruised>().single()
        assertEquals(tuning.petals - 1, bruise.petalsLeft)
        assertEquals(1, g.planted, "a bruised seed is not added")
        assertEquals(0, g.streak)
    }

    @Test
    fun bruiseGivesExtraTimeToEscape() {
        val g = Game()
        g.start()
        g.aimAt(90.0)
        g.nextBeat()
        g.nextBeat()
        assertEquals(tuning.intervalFor(0) * 1.5, g.beatLength, 1e-9)
    }

    @Test
    fun losingAllPetalsEndsTheGame() {
        val g = Game()
        g.start()
        g.aimAt(45.0)
        g.nextBeat()
        val all = ArrayList<GameEvent>()
        repeat(tuning.petals) { all += g.nextBeat() }
        assertEquals(Phase.OVER, g.phase)
        assertIs<GameEvent.Over>(all.last())
        // Input is ignored once over.
        g.rotate(30.0)
        assertEquals(45.0, g.aim, 1e-9)
    }

    @Test
    fun aimInsideGoldZoneSnapsOntoTheGoldenAngle() {
        val g = Game()
        g.start()
        g.aimAt(10.0)
        g.nextBeat()
        val spot = assertNotNull(g.goldenSpot())
        g.aimAt(spot + tuning.goldenTolerance - 1)
        val e = g.nextBeat().filterIsInstance<GameEvent.Planted>().single()
        assertTrue(e.golden)
        assertEquals(spot, e.angle, 1e-9)
        assertEquals(2, e.multiplier)
    }

    @Test
    fun safeButNotGoldenResetsTheStreak() {
        val g = Game()
        g.start()
        g.aimAt(0.0)
        g.nextBeat()
        g.aimAt(g.goldenSpot()!!)
        g.nextBeat()
        assertEquals(1, g.streak)
        g.aimAt(g.seeds.last().angle + 180.0)
        val e = g.nextBeat().filterIsInstance<GameEvent.Planted>().single()
        assertFalse(e.golden)
        assertEquals(0, g.streak)
        assertEquals(1, e.points)
    }

    @Test
    fun enteringTheGoldZoneFiresOnce() {
        val g = Game()
        g.start()
        g.aimAt(0.0)
        g.nextBeat()
        g.aimAt(g.goldenSpot()!!)
        val first = g.update(0.01)
        val second = g.update(0.01)
        assertTrue(first.contains(GameEvent.EnteredGold))
        assertFalse(second.contains(GameEvent.EnteredGold))
    }

    @Test
    fun arrivingAtGoldAtTheLastMomentIsANearMiss() {
        val g = Game()
        g.start()
        g.aimAt(0.0)
        g.nextBeat()
        g.update(g.beatLeft - 0.05)
        g.aimAt(g.goldenSpot()!!)
        val e = g.update(0.1).filterIsInstance<GameEvent.Planted>().single()
        assertTrue(e.golden && e.nearMiss)
    }

    @Test
    fun bloomsArriveAtFibonacciCountsAndHeal() {
        val g = Game()
        g.start()
        g.aimAt(0.0)
        g.nextBeat()
        g.aimAt(g.seeds.last().angle)
        g.nextBeat() // bruise: 2 petals left
        assertEquals(tuning.petals - 1, g.petals)
        val blooms = ArrayList<GameEvent.Bloomed>()
        while (g.planted < 13) {
            g.aimAt(g.goldenSpot()!!)
            blooms += g.nextBeat().filterIsInstance<GameEvent.Bloomed>()
        }
        assertEquals(listOf(1, 2), blooms.map { it.bloom })
        assertTrue(blooms.first().healed)
        assertEquals(tuning.petals, g.petals)
        assertEquals(tuning.memoryFor(2), g.shadowSeeds().size)
    }

    @Test
    fun goldenSpotIsHiddenWhenAShadowCoversIt() {
        val g = Game(tuning.copy(memory = listOf(2)))
        g.start()
        g.aimAt(0.0)
        g.nextBeat()
        // Put the second seed where the third's golden spot would land near the first.
        g.aimAt(Angles.norm(-Angles.GOLDEN))
        g.nextBeat()
        assertNull(g.goldenSpot())
    }

    @Test
    fun tempoKeepsShrinkingButNeverReachesTheFloor() {
        val beats = (0..30).map { tuning.intervalFor(it) }
        assertTrue(beats.zipWithNext().all { (a, b) -> b < a })
        assertTrue(beats.all { it > tuning.minInterval })
    }

    @Test
    fun restartClearsEverything() {
        val g = Game()
        g.start()
        g.aimAt(0.0)
        repeat(4) { g.nextBeat() }
        g.start()
        assertEquals(0, g.score)
        assertEquals(0, g.planted)
        assertTrue(g.seeds.isEmpty())
        assertEquals(tuning.petals, g.petals)
    }
}

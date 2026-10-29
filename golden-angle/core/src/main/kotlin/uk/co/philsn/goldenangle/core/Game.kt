package uk.co.philsn.goldenangle.core

enum class Phase { READY, PLAYING, OVER }

data class Seed(val angle: Double, val golden: Boolean)

sealed interface GameEvent {
    data class Planted(
        val angle: Double,
        val golden: Boolean,
        val nearMiss: Boolean,
        val points: Int,
        val multiplier: Int,
    ) : GameEvent
    /** The bud just moved into the gold zone: the cue for a crown "detent" click. */
    data object EnteredGold : GameEvent
    data class Bruised(val angle: Double, val petalsLeft: Int) : GameEvent
    data class Bloomed(val bloom: Int, val healed: Boolean) : GameEvent
    data class Over(val score: Int, val planted: Int) : GameEvent
}

/**
 * The whole game, free of any Android code so it can be unit tested and
 * simulated. Each beat a seed buds at the aim angle; it must miss the shadows
 * cast by recent seeds, and landing a golden angle on from the last seed
 * grows a Fibonacci score multiplier.
 */
class Game(val tuning: Tuning = Tuning.DEFAULT) {
    var phase: Phase = Phase.READY
        private set

    /** Where the next seed will bud. */
    var aim: Double = 0.0
        private set

    private val _seeds = ArrayDeque<Seed>()
    /** Newest last. Old seeds beyond [MAX_SEEDS] drop off the flower's rim. */
    val seeds: List<Seed> get() = _seeds

    var planted = 0
        private set
    var score = 0
        private set
    var streak = 0
        private set
    var petals = tuning.petals
        private set
    var bloom = 0
        private set
    var elapsed = 0.0
        private set
    var goldenCount = 0
        private set

    /** When the aim last entered the gold zone, or null while outside it. */
    private var goldSince: Double? = null

    /** Seconds left until the next seed buds, and the length of this beat. */
    var beatLeft = 0.0
        private set
    var beatLength = 1.0
        private set

    val multiplier: Int get() = fibonacciMultiplier(streak, tuning.maxMultiplier)
    val memory: Int get() = tuning.memoryFor(bloom)
    val shadowHalfWidth: Double get() = tuning.shadowHalfWidth(bloom)

    /** 0 → 1 through the current beat. */
    val beatProgress: Double get() = if (beatLength <= 0) 1.0 else 1.0 - beatLeft / beatLength

    /** The recent seeds whose shadows block the next bud. */
    fun shadowSeeds(): List<Seed> = _seeds.takeLast(memory)

    /**
     * The golden spot for the next seed: one golden angle clockwise from the
     * last, or null before the first seed or when a shadow covers it. Only one
     * direction, so steady golden play draws a true sunflower.
     */
    fun goldenSpot(): Double? {
        val last = _seeds.lastOrNull() ?: return null
        val spot = Angles.norm(last.angle + Angles.GOLDEN)
        return if (clearance(spot) >= 0) spot else null
    }

    /** Degrees between [angle] and the nearest shadow edge; negative inside a shadow. */
    fun clearance(angle: Double): Double {
        val w = shadowHalfWidth
        return shadowSeeds().minOfOrNull { Angles.dist(angle, it.angle) - w } ?: 180.0
    }

    /** Within the gold zone a seed snaps onto the golden spot, so it is always safe. */
    fun isGolden(angle: Double): Boolean =
        goldenSpot()?.let { Angles.dist(angle, it) <= tuning.goldenTolerance } ?: false

    fun rotate(deltaDegrees: Double) {
        if (phase == Phase.OVER) return
        aim = Angles.norm(aim + deltaDegrees)
    }

    fun aimAt(degrees: Double) {
        if (phase == Phase.OVER) return
        aim = Angles.norm(degrees)
    }

    fun start() {
        _seeds.clear()
        planted = 0
        score = 0
        streak = 0
        petals = tuning.petals
        bloom = 0
        elapsed = 0.0
        goldenCount = 0
        goldSince = null
        beatLength = tuning.intervalFor(0) + tuning.firstSeedDelay
        beatLeft = beatLength
        phase = Phase.PLAYING
    }

    /** Advances time; returns what happened so the caller can buzz and flash. */
    fun update(dt: Double): List<GameEvent> {
        if (phase != Phase.PLAYING || dt <= 0) return emptyList()
        val events = ArrayList<GameEvent>(2)
        trackGoldZone(events)
        var remaining = dt
        while (remaining > 0 && phase == Phase.PLAYING) {
            val step = minOf(remaining, beatLeft)
            elapsed += step
            beatLeft -= step
            remaining -= step
            if (beatLeft <= 1e-9) plant(events)
        }
        return events
    }

    private fun trackGoldZone(events: MutableList<GameEvent>) {
        if (isGolden(aim)) {
            if (goldSince == null) {
                goldSince = elapsed
                events += GameEvent.EnteredGold
            }
        } else {
            goldSince = null
        }
    }

    private fun plant(events: MutableList<GameEvent>) {
        val golden = isGolden(aim)
        // Reaching gold in the dying moments of the beat is a near miss too.
        val justInTime = golden && elapsed - (goldSince ?: elapsed) < tuning.justInTime
        val angle = if (golden) goldenSpot()!! else aim
        val clear = clearance(angle)
        var grace = 1.0
        if (clear < 0) {
            streak = 0
            petals -= 1
            events += GameEvent.Bruised(angle, petals)
            if (petals <= 0) {
                phase = Phase.OVER
                events += GameEvent.Over(score, planted)
                return
            }
            // A bruise leaves the aim inside a shadow; give time to get out.
            grace = 1.5
        } else {
            streak = if (golden) streak + 1 else 0
            if (golden) goldenCount++
            val mult = multiplier
            score += mult
            planted++
            _seeds.addLast(Seed(angle, golden))
            if (_seeds.size > MAX_SEEDS) _seeds.removeFirst()
            events += GameEvent.Planted(angle, golden, justInTime || (!golden && clear < tuning.nearMissMargin), mult, mult)

            val newBloom = tuning.bloomFor(planted)
            if (newBloom > bloom) {
                bloom = newBloom
                val heal = tuning.bloomHeals && petals < tuning.petals
                if (heal) petals++
                events += GameEvent.Bloomed(bloom, heal)
            }
        }
        beatLength = tuning.intervalFor(bloom) * grace
        beatLeft = beatLength
        goldSince = null
    }

    companion object {
        const val MAX_SEEDS = 420
    }
}

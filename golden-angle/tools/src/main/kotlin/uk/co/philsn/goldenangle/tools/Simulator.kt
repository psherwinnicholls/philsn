package uk.co.philsn.goldenangle.tools

import uk.co.philsn.goldenangle.core.Angles
import uk.co.philsn.goldenangle.core.Game
import uk.co.philsn.goldenangle.core.GameEvent
import uk.co.philsn.goldenangle.core.Phase
import uk.co.philsn.goldenangle.core.Tuning
import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.random.Random

/**
 * A rough model of a person turning a watch crown: they react to each new
 * seed, pick a target, then move there with Fitts'-law timing, a top crown
 * speed and aiming noise that grows with distance. The numbers are estimates,
 * not measurements; they exist to compare tunings against each other.
 */
data class Skill(
    val name: String,
    val reaction: Double,
    val fittsA: Double,
    val fittsB: Double,
    val maxSpeed: Double,
    val noiseBase: Double,
    val noisePerDegree: Double,
    /** Chance of going for the golden spot rather than just a safe gap. */
    val goldenIntent: Double,
    /** Chance per beat of a lapse: looking away, misreading the shadows. */
    val lapse: Double,
    /**
     * Has learnt the rhythm: knows where the next golden spot will be, so
     * starts turning at once and spreads the turn across the whole beat.
     */
    val anticipates: Boolean = false,
) {
    companion object {
        val NOVICE = Skill("novice", 0.45, 0.15, 0.18, 350.0, 3.0, 0.07, 0.4, 0.04)
        val CASUAL = Skill("casual", 0.38, 0.12, 0.15, 450.0, 2.5, 0.055, 0.75, 0.025)
        val SKILLED = Skill("skilled", 0.30, 0.10, 0.12, 600.0, 2.0, 0.045, 0.95, 0.012)
        val EXPERT = Skill("expert", 0.24, 0.08, 0.10, 750.0, 1.5, 0.035, 1.0, 0.006)
        val RHYTHM = Skill("rhythm", 0.30, 0.10, 0.12, 600.0, 2.0, 0.045, 1.0, 0.012, anticipates = true)
        val ALL = listOf(NOVICE, CASUAL, SKILLED, EXPERT, RHYTHM)
    }
}

data class RunResult(
    val seconds: Double,
    val planted: Int,
    val score: Int,
    val bloom: Int,
    val golden: Int,
    val nearMisses: Int,
    val bruises: Int,
    val lateBruises: Int,
    /** Seconds from the start to each bruise. */
    val bruiseTimes: List<Double>,
)

class Bot(private val skill: Skill, private val rng: Random) {
    private var from = 0.0
    private var target = 0.0
    private var moveStart = 0.0
    private var moveTime = 0.0
    private var beatStart = 0.0
    private var goal = 0.0
    private var correcting = true
    private var primary = true
    var arrivedLate = false
        private set

    /** Called when a new beat starts: choose where to go. */
    fun plan(game: Game, now: Double) {
        beatStart = now
        from = game.aim
        val lapsed = rng.nextDouble() < skill.lapse
        val golden = game.goldenSpot()
        val goal = when {
            lapsed -> Angles.norm(game.aim + rng.nextDouble(-60.0, 60.0))
            skill.anticipates && golden != null -> golden
            else -> chooseTarget(game)
        }
        val distance = abs(Angles.delta(from, goal))
        val noise = gaussian() * (skill.noiseBase + skill.noisePerDegree * distance)
        this.goal = from + Angles.delta(from, goal)
        correcting = !lapsed
        target = this.goal + noise
        // Fitts' law: the wider the landing zone, the faster the move.
        val zone = if (goal == golden) 2 * game.tuning.goldenTolerance else (2 * game.clearance(goal)).coerceIn(4.0, 30.0)
        val fitts = skill.fittsA + skill.fittsB * log2(1.0 + distance / zone)
        if (skill.anticipates && !lapsed && goal == golden) {
            // A steady, rhythmic turn that lands just before the beat.
            moveStart = now + 0.06
            moveTime = max(game.beatLength * 0.8, distance / skill.maxSpeed)
        } else {
            moveStart = now + skill.reaction * (0.85 + 0.3 * rng.nextDouble())
            moveTime = max(fitts, distance / skill.maxSpeed)
        }
        arrivedLate = false
        primary = true
    }

    /** Where the crown has the aim at time [now]. */
    fun aimAt(now: Double, beatEndsAt: Double): Double {
        // Once a movement ends, people see the error and make a smaller
        // corrective movement if there is time before the beat.
        val error = goal - target
        if (correcting && now >= moveStart + moveTime + skill.reaction * 0.6 && abs(error) > 1.5) {
            from = target
            target = goal + gaussian() * (skill.noiseBase * 0.5 + skill.noisePerDegree * abs(error))
            moveStart = now
            primary = false
            moveTime = skill.fittsA + skill.fittsB * log2(1.0 + abs(error) / 4.0)
        }
        if (now < moveStart) return from
        val t = ((now - moveStart) / moveTime).coerceIn(0.0, 1.0)
        if (beatEndsAt - now < 1e-6 && t < 1.0 && primary) arrivedLate = true
        // Minimum-jerk profile, the usual shape of a human reaching movement.
        val s = t * t * t * (10 - 15 * t + 6 * t * t)
        return from + (target - from) * s
    }

    private fun chooseTarget(game: Game): Double {
        val wantsGolden = rng.nextDouble() < skill.goldenIntent
        if (wantsGolden) {
            game.goldenSpot()?.let { return it }
        }
        // Otherwise the roomiest gap that isn't too far away.
        var best = game.aim
        var bestValue = Double.NEGATIVE_INFINITY
        var a = 0.0
        while (a < 360.0) {
            val value = min(game.clearance(a), 20.0) - 0.08 * Angles.dist(a, game.aim)
            if (value > bestValue) {
                bestValue = value
                best = a
            }
            a += 1.0
        }
        return best
    }

    private fun gaussian(): Double {
        var u = 0.0
        while (u == 0.0) u = rng.nextDouble()
        val v = rng.nextDouble()
        return kotlin.math.sqrt(-2.0 * ln(u)) * kotlin.math.cos(2 * Math.PI * v)
    }

    private fun log2(x: Double) = ln(x) / ln(2.0)
}

object Simulator {
    private const val DT = 1.0 / 60.0
    private const val MAX_SECONDS = 900.0

    fun run(tuning: Tuning, skill: Skill, seed: Long): RunResult {
        val rng = Random(seed)
        val game = Game(tuning)
        val bot = Bot(skill, rng)
        game.start()
        game.aimAt(rng.nextDouble(360.0))
        var now = 0.0
        bot.plan(game, now)
        var near = 0
        var bruises = 0
        var late = 0
        val bruiseTimes = ArrayList<Double>()
        while (game.phase == Phase.PLAYING && now < MAX_SECONDS) {
            val beatEndsAt = now + game.beatLeft
            now += DT
            game.aimAt(bot.aimAt(now, beatEndsAt))
            val events = game.update(DT)
            var newBeat = false
            for (e in events) {
                when (e) {
                    is GameEvent.Planted -> { if (e.nearMiss) near++; newBeat = true }
                    is GameEvent.Bruised -> {
                        bruises++
                        bruiseTimes += now
                        if (bot.arrivedLate) late++
                        newBeat = true
                    }
                    else -> {}
                }
            }
            if (newBeat && game.phase == Phase.PLAYING) bot.plan(game, now)
        }
        return RunResult(now, game.planted, game.score, game.bloom, game.goldenCount, near, bruises, late, bruiseTimes)
    }

    /** Bruises per beat in each bloom, pooled over many runs. */
    fun bruiseRates(tuning: Tuning, skill: Skill, runs: Int): Map<Int, Double> {
        val beats = HashMap<Int, Int>()
        val bruises = HashMap<Int, Int>()
        repeat(runs) { i ->
            val rng = Random(7919L * i + skill.name.hashCode())
            val game = Game(tuning)
            val bot = Bot(skill, rng)
            game.start()
            game.aimAt(rng.nextDouble(360.0))
            var now = 0.0
            bot.plan(game, now)
            while (game.phase == Phase.PLAYING && now < MAX_SECONDS) {
                val beatEndsAt = now + game.beatLeft
                val bloom = game.bloom
                now += DT
                game.aimAt(bot.aimAt(now, beatEndsAt))
                val events = game.update(DT)
                if (events.any { it is GameEvent.Planted || it is GameEvent.Bruised }) {
                    beats.merge(bloom, 1, Int::plus)
                    if (events.any { it is GameEvent.Bruised }) bruises.merge(bloom, 1, Int::plus)
                    if (game.phase == Phase.PLAYING) bot.plan(game, now)
                }
            }
        }
        return beats.filterValues { it >= 50 }.mapValues { (b, n) -> (bruises[b] ?: 0).toDouble() / n }
    }

    data class Summary(
        val skill: String,
        val runs: Int,
        val medianSeconds: Double,
        val p10Seconds: Double,
        val p90Seconds: Double,
        val medianScore: Int,
        val p90Score: Int,
        val medianBloom: Int,
        val goldenRate: Double,
        val nearMissPerMin: Double,
        val lateShare: Double,
        val firstBruiseMedian: Double,
        val capped: Double,
    )

    fun summarise(tuning: Tuning, skill: Skill, runs: Int = 400): Summary {
        val results = (0 until runs).map { run(tuning, skill, 1000L * it + skill.name.hashCode()) }
        val secs = results.map { it.seconds }.sorted()
        val scores = results.map { it.score }.sorted()
        val totalMin = results.sumOf { it.seconds } / 60.0
        val bruises = results.sumOf { it.bruises }
        return Summary(
            skill = skill.name,
            runs = runs,
            medianSeconds = secs[runs / 2],
            p10Seconds = secs[runs / 10],
            p90Seconds = secs[runs * 9 / 10],
            medianScore = scores[runs / 2],
            p90Score = scores[runs * 9 / 10],
            medianBloom = results.map { it.bloom }.sorted()[runs / 2],
            goldenRate = results.sumOf { it.golden }.toDouble() / max(1, results.sumOf { it.planted }),
            nearMissPerMin = results.sumOf { it.nearMisses } / totalMin,
            lateShare = if (bruises == 0) 0.0 else results.sumOf { it.lateBruises }.toDouble() / bruises,
            firstBruiseMedian = results.mapNotNull { it.bruiseTimes.firstOrNull() }.sorted().let { if (it.isEmpty()) 0.0 else it[it.size / 2] },
            capped = results.count { it.seconds >= MAX_SECONDS }.toDouble() / runs,
        )
    }
}

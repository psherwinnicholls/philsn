package uk.co.philsn.goldenangle.core

import kotlin.math.max
import kotlin.math.pow

/**
 * Every number that shapes difficulty lives here so playtest rounds can be
 * compared by swapping one Tuning for another.
 */
data class Tuning(
    /** Seeds planted at which each new bloom (level) starts. */
    val bloomAt: List<Int> = listOf(0, 5, 13, 34, 55, 89, 144, 233, 377, 610, 987),
    /** How many recent seeds cast shadows, per bloom; the last value repeats. */
    val memory: List<Int> = listOf(1, 2, 3, 5, 8, 13),
    /** Shadow half-width as a fraction of the golden clearance for that memory. */
    val shadowFraction: Double = 0.6,
    /** Seconds between seeds at bloom 0. */
    val startInterval: Double = 1.25,
    /** Each bloom multiplies the interval by this. */
    val intervalDecay: Double = 0.9,
    val minInterval: Double = 0.42,
    /** Extra time before the very first seed. */
    val firstSeedDelay: Double = 1.0,
    /** Within this many degrees of a golden spot counts as golden. */
    val goldenTolerance: Double = 11.0,
    /** Clear of the shadows by less than this counts as a near miss. */
    val nearMissMargin: Double = 4.0,
    val petals: Int = 3,
    /** A new bloom gives back one lost petal. */
    val bloomHeals: Boolean = true,
    /** Golden streak multipliers follow Fibonacci numbers up to this cap. */
    val maxMultiplier: Int = 21,
) {
    fun bloomFor(planted: Int): Int = bloomAt.indexOfLast { planted >= it }.coerceAtLeast(0)

    /** Seeds needed to reach the next bloom, or null past the table's end. */
    fun nextBloomAt(bloom: Int): Int? = bloomAt.getOrNull(bloom + 1)

    fun memoryFor(bloom: Int): Int = memory[bloom.coerceAtMost(memory.lastIndex)]

    fun shadowHalfWidth(bloom: Int): Double = shadowFraction * Angles.goldenClearance(memoryFor(bloom))

    fun intervalFor(bloom: Int): Double = max(minInterval, startInterval * intervalDecay.pow(bloom))

    companion object {
        val DEFAULT = Tuning()
    }
}

/** 1, 2, 3, 5, 8, 13, 21 … indexed by golden streak length (0 = no streak), capped. */
fun fibonacciMultiplier(streak: Int, cap: Int): Int {
    var a = 1
    var b = 2
    repeat(streak) {
        if (a >= cap) return cap
        val n = a + b
        a = b
        b = n
    }
    return a.coerceAtMost(cap)
}

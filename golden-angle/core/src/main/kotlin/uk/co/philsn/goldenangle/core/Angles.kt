package uk.co.philsn.goldenangle.core

import kotlin.math.abs
import kotlin.math.sqrt

/** All angles in the game are degrees, clockwise from 12 o'clock. */
object Angles {
    val PHI: Double = (1.0 + sqrt(5.0)) / 2.0

    /** 360° × (1 − 1/φ) ≈ 137.5078°, the divergence angle of sunflower seeds. */
    val GOLDEN: Double = 360.0 * (1.0 - 1.0 / PHI)

    fun norm(deg: Double): Double {
        val r = deg % 360.0
        return if (r < 0) r + 360.0 else r
    }

    /** Shortest distance between two angles, in [0, 180]. */
    fun dist(a: Double, b: Double): Double {
        val d = abs(norm(a) - norm(b))
        return if (d > 180.0) 360.0 - d else d
    }

    /** Signed shortest turn from [from] to [to], in (-180, 180]. */
    fun delta(from: Double, to: Double): Double {
        var d = norm(to) - norm(from)
        if (d > 180.0) d -= 360.0
        if (d <= -180.0) d += 360.0
        return d
    }

    /**
     * Closest any of the previous [memory] seeds comes to a new seed when every
     * seed is placed exactly one golden angle on from the last. The shadow width
     * is set as a fraction of this, so perfect golden play is always safe.
     */
    fun goldenClearance(memory: Int): Double =
        (1..memory).minOf { j -> dist(0.0, j * GOLDEN) }
}

package uk.co.philsn.goldenangle

import android.content.Context
import androidx.core.content.edit

/** The little the game remembers: best score, whether hints are done, crown speed. */
class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("golden_angle", Context.MODE_PRIVATE)

    var best: Int
        get() = sp.getInt("best", 0)
        set(value) = sp.edit { putInt("best", value) }

    var hintsDone: Boolean
        get() = sp.getBoolean("hints_done", false)
        set(value) = sp.edit { putBoolean("hints_done", value) }

    /** Index into [CrownSpeed.entries]. */
    var crownSpeed: Int
        get() = sp.getInt("crown_speed", CrownSpeed.MEDIUM.ordinal)
        set(value) = sp.edit { putInt("crown_speed", value) }
}

/**
 * Degrees of aim per pixel of rotary scroll. Crowns and bezels report very
 * different pixel counts per turn, so players can pick what feels right.
 * MEDIUM is a starting guess to confirm on a real Pixel Watch.
 */
enum class CrownSpeed(val label: String, val degreesPerPixel: Double) {
    SLOW("slow", 0.3),
    MEDIUM("medium", 0.5),
    FAST("fast", 0.8),
}

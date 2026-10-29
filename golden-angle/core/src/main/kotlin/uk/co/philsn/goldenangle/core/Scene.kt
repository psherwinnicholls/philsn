package uk.co.philsn.goldenangle.core

/**
 * A frame as a flat list of shapes in a unit circle: (0,0) is the centre of
 * the watch face, radius 1 touches the edge, y grows downwards. The watch app
 * and the screenshot tool both draw from this, so they stay identical.
 */
sealed interface Shape {
    data class Disc(val x: Double, val y: Double, val r: Double, val color: Long) : Shape
    data class Ring(val x: Double, val y: Double, val r: Double, val width: Double, val color: Long) : Shape

    /** An arc of a ring, clockwise from [startDeg] (0 = 12 o'clock). */
    data class Arc(
        val r: Double,
        val width: Double,
        val startDeg: Double,
        val sweepDeg: Double,
        val color: Long,
        val roundCaps: Boolean = false,
    ) : Shape

    data class Line(val x1: Double, val y1: Double, val x2: Double, val y2: Double, val width: Double, val color: Long) : Shape

    /** An ellipse along [angleDeg] from the centre, like a petal. */
    data class Petal(val x: Double, val y: Double, val length: Double, val width: Double, val angleDeg: Double, val color: Long) : Shape

    /** Text centred on (x, y); [size] is the cap height as a fraction of the radius. */
    data class Text(val x: Double, val y: Double, val size: Double, val text: String, val color: Long, val bold: Boolean = false) : Shape
}

object Palette {
    const val BACKGROUND = 0xFF0B0907
    const val TRACK = 0xFF231C14
    const val SHADOW = 0xFF3D1C15
    const val SHADOW_EDGE = 0xFFD0503A
    const val GOLD = 0xFFF5B83D
    const val GOLD_GLOW = 0x70F5B83DL
    const val SEED = 0xFF7A5A33
    const val SEED_RECENT = 0xFFB98A4E
    const val SEED_GOLDEN = 0xFFE9A93A
    const val BUD = 0xFFFFF1CF
    const val PETAL = 0xFFFFC93C
    const val PETAL_LOST = 0xFF3A3024
    const val TEXT = 0xFFF7EEDC
    const val TEXT_DIM = 0xFF9C8C74
    const val BRUISE = 0xFFE0533A
    const val AMBIENT = 0xFFBFBFBF
    const val AMBIENT_DIM = 0xFF5F5F5F

    fun withAlpha(color: Long, alpha: Double): Long {
        val a = (((color ushr 24) and 0xFF) * alpha.coerceIn(0.0, 1.0)).toLong()
        return (a shl 24) or (color and 0xFFFFFF)
    }
}

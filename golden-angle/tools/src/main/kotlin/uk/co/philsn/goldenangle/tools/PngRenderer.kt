package uk.co.philsn.goldenangle.tools

import uk.co.philsn.goldenangle.core.Shape
import java.awt.BasicStroke
import java.awt.Color
import java.awt.Font
import java.awt.RenderingHints
import java.awt.geom.Arc2D
import java.awt.geom.Ellipse2D
import java.awt.geom.Line2D
import java.awt.image.BufferedImage

/** Draws a scene with Java2D, matching the Compose renderer on the watch. */
object PngRenderer {
    fun render(shapes: List<Shape>, size: Int, roundMask: Boolean = true): BufferedImage {
        val img = BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB)
        val g = img.createGraphics()
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON)
        g.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE)
        val half = size / 2.0
        fun px(v: Double) = half + v * half
        fun len(v: Double) = v * half
        if (roundMask) g.clip = Ellipse2D.Double(0.0, 0.0, size.toDouble(), size.toDouble())

        for (s in shapes) when (s) {
            is Shape.Disc -> {
                g.color = color(s.color)
                g.fill(Ellipse2D.Double(px(s.x) - len(s.r), px(s.y) - len(s.r), 2 * len(s.r), 2 * len(s.r)))
            }
            is Shape.Ring -> {
                g.color = color(s.color)
                g.stroke = BasicStroke(len(s.width).toFloat())
                g.draw(Ellipse2D.Double(px(s.x) - len(s.r), px(s.y) - len(s.r), 2 * len(s.r), 2 * len(s.r)))
            }
            is Shape.Arc -> {
                g.color = color(s.color)
                val cap = if (s.roundCaps) BasicStroke.CAP_ROUND else BasicStroke.CAP_BUTT
                g.stroke = BasicStroke(len(s.width).toFloat(), cap, BasicStroke.JOIN_MITER)
                g.draw(Arc2D.Double(half - len(s.r), half - len(s.r), 2 * len(s.r), 2 * len(s.r), 90 - s.startDeg, -s.sweepDeg, Arc2D.OPEN))
            }
            is Shape.Line -> {
                g.color = color(s.color)
                g.stroke = BasicStroke(len(s.width).toFloat(), BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND)
                g.draw(Line2D.Double(px(s.x1), px(s.y1), px(s.x2), px(s.y2)))
            }
            is Shape.Petal -> {
                val saved = g.transform
                g.color = color(s.color)
                g.translate(px(s.x), px(s.y))
                g.rotate(Math.toRadians(s.angleDeg))
                g.fill(Ellipse2D.Double(-len(s.width) / 2, -len(s.length) / 2, len(s.width), len(s.length)))
                g.transform = saved
            }
            is Shape.Text -> {
                g.color = color(s.color)
                // Cap height is ~0.72 of the font size for typical sans faces.
                g.font = Font(Font.SANS_SERIF, if (s.bold) Font.BOLD else Font.PLAIN, (len(s.size) / 0.72).toInt().coerceAtLeast(1))
                val fm = g.fontMetrics
                val w = fm.stringWidth(s.text)
                val capHeight = len(s.size)
                g.drawString(s.text, (px(s.x) - w / 2.0).toFloat(), (px(s.y) + capHeight / 2.0).toFloat())
            }
        }
        g.dispose()
        return img
    }

    private fun color(argb: Long): Color = Color(argb.toInt(), true)
}

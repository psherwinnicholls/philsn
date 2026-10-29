package uk.co.philsn.goldenangle

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import uk.co.philsn.goldenangle.core.Shape

/** Draws the shared scene description; the screenshot tool mirrors this with Java2D. */
@Composable
fun SceneCanvas(shapes: () -> List<Shape>, modifier: Modifier = Modifier) {
    val measurer = rememberTextMeasurer()
    Canvas(modifier) {
        val half = size.minDimension / 2f
        val cx = size.width / 2f
        val cy = size.height / 2f
        for (s in shapes()) draw(s, cx, cy, half, measurer)
    }
}

private fun DrawScope.draw(s: Shape, cx: Float, cy: Float, half: Float, measurer: TextMeasurer) {
    fun px(x: Double) = cx + x.toFloat() * half
    fun py(y: Double) = cy + y.toFloat() * half
    fun len(v: Double) = v.toFloat() * half
    when (s) {
        is Shape.Disc -> drawCircle(color(s.color), len(s.r), Offset(px(s.x), py(s.y)))
        is Shape.Ring -> drawCircle(color(s.color), len(s.r), Offset(px(s.x), py(s.y)), style = Stroke(len(s.width)))
        is Shape.Arc -> {
            val r = len(s.r)
            drawArc(
                color = color(s.color),
                // Compose measures from 3 o'clock; the scene measures from 12.
                startAngle = (s.startDeg - 90).toFloat(),
                sweepAngle = s.sweepDeg.toFloat(),
                useCenter = false,
                topLeft = Offset(cx - r, cy - r),
                size = Size(2 * r, 2 * r),
                style = Stroke(len(s.width), cap = if (s.roundCaps) StrokeCap.Round else StrokeCap.Butt),
            )
        }
        is Shape.Line -> drawLine(
            color(s.color),
            Offset(px(s.x1), py(s.y1)),
            Offset(px(s.x2), py(s.y2)),
            strokeWidth = len(s.width),
            cap = StrokeCap.Round,
        )
        is Shape.Petal -> {
            val centre = Offset(px(s.x), py(s.y))
            rotate(s.angleDeg.toFloat(), pivot = centre) {
                val w = len(s.width)
                val l = len(s.length)
                drawOval(color(s.color), Offset(centre.x - w / 2, centre.y - l / 2), Size(w, l))
            }
        }
        is Shape.Text -> {
            // Cap height is ~0.72 of the font size for the system sans face.
            val fontPx = len(s.size) / 0.72f
            val layout = measurer.measure(
                s.text,
                TextStyle(
                    color = color(s.color),
                    fontSize = fontPx.toSp(),
                    fontWeight = if (s.bold) FontWeight.Bold else FontWeight.Normal,
                ),
            )
            val capHeight = len(s.size)
            drawText(
                layout,
                topLeft = Offset(px(s.x) - layout.size.width / 2f, py(s.y) + capHeight / 2f - layout.firstBaseline),
            )
        }
    }
}

private fun color(argb: Long) = Color(argb.toInt())

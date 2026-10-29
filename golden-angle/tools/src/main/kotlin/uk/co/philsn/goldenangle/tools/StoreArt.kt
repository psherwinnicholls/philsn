package uk.co.philsn.goldenangle.tools

import uk.co.philsn.goldenangle.core.Angles
import uk.co.philsn.goldenangle.core.Palette
import java.awt.Color
import java.awt.Font
import java.awt.Graphics2D
import java.awt.RenderingHints
import java.awt.geom.AffineTransform
import java.awt.geom.Ellipse2D
import java.awt.image.BufferedImage
import java.io.File
import javax.imageio.ImageIO
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/** Play Store icon, feature graphic and flattened screenshots. */
object StoreArt {
    fun all(outDir: File, screenshotsDir: File) {
        outDir.mkdirs()
        ImageIO.write(icon(512), "png", File(outDir, "icon-512.png"))
        ImageIO.write(feature(), "png", File(outDir, "feature-1024x500.png"))
        // Play wants opaque, square screenshots; the round mask goes on a black square.
        val shots = File(outDir, "screenshots").apply { mkdirs() }
        screenshotsDir.listFiles { f -> f.extension == "png" }?.sorted()?.forEach { f ->
            for (size in listOf(456, 384)) {
                val src = ImageIO.read(f)
                val out = BufferedImage(size, size, BufferedImage.TYPE_INT_RGB)
                out.createGraphics().apply {
                    setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC)
                    color = Color.BLACK
                    fillRect(0, 0, size, size)
                    drawImage(src, 0, 0, size, size, null)
                    dispose()
                }
                ImageIO.write(out, "png", File(shots, "${f.nameWithoutExtension}-$size.png"))
            }
        }
    }

    fun icon(size: Int): BufferedImage {
        val img = BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB)
        val g = graphics(img)
        g.color = Color(Palette.BACKGROUND.toInt(), true)
        g.fillRect(0, 0, size, size)
        sunflower(g, size / 2.0, size / 2.0, size * 0.42, 144)
        g.dispose()
        return img
    }

    fun feature(): BufferedImage {
        val w = 1024
        val h = 500
        val img = BufferedImage(w, h, BufferedImage.TYPE_INT_RGB)
        val g = graphics(img)
        g.color = Color(Palette.BACKGROUND.toInt(), true)
        g.fillRect(0, 0, w, h)
        sunflower(g, 830.0, 250.0, 270.0, 260)
        g.color = Color(Palette.GOLD.toInt(), true)
        g.font = Font(Font.SANS_SERIF, Font.BOLD, 86)
        g.drawString("Golden", 70, 200)
        g.drawString("Angle", 70, 290)
        g.color = Color(Palette.TEXT.toInt(), true)
        g.font = Font(Font.SANS_SERIF, Font.PLAIN, 30)
        g.drawString("Turn the crown. Grow a sunflower.", 72, 360)
        g.color = Color(Palette.TEXT_DIM.toInt(), true)
        g.font = Font(Font.SANS_SERIF, Font.PLAIN, 24)
        g.drawString("An endless 137.5° game for Wear OS", 72, 400)
        g.dispose()
        return img
    }

    /** Vogel's sunflower: seed k at radius ∝ √k, k golden angles round. */
    private fun sunflower(g: Graphics2D, cx: Double, cy: Double, radius: Double, n: Int) {
        val c = radius / sqrt(n.toDouble())
        for (k in n - 1 downTo 0) {
            val r = c * sqrt(k + 0.5)
            val a = Math.toRadians(k * Angles.GOLDEN)
            val x = cx + r * sin(a)
            val y = cy - r * cos(a)
            val size = c * (0.7 + 0.35 * k / n)
            val color = if (k % 5 == 0) Palette.SEED_RECENT else Palette.GOLD
            g.color = Color(color.toInt(), true)
            val saved: AffineTransform = g.transform
            g.translate(x, y)
            g.rotate(a)
            g.fill(Ellipse2D.Double(-size * 0.4, -size * 0.62, size * 0.8, size * 1.25))
            g.transform = saved
        }
    }

    private fun graphics(img: BufferedImage): Graphics2D = img.createGraphics().apply {
        setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON)
    }
}

package uk.co.philsn.goldenangle.tools

import uk.co.philsn.goldenangle.core.Effects
import uk.co.philsn.goldenangle.core.Game
import uk.co.philsn.goldenangle.core.GameEvent
import uk.co.philsn.goldenangle.core.Phase
import uk.co.philsn.goldenangle.core.SceneBuilder
import uk.co.philsn.goldenangle.core.Tuning
import uk.co.philsn.goldenangle.core.View
import java.awt.image.BufferedImage
import java.io.File
import javax.imageio.IIOImage
import javax.imageio.ImageIO
import javax.imageio.ImageTypeSpecifier
import javax.imageio.metadata.IIOMetadataNode
import kotlin.random.Random

/** Plays a bot game frame by frame so we can grab screenshots and GIFs of real play. */
class Playback(tuning: Tuning, skill: Skill, seed: Long) {
    val game = Game(tuning)
    val fx = Effects()
    private val bot = Bot(skill, Random(seed))
    var now = 0.0
        private set
    var lastEvents: List<GameEvent> = emptyList()
        private set

    init {
        game.start()
        game.aimAt(20.0)
        bot.plan(game, 0.0)
    }

    fun step(dt: Double = 1.0 / 60.0) {
        if (game.phase != Phase.PLAYING) {
            fx.update(dt)
            now += dt
            lastEvents = emptyList()
            return
        }
        val beatEndsAt = now + game.beatLeft
        now += dt
        game.aimAt(bot.aimAt(now, beatEndsAt))
        val events = game.update(dt)
        fx.update(dt)
        fx.onEvents(events)
        lastEvents = events
        if (game.phase == Phase.PLAYING && events.any { it is GameEvent.Planted || it is GameEvent.Bruised }) bot.plan(game, now)
    }

    fun frame(size: Int, view: View = View(best = 412, clock = now)): BufferedImage =
        PngRenderer.render(SceneBuilder.build(game, fx, view), size)
}

object Shots {
    fun screenshots(outDir: File, size: Int, tuning: Tuning) {
        outDir.mkdirs()
        fun save(name: String, img: BufferedImage) = ImageIO.write(img, "png", File(outDir, "$name.png"))

        val ready = Game(tuning)
        save("1-ready", PngRenderer.render(SceneBuilder.build(ready, Effects(), View(best = 412, clock = 2.0)), size))

        // Early game with first-run hints showing.
        Playback(tuning, Skill.SKILLED, 7).run {
            while (game.planted < 4) step()
            repeat(20) { step() }
            save("2-first-seeds", frame(size, View(best = 0, showHints = true, clock = now)))
        }

        // Mid game: grab the frame just after a high-multiplier golden seed.
        Playback(tuning, Skill.EXPERT, 11).run {
            var grabbed = false
            while (!grabbed && game.phase == Phase.PLAYING) {
                step()
                val golden = lastEvents.filterIsInstance<GameEvent.Planted>().firstOrNull { it.golden && it.multiplier >= 8 }
                if (golden != null && game.planted > 40) {
                    repeat(9) { step() }
                    save("3-golden-streak", frame(size))
                    grabbed = true
                }
            }
        }

        // A bruise.
        Playback(tuning, Skill.CASUAL, 3).run {
            var grabbed = false
            while (!grabbed && game.phase == Phase.PLAYING) {
                step()
                if (lastEvents.any { it is GameEvent.Bruised } && game.planted > 10) {
                    repeat(6) { step() }
                    save("4-bruise", frame(size))
                    grabbed = true
                }
            }
        }

        // Game over with the flower they grew behind the score.
        Playback(tuning, Skill.SKILLED, 5).run {
            while (game.phase == Phase.PLAYING) step()
            save("5-game-over", frame(size, View(best = game.score, newBest = true, clock = now)))
            save("6-ambient", frame(size, View(best = 412, ambient = true, clock = now)))
        }
    }

    fun gif(out: File, size: Int, seconds: Double, tuning: Tuning, skill: Skill, seed: Long) {
        out.parentFile?.mkdirs()
        val fps = 20
        val pb = Playback(tuning, skill, seed)
        val writer = ImageIO.getImageWritersByFormatName("gif").next()
        ImageIO.createImageOutputStream(out).use { stream ->
            writer.output = stream
            writer.prepareWriteSequence(null)
            var t = 0.0
            var first = true
            while (t < seconds) {
                repeat(60 / fps) { pb.step() }
                t += 1.0 / fps
                val argb = pb.frame(size)
                val rgb = BufferedImage(size, size, BufferedImage.TYPE_INT_RGB)
                rgb.createGraphics().apply { drawImage(argb, 0, 0, null); dispose() }
                val meta = writer.getDefaultImageMetadata(ImageTypeSpecifier.createFromRenderedImage(rgb), null)
                val root = meta.getAsTree(meta.nativeMetadataFormatName) as IIOMetadataNode
                child(root, "GraphicControlExtension").apply {
                    setAttribute("disposalMethod", "none")
                    setAttribute("userInputFlag", "FALSE")
                    setAttribute("transparentColorFlag", "FALSE")
                    setAttribute("delayTime", (100 / fps).toString())
                    setAttribute("transparentColorIndex", "0")
                }
                if (first) {
                    val apps = child(root, "ApplicationExtensions")
                    apps.appendChild(IIOMetadataNode("ApplicationExtension").apply {
                        setAttribute("applicationID", "NETSCAPE")
                        setAttribute("authenticationCode", "2.0")
                        userObject = byteArrayOf(1, 0, 0)
                    })
                    first = false
                }
                meta.setFromTree(meta.nativeMetadataFormatName, root)
                writer.writeToSequence(IIOImage(rgb, null, meta), null)
                if (pb.game.phase == Phase.OVER && t > 2) break
            }
            writer.endWriteSequence()
        }
    }

    private fun child(root: IIOMetadataNode, name: String): IIOMetadataNode {
        for (i in 0 until root.length) {
            val n = root.item(i)
            if (n.nodeName == name) return n as IIOMetadataNode
        }
        return IIOMetadataNode(name).also { root.appendChild(it) }
    }
}

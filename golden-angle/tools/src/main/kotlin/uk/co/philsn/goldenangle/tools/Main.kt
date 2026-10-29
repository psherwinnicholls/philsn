package uk.co.philsn.goldenangle.tools

import uk.co.philsn.goldenangle.core.Tuning
import java.io.File

/**
 * Usage:
 *   sim [runs]                    print the bot playtest table
 *   shots <dir> [size]            render screenshots of real bot play
 *   gif <file> [size] [seconds]   render an animated GIF of a skilled bot game
 */
fun main(args: Array<String>) {
    val tuning = Tuning.DEFAULT
    when (args.firstOrNull() ?: "sim") {
        "sim" -> printSimulation(tuning, args.getOrNull(1)?.toInt() ?: 400)
        "shots" -> Shots.screenshots(File(args[1]), args.getOrNull(2)?.toInt() ?: 456, tuning)
        "gif" -> Shots.gif(
            File(args[1]),
            args.getOrNull(2)?.toInt() ?: 300,
            args.getOrNull(3)?.toDouble() ?: 30.0,
            tuning,
            Skill.SKILLED,
            seed = 42,
        )
        else -> error("Unknown command ${args.first()}")
    }
}

fun printSimulation(tuning: Tuning, runs: Int) {
    println("| Skill | Median run | 10th–90th pct | Median score | 90th pct score | Median bloom | Golden rate | Near misses/min | Late bruises | First bruise | Hit 15-min cap |")
    println("|---|---|---|---|---|---|---|---|---|---|---|")
    for (skill in Skill.ALL) {
        val s = Simulator.summarise(tuning, skill, runs)
        println(
            "| ${s.skill} | ${"%.0f".format(s.medianSeconds)}s | ${"%.0f".format(s.p10Seconds)}–${"%.0f".format(s.p90Seconds)}s | " +
                "${s.medianScore} | ${s.p90Score} | ${s.medianBloom} | ${"%.0f".format(100 * s.goldenRate)}% | " +
                "${"%.1f".format(s.nearMissPerMin)} | ${"%.0f".format(100 * s.lateShare)}% | ${"%.0f".format(s.firstBruiseMedian)}s | " +
                "${"%.0f".format(100 * s.capped)}% |",
        )
    }
}

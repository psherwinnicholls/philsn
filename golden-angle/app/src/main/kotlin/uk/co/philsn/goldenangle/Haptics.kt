package uk.co.philsn.goldenangle

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import uk.co.philsn.goldenangle.core.GameEvent

/**
 * One buzz per frame at most, the most important event winning. The tick on
 * entering the gold zone makes the crown feel as if it has a detent at 137.5°.
 */
class Haptics(context: Context) {
    private val vibrator: Vibrator? =
        if (Build.VERSION.SDK_INT >= 31) {
            context.getSystemService(VibratorManager::class.java)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Vibrator::class.java)
        }

    fun play(events: List<GameEvent>) {
        val v = vibrator?.takeIf { it.hasVibrator() } ?: return
        val effect = when {
            events.any { it is GameEvent.Over } -> VibrationEffect.createOneShot(220, VibrationEffect.DEFAULT_AMPLITUDE)
            events.any { it is GameEvent.Bruised } -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK)
            events.any { it is GameEvent.Bloomed } -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_DOUBLE_CLICK)
            events.any { it is GameEvent.Planted && it.golden } -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
            events.any { it is GameEvent.EnteredGold } -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
            else -> return
        }
        v.vibrate(effect)
    }
}

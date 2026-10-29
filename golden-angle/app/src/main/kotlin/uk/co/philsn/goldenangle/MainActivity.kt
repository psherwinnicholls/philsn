package uk.co.philsn.goldenangle

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.rotary.onRotaryScrollEvent
import androidx.wear.ambient.AmbientLifecycleObserver

class MainActivity : ComponentActivity() {
    private lateinit var host: GameHost

    private val ambientCallback = object : AmbientLifecycleObserver.AmbientLifecycleCallback {
        override fun onEnterAmbient(ambientDetails: AmbientLifecycleObserver.AmbientDetails) {
            host.pause()
            host.ambient = true
        }

        override fun onExitAmbient() {
            host.ambient = false
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        host = GameHost(Prefs(this), Haptics(this))
        lifecycle.addObserver(AmbientLifecycleObserver(this, ambientCallback))

        setContent {
            val focus = remember { FocusRequester() }
            LaunchedEffect(Unit) { focus.requestFocus() }
            LaunchedEffect(host.ambient) {
                if (host.ambient) return@LaunchedEffect
                var last = 0L
                while (true) {
                    withFrameNanos { now ->
                        // Clamp long gaps (e.g. after a hiccup) so seeds never skip.
                        val dt = if (last == 0L) 0.0 else ((now - last) / 1e9).coerceAtMost(0.1)
                        last = now
                        host.tick(dt)
                        keepScreenOn(host.playing)
                    }
                }
            }
            SceneCanvas(
                shapes = {
                    host.frame // read so the canvas redraws every frame
                    host.shapes()
                },
                modifier = Modifier
                    .fillMaxSize()
                    .onRotaryScrollEvent {
                        host.rotate(it.verticalScrollPixels)
                        true
                    }
                    .focusRequester(focus)
                    .focusable()
                    .pointerInput(Unit) {
                        awaitEachGesture {
                            val down = awaitFirstDown()
                            host.touch(down.position.x, down.position.y, size.width, size.height, down = true)
                            do {
                                val event = awaitPointerEvent()
                                event.changes.forEach {
                                    if (it.pressed) host.touch(it.position.x, it.position.y, size.width, size.height, down = false)
                                }
                            } while (event.changes.any { it.pressed })
                        }
                    },
            )
        }
    }

    override fun onPause() {
        super.onPause()
        host.pause()
        keepScreenOn(false)
    }

    private var screenKeptOn = false

    private fun keepScreenOn(on: Boolean) {
        if (on == screenKeptOn) return
        screenKeptOn = on
        if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
}

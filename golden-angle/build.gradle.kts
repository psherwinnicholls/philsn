// Load the Kotlin plugin once for all modules. The Android plugin is left out
// so the pure-Kotlin modules still build where there's no Android SDK.
plugins {
    id("org.jetbrains.kotlin.jvm") apply false
}

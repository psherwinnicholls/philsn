// Plugin versions live in settings.gradle.kts so the Android plugin is only
// resolved when the :app module is included. (Gradle warns that the Kotlin
// plugin loads in both :core and :app; declaring it here instead breaks the
// Kotlin Android plugin's view of the Android Gradle plugin, so leave it.)
